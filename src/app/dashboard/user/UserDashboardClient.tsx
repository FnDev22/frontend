'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Package, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Lock, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

type OrderRow = {
    id: string
    created_at: string
    product?: { title: string; instructions?: string; is_preorder?: boolean }
    payment_status: string
    quantity?: number
    payment_url?: string
    expires_at?: string
    total_price?: number
    transaction_id?: string
}

export function UserDashboardClient({
    orders,
    accountsByOrder,
    userEmail
}: {
    orders: OrderRow[]
    accountsByOrder: Record<string, Array<{ email: string; password: string }>>
    userEmail?: string
}) {
    const [copied, setCopied] = useState<string | null>(null)
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)
    const [passwordStep, setPasswordStep] = useState<'otp' | 'new-password'>('otp')
    const [otpCode, setOtpCode] = useState('')
    const [newPass, setNewPass] = useState('')
    const [loading, setLoading] = useState(false)
    const [paymentOrder, setPaymentOrder] = useState<OrderRow | null>(null)

    const isExpired = (order: OrderRow) => {
        if (order.payment_status !== 'pending') return false
        // Old orders without QRIS data are considered expired/invalid for payment
        if (!order.payment_url) return true

        if (!order.expires_at) {
            // Fallback for old orders: 24h from created_at
            return new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000 < Date.now()
        }
        return new Date(order.expires_at).getTime() < Date.now()
    }

    const handleSendOtp = async () => {
        if (!userEmail) return
        setLoading(true)
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, purpose: 'change_password' }),
            })
            if (!res.ok) throw new Error('Gagal mengirim OTP')
            toast.success('Kode OTP dikirim ke ' + userEmail)
            setPasswordStep('new-password')
        } catch (e) {
            toast.error('Gagal mengirim OTP')
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async () => {
        if (!otpCode || !newPass) {
            toast.error('Lengkapi data')
            return
        }
        setLoading(true)
        try {
            // Verify OTP Logic - Reusing verify-otp API
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, code: otpCode, purpose: 'change_password' }),
            })
            const data = await res.json()
            if (!res.ok || !data.valid) throw new Error(data.error || 'OTP Invalid')

            // Update Password via Supabase Client
            const { error } = await supabase.auth.updateUser({ password: newPass })
            if (error) throw error

            toast.success('Password berhasil diubah')
            setShowPasswordDialog(false)
            setOtpCode('')
            setNewPass('')
            setPasswordStep('otp')
        } catch (e: any) {
            toast.error(e.message || 'Gagal mengubah password')
        } finally {
            setLoading(false)
        }
    }

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

                {/* Change Password Dialog (Empty State) */}
                <div className="mt-8">
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                        <Lock className="mr-2 h-4 w-4" />
                        Ubah Password
                    </Button>
                </div>

                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ubah Password</DialogTitle>
                            <DialogDescription>Verifikasi identitas Anda dengan OTP Email.</DialogDescription>
                        </DialogHeader>
                        {passwordStep === 'otp' ? (
                            <div className="space-y-4">
                                <p className="text-sm">Kami akan mengirim kode OTP ke <strong>{userEmail}</strong></p>
                                <Button onClick={handleSendOtp} disabled={loading} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Kirim Kode OTP
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Kode OTP</Label>
                                    <Input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password Baru</Label>
                                    <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="******" />
                                </div>
                                <Button onClick={handleChangePassword} disabled={loading} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Password Baru
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    return (
        <>
            {/* Desktop: table */}
            <div className="flex justify-end px-4 sm:px-6 mb-4 md:hidden">
                <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Ubah Password
                </Button>
            </div>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ubah Password</DialogTitle>
                        <DialogDescription>Verifikasi identitas Anda dengan OTP Email.</DialogDescription>
                    </DialogHeader>
                    {passwordStep === 'otp' ? (
                        <div className="space-y-4">
                            <p className="text-sm">Kami akan mengirim kode OTP ke <strong>{userEmail}</strong></p>
                            <Button onClick={handleSendOtp} disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Kirim Kode OTP
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Kode OTP</Label>
                                <Input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" />
                            </div>
                            <div className="space-y-2">
                                <Label>Password Baru</Label>
                                <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="******" />
                            </div>
                            <Button onClick={handleChangePassword} disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Password Baru
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={!!paymentOrder} onOpenChange={(open) => !open && setPaymentOrder(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pembayaran QRIS</DialogTitle>
                        <DialogDescription>Scan QR code ini untuk menyelesaikan pembayaran.</DialogDescription>
                    </DialogHeader>
                    {paymentOrder && (
                        <div className="flex flex-col items-center space-y-4 py-4">
                            <div className="w-full max-w-[240px] mx-auto bg-white p-4 rounded-xl border-2 border-dashed shadow-sm">
                                {paymentOrder.payment_url ? (
                                    <QRCodeSVG value={paymentOrder.payment_url} size={200} className="w-full h-auto" />
                                ) : (
                                    <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground text-xs text-center p-4">
                                        QR Code tidak tersedia
                                    </div>
                                )}
                            </div>
                            <div className="text-center space-y-1 w-full">
                                <p className="text-2xl font-bold">Rp {(paymentOrder.total_price ?? 0).toLocaleString('id-ID')}</p>
                                <p className="text-xs text-muted-foreground break-all">Order ID: {paymentOrder.transaction_id || paymentOrder.id}</p>
                                {paymentOrder.expires_at && (
                                    <p className="text-xs text-red-500 font-medium mt-1">
                                        Bayar sebelum: {new Date(paymentOrder.expires_at).toLocaleString('id-ID')}
                                    </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-2">
                                    Status dicek otomatis...
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="hidden md:block overflow-x-auto px-4 sm:px-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Daftar Pesanan</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                        <Lock className="mr-2 h-4 w-4" />
                        Ubah Password
                    </Button>
                </div>
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
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{order.product?.title}</span>
                                        {order.product?.is_preorder && <span className="text-[10px] text-orange-600 font-semibold border border-orange-200 bg-orange-50 w-fit px-1.5 rounded-full mt-0.5">Preorder</span>}
                                    </div>
                                </TableCell>
                                <TableCell>{(order.quantity ?? 1)} unit</TableCell>
                                <TableCell>
                                    {isExpired(order) ? (
                                        <Badge variant="destructive">Expired</Badge>
                                    ) : (
                                        <Badge
                                            variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'failed' ? 'destructive' : 'secondary'}
                                            className={order.payment_status === 'pending' && order.payment_url ? "cursor-pointer hover:bg-secondary/80" : ""}
                                            onClick={() => order.payment_status === 'pending' && order.payment_url && setPaymentOrder(order)}
                                        >
                                            {order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'failed' ? 'Gagal' : 'Pending'}
                                        </Badge>
                                    )}
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
                                        <div className="space-y-2">
                                            {isExpired(order) ? (
                                                <span className="text-destructive text-sm font-medium">Pesanan kadaluarsa. Silakan order ulang.</span>
                                            ) : (
                                                <>
                                                    <span className="text-muted-foreground text-sm block">Bayar untuk menerima akun</span>
                                                    {order.payment_url ? (
                                                        <Button size="sm" onClick={() => setPaymentOrder(order)}>Bayar Sekarang</Button>
                                                    ) : (
                                                        <span className="text-xs text-amber-600 block mt-1">
                                                            QRIS belum tersedia (Order Lama). <br />
                                                            Silakan order ulang.
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
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
                                <div className="flex-1">
                                    {order.product?.is_preorder && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] h-5 px-1.5 mr-2">PO</Badge>}
                                    <span className="font-medium line-clamp-2 inline">{order.product?.title}</span>
                                </div>
                                {isExpired(order) ? (
                                    <Badge variant="destructive" className="shrink-0">Expired</Badge>
                                ) : (
                                    <Badge
                                        variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'failed' ? 'destructive' : 'secondary'}
                                        className={`shrink-0 ${order.payment_status === 'pending' && order.payment_url ? "cursor-pointer" : ""}`}
                                        onClick={() => order.payment_status === 'pending' && order.payment_url && setPaymentOrder(order)}
                                    >
                                        {order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'failed' ? 'Gagal' : 'Pending'}
                                    </Badge>
                                )}
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
                                <div className="mt-2">
                                    {isExpired(order) ? (
                                        <p className="text-xs text-destructive font-medium">Pesanan kadaluarsa.</p>
                                    ) : (
                                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Menunggu pembayaran</p>
                                            {order.payment_url && (
                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPaymentOrder(order)}>Bayar</Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </>
    )
}
