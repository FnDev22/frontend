import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Client untuk komponen browser; menyimpan session di cookie agar middleware & server bisa baca. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    },
})
