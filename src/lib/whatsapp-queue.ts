import { SupabaseClient } from '@supabase/supabase-js'

export async function enqueueWhatsAppMessage(
    supabase: SupabaseClient,
    phone: string,
    message: string
) {
    // Normalisasi nomor HP (hapus 0 di depan, ganti 62, dll)
    // Sebenarnya whatsapp-service juga melakukan normalisasi, tapi kita bersihkan dasar dulu
    let cleanPhone = phone.trim()
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1)
    }

    try {
        const { error } = await supabase
            .from('whatsapp_queue')
            .insert({
                phone: cleanPhone,
                message: message,
                status: 'pending'
            })

        if (error) {
            console.error('[WhatsApp Queue] Insert Error:', error)
            throw error
        }

        console.log(`[WhatsApp Queue] Enqueued message to ${cleanPhone}`)
        return true
    } catch (err) {
        console.error('[WhatsApp Queue] Failed to enqueue:', err)
        return false
    }
}
