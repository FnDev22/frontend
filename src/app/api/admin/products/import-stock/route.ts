import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
    try {
        const { productId, accounts } = await request.json()

        if (!productId || !Array.isArray(accounts) || accounts.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        const supabase = await createClient()

        // Encrypt passwords before storing
        const stockData = accounts.map((acc: any) => ({
            product_id: productId,
            email: encrypt(acc.email),
            password: encrypt(acc.password),
            is_sold: false,
            created_at: new Date().toISOString()
        }))

        const { data, error } = await supabase
            .from('account_stock')
            .insert(stockData)
            .select()

        if (error) {
            console.error('Import error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        revalidatePath(`/product/${productId}`)
        revalidatePath('/')
        revalidatePath('/products')

        return NextResponse.json({ success: true, count: data?.length || 0 })
    } catch (error: any) {
        console.error('Server import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
