import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/** POST: Tandai notifikasi sebagai dibaca */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('notification_reads').upsert(
        { notification_id: id, user_id: user.id },
        { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
