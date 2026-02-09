'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ShoppingCart, CreditCard, ChevronRight, Tag, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Product } from '@/types'
import Link from 'next/link'

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const productId = searchParams.get('productId')
    const [product, setProduct] = useState<Product | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [productLoadDone, setProductLoadDone] = useState(false)

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [note, setNote] = useState('')
    const [promoText, setPromoText] = useState('')
    const [promoDiscount, setPromoDiscount] = useState<{ percent: number; value: number; title: string } | null>(null)
    const [validatingPromo, setValidatingPromo] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)

    const [paymentData, setPaymentData] = useState<{
        qr_string: string
        amount: number
        subtotal?: number
        fee?: number
        total_payment?: number
        transaction_id: string
        order_id: string
    } | null>(null)

    useEffect(() => {
        let cancelled = false
        const init = async () => {
            try {
                // Check auth first
                const { data: { user } } = await supabase.auth.getUser()
                if (cancelled) return

                if (!user) {
                    setCheckingAuth(false)
                    toast.error('Silakan login untuk checkout')
                    router.replace('/login')
                    return
                }

                setIsAuthenticated(true)
                setCheckingAuth(false)

                // Fetch product if productId exists
                if (productId) {
                    const { data, error } = await supabase.rpc('get_product_with_stock', { p_product_id: productId })
                    if (cancelled) return
                    setProductLoadDone(true)
                    const row = Array.isArray(data) ? data[0] : data
                    if (row) {
                        const minBuy = row.min_buy ?? 1
                        setProduct({
                            ...row,
                            min_buy: minBuy,
                            category: row.category ?? '',
                            image_url: row.image_url ?? '',
                            avg_delivery_time: row.avg_delivery_time ?? '',
                            instructions: row.instructions ?? '',
                            description: row.description ?? '',
                            is_sold: row.is_sold ?? false,
                        })
                        setQuantity((q) => (q < minBuy ? minBuy : Math.min(q, row.available_stock ?? minBuy)))
                    } else {
                        setProduct(null)
                        if (error) toast.error('Gagal memuat produk')
                    }
                } else {
                    setProductLoadDone(true)
                }

                // Fetch user profile
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
                if (cancelled) return
                if (profile) {
                    setFullName(profile.full_name || '')
                    setWhatsapp(profile.whatsapp_number || '')
                }
                setEmail(user.email || '')
            } catch (err) {
                console.error('Checkout init error:', err)
                setCheckingAuth(false)
                setProductLoadDone(true)
            }
        }

        init()
        return () => { cancelled = true }
    }, [productId, router])

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: product?.id,
                    fullName,
                    email,
                    whatsapp,
                    note,
                    promo_text: promoText.trim() || undefined,
                    promo_discount_percent: promoDiscount?.percent || 0,
                    promo_discount_value: promoDiscount?.value || 0,
                    quantity,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Checkout failed')
            }

            setPaymentData(result)
            toast.success('Order created! Please scan the QR code to pay.')

        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleValidatePromo = async () => {
        if (!promoText.trim()) {
            toast.error('Masukkan kode promo terlebih dahulu')
            return
        }
        setValidatingPromo(true)
        try {
            const res = await fetch('/api/promos/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: promoText.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Kode promo tidak valid')
                setPromoDiscount(null)
                return
            }
            setPromoDiscount({
                percent: data.discount_percent || 0,
                value: data.discount_value || 0,
                title: data.title || promoText.trim()
            })
            toast.success(`Promo "${data.title || promoText}" berhasil diterapkan!`)
        } catch {
            toast.error('Gagal validasi promo')
            setPromoDiscount(null)
        } finally {
            setValidatingPromo(false)
        }
    }

    const [checkingStatus, setCheckingStatus] = useState(false)

    const handleUpdateStatus = async () => {
        if (!paymentData?.order_id) return
        setCheckingStatus(true)
        try {
            const res = await fetch(`/api/checkout/check-status?order_id=${encodeURIComponent(paymentData.order_id)}`)
            const data = await res.json().catch(() => ({}))
            if (data.paid) {
                toast.success('Pembayaran terverifikasi. Detail akun dikirim ke WhatsApp.')
                router.push('/dashboard/user')
            } else {
                toast.info(data.error || 'Pembayaran belum terdeteksi. Coba lagi setelah transfer.')
            }
        } catch {
            toast.error('Gagal cek status')
        } finally {
            setCheckingStatus(false)
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Memverifikasi...</p>
                </div>
            </div>
        )
    }

    if (!product) {
        if (!productId) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center px-4">
                    <Card className="max-w-sm w-full">
                        <CardContent className="pt-6 text-center">
                            <p className="text-muted-foreground">Tidak ada produk dipilih.</p>
                            <Button asChild className="mt-4"><Link href="/">Pilih produk</Link></Button>
                        </CardContent>
                    </Card>
                </div>
            )
        }
        if (!productLoadDone) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center px-4">
                    <div className="text-center">
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-sm text-muted-foreground">Memuat produk...</p>
                    </div>
                </div>
            )
        }
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <Card className="max-w-sm w-full">
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">Produk tidak ditemukan atau sudah tidak tersedia.</p>
                        <Button asChild className="mt-4"><Link href="/">Kembali ke beranda</Link></Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const availableStock = product.available_stock ?? 0
    const minBuy = product.min_buy ?? 1
    const canBuy = availableStock >= minBuy

    const step = paymentData ? 2 : 1
    const total = Number(product.price) * quantity

    return (
        <div className="container max-w-xl px-4 py-6 sm:py-10 mx-auto">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <ShoppingCart className="h-4 w-4" />
                    <span>Data &amp; order</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <CreditCard className="h-4 w-4" />
                    <span>Pembayaran</span>
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                    <CardTitle className="text-xl sm:text-2xl">Checkout</CardTitle>
                    <CardDescription>Lengkapi data dan selesaikan pembayaran untuk {product.title}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {!paymentData ? (
                        <form onSubmit={handleCheckout} className="space-y-6">
                            <div className="rounded-xl border bg-muted/40 p-4 sm:p-5">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Ringkasan</h3>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">{product.title}</span>
                                    <span className="text-muted-foreground">Rp {Number(product.price).toLocaleString('id-ID')}/unit</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Kategori: {product.category} · Stok: {(product.available_stock ?? 0)} unit</p>
                                <div className="mt-3 pt-3 border-t flex justify-between">
                                    <Label htmlFor="quantity" className="text-sm">Jumlah</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min={minBuy}
                                        max={availableStock}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(minBuy, Math.min(availableStock, parseInt(e.target.value, 10) || minBuy)))}
                                        disabled={!canBuy}
                                        className="w-20 h-9 text-center"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Min. {minBuy} unit</p>
                                <div className="mt-3 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>Rp {total.toLocaleString('id-ID')}</span>
                                    </div>

                                    {promoDiscount && (promoDiscount.percent > 0 || promoDiscount.value > 0) && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Diskon</span>
                                            <span>-Rp {(promoDiscount.percent > 0 ? Math.round(total * promoDiscount.percent / 100) : promoDiscount.value).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Biaya Layanan (QRIS 0.7%)</span>
                                        <span>Rp {(() => {
                                            let subAfterDiscount = total
                                            if (promoDiscount) {
                                                if (promoDiscount.percent > 0) subAfterDiscount -= Math.round(total * promoDiscount.percent / 100)
                                                else if (promoDiscount.value > 0) subAfterDiscount -= promoDiscount.value
                                            }
                                            subAfterDiscount = Math.max(0, subAfterDiscount)
                                            return Math.ceil(subAfterDiscount * 0.007).toLocaleString('id-ID')
                                        })()}</span>
                                    </div>

                                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                        <span>Total Bayar</span>
                                        <span>Rp {(() => {
                                            let finalTotal = total
                                            if (promoDiscount) {
                                                if (promoDiscount.percent > 0) finalTotal -= Math.round(total * promoDiscount.percent / 100)
                                                else if (promoDiscount.value > 0) finalTotal -= promoDiscount.value
                                            }
                                            finalTotal = Math.max(0, finalTotal)
                                            // Add 0.7% admin fee
                                            const fee = Math.ceil(finalTotal * 0.007)
                                            return (finalTotal + fee).toLocaleString('id-ID')
                                        })()}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Total sudah termasuk biaya layanan QRIS.</p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Data pemesan</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="fullName">Nama lengkap</Label>
                                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Nama Anda" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@contoh.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="whatsapp">WhatsApp</Label>
                                        <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="62xxxxxxxxxx" required />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="note">Catatan (opsional)</Label>
                                        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Request khusus atau catatan..." rows={2} className="resize-none" />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="promo">Kode promo (opsional)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="promo"
                                                value={promoText}
                                                onChange={(e) => {
                                                    setPromoText(e.target.value)
                                                    if (promoDiscount) setPromoDiscount(null)
                                                }}
                                                placeholder="Masukkan kode promo"
                                                disabled={!!promoDiscount}
                                            />
                                            {promoDiscount ? (
                                                <Button type="button" variant="outline" size="icon" className="shrink-0 text-green-600 border-green-600">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleValidatePromo}
                                                    disabled={validatingPromo || !promoText.trim()}
                                                    className="shrink-0"
                                                >
                                                    {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cek'}
                                                </Button>
                                            )}
                                        </div>
                                        {promoDiscount && (
                                            <p className="text-xs text-green-600 flex items-center gap-1">
                                                <Check className="h-3 w-3" /> Promo "{promoDiscount.title}" diterapkan
                                                <button type="button" onClick={() => setPromoDiscount(null)} className="ml-1 underline text-muted-foreground hover:text-foreground">Hapus</button>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full h-12 text-base" type="submit" disabled={loading || !canBuy}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {canBuy ? `Lanjut bayar Rp ${(() => {
                                    let finalTotal = total
                                    if (promoDiscount) {
                                        if (promoDiscount.percent > 0) finalTotal -= Math.round(total * promoDiscount.percent / 100)
                                        else if (promoDiscount.value > 0) finalTotal -= promoDiscount.value
                                    }
                                    finalTotal = Math.max(0, finalTotal)
                                    const fee = Math.ceil(finalTotal * 0.007)
                                    return (finalTotal + fee).toLocaleString('id-ID')
                                })()}` : 'Stok tidak cukup'}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center space-y-6">
                            <div className="text-center space-y-2 w-full">
                                <h3 className="font-bold text-lg sm:text-xl">Bayar dengan QRIS</h3>
                                {(paymentData.fee != null && paymentData.fee > 0) && (
                                    <div className="text-left rounded-lg border bg-muted/40 p-3 space-y-1 text-sm max-w-xs mx-auto">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>Rp {(paymentData.subtotal ?? paymentData.amount).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Biaya pembayaran (ditanggung pembeli)</span>
                                            <span>Rp {(paymentData.fee ?? 0).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold pt-1 border-t">
                                            <span>Total yang harus dibayar</span>
                                            <span>Rp {(paymentData.total_payment ?? paymentData.amount).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                )}
                                {(!paymentData.fee || paymentData.fee === 0) && (
                                    <p className="text-2xl sm:text-3xl font-bold">Rp {paymentData.amount.toLocaleString('id-ID')}</p>
                                )}
                                <p className="text-sm text-muted-foreground">Buka aplikasi e-wallet/banking lalu scan QR di bawah</p>
                            </div>

                            <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-dashed shadow-inner">
                                <QRCodeSVG value={paymentData.qr_string} size={240} className="w-full h-auto max-w-[240px] mx-auto" />
                            </div>

                            <div className="w-full space-y-3">
                                <div className="rounded-lg bg-muted px-4 py-3 text-center">
                                    <p className="text-xs text-muted-foreground">Order ID</p>
                                    <p className="font-mono font-semibold text-sm break-all mt-0.5">{paymentData.order_id}</p>
                                </div>
                                <Button className="w-full h-11" onClick={handleUpdateStatus} disabled={checkingStatus}>
                                    {checkingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sudah bayar? Cek status
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">
                                    Setelah pembayaran terverifikasi, detail akun dikirim ke WhatsApp dan muncul di <Link href="/dashboard/user" className="underline">Dashboard</Link>.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    )
}
