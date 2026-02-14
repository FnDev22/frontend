import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
})

export type EmailPayload = {
    to: string
    subject: string
    html: string
}

export const sendEmail = async (data: EmailPayload) => {
    const mailOptions = {
        from: `F-PEDIA <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent: ' + info.response)
        return true
    } catch (error) {
        console.error('Error sending email:', error)
        return false
    }
}

import { createClient } from '@supabase/supabase-js'

export const broadcastEmail = async (subject: string, htmlContent: string) => {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Fetch all profiles to get emails
        // Note: Ideally use auth.users via admin API to get ALL emails, 
        // but profiles is likely what we want for active users.
        const { data: users, error } = await supabase
            .from('profiles')
            .select('email')
            .not('email', 'is', null)

        if (error) {
            console.error('Broadcast fetch users error:', error)
            return false
        }

        if (!users || users.length === 0) return true

        const emails = users.map(u => u.email).filter(e => e)

        // Use BCC to send bulk or iterate. Nodemailer supports array in 'bcc'.
        // To avoid exposing emails to everyone, use BCC.
        const mailOptions = {
            from: `F-PEDIA <${process.env.EMAIL_USER}>`,
            bcc: emails,
            subject: subject,
            html: htmlContent,
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('Broadcast sent:', info.messageId)
        return true

    } catch (error) {
        console.error('Broadcast error:', error)
        return false
    }
}
