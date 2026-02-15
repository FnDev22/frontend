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
        const { email, password, full_name, whatsapp_number, otp_code } = await request.json()

        if (!email || !password || !full_name || !whatsapp_number || !otp_code) {
            return NextResponse.json({ error: 'Data incomplete' }, { status: 400 })
        }

        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // 1. Verify OTP again (Secure)
        // 1. Verify OTP again (Secure)
        const { data: otpData, error: otpError } = await adminSupabase
            .from('otp_codes')
            .select('*')
            .eq('phone', email.trim().toLowerCase()) // 'phone' column stores the identifier (email/phone)
            .eq('code', otp_code)
            .eq('purpose', 'register')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (otpError || !otpData) {
            console.error('Register API OTP Error:', otpError || 'No OTP found')
            return NextResponse.json({ error: 'Kode OTP tidak valid' }, { status: 400 })
        }

        // Check Expiration
        const now = new Date()
        const expiresAt = new Date(otpData.expires_at)
        if (now > expiresAt) {
            console.log('Register API OTP Expired:', { now, expiresAt })
            return NextResponse.json({ error: 'Kode OTP sudah kadaluarsa' }, { status: 400 })
        }

        // 2. Create User (Auto Confirm)
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name,
                whatsapp_number: whatsapp_number,
            }
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 3. Create Profile (Trigger usually does this, but we can ensure updates if needed)
        // If you have a trigger 'on_auth_user_created', it will run. 
        // We can update the profile with whatsapp number just in case the trigger didn't pick it up from metadata immediately,
        // or if your trigger logic relies on metadata.

        // 4. Delete OTP
        await adminSupabase.from('otp_codes').delete().eq('id', otpData.id)

        return NextResponse.json({ success: true, user: authData.user })

    } catch (error) {
        console.error('Register Verified Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
