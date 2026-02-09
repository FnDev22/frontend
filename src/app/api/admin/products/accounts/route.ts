import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { rejectBrowserGet } from '@/lib/api-protect'

const ADMIN_EMAIL = 'ae132118@gmail.com'

/** GET: ambil daftar akun stok per produk (pakai service role, hindari RLS/timeout di client). */
export async function GET(request: NextRequest) {
    const rejected = rejectBrowserGet(request)
    if (rejected) return rejected
    try {
        const auth = await requireAdmin()
        if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

        const productId = request.nextUrl.searchParams.get('product_id')
        if (!productId) {
            return NextResponse.json({ error: 'product_id wajib' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data: list, error } = await supabaseAdmin
            .from('account_stock')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ list: list ?? [] })
    } catch (err) {
        console.error('Admin products/accounts GET error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}

/** POST: tambah akun ke account_stock (pakai service role, hindari AbortError di client). */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { product_id, email, password } = body

        if (!product_id || typeof product_id !== 'string' || !email?.trim() || !password?.trim()) {
            return NextResponse.json(
                { error: 'product_id, email, dan password wajib' },
                { status: 400 }
            )
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { error } = await supabaseAdmin.from('account_stock').insert({
            product_id,
            email: String(email).trim(),
            password: String(password).trim(),
        })

        if (error) {
            console.error('Admin accounts insert error:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        const { data: list } = await supabaseAdmin
            .from('account_stock')
            .select('*')
            .eq('product_id', product_id)
            .order('created_at', { ascending: false })

        return NextResponse.json({ list: list ?? [] })
    } catch (err) {
        console.error('Admin products/accounts API error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
        return { ok: false as const, error: 'Unauthorized', status: 401 }
    }
    return { ok: true as const, supabase }
}

/** PATCH: edit akun (email/password). Hanya akun yang belum terjual. */
export async function PATCH(request: NextRequest) {
    try {
        const auth = await requireAdmin()
        if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

        const body = await request.json()
        const { account_id, product_id, email, password } = body

        if (!account_id || typeof account_id !== 'string') {
            return NextResponse.json({ error: 'account_id wajib' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data: row } = await supabaseAdmin
            .from('account_stock')
            .select('id, product_id, is_sold')
            .eq('id', account_id)
            .single()

        if (!row) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
        if (row.is_sold) return NextResponse.json({ error: 'Akun sudah terjual, tidak bisa diedit' }, { status: 400 })

        const updates: { email?: string; password?: string } = {}
        if (typeof email === 'string' && email.trim()) updates.email = email.trim()
        if (typeof password === 'string' && password.trim()) updates.password = password.trim()
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Berikan email atau password baru' }, { status: 400 })
        }

        const { error } = await supabaseAdmin.from('account_stock').update(updates).eq('id', account_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        const pid = product_id || row?.product_id
        if (pid) {
            const { data: list } = await supabaseAdmin.from('account_stock').select('*').eq('product_id', pid).order('created_at', { ascending: false })
            return NextResponse.json({ list: list ?? [] })
        }
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Admin accounts PATCH error:', err)
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
    }
}

/** DELETE: hapus akun dari stok. Hanya akun yang belum terjual. */
export async function DELETE(request: NextRequest) {
    try {
        const auth = await requireAdmin()
        if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

        const accountId = request.nextUrl.searchParams.get('account_id')
        const productId = request.nextUrl.searchParams.get('product_id')

        if (!accountId) {
            return NextResponse.json({ error: 'account_id wajib' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data: row } = await supabaseAdmin
            .from('account_stock')
            .select('id, product_id, is_sold')
            .eq('id', accountId)
            .single()

        if (!row) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
        if (row.is_sold) return NextResponse.json({ error: 'Akun sudah terjual, tidak bisa dihapus' }, { status: 400 })

        const { error } = await supabaseAdmin.from('account_stock').delete().eq('id', accountId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const pid = productId || row.product_id as string
        const { data: list } = await supabaseAdmin
            .from('account_stock')
            .select('*')
            .eq('product_id', pid)
            .order('created_at', { ascending: false })

        return NextResponse.json({ list: list ?? [] })
    } catch (err) {
        console.error('Admin accounts DELETE error:', err)
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
    }
}
