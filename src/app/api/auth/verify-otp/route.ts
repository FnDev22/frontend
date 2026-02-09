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
        const { phone, code, purpose } = await request.json()

        if (!phone || !code || !purpose) {
            return NextResponse.json({ error: 'Phone, code, and purpose required' }, { status: 400 })
        }

        const normalizedPhone = normalizePhone(phone)
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // Check OTP
        const { data, error } = await adminSupabase
            .from('otp_codes')
            .select('*')
            .eq('phone', normalizedPhone)
            .eq('code', code)
            .eq('purpose', purpose)
            .gt('expires_at', new Date().toISOString()) // Not expired
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('Verify OTP Error:', error)
            return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ valid: false, error: 'Kode OTP salah atau kedaluwarsa' }, { status: 400 })
        }

        // Delete used OTP (or mark used)
        await adminSupabase.from('otp_codes').delete().eq('id', data.id)

        return NextResponse.json({ valid: true })

    } catch (error) {
        console.error('Verify OTP Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
