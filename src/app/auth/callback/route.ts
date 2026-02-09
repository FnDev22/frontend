import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, {
                                    ...options,
                                    domain: '.f-pedia.my.id',
                                    sameSite: 'lax',
                                    secure: process.env.NODE_ENV === 'production',
                                })
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Notify Admin
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const adminNumber = '6285814581266'
                const msg = `*User login F-PEDIA*\n\nEmail: ${user.email || '-'}\nWaktu: ${new Date().toLocaleString('id-ID')}`
                try {
                    const url = process.env.WHATSAPP_API_URL || 'http://localhost:3001'
                    const secret = process.env.WHATSAPP_API_SECRET || process.env.WHATSAPP_API_KEY
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                    if (secret) headers['X-Api-Key'] = secret
                    // Use fetch without awaiting to not block redirect, 
                    // BUT Vercel serverless might kill it. Better to await or use waitUntil if available (Next.js 15+ has after/waitUntil).
                    // For safety in standard Next.js 14, we await directly with a timeout or just await it.
                    await fetch(`${url}/send-notification`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ target: adminNumber, message: msg })
                    }).catch(console.error)
                } catch (e) {
                    console.error('Notify login WA error:', e)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
