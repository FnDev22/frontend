'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function AuthSanitizer({ serverUserExists }: { serverUserExists: boolean }) {
    useEffect(() => {
        // This component runs only on the client.
        // It acts as a fail-safe to stop the "Invalid Refresh Token" loop.

        const performSanitization = async () => {
            // 1. Identify the Project Ref from env or hardcode if needed (from logs: fpcbbtbwnqqklyvgwkwv)
            // But safer to just generally clean up known patterns.

            // If the Server says "No User" (!serverUserExists), but the Client has data...
            if (!serverUserExists) {
                let dirty = false

                // Check LocalStorage for Supabase tokens
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i)
                    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                        console.warn('AuthSanitizer: Found zombie token in localStorage. Nuking:', key)
                        localStorage.removeItem(key)
                        dirty = true
                    }
                }

                // Check Cookies for Supabase tokens (sb-*-auth-token)
                // Note: Client-side cookie deletion is limited for HttpOnly, but often these are accessible or we try anyway.
                document.cookie.split(';').forEach((c) => {
                    const [name] = c.trim().split('=')
                    if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
                        console.warn('AuthSanitizer: Found zombie token in cookies. Nuking:', name)
                        // Expire it
                        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`
                        dirty = true
                    }
                })

                if (dirty) {
                    console.warn('AuthSanitizer: Cleanup performed. Reloading to reset client state.')
                    // Force reload to ensure a clean slate for the Supabase client
                    window.location.reload()
                }
            }
        }

        performSanitization()
    }, [serverUserExists])

    return null
}
