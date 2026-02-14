import { adminSupabase } from '@/lib/supabase-admin'
import ProductsClient from './ProductsClient'

export const revalidate = 0

export default async function AdminProductsPage() {
    const { data: products, error } = await adminSupabase
        .from('products')
        .select(`
            *,
            account_stock(count)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Admin products query error:', error)
    }

    const list = (products || []) as Array<Record<string, unknown>>
    const normalized = list.map((p) => ({
        ...p,
        min_buy: p.min_buy ?? 1,
        is_sold: p.is_sold ?? false,
        category: p.category ?? '',
        image_url: p.image_url ?? '',
        avg_delivery_time: p.avg_delivery_time ?? '',
        instructions: p.instructions ?? '',
        description: p.description ?? '',
    }))
    return <ProductsClient initialProducts={normalized as any} />
}

