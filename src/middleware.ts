
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Routes that require an authenticated user */
const PROTECTED_PREFIXES = ['/admin', '/dashboard']

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Generate Nonce for CSP
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

    // Strict CSP Policy
    // Note: 'unsafe-eval' might be needed for some dev tools or libraries, but we try to avoid it.
    // 'unsafe-inline' for styles is often needed for CSS-in-JS unless we extract styles. 
    // For scripts, we strictly use the nonce.
    const cspHeader = `
        default-src 'self';
        base-uri 'self';
        object-src 'none';
        form-action 'self';
        frame-ancestors 'self';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:;
        style-src 'self' 'unsafe-inline' https:;
        img-src 'self' data: blob: https:;
        font-src 'self' data: https:;
        connect-src 'self' https:;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', cspHeader)

    // Skip auth-related callbacks entirely but apply CSP
    if (path === '/auth/callback' || path.startsWith('/api/auth/')) {
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
        response.headers.set('Content-Security-Policy', cspHeader)
        return response
    }

    // Only run auth check on protected routes — public pages don't need it
    const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p))
    if (!needsAuth) {
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
        response.headers.set('Content-Security-Policy', cspHeader)
        return response
    }

    let response = NextResponse.next({
        request: { headers: requestHeaders },
    })
    response.headers.set('Content-Security-Policy', cspHeader)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: { headers: requestHeaders },
                    })
                    response.headers.set('Content-Security-Policy', cspHeader)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Wrap in try-catch: concurrent requests can race to refresh the same
    // token, causing "refresh_token_already_used". We treat that as
    // unauthenticated rather than crashing.
    let user = null
    try {
        const { data, error } = await supabase.auth.getUser()
        if (!error) user = data.user
    } catch {
        // network / unexpected error — treat as unauthenticated
    }

    // Protect Admin Routes
    if (path.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Use Env Variable for Admin Email
        const adminEmail = process.env.ADMIN_EMAIL || 'ae132118@gmail.com'
        if (user.email !== adminEmail) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Protect User Dashboard
    if (path.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
