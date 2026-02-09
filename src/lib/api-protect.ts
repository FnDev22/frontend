import { NextRequest, NextResponse } from 'next/server'

/**
 * Jika request dari browser (Accept: text/html), return 405 Method Not Allowed.
 * Dipanggil di awal handler GET API agar membuka URL di tab baru tidak menampilkan JSON.
 */
export function rejectBrowserGet(request: NextRequest): NextResponse | null {
    const accept = request.headers.get('accept') ?? ''
    if (accept.includes('text/html')) {
        return NextResponse.json(
            { error: 'Method Not Allowed' },
            { status: 405, headers: { Allow: 'GET' } }
        )
    }
    return null
}
