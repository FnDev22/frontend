import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { confirmOrderPaid } from '@/lib/order-confirm'

export async function POST(request: Request) {
    const { orderId, status } = await request.json()

    const supabase = await createClient()

    // Verify Admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || session.user.email !== 'ae132118@gmail.com') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: status })
        .eq('id', orderId)
        .select('id')
        .single()

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (status === 'paid' && order) {
        const result = await confirmOrderPaid(supabaseAdmin, orderId)
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }
    }

    return NextResponse.json({ success: true })
}
