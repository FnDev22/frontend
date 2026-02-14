import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const ip = request.headers.get('x-forwarded-for') || 'Unknown IP'
        const userAgent = request.headers.get('user-agent') || 'Unknown Device'

        // Parse user agent
        const parser = new UAParser(userAgent)
        const device = parser.getDevice()
        const os = parser.getOS()
        const browser = parser.getBrowser()
        const deviceInfo = `${browser.name} on ${os.name} (${device.type || 'Desktop'})`

        // Insert log
        // Note: You need to create 'login_logs' table first
        const { error } = await supabase
            .from('login_logs')
            .insert({
                user_id: user.id,
                email: user.email,
                role: user.user_metadata?.role || 'user',
                ip_address: ip,
                device_info: deviceInfo,
            })

        if (error) {
            console.error('Log insert error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Log API error:', err)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
