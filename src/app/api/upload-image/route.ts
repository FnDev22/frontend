import { NextRequest, NextResponse } from 'next/server'

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'
const UPLOAD_TIMEOUT_MS = 60_000

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'IMGBB_API_KEY not configured' }, { status: 500 })
        }

        const formData = await request.formData()
        const file = formData.get('file') ?? formData.get('image')
        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ error: 'File is required (field: file or image)' }, { status: 400 })
        }

        const buffer = Buffer.from(await (file as Blob).arrayBuffer())
        const base64 = buffer.toString('base64')

        const body = new URLSearchParams()
        body.set('key', apiKey)
        body.set('image', base64)
        if (file instanceof File && file.name) body.set('name', file.name)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

        const res = await fetch(IMGBB_UPLOAD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const text = await res.text()
        let data: Record<string, unknown> = {}
        try {
            data = JSON.parse(text) as Record<string, unknown>
        } catch {
            return NextResponse.json(
                { error: 'Invalid response from image host', detail: text.slice(0, 200) },
                { status: 502 }
            )
        }

        const success = data?.success === true && data?.status === 200
        const dataObj = data?.data as { url?: string; image?: { url?: string }; display_url?: string } | undefined
        const imageUrl = dataObj?.url ?? dataObj?.display_url ?? dataObj?.image?.url

        if (!success || !imageUrl) {
            const err = data?.error as { message?: string } | string | undefined
            const errMsg = (typeof err === 'object' && err?.message) || (typeof err === 'string' ? err : '') || text.slice(0, 200)
            return NextResponse.json({ error: errMsg || 'Upload failed' }, { status: 400 })
        }

        return NextResponse.json({ url: imageUrl, data: dataObj })
    } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError'
        console.error('Image upload error:', err)
        const message = isTimeout
            ? 'Koneksi ke layanan gambar timeout. Coba lagi atau gunakan URL gambar.'
            : err instanceof Error
              ? err.message
              : 'Upload gagal'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
