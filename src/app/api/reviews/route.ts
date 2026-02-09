import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/** POST: Tambah ulasan. Hanya boleh jika user punya order lunas untuk produk ini. */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Silakan login' }, { status: 401 })
        }

        const body = await request.json()
        const productId = body?.product_id
        let rating = typeof body?.rating === 'number' ? body.rating : parseInt(body?.rating, 10)
        const comment = typeof body?.comment === 'string' ? body.comment.trim() : ''

        if (!productId || !rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'product_id dan rating (1-5) wajib' }, { status: 400 })
        }

        const { data: paidOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .eq('payment_status', 'paid')
            .limit(1)
            .maybeSingle()

        if (!paidOrder) {
            return NextResponse.json({ error: 'Anda hanya bisa memberi ulasan untuk produk yang sudah dibeli dan lunas' }, { status: 403 })
        }

        const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ error: 'Anda sudah memberi ulasan untuk produk ini' }, { status: 400 })
        }

        const { error } = await supabase.from('reviews').insert({
            user_id: session.user.id,
            product_id: productId,
            rating: Math.min(5, Math.max(1, rating)),
            comment: comment || null,
        })

        if (error) {
            console.error('Review insert error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('Reviews API error:', e)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
