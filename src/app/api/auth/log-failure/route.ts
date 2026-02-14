import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mail'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        )

        // Insert into login_failures table (separate from login_logs which requires user_id)
        await supabaseAdmin.from('login_failures').insert({
            email: email || 'unknown',
            ip_address: ip,
            user_agent: userAgent,
        })

        // Check recent failures for this IP (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count } = await supabaseAdmin
            .from('login_failures')
            .select('*', { count: 'exact', head: true })
            .eq('ip_address', ip)
            .gt('created_at', fiveMinutesAgo)

        if (count && count >= 5) {
            const adminEmail = process.env.ADMIN_EMAIL || 'ae132118@gmail.com'
            await sendEmail({
                to: adminEmail,
                subject: `[SECURITY ALERT] ${count}x Failed Login from IP ${ip}`,
                html: `
                    <h3 style="color: red;">⚠️ Peringatan Keamanan</h3>
                    <p>Terdeteksi <strong>${count}</strong> percobaan login gagal dari IP <strong>${ip}</strong> dalam 5 menit terakhir.</p>
                    <p><strong>Email yang dicoba:</strong> ${email}</p>
                    <p><strong>User Agent:</strong> ${userAgent}</p>
                    <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
                    <hr />
                    <p>Harap periksa <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">Admin Dashboard</a> untuk detail lebih lanjut.</p>
                `
            }).catch(err => console.error('Failed to send alert email:', err))
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Log failure error:', error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
