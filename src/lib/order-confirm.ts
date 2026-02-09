import type { SupabaseClient } from '@supabase/supabase-js'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue'

/** 08xxx / +62 -> 62xxx untuk WA */
function normalizePhone(input: string | null | undefined): string | null {
    if (input == null || typeof input !== 'string') return null
    const s = input.trim().replace(/\s/g, '').replace(/\D/g, '')
    if (s.length < 10 || s.length > 15) return null
    if (s.startsWith('0')) return '62' + s.slice(1)
    if (!s.startsWith('62')) return '62' + s
    return s
}

/** Set order to paid, allocate accounts, send WhatsApp. orderId = orders.id (UUID). */
export async function confirmOrderPaid(
    supabaseAdmin: SupabaseClient,
    orderId: string
): Promise<{ ok: boolean; error?: string }> {
    const { data: order, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId)
        .select('*, product:products(title, instructions), user:profiles(full_name, email, whatsapp_number)')
        .single()

    const orderWithPromo = order as { promo_text?: string } | null

    if (updateError) {
        return { ok: false, error: updateError.message }
    }
    if (!order) {
        return { ok: false, error: 'Order not found' }
    }

    const quantity = order.quantity ?? 1
    const { data: allocated, error: rpcError } = await supabaseAdmin.rpc('allocate_accounts_to_order', {
        p_order_id: orderId,
        p_product_id: order.product_id,
        p_quantity: quantity,
    })

    if (rpcError || !allocated) {
        console.error('allocate_accounts_to_order failed', rpcError)
        return { ok: false, error: 'Failed to allocate accounts. Check stock.' }
    }

    const { data: orderAccounts } = await supabaseAdmin
        .from('order_accounts')
        .select('account_stock_id(email, password)')
        .eq('order_id', orderId)

    const accountsList = (orderAccounts || [])
        .map((oa: { account_stock_id: { email: string; password: string } | { email: string; password: string }[] | null }, i: number) => {
            const raw = oa.account_stock_id
            const a = Array.isArray(raw) ? raw[0] : raw
            if (!a) return null
            return `${i + 1}. Email: ${a.email}\n   Password: ${a.password}`
        })
        .filter(Boolean)
        .join('\n\n')

    const buyerWa = normalizePhone(order.buyer_whatsapp)
    if (buyerWa) {
        let message = `*Terima kasih telah order di F-PEDIA!*\n\n`
        message += `Halo ${order.buyer_email || 'Pelanggan'},\n\n`
        message += `Pembayaran Anda untuk pesanan *${order.product?.title}* (Order ID: ${order.transaction_id}) telah berhasil.\n\n`
        message += `*Detail Akun (${quantity}):*\n${accountsList || 'Menunggu pengiriman.'}\n\n`
        if (order.product?.instructions) {
            message += `*Cara Penggunaan:*\n${order.product.instructions}\n\n`
        }
        if (orderWithPromo?.promo_text) {
            message += `*Promo:* ${orderWithPromo.promo_text}\n\n`
        }
        message += `Terima kasih telah mempercayakan F-PEDIA.`

        await enqueueWhatsAppMessage(supabaseAdmin, buyerWa, message)
    }

    return { ok: true }
}
