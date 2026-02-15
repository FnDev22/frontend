import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
    try {
        const { email, otpCode, newPassword } = await request.json()

        if (!email || !otpCode || !newPassword) {
            return NextResponse.json({ error: 'Data incomplete' }, { status: 400 })
        }

        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 1. Verify OTP
        // 1. Verify OTP
        const { data: otpData, error: otpError } = await adminSupabase
            .from('otp_codes')
            .select('*')
            .eq('phone', email)
            .eq('code', otpCode)
            .eq('purpose', 'reset_password')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (otpError || !otpData) {
            console.error('Reset Password OTP Error:', otpError || 'No OTP found')
            return NextResponse.json({ error: 'Kode OTP salah atau tidak ditemukan' }, { status: 400 })
        }

        // Check Expiration
        const now = new Date()
        const expiresAt = new Date(otpData.expires_at)
        if (now > expiresAt) {
            console.log('Reset Password OTP Expired:', { now, expiresAt })
            return NextResponse.json({ error: 'Kode OTP sudah kadaluarsa' }, { status: 400 })
        }

        // 2. Find User ID by Email
        // Supabase Admin doesn't have getUserByEmail in JS client easily, so we list users
        // This is inefficient if you have 1M users, but for now it works.
        // Alternative: Use admin.listUsers({ page: 1, perPage: 1 }) is not filtering.
        // Actually, we can assume the email is the one in auth.users?
        // We can use a trick: RPC function if we had access.
        // Or we iterate pages? No.
        // Better way: use `admin.generateLink`? No, we want to set password directly.
        // Wait, `admin.updateUser` requires UID.
        // Let's try `supabase.rpc` if available to get UID by email.
        // Fallback: We can assume email is unique and just try to find them if we had a profiles table.
        // We do have `profiles` table?

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 3. Update Password
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            profile.id,
            { password: newPassword }
        )

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // 4. Delete OTP
        await adminSupabase.from('otp_codes').delete().eq('id', otpData.id)

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Reset Password Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
