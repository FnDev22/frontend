import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/** POST: Notify admin when user logs in. Dipanggil dari client setelah auth berhasil. */
export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminNumber = '6285814581266'
    const msg = `*User login F-PEDIA*\n\nEmail: ${user.email || '-'}\nWaktu: ${new Date().toLocaleString('id-ID')}`

    try {
        const url = process.env.WHATSAPP_API_URL || 'http://localhost:3001'
        const secret = process.env.WHATSAPP_API_SECRET || process.env.WHATSAPP_API_KEY
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (secret) headers['X-Api-Key'] = secret
        await fetch(`${url}/send-notification`, { method: 'POST', headers, body: JSON.stringify({ target: adminNumber, message: msg }) })
    } catch (e) {
        console.error('Notify login WA error:', e)
    }

    return NextResponse.json({ ok: true })
}
