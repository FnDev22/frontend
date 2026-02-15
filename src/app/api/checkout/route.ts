import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue'
import { revalidatePath } from 'next/cache'

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
    console.log('[Checkout] API Route called')

    // 1. Log Request Payload
    let body
    try {
        body = await request.json()
        console.log('[Checkout] Payload received:', JSON.stringify(body))
    } catch (e) {
        console.error('[Checkout] Failed to parse JSON body:', e)
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { productId, fullName, email, whatsapp, note, promo_code: promoCode, quantity: qty = 1 } = body
    const quantity = Math.max(1, parseInt(String(qty), 10) || 1)

    // 2. Verify Environment Variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('[Checkout] Env Check:', {
        NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL
    })

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[Checkout] Critical Env Vars missing!')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // 3. Fetch Product
    const { data: product, error: productError } = await adminSupabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

    if (productError || !product) {
        console.error('[Checkout] Product fetch error:', productError)
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    console.log('[Checkout] Product found:', product.title)

    const minBuy = product.min_buy ?? 1
    if (quantity < minBuy) {
        return NextResponse.json({ error: `Minimum pembelian ${minBuy} unit` }, { status: 400 })
    }

    const { data: availableStock, error: stockError } = await adminSupabase.rpc('get_available_stock', { product_uuid: productId })
    if (stockError) console.error('[Checkout] Stock RPC error:', stockError)

    const available = typeof availableStock === 'number' ? availableStock : 0
    console.log('[Checkout] Stock available:', available, 'Requested:', quantity)

    if (available < quantity) {
        return NextResponse.json({ error: `Stok tidak cukup. Tersedia: ${available} unit` }, { status: 400 })
    }

    const orderId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const rawSubtotal = Number(product.price) * quantity

    // Apply promo discount (Server-Side Validation)
    let discount = 0
    let promoText = null

    if (promoCode && typeof promoCode === 'string') {
        const { data: promo, error: promoError } = await adminSupabase
            .from('promos')
            .select('*')
            .eq('code', promoCode.toUpperCase())
            .eq('is_active', true)
            .maybeSingle()

        const now = new Date().toISOString()

        if (promo && !promoError) {
            // Validate Date
            const isValidDate = (!promo.valid_from || now >= promo.valid_from) &&
                (!promo.valid_until || now <= promo.valid_until)

            if (isValidDate) {
                if (promo.discount_percent > 0) {
                    discount = Math.round(rawSubtotal * promo.discount_percent / 100)
                    promoText = `Diskon ${promo.discount_percent}% (Kode: ${promoCode})`
                } else if (promo.discount_value > 0) {
                    discount = Math.min(promo.discount_value, rawSubtotal)
                    promoText = `Diskon Rp ${promo.discount_value.toLocaleString('id-ID')} (Kode: ${promoCode})`
                }
            }
        }
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
            console.log('[Checkout] Requesting QRIS from Pakasir...')
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
            console.log('[Checkout] Pakasir response:', data)

            if (data?.payment?.payment_number) {
                qrString = data.payment.payment_number
                fee = Number(data.payment.fee) || 0
                totalPayment = Number(data.payment.total_payment) ?? subtotal + fee
            } else {
                console.warn('[Checkout] Pakasir did not return payment_number', data)
            }
        } catch (e) {
            console.error("[Checkout] Pakasir API Error", e)
        }
    } else {
        console.warn("[Checkout] Pakasir credentials missing, using placeholder QR code")
    }

    // Create Order in Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    console.log('[Checkout] Inserting order into DB:', orderId)
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
            payment_url: qrString, // Save QR string
            expires_at: expiresAt,
        })

    if (insertError) {
        console.error('[Checkout] Order insertion failed:', insertError)
        return NextResponse.json({ error: 'Failed to create order', details: insertError.message }, { status: 500 })
    }
    console.log('[Checkout] Order inserted successfully')

    // Refresh product page to update stock immediately
    revalidatePath(`/product/${productId}`)

    const promoTextStr = typeof promoText === 'string' ? promoText.trim() : ''
    const productTitle = product.title || 'Produk'

    // Batas waktu bayar string
    const payBefore = new Date(expiresAt)
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

    // Email Notification to Admin (Styled)
    try {
        console.log('[Checkout] Sending admin email...')
        const { sendEmail } = await import('@/lib/mail')
        const adminEmail = process.env.ADMIN_EMAIL || 'ae132118@gmail.com'

        // Base email template function
        const emailTemplate = (content: string) => `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #000; padding: 20px; text-align: center;">
                    <img src="https://f-pedia.my.id/logo.png" alt="F-PEDIA Logo" style="height: 40px; object-fit: contain;">
                </div>
                <div style="padding: 24px;">
                    ${content}
                </div>
                <div style="background-color: #f9f9f9; padding: 16px; text-align: center; font-size: 12px; color: #888;">
                    &copy; ${new Date().getFullYear()} F-PEDIA. All rights reserved.
                </div>
            </div>
        `

        await sendEmail({
            to: adminEmail,
            subject: `[New Order] ${orderId} - ${productTitle}`,
            html: emailTemplate(`
                <h2 style="color: #000; margin-top: 0;">Order Baru Masuk</h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Order ID</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${orderId}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Produk</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${productTitle}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Jumlah</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${quantity} unit</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Total</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #d32f2f; font-weight: bold;">Rp ${totalPayment.toLocaleString('id-ID')}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Customer</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${email}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>WhatsApp</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${whatsapp}</td></tr>
                </table>
                <p style="margin-bottom: 0;">Status: <strong>Pending Payment</strong></p>
            `)
        })
        console.log('[Checkout] Admin email sent')
    } catch (err) {
        console.error('[Checkout] Failed to send admin email', err)
    }

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
