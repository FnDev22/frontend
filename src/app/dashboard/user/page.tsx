import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Package, ShoppingBag, ArrowRight, FileText } from 'lucide-react'
import { UserDashboardClient } from '@/app/dashboard/user/UserDashboardClient'

export const revalidate = 0

export default async function UserDashboard() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return (
            <div className="container px-4 py-12 sm:py-16">
                <Card className="max-w-md mx-auto border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Akses ditolak
                        </CardTitle>
                        <CardDescription>Silakan login untuk melihat riwayat pesanan dan akun Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/login">Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { data: orders } = await supabase
        .from('orders')
        .select('*, product:products(title, instructions)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

    const paidOrderIds = (orders || []).filter((o: { payment_status: string }) => o.payment_status === 'paid').map((o: { id: string }) => o.id)
    let accountsByOrder: Record<string, Array<{ email: string; password: string }>> = {}
    if (paidOrderIds.length > 0) {
        const { data: orderAccounts } = await supabase
            .from('order_accounts')
            .select('order_id, account_stock_id(email, password)')
            .in('order_id', paidOrderIds)
        for (const oa of orderAccounts || []) {
            const oid = oa.order_id as string
            const raw = oa.account_stock_id
            const acc = Array.isArray(raw) ? raw[0] : raw
            if (!acc || typeof acc !== 'object' || !('email' in acc)) continue
            if (!accountsByOrder[oid]) accountsByOrder[oid] = []
            accountsByOrder[oid].push({ email: String(acc.email), password: String(acc.password) })
        }
    }

    const displayName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pengguna'
    const hasPaidOrders = (orders || []).some((o: { payment_status: string }) => o.payment_status === 'paid')

    return (
        <div className="container px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
            {/* Thank you banner - tampil jika ada pesanan lunas */}
            {hasPaidOrders && (
                <div className="mb-6 rounded-2xl border bg-primary/10 border-primary/20 p-4 sm:p-5 text-center">
                    <p className="font-semibold text-foreground">Terima kasih telah order di F-PEDIA</p>
                    <p className="text-sm text-muted-foreground mt-1">Detail akun ada di bawah. Simpan dengan aman.</p>
                </div>
            )}

            {/* Welcome */}
            <div className="mb-6 sm:mb-8">
                <div className="rounded-2xl border bg-gradient-to-br from-muted/60 to-muted/30 p-5 sm:p-6 md:p-8">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Halo, {displayName}</h1>
                    <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Kelola pesanan dan akses akun yang sudah Anda beli.</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                        <Link href="/#produk">
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Lihat produk
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Orders */}
            <Card>
                <CardHeader className="pb-4 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                        Riwayat Pesanan
                    </CardTitle>
                    <CardDescription className="text-sm">Pesanan dan akun yang telah Anda beli. Gunakan tombol salin untuk menyalin Email &amp; Password.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 pt-0">
                    <UserDashboardClient
                        orders={orders || []}
                        accountsByOrder={accountsByOrder}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
