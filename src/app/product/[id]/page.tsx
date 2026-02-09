import { createClient } from '@/lib/supabase-server'
import { getPublicStorageUrl } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, ShoppingCart, Star, Clock, Info, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProductReviewForm } from './ProductReviewForm'

export const revalidate = 0

interface Props {
    params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const { data: productRows } = await supabase.rpc('get_product_with_stock', { p_product_id: id })
    const product = Array.isArray(productRows) ? productRows[0] : productRows

    if (!product) {
        notFound()
    }

    const { data: reviews } = await supabase
        .from('reviews')
        .select('*, user:profiles(*)')
        .eq('product_id', id)
        .order('created_at', { ascending: false })

    const { data: { session } } = await supabase.auth.getSession()
    let canReview = false
    let alreadyReviewed = false
    if (session?.user?.id) {
        const { data: paidOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('product_id', id)
            .eq('payment_status', 'paid')
            .limit(1)
            .maybeSingle()
        canReview = !!paidOrder
        const { data: myReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('product_id', id)
            .maybeSingle()
        alreadyReviewed = !!myReview
    }

    const soldCount = product.sold_count ?? 0
    const availableStock = product.available_stock ?? 0
    const minBuy = product.min_buy ?? 1
    const canBuy = availableStock >= minBuy

    return (
        <div className="container px-4 py-6 sm:py-10 md:px-6 max-w-5xl mx-auto">
            {/* Breadcrumb - center on desktop */}
            <nav className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground mb-6 sm:mb-8 flex-wrap">
                <Link href="/" className="hover:text-foreground transition-colors">Beranda</Link>
                <ChevronRight className="h-4 w-4 shrink-0" />
                <Link href="/#produk" className="hover:text-foreground transition-colors">Produk</Link>
                <ChevronRight className="h-4 w-4 shrink-0" />
                <span className="text-foreground font-medium truncate max-w-[180px] sm:max-w-none">{product.title}</span>
            </nav>

            {/* Produk: grid di tengah (max-width agar tidak full lebar di desktop) */}
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 items-start max-w-4xl mx-auto">
                <div className="rounded-2xl overflow-hidden border-2 bg-muted aspect-video md:aspect-square relative shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={getPublicStorageUrl(product.image_url) || 'https://placehold.co/600x400/png?text=Product'}
                        alt={product.title}
                        className="object-cover w-full h-full"
                    />
                </div>
                <div className="space-y-5 sm:space-y-6">
                    <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className="font-normal">{product.category}</Badge>
                            <Badge variant="secondary">Terjual {soldCount}</Badge>
                            <Badge variant="outline">Stok {availableStock}</Badge>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">{product.title}</h1>
                        <p className="text-xl sm:text-2xl font-bold mt-3">Rp {Number(product.price).toLocaleString('id-ID')}</p>
                        <p className="text-sm text-muted-foreground mt-1">per unit</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-muted/80 p-4 rounded-xl flex items-center gap-3 border">
                            <div className="rounded-lg bg-background p-2"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Pengiriman</p>
                                <p className="font-medium text-sm">{product.avg_delivery_time || 'Instan'}</p>
                            </div>
                        </div>
                        <div className="bg-muted/80 p-4 rounded-xl flex items-center gap-3 border">
                            <div className="rounded-lg bg-background p-2"><Info className="h-4 w-4 text-muted-foreground" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Min. pembelian</p>
                                <p className="font-medium text-sm">{minBuy} unit</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {canBuy ? (
                            <Button asChild size="lg" className="w-full md:w-auto">
                                <Link href={`/checkout?productId=${product.id}`}>
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                    Beli Sekarang
                                </Link>
                            </Button>
                        ) : (
                            <Button size="lg" className="w-full md:w-auto" disabled>
                                Stok habis
                            </Button>
                        )}
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            <span>Pengiriman otomatis setelah pembayaran</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            <span>Pembayaran aman via QRIS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deskripsi di bawah grid */}
            <div className="max-w-4xl mx-auto mt-8">
                <Card className="border-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Deskripsi</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {product.description}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <section className="mt-12 sm:mt-16 pt-8 border-t max-w-4xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Ulasan</h2>
                <div className="mb-6">
                    <ProductReviewForm productId={id} canReview={canReview} alreadyReviewed={alreadyReviewed} />
                </div>
                <div className="grid gap-4 sm:gap-6">
                    {reviews?.map((review: any) => (
                        <Card key={review.id} className="overflow-hidden">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <Avatar>
                                    <AvatarImage src={review.user?.avatar_url} />
                                    <AvatarFallback>{review.user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base">{review.user?.full_name || 'Anonymous'}</CardTitle>
                                    <div className="flex items-center text-xs text-muted-foreground">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                        ))}
                                        <span className="ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{review.comment}</p>
                            </CardContent>
                        </Card>
                    ))}
                    {(!reviews || reviews.length === 0) && (
                        <div className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">
                            <Star className="mx-auto h-10 w-10 opacity-40 mb-2" />
                            <p>Belum ada ulasan.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
