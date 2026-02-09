import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Only allow admin to access this
// We rely on middleware or check session here.
// But better check session here.

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { password } = await request.json()

        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password min 6 chars' }, { status: 400 })
        }

        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // Update user
        const { error } = await adminSupabase.auth.admin.updateUserById(
            id,
            { password: password }
        )

        if (error) {
            console.error('Admin Update Password Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Admin Password API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
