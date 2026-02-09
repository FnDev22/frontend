import { createClient } from '@/lib/supabase-server'
import OrdersClient from './OrdersClient'

export const revalidate = 0

export default async function AdminOrdersPage() {
    const supabase = await createClient()

    const { data: orders } = await supabase
        .from('orders')
        .select('*, product:products(*)')
        .order('created_at', { ascending: false })

    return <OrdersClient initialOrders={orders || []} />
}
