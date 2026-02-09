'use client'

import { useState } from 'react'
import { Order } from '@/types'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
    const [orders, setOrders] = useState<Order[]>(initialOrders)
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()

    const handleStatusUpdate = async (orderId: string, status: 'paid' | 'failed') => {
        setLoading(orderId)
        try {
            const res = await fetch('/api/admin/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status })
            })

            if (!res.ok) throw new Error('Failed to update status')

            toast.success(`Order marked as ${status}`)
            router.refresh()
            // window.location.reload()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pesanan</h1>
                <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                    Konfirmasi lunas otomatis via webhook (production) atau user klik &quot;Update status&quot; di checkout. Di localhost gunakan tombol &quot;Lunas&quot; atau user klik &quot;Update status&quot; setelah bayar.
                </p>
            </div>
            <div className="rounded-xl border-2 overflow-hidden overflow-x-auto">
                <Table className="min-w-[640px]">
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Order ID</TableHead>
                            <TableHead className="font-semibold">Customer</TableHead>
                            <TableHead className="font-semibold hidden lg:table-cell">Product</TableHead>
                            <TableHead className="font-semibold">Qty</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map(order => {
                            const qty = order.quantity ?? 1
                            const amount = (order.product?.price ?? 0) * qty
                            return (
                            <TableRow key={order.id}>
                                <TableCell className="font-mono text-xs">{order.transaction_id}<br />{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{order.buyer_email}</span>
                                        <span className="text-xs text-muted-foreground">{order.buyer_whatsapp}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">{order.product?.title || '—'}</TableCell>
                                <TableCell>{qty}</TableCell>
                                <TableCell>Rp {amount.toLocaleString('id-ID')}</TableCell>
                                <TableCell>
                                    <Badge variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                                        {order.payment_status.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {order.payment_status === 'pending' && (
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusUpdate(order.id, 'paid')} disabled={loading === order.id} title="Tandai lunas (jika user sudah bayar tapi gateway/webhook belum konfirmasi)">
                                                {loading === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                Lunas
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusUpdate(order.id, 'failed')} disabled={loading === order.id} title="Tandai gagal (batal / user error)">
                                                {loading === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                                Gagal
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
