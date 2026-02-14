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
                                    domain: process.env.NODE_ENV === 'production' ? '.f-pedia.my.id' : undefined,
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
            // Notify Admin via Email
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const adminEmail = process.env.ADMIN_EMAIL || 'ae132118@gmail.com'
                const { sendEmail } = await import('@/lib/mail')

                // MUST await on Vercel or the function will be killed before email is sent
                try {
                    await sendEmail({
                        to: adminEmail,
                        subject: `[Login Alert] User Login: ${user.email}`,
                        html: `
                            <h3>User Login Notification (OAuth)</h3>
                            <p><strong>User:</strong> ${user.email}</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Method:</strong> Google OAuth</p>
                        `
                    })
                } catch (err) {
                    console.error('Failed to send login email', err)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
