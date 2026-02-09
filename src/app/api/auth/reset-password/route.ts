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
        const { phone, newPassword, otpCode } = await request.json()

        if (!phone || !newPassword || !otpCode) {
            return NextResponse.json({ error: 'Phone, password, and OTP required' }, { status: 400 })
        }

        const normalizedPhone = normalizePhone(phone)
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // 1. Verify OTP again (double check security)
        const { data: otpData, error: otpError } = await adminSupabase
            .from('otp_codes')
            .select('*')
            .eq('phone', normalizedPhone)
            .eq('code', otpCode)
            .eq('purpose', 'reset_password')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (otpError || !otpData) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
        }

        // 2. Find user by whatsapp number
        // We look into profiles table to find the user_id
        const { data: profile, error: profileError } = await adminSupabase
            .from('profiles')
            .select('id')
            .eq('whatsapp_number', normalizedPhone)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 3. Update password
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            profile.id,
            { password: newPassword }
        )

        if (updateError) {
            console.error('Update Password Error:', updateError)
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
        }

        // 4. Delete OTP
        await adminSupabase.from('otp_codes').delete().eq('id', otpData.id)

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Reset Password API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
