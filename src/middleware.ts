
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Routes that require an authenticated user */
const PROTECTED_PREFIXES = ['/admin', '/dashboard']

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Skip auth-related callbacks entirely
    if (path === '/auth/callback' || path.startsWith('/api/auth/')) {
        return NextResponse.next()
    }

    // Only run auth check on protected routes — public pages don't need it
    const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p))
    if (!needsAuth) {
        return NextResponse.next()
    }

    let response = NextResponse.next({
        request: { headers: request.headers },
    })

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
                        request: { headers: request.headers },
                    })
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
        if (user.email !== 'ae132118@gmail.com') {
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
         * Only run middleware on protected routes.
         * This avoids unnecessary token refresh on static assets,
         * images, public pages, and API routes.
         */
        '/admin/:path*',
        '/dashboard/:path*',
    ],
}
