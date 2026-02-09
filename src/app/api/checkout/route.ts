import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue'

/** Normalisasi nomor WA: 08xxx / +62xxx -> 62xxx (tanpa @s.whatsapp.net) untuk dikirim ke whatsapp-service */
function normalizePhoneForWhatsApp(input: string | null | undefined): string | null {
    if (input == null || typeof input !== 'string') return null
    let s = input.trim().replace(/\s/g, '').replace(/\D/g, '')
    if (s.length < 10 || s.length > 15) return null
    if (s.startsWith('0')) s = '62' + s.slice(1)
    else if (!s.startsWith('62')) s = '62' + s
    return s
}

/** GET/PUT/DELETE etc.: Method Not Allowed — endpoint ini hanya POST */
export async function GET(_request: NextRequest) {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'POST' } })
}

export async function POST(request: Request) {
    const { productId, fullName, email, whatsapp, note, promo_text: promoText, promo_discount_percent: discountPercent = 0, promo_discount_value: discountValue = 0, quantity: qty = 1 } = await request.json()
    const quantity = Math.max(1, parseInt(String(qty), 10) || 1)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    const { data: product } = await adminSupabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const minBuy = product.min_buy ?? 1
    if (quantity < minBuy) {
        return NextResponse.json({ error: `Minimum pembelian ${minBuy} unit` }, { status: 400 })
    }

    const { data: availableStock } = await adminSupabase.rpc('get_available_stock', { product_uuid: productId })
    const available = typeof availableStock === 'number' ? availableStock : 0
    if (available < quantity) {
        return NextResponse.json({ error: `Stok tidak cukup. Tersedia: ${available} unit` }, { status: 400 })
    }

    const orderId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const rawSubtotal = Number(product.price) * quantity

    // Apply promo discount
    let discount = 0
    if (discountPercent > 0) {
        discount = Math.round(rawSubtotal * discountPercent / 100)
    } else if (discountValue > 0) {
        discount = Math.min(discountValue, rawSubtotal) // Don't exceed subtotal
    }
    const subtotal = Math.max(0, rawSubtotal - discount)

    // Pakasir: biaya pembayaran ditanggung pembeli; response berisi fee & total_payment
    const pakasirSlug = process.env.PAKASIR_PROJECT_SLUG
    const pakasirApiKey = process.env.PAKASIR_API_KEY

    let qrString = "00020101021226590013ID.CO.QRIS.WWW01189360091800216005230208216005230303UME51440014ID.CO.QRIS.WWW0215ID10243228429300303UME5204792953033605409100003.005802ID5907Pakasir6012KAB. KEBUMEN61055439262230519SP25RZRATEQI2HQ65Q46304A079" // Dummy QR fallback
    let fee = 0
    let totalPayment = subtotal

    if (pakasirSlug && pakasirApiKey) {
        try {
            const res = await fetch(`https://app.pakasir.com/api/transactioncreate/qris`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: pakasirSlug,
                    order_id: orderId,
                    amount: subtotal,
                    api_key: pakasirApiKey,
                }),
            })
            const data = await res.json()
            if (data?.payment?.payment_number) {
                qrString = data.payment.payment_number
                fee = Number(data.payment.fee) || 0
                totalPayment = Number(data.payment.total_payment) ?? subtotal + fee
            }
        } catch (e) {
            console.error("Pakasir API Error", e)
        }
    } else {
        console.warn("Pakasir credentials missing, using placeholder QR code")
    }

    // Create Order in Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await adminSupabase
        .from('orders')
        .insert({
            user_id: user?.id || null,
            product_id: productId,
            payment_status: 'pending',
            payment_method: 'qris',
            transaction_id: orderId,
            buyer_whatsapp: whatsapp,
            buyer_email: email,
            note: note || null,
            promo_text: typeof promoText === 'string' ? promoText.trim() || null : null,
            quantity,
            total_price: totalPayment,
        })

    if (insertError) {
        console.error(insertError)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const promoTextStr = typeof promoText === 'string' ? promoText.trim() : ''
    const productTitle = product.title || 'Produk'

    // Batas waktu bayar: 24 jam dari sekarang
    const payBefore = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const payBeforeStr = payBefore.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

    const whatsappServiceUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3001'
    const apiSecret = process.env.WHATSAPP_API_SECRET || process.env.WHATSAPP_API_KEY

    const sendWhatsApp = async (target: string, msg: string, label: string) => {
        try {
            console.log('[Checkout] Enqueue WA ke', label, '→', target.slice(0, 4) + '***' + target.slice(-3))
            await enqueueWhatsAppMessage(adminSupabase, target, msg)
        } catch (e) {
            console.error('[Checkout] WA enqueue error ke', label, e)
        }
    }

    const adminNumberRaw = process.env.ADMIN_WHATSAPP_NUMBER || '6285814581266'
    const adminNumber = normalizePhoneForWhatsApp(adminNumberRaw) || adminNumberRaw.replace(/\D/g, '').replace(/^0/, '62') || '6285814581266'
    const adminMsg = `*Order Baru F-PEDIA*\n\nProduk: ${productTitle}\nJumlah: ${quantity}\nTotal: Rp ${totalPayment.toLocaleString('id-ID')}\nPemesan: ${email}\nWA: ${whatsapp}\nOrder ID: ${orderId}`
    await sendWhatsApp(adminNumber, adminMsg, 'admin')

    const userWhatsappNormalized = typeof whatsapp === 'string' && whatsapp.trim() ? normalizePhoneForWhatsApp(whatsapp.trim()) : null
    const userMsgOrder = `*Kamu telah order di F-PEDIA*\n\nHalo,\n\nPesanan Anda:\n• Produk: *${productTitle}*\n• Jumlah: ${quantity} unit\n• Total pembayaran: Rp ${totalPayment.toLocaleString('id-ID')}\n• Order ID: ${orderId}\n\n${promoTextStr ? `*Promo:* ${promoTextStr}\n\n` : ''}Silakan scan QR untuk pembayaran.\n*Harap bayar sebelum: ${payBeforeStr}*\n\nSetelah terverifikasi, akun akan dikirim ke WhatsApp ini.\n\nTerima kasih!`
    if (userWhatsappNormalized) await sendWhatsApp(userWhatsappNormalized, userMsgOrder, 'user')

    return NextResponse.json({
        success: true,
        qr_string: qrString,
        amount: totalPayment,
        subtotal,
        fee,
        total_payment: totalPayment,
        order_id: orderId,
        transaction_id: orderId,
    })
}
