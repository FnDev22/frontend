import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET_NAME = 'product-images'

export async function POST() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRole) {
        return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
    }

    const supabase = createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === BUCKET_NAME)
    if (exists) {
        return NextResponse.json({ ok: true, message: 'Bucket already exists' })
    }

    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
    })
    if (error) {
        console.error('createBucket error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Bucket created' })
}
