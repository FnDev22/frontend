import { createClient } from '@/lib/supabase-server'
import ProductsClient from './ProductsClient'

export const revalidate = 0

export default async function AdminProductsPage() {
    const supabase = await createClient()
    const { data: products } = await supabase.rpc('get_products_with_stock')
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
