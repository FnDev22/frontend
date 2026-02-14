import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mail'

export async function POST(request: NextRequest) {
    try {
        const { email, time, userAgent } = await request.json()
        const adminEmail = process.env.ADMIN_EMAIL || 'ae132118@gmail.com'

        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

        await sendEmail({
            to: adminEmail,
            subject: `[Login Alert] User Login: ${email}`,
            html: `
                <h3>User Login Notification</h3>
                <p><strong>User:</strong> ${email}</p>
                <p><strong>Time:</strong> ${time || new Date().toLocaleString()}</p>
                <p><strong>User Agent:</strong> ${userAgent || 'Unknown'}</p>
            `
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Login Notify Error:', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
