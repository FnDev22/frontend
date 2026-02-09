import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function createSupabaseWithCookies(request: NextRequest, response: NextResponse) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )
}

/** GET: Supabase bisa redirect ke /api/auth/callback?code=xxx (sesuai Redirect URL). */
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    if (!code || !code.trim()) {
        return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
    }

    const response = NextResponse.redirect(new URL('/', request.url))
    const supabase = createSupabaseWithCookies(request, response)

    const { error } = await supabase.auth.exchangeCodeForSession(code.trim())
    if (error) {
        console.error('Auth callback GET exchange error:', error.message)
        return NextResponse.redirect(new URL(`/login?error=auth_failed&reason=${encodeURIComponent(error.message)}`, request.url))
    }

    return response
}

/** POST: Client (halaman /auth/callback) kirim code lewat body. */
export async function POST(request: NextRequest) {
    let code: string | null = null
    try {
        const body = await request.json()
        code = typeof body?.code === 'string' ? body.code.trim() : null
    } catch {
        // body invalid atau bukan JSON
    }

    if (!code) {
        return NextResponse.json(
            { error: 'Missing code', hint: 'Pastikan Redirect URL di Supabase: Authentication → URL Configuration → Redirect URLs berisi http://localhost:3000/auth/callback' },
            { status: 400 }
        )
    }

    const response = NextResponse.json({ success: true })
    const supabase = createSupabaseWithCookies(request, response)

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
        console.error('Auth callback POST exchange error:', error.message)
        return NextResponse.json(
            { error: error.message, code: 'exchange_failed' },
            { status: 400 }
        )
    }

    return response
}
