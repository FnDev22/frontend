import { createClient } from '@/lib/supabase-server'
import LogsClient from './LogsClient'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function AdminLogsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || (user.email !== 'ae132118@gmail.com' && user.user_metadata?.role !== 'admin')) {
        redirect('/')
    }

    // Fetch logs (requires policy setup or service role if policy restricts)
    // Using standard client here, assuming policy allows admin (which we added in SQL)
    const { data: logs, error } = await supabase
        .from('login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) {
        console.error('Fetch logs error:', error)
    }

    return <LogsClient logs={logs || []} />
}
