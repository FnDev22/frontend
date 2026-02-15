import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET_NAME = 'product-images'

export async function POST(request: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRole) {
        return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
    }

    const sbAdmin = createClient(url, serviceRole, {
        auth: { persistSession: false },
    })

    // Auth Check
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await sbAdmin.auth.getUser(token)

    if (authError || !user || user.email !== (process.env.ADMIN_EMAIL || 'ae132118@gmail.com')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buckets } = await sbAdmin.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === BUCKET_NAME)
    if (exists) {
        return NextResponse.json({ ok: true, message: 'Bucket already exists' })
    }

    const { error } = await sbAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
    })
    if (error) {
        console.error('createBucket error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Bucket created' })
}
