import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3001'
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_SECRET || process.env.WHATSAPP_API_KEY

function normalizePhone(phone: string) {
    let p = phone.trim().replace(/\D/g, '')
    if (p.startsWith('0')) p = '62' + p.slice(1)
    else if (!p.startsWith('62')) p = '62' + p
    return p
}

export async function POST(request: NextRequest) {
    try {
        const { phone, email, purpose } = await request.json()

        // DEBUG CREDENTIALS REMOVED


        if ((!phone && !email) || !purpose) {
            return NextResponse.json({ error: 'Phone/Email and purpose required' }, { status: 400 })
        }

        const isEmail = !!email
        const identifier = isEmail ? email.trim().toLowerCase() : normalizePhone(phone)

        // Security: Rate Limit by IP + UserAgent to prevent bombing
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const ua = request.headers.get('user-agent') || 'unknown'
        const { checkRateLimit } = await import('@/lib/rate-limit')
        const rateLimit = await checkRateLimit(`otp:${ip}:${ua}`, 5, 60 * 10) // 5 requests per 10 mins

        if (!rateLimit.success) {
            return NextResponse.json({ error: rateLimit.message }, { status: 429 })
        }

        // Rate Limiter: 10 requests per minute
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        const { count, error: countError } = await adminSupabase
            .from('otp_codes')
            .select('*', { count: 'exact', head: true })
            .eq('phone', identifier) // Identifier stored in phone column
            .gte('created_at', oneMinuteAgo)

        if (count !== null && count >= 10) {
            return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString() // 6 digits
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        // Removed redundant client creation (moved up)

        // Save OTP (using 'phone' column as generic identifier)
        const { error: dbError } = await adminSupabase
            .from('otp_codes')
            .insert({
                phone: identifier,
                code,
                purpose,
                expires_at: expiresAt.toISOString()
            })

        if (dbError) {
            console.error('OTP DB Error:', dbError)
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
        }

        // Send OTP via Email or WhatsApp
        if (isEmail) {
            const { sendEmail } = await import('@/lib/mail')
            await sendEmail({
                to: identifier,
                subject: `Kode OTP F-PEDIA: ${code}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Verifikasi OTP F-PEDIA</h2>
                        <p>Kode OTP Anda adalah:</p>
                        <h1 style="letter-spacing: 5px; color: #2563eb;">${code}</h1>
                        <p>JANGAN BERIKAN kode ini kepada siapapun.</p>
                        <p>Kode berlaku selama 5 menit.</p>
                    </div>
                `
            })
        } else {
            const message = `Kode OTP F-PEDIA Anda: *${code}*\n\nJangan berikan kode ini kepada siapapun via telepon/WA. Berlaku 5 menit.`
            await enqueueWhatsAppMessage(adminSupabase, identifier, message)
        }

        return NextResponse.json({ success: true, message: 'OTP sent' })

    } catch (error) {
        console.error('Send OTP Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
