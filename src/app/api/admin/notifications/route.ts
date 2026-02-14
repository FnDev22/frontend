import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ae132118@gmail.com'

/** GET: Method Not Allowed — endpoint ini hanya POST */
export async function GET(_request: NextRequest) {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'POST' } })
}

/** POST: Admin buat notifikasi baru */
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const title = body?.title?.trim()
    const message = body?.message?.trim()

    if (!title) {
        return NextResponse.json({ error: 'Title wajib' }, { status: 400 })
    }

    const admin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data, error } = await admin.from('notifications').insert({ title, message: message || null }).select('id, title, message, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Broadcast email to all users
    const emailHtml = `
        <h2>${data.title}</h2>
        <p>Halo,</p>
        <p>Ada pesan baru untuk Anda:</p>
        <blockquote style="border-left: 4px solid #0070f3; padding-left: 10px; margin: 10px 0; color: #555;">
            ${data.message || 'Harap cek notifikasi di aplikasi.'}
        </blockquote>
        <p>Salam,<br/>Tim F-PEDIA</p>
    `
    import('@/lib/mail').then(({ broadcastEmail }) => {
        broadcastEmail(data.title, emailHtml)
    })

    return NextResponse.json(data)
}
