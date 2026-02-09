import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DollarSign, Package, ShoppingCart, Users, ArrowRight, LayoutDashboard, Bell, Tag, MessageCircle } from 'lucide-react'
import { AddNotificationForm } from './AddNotificationForm'
import { AddPromoForm } from './AddPromoForm'
import { BroadcastForm } from './BroadcastForm'
import { WhatsAppTestComponent } from './WhatsAppTestComponent'

export const revalidate = 0

export default async function AdminDashboard() {
    const supabase = await createClient()

    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    const { data: paidOrders } = await supabase
        .from('orders')
        .select('created_at, quantity, product:products(price)')
        .eq('payment_status', 'paid')

    const totalRevenue = paidOrders?.reduce((acc: number, order: any) => acc + ((order.product?.price || 0) * (order.quantity ?? 1)), 0) ?? 0
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyOrders = paidOrders?.filter((order: any) => {
        const d = new Date(order.created_at)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }) ?? []
    const monthlyRevenue = monthlyOrders.reduce((acc: number, order: any) => acc + ((order.product?.price || 0) * (order.quantity ?? 1)), 0)

    const quickLinks = [
        { href: '/admin/products', label: 'Kelola Produk', icon: Package, desc: 'Tambah, edit, stok akun' },
        { href: '/admin/orders', label: 'Pesanan', icon: ShoppingCart, desc: 'Lihat & update status' },
        { href: '/admin/users', label: 'Pengguna', icon: Users, desc: 'Daftar pengguna' },
    ]

    return (
        <div className="space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                    <LayoutDashboard className="h-8 w-8" />
                    Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">Ringkasan toko dan akses cepat.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold">Rp {totalRevenue.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>
                <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Bulan Ini</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold">Rp {monthlyRevenue.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground">{monthlyOrders.length} order</p>
                    </CardContent>
                </Card>
                <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Produk</CardTitle>
                        <Package className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold">{productsCount ?? 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pengguna</CardTitle>
                        <Users className="h-5 w-5 text-violet-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold">{usersCount ?? 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4">Akses Cepat</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {quickLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Card className="border-2 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer group h-full">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <div className="space-y-1.5">
                                        <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary">
                                            {link.label}
                                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </CardTitle>
                                        <CardDescription>{link.desc}</CardDescription>
                                    </div>
                                    <link.icon className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            <Card className="border-dashed">
                <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="font-medium">Total pesanan</p>
                        <p className="text-2xl font-bold">{ordersCount ?? 0}</p>
                    </div>
                    <Button asChild><Link href="/admin/orders">Lihat pesanan</Link></Button>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Buat Notifikasi
                </h2>
                <AddNotificationForm />
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Broadcast WhatsApp
                </h2>
                <BroadcastForm />
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Kelola Promo
                </h2>
                <AddPromoForm />
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4">Diagnostik & Testing</h2>
                <WhatsAppTestComponent />
            </div>
        </div>
    )
}
