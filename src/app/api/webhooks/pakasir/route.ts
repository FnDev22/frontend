import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { confirmOrderPaid } from '@/lib/order-confirm'

/** Body dari Pakasir (payment.md): amount, order_id, project, status, payment_method, completed_at */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { order_id: pakasirOrderId, status, amount } = body as {
            order_id?: string
            status?: string
            amount?: number
            project?: string
            payment_method?: string
            completed_at?: string
        }

        if (status !== 'completed' || !pakasirOrderId) {
            return NextResponse.json({ received: true }, { status: 200 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('id, payment_status, quantity, total_price')
            .eq('transaction_id', pakasirOrderId)
            .single()

        if (!order) {
            console.warn('Pakasir webhook: order not found for transaction_id', pakasirOrderId)
            return NextResponse.json({ received: true }, { status: 200 })
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ received: true, already_paid: true }, { status: 200 })
        }

        // Validate amount if present in webhook and database
        if (amount && order.total_price) {
            // Allow small difference for floating point or fee variations (optional tolerance)
            // But ideally should match exactly or within very small margin
            const dbTotal = Number(order.total_price)
            const webhookAmount = Number(amount)

            if (Math.abs(dbTotal - webhookAmount) > 100) { // Tolerance Rp 100
                console.error(`Pakasir webhook: amount mismatch. Webhook: ${webhookAmount}, DB: ${dbTotal}`)
                // Optional: reject processed status if amount mismatch
                // return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
                // For now, we just log and proceed, or you can choose to stop.
                // Let's be strict:
                return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
            }
        }

        const result = await confirmOrderPaid(supabaseAdmin, order.id)
        if (!result.ok) {
            console.error('Pakasir webhook: confirmOrderPaid failed', result.error)
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ received: true, confirmed: true }, { status: 200 })
    } catch (e) {
        console.error('Pakasir webhook error', e)
        return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
    }
}
