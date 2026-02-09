'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Package, ShoppingCart, Users, Home, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Produk', icon: Package },
    { href: '/admin/orders', label: 'Pesanan', icon: ShoppingCart },
    { href: '/admin/users', label: 'Pengguna', icon: Users },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    const sidebar = (
        <nav className="grid items-start gap-1 px-2 py-4 sm:px-4">
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                        <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                                'w-full justify-start gap-3 font-medium',
                                isActive && 'bg-muted'
                            )}
                        >
                            <item.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', isActive && 'text-primary')} />
                            {item.label}
                        </Button>
                    </Link>
                )
            })}
            <div className="border-t my-2" />
            <Link href="/" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
                    <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    Kembali ke toko
                </Button>
            </Link>
        </nav>
    )

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
                <div className="flex h-14 sm:h-16 items-center border-b px-4 lg:px-6">
                    <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                        Admin Panel
                    </Link>
                </div>
                {sidebar}
            </aside>

            {/* Mobile: sheet */}
            <div className="md:hidden flex items-center justify-between border-b bg-background px-4 h-14 sticky top-0 z-10">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="flex h-14 items-center border-b px-4 font-semibold">Menu</div>
                        {sidebar}
                    </SheetContent>
                </Sheet>
                <Link href="/admin/dashboard" className="font-semibold">Admin</Link>
                <div className="w-10" />
            </div>

            <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
                {children}
            </main>
        </div>
    )
}
