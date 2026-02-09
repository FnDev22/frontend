import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { rejectBrowserGet } from '@/lib/api-protect'

/** GET: List notifications untuk user (dengan info sudah dibaca atau belum) */
export async function GET(request: NextRequest) {
    const rejected = rejectBrowserGet(request)
    if (rejected) return rejected

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

    let readIds: string[] = []
    if (user?.id) {
        const { data: reads } = await supabase
            .from('notification_reads')
            .select('notification_id')
            .eq('user_id', user.id)
        readIds = (reads || []).map((r) => r.notification_id)
    }

    const withRead = (notifications || []).map((n) => ({
        ...n,
        is_read: readIds.includes(n.id),
    }))

    return NextResponse.json({ notifications: withRead, unread_count: withRead.filter((n) => !n.is_read).length })
}
