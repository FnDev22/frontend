import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/mail'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()

        // 1. Get pending orders created > 1 hour ago (and not yet reminded?)
        // For simplicity, we just check pending orders. To avoid spam, we should probably check a flag.
        // But since we don't have a flag yet, let's just pick those within a time window, e.g., 1-2 hours ago.

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, product:products(title)')
            .eq('payment_status', 'pending')
            .lt('created_at', oneHourAgo)
            .gt('created_at', twoHoursAgo)

        if (error) throw error

        if (!orders || orders.length === 0) {
            return NextResponse.json({ message: 'No pending orders to remind' })
        }

        const results = []

        for (const order of orders) {
            if (!order.buyer_email) continue

            // Send Email
            await sendEmail({
                to: order.buyer_email,
                subject: `[Reminder] Menunggu Pembayaran - ${order.product?.title}`,
                html: `
                    <h3>Halo, pesanan Anda menunggu pembayaran.</h3>
                    <p>Produk: <strong>${order.product?.title}</strong></p>
                    <p>Total: Rp ${Number(order.total_price).toLocaleString('id-ID')}</p>
                    <p>Silakan selesaikan pembayaran agar pesanan segera diproses.</p>
                    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/checkout?order_id=${order.transaction_id}">Bayar Sekarang</a></p>
                    <p>Jika sudah membayar, abaikan email ini.</p>
                `
            })
            results.push(order.id)
        }

        return NextResponse.json({ success: true, reminded_count: results.length, orders: results })

    } catch (error: any) {
        console.error('Cron Payment Reminder Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
