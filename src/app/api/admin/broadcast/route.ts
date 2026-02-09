import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'ae132118@gmail.com'
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
    try {
        // Verify admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { message } = body

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        // Get all unique phone numbers from orders
        const { data: orders, error } = await supabase
            .from('orders')
            .select('buyer_whatsapp')
            .not('buyer_whatsapp', 'is', null)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Deduplicate phone numbers
        const uniquePhones = Array.from(
            new Set(
                orders
                    .map((order: any) => order.buyer_whatsapp)
                    .filter((phone: string) => phone && phone.trim())
            )
        )

        if (uniquePhones.length === 0) {
            return NextResponse.json({ 
                message: 'No phone numbers found to broadcast',
                sent: 0
            }, { status: 200 })
        }

        // Send message via WhatsApp service
        const failedPhones: string[] = []
        let successCount = 0

        for (const phone of uniquePhones) {
            try {
                const response = await fetch(`${WHATSAPP_SERVICE_URL}/send-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: String(phone).trim(),
                        message: String(message).trim(),
                    }),
                })

                if (response.ok) {
                    successCount++
                } else {
                    failedPhones.push(phone)
                }
            } catch (err) {
                failedPhones.push(phone)
            }
        }

        return NextResponse.json({
            message: 'Broadcast completed',
            total: uniquePhones.length,
            sent: successCount,
            failed: failedPhones.length,
            failedPhones: failedPhones.length > 0 ? failedPhones : undefined,
        }, { status: 200 })

    } catch (error) {
        console.error('Broadcast error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
