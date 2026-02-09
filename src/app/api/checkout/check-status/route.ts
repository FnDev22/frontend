import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { confirmOrderPaid } from '@/lib/order-confirm'
import { rejectBrowserGet } from '@/lib/api-protect'

/** GET ?order_id=INV-xxx — cek status ke Pakasir; jika completed, konfirmasi order dan return paid: true */
export async function GET(request: NextRequest) {
    const rejected = rejectBrowserGet(request)
    if (rejected) return rejected

    const orderId = request.nextUrl.searchParams.get('order_id')
    if (!orderId?.trim()) {
        return NextResponse.json({ error: 'order_id required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, payment_status, quantity, product:products(price)')
        .eq('transaction_id', orderId.trim())
        .single()

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
        return NextResponse.json({ paid: true })
    }

    const slug = process.env.PAKASIR_PROJECT_SLUG
    const apiKey = process.env.PAKASIR_API_KEY
    const product = order.product as { price?: number } | null
    const price = product?.price ?? 0
    const quantity = order.quantity ?? 1
    const amount = price * quantity

    if (!slug || !apiKey) {
        return NextResponse.json({ paid: false, error: 'Payment gateway not configured' }, { status: 200 })
    }

    try {
        const url = `https://app.pakasir.com/api/transactiondetail?project=${encodeURIComponent(slug)}&amount=${amount}&order_id=${encodeURIComponent(orderId.trim())}&api_key=${encodeURIComponent(apiKey)}`
        const res = await fetch(url)
        const data = await res.json().catch(() => ({}))
        const status = data?.transaction?.status

        if (status === 'completed') {
            const result = await confirmOrderPaid(supabaseAdmin, order.id)
            if (!result.ok) {
                return NextResponse.json({ paid: false, error: result.error }, { status: 200 })
            }
            return NextResponse.json({ paid: true })
        }
    } catch (e) {
        console.error('Check status Pakasir error', e)
    }

    return NextResponse.json({ paid: false })
}
