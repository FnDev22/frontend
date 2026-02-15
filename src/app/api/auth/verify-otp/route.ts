import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function normalizePhone(phone: string) {
    let p = phone.trim().replace(/\D/g, '')
    if (p.startsWith('0')) p = '62' + p.slice(1)
    else if (!p.startsWith('62')) p = '62' + p
    return p
}

export async function POST(request: NextRequest) {
    try {
        const { phone, email, code, purpose } = await request.json()

        if ((!phone && !email) || !code || !purpose) {
            return NextResponse.json({ error: 'Phone/Email, code, and purpose required' }, { status: 400 })
        }

        const identifier = email ? email.trim().toLowerCase() : normalizePhone(phone)
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // Check OTP
        const { data, error } = await adminSupabase
            .from('otp_codes')
            .select('*')
            .eq('phone', identifier)
            .eq('code', code)
            .eq('purpose', purpose)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        // DEBUG OTP VERIFICATION
        const now = new Date()
        console.log('[Verify OTP] Checking:', { identifier, code, purpose })
        console.log('[Verify OTP] Current Server Time:', now.toISOString())
        if (data) {
            console.log('[Verify OTP] Found Record:', data)
            console.log('[Verify OTP] Expires At:', data.expires_at)
        } else {
            console.log('[Verify OTP] No record found for criteria')
        }

        if (error) {
            console.error('Verify OTP Error:', error)
            return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ valid: false, error: 'Kode OTP salah atau tidak ditemukan' }, { status: 400 })
        }

        // Check Expiration in JS (Safer for Timezones)
        const expiresAt = new Date(data.expires_at)
        if (now > expiresAt) {
            console.log('[Verify OTP] Expired! Now > ExpiresAt')
            return NextResponse.json({ valid: false, error: 'Kode OTP sudah kadaluarsa (Expired)' }, { status: 400 })
        }



        // Delete used OTP (or mark used)
        await adminSupabase.from('otp_codes').delete().eq('id', data.id)

        return NextResponse.json({ valid: true })

    } catch (error) {
        console.error('Verify OTP Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
