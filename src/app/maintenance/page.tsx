import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function MaintenancePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight">System Under Maintenance</h1>
            <p className="mb-8 max-w-md text-muted-foreground">
                Kami sedang melakukan pembaruan sistem untuk meningkatkan performa dan keamanan.
                Mohon maaf atas ketidaknyamanan ini.
            </p>

            <div className="space-y-4">
                <p className="text-sm font-medium">Butuh bantuan mendesak?</p>
                <Link
                    href="https://wa.me/6285814581266"
                    target="_blank"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-[#25D366] px-8 text-sm font-medium text-white transition-colors hover:bg-[#20bd5a] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
                >
                    Hubungi via WhatsApp
                </Link>
            </div>

            <div className="mt-12 text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} F-PEDIA. All rights reserved.
            </div>
        </div>
    )
}
