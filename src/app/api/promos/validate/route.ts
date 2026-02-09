import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json()
        if (!code) {
            return NextResponse.json({ error: 'Kode promo required' }, { status: 400 })
        }

        const admin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const now = new Date().toISOString()
        const { data: promo, error } = await admin
            .from('promos')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .maybeSingle()

        if (error) throw error
        if (!promo) {
            return NextResponse.json({ error: 'Kode promo tidak valid atau sudah tidak aktif' }, { status: 404 })
        }

        // Validity check
        if (promo.valid_from && now < promo.valid_from) {
            return NextResponse.json({ error: 'Promo belum dimulai' }, { status: 400 })
        }
        if (promo.valid_until && now > promo.valid_until) {
            return NextResponse.json({ error: 'Promo sudah berakhir' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            code: promo.code,
            discount_percent: promo.discount_percent || 0,
            discount_value: promo.discount_value || 0,
            title: promo.title
        })
    } catch (err) {
        console.error('Promo validation error:', err)
        return NextResponse.json({ error: 'Gagal validasi promo' }, { status: 500 })
    }
}
