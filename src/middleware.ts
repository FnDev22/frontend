
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Routes that require an authenticated user */
const PROTECTED_PREFIXES = ['/admin', '/dashboard']

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Maintenance Mode Check
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'

    // Allow access to maintenance page itself and static assets
    // Also allow common image/font extensions if they are in public folder
    const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i.test(path)

    if (isMaintenanceMode && !path.startsWith('/maintenance') && !path.startsWith('/_next') && !path.startsWith('/api/') && !isStaticAsset) {
        // Check for Admin Bypass Cookie
        // Note: In a real scenario, you might want a more secure bypass token.
        // For now, we rely on the session cookie if available, or a specific admin_access cookie.
        const adminAccess = request.cookies.get('sb-access-token') || request.cookies.get('admin_access')

        if (!adminAccess) {
            return NextResponse.redirect(new URL('/maintenance', request.url))
        }
    }

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
    requestHeaders.set('X-Content-Type-Options', 'nosniff')
    requestHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    requestHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // Skip auth-related callbacks entirely but apply CSP
    if (path === '/auth/callback' || path.startsWith('/api/auth/')) {
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
        response.headers.set('Content-Security-Policy', cspHeader)
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
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
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        return response
    }

    let response = NextResponse.next({
        request: { headers: requestHeaders },
    })
    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

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
                    response.headers.set('X-Content-Type-Options', 'nosniff')
                    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
                    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
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
        if (error) {
            throw error
        }
        user = data.user
    } catch {
        // Force clear all Supabase auth cookies on error
        // This ensures the client immediately stops sending the invalid token
        request.cookies.getAll().forEach((cookie) => {
            if (cookie.name.startsWith('sb-')) {
                response.cookies.delete(cookie.name)
            }
        })
        await supabase.auth.signOut()
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
