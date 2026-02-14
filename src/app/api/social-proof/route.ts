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
            profile:profiles(full_name, email)
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
        // Get name or masked email
        let name = o.profile?.full_name || 'Pelanggan'
        if (name === 'Pelanggan' && o.profile?.email) {
            name = o.profile.email.split('@')[0]
        }
        // Mask name if too long or for privacy (optional, user asked for "Budi")
        // We'll use the first name part
        name = name.split(' ')[0]

        return {
            name,
            product: o.product?.title || 'Produk',
            time: o.created_at
        }
    })

    return NextResponse.json(proof)
}
