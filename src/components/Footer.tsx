import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

const footerLinks = {
    toko: [
        { label: 'Semua Produk', href: '/' },
        { label: 'Kategori', href: '/#produk' },
    ],
    akun: [
        { label: 'Login', href: '/login' },
        { label: 'Daftar', href: '/register' },
        { label: 'Dashboard', href: '/dashboard/user' },
    ],
}

export function Footer() {
    return (
        <footer className="border-t bg-muted/30 w-full min-w-0 overflow-hidden">
            <div className="container px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12 max-w-[100vw]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-left">
                    <div className="col-span-2 md:col-span-2 space-y-4">
                        <Link href="/" className="inline-flex items-center gap-2 font-bold text-lg md:text-xl tracking-tight">
                            <ShoppingBag className="h-6 w-6 shrink-0" />
                            <span>F-PEDIA</span>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                            Toko digital terpercaya untuk akun premium. Pembayaran aman, pengiriman instant.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-sm">Toko</h3>
                        <div className="flex flex-col gap-2">
                            {footerLinks.toko.map((item) => (
                                <Link key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-sm">Akun</h3>
                        <div className="flex flex-col gap-2">
                            {footerLinks.akun.map((item) => (
                                <Link key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} F-PEDIA. Hak cipta dilindungi.</p>
                    <div className="flex gap-4">
                        <Link href="#" className="hover:text-foreground transition-colors">Syarat & Ketentuan</Link>
                        <Link href="#" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
