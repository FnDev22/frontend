

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** Routes that require an authenticated user */
const PROTECTED_PREFIXES = ['/admin', '/dashboard']

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Maintenance Mode Check (Dynamic Sync with Bot)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: mSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle()

    const isMaintenanceMode = mSetting?.value === true || process.env.MAINTENANCE_MODE === 'true'

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

    // Simplified Auth Check
    // We do NOT use createServerClient or getUser() here because it triggers
    // token refreshes, leading to race conditions and "Invalid Refresh Token" loops.
    // Instead, we just check for the presence of a Supabase session cookie.
    // The actual security validation happens in the Server Components (layout/page).

    // Check for any cookie that looks like a Supabase session
    const hasSession = request.cookies.getAll().some(
        (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    )

    // Protect Admin Routes
    if (path.startsWith('/admin')) {
        if (!hasSession) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Admin email check is now deferred to the Server Component (layout or page)
        // to avoid calling getUser() here.
    }

    // Protect User Dashboard
    if (path.startsWith('/dashboard')) {
        if (!hasSession) {
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
