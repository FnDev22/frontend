import { NextRequest, NextResponse } from 'next/server'

/**
 * Test WhatsApp Service Connection
 * GET /api/test-whatsapp
 * Returns health status of WhatsApp service
 */
export async function GET(request: NextRequest) {
    const whatsappServiceUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3001'

    try {
        const healthResponse = await fetch(`${whatsappServiceUrl}/health`, {
            method: 'GET',
        })

        const healthData = await healthResponse.json().catch(() => ({}))

        if (!healthResponse.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    status: healthResponse.status,
                    message: 'WhatsApp service returned error',
                    details: healthData,
                },
                { status: healthResponse.status }
            )
        }

        return NextResponse.json(
            {
                ok: true,
                message: 'WhatsApp service is healthy',
                whatsapp_service_url: whatsappServiceUrl,
                service_data: healthData,
                instructions: {
                    if_not_connected: [
                        '1. Make sure WhatsApp service is running: npm start (in whatsapp-service folder)',
                        '2. Check if device is paired: look for QR code in terminal',
                        '3. Use /instructions endpoint to see pairing instructions',
                        '4. If still not working, run: curl -X POST http://localhost:3001/force-reset -H "X-Api-Key: 134234eqweqasadadwq"',
                    ],
                },
            },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                message: 'Failed to connect to WhatsApp service',
                error: error instanceof Error ? error.message : 'Unknown error',
                whatsapp_service_url: whatsappServiceUrl,
                troubleshooting: [
                    'Check if WHATSAPP_API_URL environment variable is correct',
                    'Make sure WhatsApp service is running on the specified port',
                    'Check firewall/network connectivity',
                ],
            },
            { status: 503 }
        )
    }
}

/**
 * Send Test Message to WhatsApp
 * POST /api/test-whatsapp
 * Body: { target: "62812345678", message: "Test message" }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { target, message } = body

        if (!target || !message) {
            return NextResponse.json(
                { error: 'target and message are required' },
                { status: 400 }
            )
        }

        const whatsappServiceUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3001'
        const apiSecret = process.env.WHATSAPP_API_SECRET || process.env.WHATSAPP_API_KEY

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (apiSecret) {
            headers['X-Api-Key'] = apiSecret
        }

        const response = await fetch(`${whatsappServiceUrl}/send-notification`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ target, message }),
        })

        const responseData = await response.json().catch(() => ({}))

        if (!response.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    status: response.status,
                    message: 'Failed to send message',
                    error: responseData.error || 'Unknown error',
                    debug: {
                        target: target.slice(0, 4) + '***' + target.slice(-3),
                        message_length: message.length,
                        service_url: whatsappServiceUrl,
                        has_api_secret: !!apiSecret,
                    },
                },
                { status: response.status }
            )
        }

        return NextResponse.json(
            {
                ok: true,
                message: 'Test message sent successfully!',
                data: responseData,
                info: {
                    target: target.slice(0, 4) + '***' + target.slice(-3),
                    message_preview: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
                },
            },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                message: 'Server error',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
