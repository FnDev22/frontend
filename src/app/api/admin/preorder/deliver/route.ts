import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ae132118@gmail.com'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { order_id, accounts } = await request.json()

        if (!order_id || !Array.isArray(accounts) || accounts.length === 0) {
            return NextResponse.json({ error: 'order_id dan accounts diperlukan' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        // Get order details
        const { data: order, error: orderErr } = await supabaseAdmin
            .from('orders')
            .select('id, product_id, buyer_email, buyer_whatsapp, quantity, user_id, product:products(title)')
            .eq('id', order_id)
            .maybeSingle()

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
        }

        // Insert accounts into account_stock and mark as sold
        const accountRows = accounts.map((acc: { email: string, password: string }) => ({
            product_id: order.product_id,
            email: acc.email,
            password: acc.password,
            is_sold: true,
            sold_at: new Date().toISOString(),
        }))

        const { data: insertedAccounts, error: insertErr } = await supabaseAdmin
            .from('account_stock')
            .insert(accountRows)
            .select('id')

        if (insertErr) {
            console.error('Insert accounts error:', insertErr)
            return NextResponse.json({ error: 'Gagal menyimpan akun: ' + insertErr.message }, { status: 500 })
        }

        // Link accounts to order via order_accounts
        if (insertedAccounts && insertedAccounts.length > 0) {
            const orderAccountRows = insertedAccounts.map(acc => ({
                order_id: order_id,
                account_stock_id: acc.id,
            }))

            const { error: linkErr } = await supabaseAdmin
                .from('order_accounts')
                .insert(orderAccountRows)

            if (linkErr) {
                console.error('Link order_accounts error:', linkErr)
            }
        }

        // Send WhatsApp notification to buyer
        const productTitle = (order.product as any)?.title || 'Produk'
        const accountDetails = accounts
            .map((acc: { email: string, password: string }, i: number) => `${i + 1}. Email: ${acc.email} | Password: ${acc.password}`)
            .join('\n')

        const waMessage = `🎉 *Pesanan Pre-Order Anda Telah Dikirim!*\n\nProduk: *${productTitle}*\nJumlah: ${accounts.length} akun\n\n📋 *Detail Akun:*\n${accountDetails}\n\n⚠️ Segera ganti password setelah login.\nTerima kasih telah berbelanja di F-PEDIA!`

        // Try to send WhatsApp notification (non-blocking)
        try {
            const waUrl = process.env.WHATSAPP_SERVICE_URL
            if (waUrl && order.buyer_whatsapp) {
                fetch(`${waUrl}/send-message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        number: order.buyer_whatsapp,
                        message: waMessage,
                    }),
                }).catch(() => { /* silent */ })
            }
        } catch { /* silent */ }

        // Also send email notification
        try {
            const { sendEmail } = await import('@/lib/mail')
            const emailHtml = `
                <h2>Pesanan Pre-Order Anda Telah Dikirim!</h2>
                <p>Produk: <strong>${productTitle}</strong></p>
                <p>Jumlah: ${accounts.length} akun</p>
                <h3>Detail Akun:</h3>
                <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
                    <tr><th>No</th><th>Email</th><th>Password</th></tr>
                    ${accounts.map((acc: { email: string, password: string }, i: number) =>
                `<tr><td>${i + 1}</td><td>${acc.email}</td><td>${acc.password}</td></tr>`
            ).join('')}
                </table>
                <p>⚠️ Segera ganti password setelah login.</p>
                <p>Terima kasih telah berbelanja di F-PEDIA!</p>
            `
            await sendEmail({ to: order.buyer_email, subject: `Pre-Order Dikirim: ${productTitle}`, html: emailHtml })
        } catch (emailErr) {
            console.error('Email notification error:', emailErr)
        }

        return NextResponse.json({ ok: true, count: accounts.length })
    } catch (err) {
        console.error('Preorder deliver error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}
