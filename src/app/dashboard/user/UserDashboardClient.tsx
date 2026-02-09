'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Package, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type OrderRow = {
    id: string
    created_at: string
    product?: { title: string; instructions?: string }
    payment_status: string
    quantity?: number
}

export function UserDashboardClient({
    orders,
    accountsByOrder,
}: {
    orders: OrderRow[]
    accountsByOrder: Record<string, Array<{ email: string; password: string }>>
}) {
    const [copied, setCopied] = useState<string | null>(null)

    const copyAccount = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopied(id)
        toast.success('Disalin ke clipboard')
        setTimeout(() => setCopied(null), 2000)
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="rounded-xl border border-dashed bg-muted/30 py-12 px-4 sm:py-16 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <p className="mt-4 font-medium text-foreground">Belum ada pesanan</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Mulai belanja untuk melihat riwayat dan menerima akun di sini.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/#produk">Lihat produk</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto px-4 sm:px-6">
                <Table className="min-w-[600px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Akun</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                    {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </TableCell>
                                <TableCell className="font-medium">{order.product?.title}</TableCell>
                                <TableCell>{(order.quantity ?? 1)} unit</TableCell>
                                <TableCell>
                                    <Badge variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                                        {order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'failed' ? 'Gagal' : 'Pending'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {order.payment_status === 'paid' ? (
                                        <div className="flex flex-col gap-3 max-w-md">
                                            {(accountsByOrder[order.id] || []).map((acc, i) => (
                                                <div key={i} className="p-3 bg-muted rounded-lg space-y-2">
                                                    <p className="text-xs font-medium text-muted-foreground">Akun {i + 1}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground shrink-0 w-14">Email:</span>
                                                        <span className="text-xs font-mono flex-1 truncate">{acc.email}</span>
                                                        <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => copyAccount(acc.email, `desk-em-${order.id}-${i}`)}>
                                                            {copied === `desk-em-${order.id}-${i}` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground shrink-0 w-14">Password:</span>
                                                        <span className="text-xs font-mono flex-1 truncate">{acc.password}</span>
                                                        <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => copyAccount(acc.password, `desk-pw-${order.id}-${i}`)}>
                                                            {copied === `desk-pw-${order.id}-${i}` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    </div>
                                                    <Button size="sm" variant="outline" className="w-full mt-1 h-8 text-xs" onClick={() => copyAccount(`${acc.email}\n${acc.password}`, `desk-full-${order.id}-${i}`)}>
                                                        {copied === `desk-full-${order.id}-${i}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                                        Salin Email &amp; Password
                                                    </Button>
                                                </div>
                                            ))}
                                            {order.product?.instructions && (
                                                <div className="p-3 border rounded-lg text-xs whitespace-pre-wrap text-muted-foreground mt-1">
                                                    <p className="font-medium text-foreground mb-1">Cara penggunaan</p>
                                                    {order.product.instructions}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">Bayar untuk menerima akun</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden space-y-4 px-4 pb-4">
                {orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-medium line-clamp-2">{order.product?.title}</p>
                                <Badge variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'failed' ? 'destructive' : 'secondary'} className="shrink-0">
                                    {order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'failed' ? 'Gagal' : 'Pending'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · {(order.quantity ?? 1)} unit
                            </p>
                            {order.payment_status === 'paid' && (
                                <div className="space-y-3 pt-3 border-t">
                                    {(accountsByOrder[order.id] || []).map((acc, i) => (
                                        <div key={i} className="p-3 bg-muted rounded-lg space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">Akun {i + 1}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-16 shrink-0">Email:</span>
                                                <span className="text-xs font-mono flex-1 truncate">{acc.email}</span>
                                                <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => copyAccount(acc.email, `mob-em-${order.id}-${i}`)}>
                                                    {copied === `mob-em-${order.id}-${i}` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-16 shrink-0">Password:</span>
                                                <span className="text-xs font-mono flex-1 truncate">{acc.password}</span>
                                                <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => copyAccount(acc.password, `mob-pw-${order.id}-${i}`)}>
                                                    {copied === `mob-pw-${order.id}-${i}` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => copyAccount(`${acc.email}\n${acc.password}`, `mob-full-${order.id}-${i}`)}>
                                                {copied === `mob-full-${order.id}-${i}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                                Salin keduanya
                                            </Button>
                                        </div>
                                    ))}
                                    {order.product?.instructions && (
                                        <div className="p-3 border rounded-lg text-xs whitespace-pre-wrap text-muted-foreground">
                                            <p className="font-medium text-foreground mb-1">Cara penggunaan</p>
                                            {order.product.instructions}
                                        </div>
                                    )}
                                </div>
                            )}
                            {order.payment_status !== 'paid' && order.payment_status !== 'failed' && (
                                <p className="text-xs text-muted-foreground">Selesaikan pembayaran untuk menerima akun.</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </>
    )
}
