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

        const body = await request.json()
        const {
            title,
            description,
            price,
            category,
            image_url,
            min_buy,
            avg_delivery_time,
            instructions,
            wholesale_prices,
            is_preorder,
        } = body

        if (!title || typeof title !== 'string' || !title.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }
        const priceNum = Number(price)
        if (Number.isNaN(priceNum) || priceNum < 0) {
            return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const productData = {
            title: String(title).trim(),
            description: description != null ? String(description).trim() : '',
            price: priceNum,
            category: category != null ? String(category).trim() : '',
            image_url: image_url != null ? String(image_url).trim() : '',
            min_buy: min_buy != null ? Number(min_buy) : 1,
            avg_delivery_time: avg_delivery_time != null ? String(avg_delivery_time).trim() : '',
            instructions: instructions != null ? String(instructions).trim() : '',
            wholesale_prices: Array.isArray(wholesale_prices) ? wholesale_prices : [],
            is_preorder: typeof is_preorder === 'boolean' ? is_preorder : false,
            is_sold: false,
            is_deleted: false,
        }

        const { data: inserted, error } = await supabaseAdmin
            .from('products')
            .insert(productData)
            .select('id, title, description, price, category, image_url, min_buy, avg_delivery_time, instructions, wholesale_prices, is_preorder, is_deleted, created_at, is_sold')
            .single()

        if (error) {
            console.error('Admin products insert error:', error)
            return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
        }

        // Broadcast email to all users
        const emailHtml = `
            <h2>Produk Baru Tersedia: ${inserted.title}</h2>
            <p>Halo,</p>
            <p>Kami baru saja menambahkan produk baru yang mungkin Anda sukai:</p>
            <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; margin: 10px 0;">
                <img src="${inserted.image_url}" alt="${inserted.title}" style="max-width: 100%; height: auto; max-height: 200px; object-fit: cover;" />
                <h3>${inserted.title}</h3>
                <p>Harga: Rp ${inserted.price.toLocaleString('id-ID')}</p>
                <p>${inserted.description}</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/products/${inserted.id}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Lihat Produk</a>
            </div>
            <p>Stok terbatas, segera order sebelum kehabisan!</p>
            <p>Salam,<br/>Tim F-PEDIA</p>
        `
        // MUST await on Vercel or the function will be killed before email is sent
        try {
            const { broadcastEmail } = await import('@/lib/mail')
            await broadcastEmail(`Produk Baru: ${inserted.title}`, emailHtml)
        } catch (emailError) {
            console.error('Failed to broadcast email:', emailError)
        }

        return NextResponse.json({
            ...inserted,
            available_stock: 0,
            sold_count: 0,
        })
    } catch (err) {
        console.error('Admin products API error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...rest } = body
        if (!id) {
            return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { error } = await supabaseAdmin
            .from('products')
            .update(rest)
            .eq('id', id)

        if (error) {
            console.error('Admin products update error:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Admin products PATCH error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        )
    }
}
