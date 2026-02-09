'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ProductReviewForm({
    productId,
    canReview,
    alreadyReviewed,
}: {
    productId: string
    canReview: boolean
    alreadyReviewed: boolean
}) {
    const router = useRouter()
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)

    if (alreadyReviewed) {
        return (
            <Card className="border-dashed bg-muted/30">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Anda sudah memberi ulasan untuk produk ini. Terima kasih!
                </CardContent>
            </Card>
        )
    }

    if (!canReview) {
        return (
            <Card className="border-dashed bg-muted/30">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Beli dan selesaikan pembayaran produk ini untuk bisa memberi ulasan.{' '}
                    <Link href="/login" className="underline font-medium">Login</Link> untuk melihat riwayat order.
                </CardContent>
            </Card>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating < 1 || rating > 5) {
            toast.error('Pilih rating 1–5 bintang')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, rating, comment }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Gagal mengirim ulasan')
                return
            }
            toast.success('Ulasan berhasil dikirim. Terima kasih!')
            setRating(0)
            setComment('')
            router.refresh()
        } catch {
            toast.error('Gagal mengirim ulasan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Beri Ulasan</CardTitle>
                <p className="text-sm text-muted-foreground">Anda sudah membeli produk ini. Bagaimana pengalaman Anda?</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="text-sm">Rating</Label>
                        <div className="flex gap-1 mt-1.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="p-1 rounded hover:bg-muted transition-colors"
                                    onMouseEnter={() => setHoverRating(i)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(i)}
                                    aria-label={`${i} bintang`}
                                >
                                    <Star
                                        className={`h-8 w-8 transition-colors ${
                                            i <= (hoverRating || rating)
                                                ? 'text-yellow-500 fill-yellow-500'
                                                : 'text-muted-foreground'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{rating > 0 ? `${rating} bintang` : 'Klik bintang untuk memilih'}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="review-comment" className="text-sm">Ulasan (opsional)</Label>
                        <Textarea
                            id="review-comment"
                            placeholder="Tulis pengalaman Anda..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Mengirim...' : 'Kirim Ulasan'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
