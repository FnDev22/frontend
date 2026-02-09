import { createClient } from '@/lib/supabase-server'
import UsersClient from './UsersClient'

export const revalidate = 0

export default async function AdminUsersPage() {
    const supabase = await createClient()

    // Requires "Admin can view all profiles" policy
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    return <UsersClient initialUsers={users || []} />
}
