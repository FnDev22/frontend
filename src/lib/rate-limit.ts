import { createClient } from '@/lib/supabase-server'

/**
 * Check if a key has exceeded the rate limit.
 * @param key Unique key for the limiter (e.g., 'otp:127.0.0.1')
 * @param limit Max attempts allowed
 * @param windowSeconds Time window in seconds
 * @returns { success: boolean, message?: string }
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
    const supabase = await createClient()
    const now = new Date()
    const windowStart = new Date(now.getTime() - windowSeconds * 1000).toISOString()

    // Clean up old entries (Optional - can be done via cron or trigger to save performance here)
    // await supabase.from('rate_limits').delete().lt('created_at', windowStart)

    // Count attempts in the window
    const { count, error } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('key', key)
        .gt('created_at', windowStart)

    if (error) {
        console.error('RateLimit Check Error:', error)
        return { success: true } // Fail open to avoid blocking valid users on DB error
    }

    if (count !== null && count >= limit) {
        return { success: false, message: 'Too many requests. Please try again later.' }
    }

    // Log this attempt
    await supabase.from('rate_limits').insert({
        key,
        created_at: now.toISOString(),
    })

    return { success: true }
}
