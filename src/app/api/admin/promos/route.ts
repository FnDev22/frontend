import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { rejectBrowserGet } from '@/lib/api-protect'

const ADMIN_EMAIL = 'ae132118@gmail.com'

/** GET: List semua promo */
export async function GET(request: NextRequest) {
    const rejected = rejectBrowserGet(request)
    if (rejected) return rejected
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const admin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data, error } = await admin
            .from('promos')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data ?? [])
    } catch (err) {
        console.error('Admin promos GET error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}

/** POST: Admin buat promo baru */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const code = body?.code?.trim()
        const title = body?.title?.trim()
        const description = body?.description?.trim()
        const discountPercent = Number(body?.discount_percent) || 0
        const discountValue = Number(body?.discount_value) || 0
        const validFrom = body?.valid_from ? new Date(body.valid_from).toISOString() : null
        const validUntil = body?.valid_until ? new Date(body.valid_until).toISOString() : null
        const isActive = body?.is_active !== false

        if (!code || !title) {
            return NextResponse.json(
                { error: 'Code dan title wajib' },
                { status: 400 }
            )
        }

        const admin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data, error } = await admin
            .from('promos')
            .insert({
                code: code.toUpperCase(),
                title,
                description: description || null,
                discount_percent: discountPercent,
                discount_value: discountValue,
                valid_from: validFrom,
                valid_until: validUntil,
                is_active: isActive,
            })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json(data)
    } catch (err) {
        console.error('Admin promos POST error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}
