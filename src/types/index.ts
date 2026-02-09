export type Profile = {
    id: string
    email: string
    full_name: string
    whatsapp_number: string
    role: 'user' | 'admin'
    avatar_url: string
    created_at: string
}

export type Product = {
    id: string
    title: string
    description: string
    price: number
    account_credentials?: string
    is_sold: boolean
    category: string
    image_url: string
    created_at: string
    min_buy: number
    avg_delivery_time: string
    instructions: string
    available_stock?: number
    sold_count?: number
}

export type Order = {
    id: string
    user_id: string
    product_id: string
    payment_status: 'pending' | 'paid' | 'failed'
    payment_method: string
    transaction_id: string
    buyer_whatsapp: string
    buyer_email: string
    created_at: string
    note: string
    quantity?: number
    product?: Product
}

export type AccountStock = {
    id: string
    product_id: string
    email: string
    password: string
    is_sold: boolean
    sold_at: string | null
    created_at: string
}

export type OrderAccount = {
    id: string
    order_id: string
    account_stock_id: string
    created_at: string
    account_stock?: AccountStock
}

export type Review = {
    id: string
    user_id: string
    product_id: string
    rating: number
    comment: string
    created_at: string
    user?: Profile
}
