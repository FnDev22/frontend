'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Send, Package, User, Phone, Mail, ClipboardList, Check, AlertCircle } from 'lucide-react'

type PreorderOrder = {
    id: string
    created_at: string
    quantity: number
    buyer_email: string
    buyer_whatsapp: string
    note: string
    payment_status: string
    transaction_id: string
    product: {
        id: string
        title: string
        price: number
        image_url: string
    }
    user: {
        full_name: string
    }
    delivered?: boolean
}

export default function AdminPreorderPage() {
    const [orders, setOrders] = useState<PreorderOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [delivering, setDelivering] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<PreorderOrder | null>(null)
    const [accountInput, setAccountInput] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)

    useEffect(() => {
        fetchPreorders()
    }, [])

    const fetchPreorders = async () => {
        setLoading(true)
        try {
            // Get products that have is_preorder = true
            const { data: preorderProducts, error: prodError } = await supabase
                .from('products')
                .select('id')
                .eq('is_preorder', true)

            if (prodError) {
                console.error('Error fetching preorder products:', prodError)
                toast.error('Gagal memuat data produk: ' + prodError.message)
                setLoading(false)
                return
            }

            if (!preorderProducts || preorderProducts.length === 0) {
                setOrders([])
                setLoading(false)
                return
            }

            const productIds = preorderProducts.map(p => p.id)

            // Get ALL orders for preorder products (remove payment_status filter)
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select(`
                    id, created_at, quantity, buyer_email, buyer_whatsapp, note, payment_status, transaction_id,
                    product:products(id, title, price, image_url),
                    user:profiles(full_name)
                `)
                .in('product_id', productIds)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Fetch preorders error:', error)
                toast.error('Gagal memuat preorder: ' + error.message)
            } else {
                // Check which orders already have accounts delivered
                const orderIds = (ordersData || []).map(o => o.id)
                const { data: deliveredAccounts } = await supabase
                    .from('order_accounts')
                    .select('order_id')
                    .in('order_id', orderIds)

                const deliveredOrderIds = new Set((deliveredAccounts || []).map(a => a.order_id))

                const enriched = (ordersData || []).map(o => {
                    const productData = Array.isArray(o.product) ? o.product[0] : o.product
                    const userData = Array.isArray(o.user) ? o.user[0] : o.user
                    return {
                        ...o,
                        product: productData,
                        user: userData,
                        delivered: deliveredOrderIds.has(o.id),
                    }
                }) as PreorderOrder[]

                setOrders(enriched)
            }
        } catch (err) {
            console.error('Preorder fetch error:', err)
            toast.error('Gagal menghubungi database')
        } finally {
            setLoading(false)
        }
    }

    const openDeliverDialog = (order: PreorderOrder) => {
        setSelectedOrder(order)
        setAccountInput('')
        setDialogOpen(true)
    }

    const handleDeliver = async () => {
        if (!selectedOrder) return

        const accountText = accountInput.trim()
        if (!accountText) {
            toast.error('Masukkan data akun terlebih dahulu')
            return
        }

        // Parse accounts (email:password per line)
        const accounts = accountText.split('\n').map(line => {
            const parts = line.includes(',') ? line.split(',') : line.split(':')
            const email = parts[0]?.trim()
            const password = parts.slice(1).join(':').trim()
            if (email && password) return { email, password }
            return null
        }).filter(Boolean)

        if (accounts.length === 0) {
            toast.error('Format tidak valid. Gunakan email:password per baris.')
            return
        }

        setDelivering(true)
        try {
            const res = await fetch('/api/admin/preorder/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: selectedOrder.id, accounts }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Gagal kirim akun')

            toast.success(`Berhasil mengirim ${accounts.length} akun ke pembeli!`)
            setDialogOpen(false)
            fetchPreorders() // Refresh list
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setDelivering(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                    <ClipboardList className="h-8 w-8" />
                    Manajemen Preorder
                </h1>
                <p className="text-muted-foreground mt-1">
                    Kelola dan kirim akun untuk pesanan preorder.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : orders.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground">Belum ada pesanan preorder.</p>
                        <p className="text-sm text-muted-foreground mt-1">Aktifkan preorder pada produk di halaman Produk.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[180px]">Order ID / Tgl</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-center">Status Bayar</TableHead>
                                    <TableHead className="text-center">Status Kirim</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">
                                            <span className="font-semibold block">{order.transaction_id || order.id.slice(0, 8)}</span>
                                            <span className="text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="font-medium">{order.user?.full_name || 'Guest'}</span>
                                                <span className="text-xs text-muted-foreground">{order.buyer_whatsapp}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-sm">{order.product?.title}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {order.quantity}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                                                {order.payment_status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {order.delivered ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    <Check className="w-3 h-3 mr-1" /> Terkirim
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant={order.delivered ? "outline" : "default"}
                                                className={!order.delivered ? "bg-orange-500 hover:bg-orange-600" : ""}
                                                onClick={() => openDeliverDialog(order)}
                                            >
                                                {order.delivered ? 'Kirim Ulang' : 'Proses'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Kirim Akun ke Pembeli</DialogTitle>
                        <DialogDescription>
                            Pastikan data akun valid. Sistem akan mengirim email & WhatsApp ke pembeli.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-4 py-2">
                            {selectedOrder.payment_status !== 'paid' && (
                                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Peringatan: Pesanan belum lunas!</p>
                                        <p>Status saat ini: <strong>{selectedOrder.payment_status.toUpperCase()}</strong>. Pastikan Anda sudah menerima pembayaran manual sebelum mengirim akun.</p>
                                    </div>
                                </div>
                            )}

                            <div className="text-sm bg-muted p-3 rounded-md space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Produk:</span>
                                    <span className="font-medium">{selectedOrder.product?.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pembeli:</span>
                                    <span>{selectedOrder.user?.full_name} ({selectedOrder.buyer_whatsapp})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Jumlah Pesanan:</span>
                                    <span className="font-bold">{selectedOrder.quantity} item</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Data Akun ({selectedOrder.quantity} baris dibutuhkan)</Label>
                                <Textarea
                                    placeholder={`email1@ex.com:pass1\nemail2@ex.com:pass2`}
                                    className="font-mono min-h-[150px]"
                                    value={accountInput}
                                    onChange={(e) => setAccountInput(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Format: <code>email:password</code> atau <code>email,password</code> (satu per baris).</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={delivering}>Batal</Button>
                        <Button onClick={handleDeliver} disabled={delivering || !accountInput.trim()} className="bg-orange-500 hover:bg-orange-600 text-white">
                            {delivering ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" /> Kirim Sekarang
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

