
import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase-admin'

export const revalidate = 0

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
        return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
    }

    // Security: Rate Limit to prevent Inventory Scraping
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const { checkRateLimit } = await import('@/lib/rate-limit')
    const rateLimit = await checkRateLimit(`stock:${ip}:${ua}`, 20, 60) // 20 requests per minute

    if (!rateLimit.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    try {
        const { count, error } = await adminSupabase
            .from('account_stock')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', productId)
            .eq('is_sold', false)

        if (error) {
            console.error('Stock API error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ count: count || 0 })
    } catch (error: any) {
        console.error('Stock API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
