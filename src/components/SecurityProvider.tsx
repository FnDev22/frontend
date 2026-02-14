'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

interface SecurityProviderProps {
    children: React.ReactNode
    isAdmin: boolean
}

export function SecurityProvider({ children, isAdmin }: SecurityProviderProps) {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (isAdmin) return

        // 1. Disable Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
        }

        // 2. Disable Key Shortcuts (PrintScreen, Ctrl+C, Ctrl+U, F12, etc.)
        const handleKeyDown = (e: KeyboardEvent) => {
            // PrintScreen
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                e.preventDefault()
                alert('Screenshot tidak diperbolehkan!')
                document.body.style.display = 'none'
                setTimeout(() => {
                    document.body.style.display = 'block'
                    router.push('/')
                }, 100)
                return
            }

            // Ctrl+Shift+I (DevTools), Ctrl+U (Source), Ctrl+S (Save), F12
            if (
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p')) ||
                e.key === 'F12'
            ) {
                e.preventDefault()
            }
        }

        // 3. Blur on visibility change (Tab switch / Window minimize) - Optional but good for security
        // const handleVisibilityChange = () => {
        //   if (document.hidden) {
        //     document.title = 'Security Alert'
        //   } else {
        //     document.title = 'F-PEDIA'
        //   }
        // }

        // 4. Overlay for Copy Protection (CSS is also used: user-select-none)
        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
        }

        document.addEventListener('contextmenu', handleContextMenu)
        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('copy', handleCopy)
        // document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu)
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('copy', handleCopy)
            //   document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [isAdmin, router])

    return (
        <div className={isAdmin ? '' : 'select-none'}>
            {/* Anti-print overlay (CSS media print) */}
            <style jsx global>{`
            @media print {
                html, body {
                    display: none !important;
                }
            }
        `}</style>
            {children}
        </div>
    )
}
