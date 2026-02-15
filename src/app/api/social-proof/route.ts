import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
    const supabase = await createClient()

    // Fetch recent paid orders (last 7 days) — only real completed purchases
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            created_at,
            product:products(title),
            profile:profiles(full_name)
        `)
        .eq('payment_status', 'paid')
        .gt('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to be anonymous but realistic "Budi bought Netflix"
    const proof = orders.map((o: any) => {
        // Get name
        let name = o.profile?.full_name || 'Pelanggan'

        // Mask name: use first name only
        name = name.split(' ')[0]

        return {
            name,
            product: o.product?.title || 'Produk',
            time: o.created_at
        }
    })

    return NextResponse.json(proof)
}
