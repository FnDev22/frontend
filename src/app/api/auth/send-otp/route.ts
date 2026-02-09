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
        const { phone, purpose } = await request.json()

        if (!phone || !purpose) {
            return NextResponse.json({ error: 'Phone and purpose required' }, { status: 400 })
        }

        const normalizedPhone = normalizePhone(phone)
        const code = Math.floor(100000 + Math.random() * 900000).toString() // 6 digits
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // Save OTP
        const { error: dbError } = await adminSupabase
            .from('otp_codes')
            .insert({
                phone: normalizedPhone,
                code,
                purpose,
                expires_at: expiresAt.toISOString()
            })

        if (dbError) {
            console.error('OTP DB Error:', dbError)
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
        }

        // Send WhatsApp
        const message = `Kode OTP F-PEDIA Anda: *${code}*\n\nJangan berikan kode ini kepada siapapun via telepon/WA. Berlaku 5 menit.`

        await enqueueWhatsAppMessage(adminSupabase, normalizedPhone, message)

        return NextResponse.json({ success: true, message: 'OTP sent' })

    } catch (error) {
        console.error('Send OTP Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
