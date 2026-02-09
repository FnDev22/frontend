'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Tag, Plus, Trash2 } from 'lucide-react'

type Promo = {
    id: string
    code: string
    title: string
    description?: string
    discount_percent?: number
    discount_value?: number
    valid_from?: string
    valid_until?: string
    is_active?: boolean
    created_at?: string
}

export function AddPromoForm() {
    const [promos, setPromos] = useState<Promo[]>([])
    const [loading, setLoading] = useState(true)
    const [code, setCode] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [discountPercent, setDiscountPercent] = useState('')
    const [discountValue, setDiscountValue] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchPromos = async () => {
        try {
            const res = await fetch('/api/admin/promos')
            if (res.ok) {
                const data = await res.json()
                setPromos(Array.isArray(data) ? data : [])
            }
        } catch {
            toast.error('Gagal memuat promo')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchPromos()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim() || !title.trim()) {
            toast.error('Kode dan judul promo wajib')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch('/api/admin/promos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code.trim(),
                    title: title.trim(),
                    description: description.trim() || undefined,
                    discount_percent: Number(discountPercent) || 0,
                    discount_value: Number(discountValue) || 0,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Gagal menambah promo')
                return
            }
            toast.success('Promo berhasil ditambahkan')
            setCode('')
            setTitle('')
            setDescription('')
            setDiscountPercent('')
            setDiscountValue('')
            void fetchPromos()
        } catch {
            toast.error('Gagal menambah promo')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = (id: string) => {
        setDeletingPromoId(id)
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!deletingPromoId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/admin/promos/${deletingPromoId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Promo dihapus')
                setDeleteDialogOpen(false)
                setDeletingPromoId(null)
                void fetchPromos()
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || 'Gagal menghapus')
            }
        } catch {
            toast.error('Gagal menghapus promo')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Tambah Promo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="promo-code">Kode Promo</Label>
                                <Input id="promo-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Contoh: DISCOUNT10" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="promo-title">Judul</Label>
                                <Input id="promo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Diskon 10%" required />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="promo-desc">Deskripsi (opsional)</Label>
                            <Textarea id="promo-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detail promo..." rows={2} className="resize-none" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="promo-percent">Diskon (%)</Label>
                                <Input id="promo-percent" type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="0" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="promo-value">Diskon Rp (tetap)</Label>
                                <Input id="promo-value" type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0" />
                            </div>
                        </div>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tambah Promo
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Daftar Promo ({promos.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Memuat...</p>
                    ) : promos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada promo.</p>
                    ) : (
                        <div className="space-y-2">
                            {promos.map((p) => (
                                <div key={p.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                    <div>
                                        <span className="font-mono font-medium">{p.code}</span>
                                        <span className="mx-2">–</span>
                                        <span>{p.title}</span>
                                        {(p.discount_percent ?? 0) > 0 && <Badge variant="secondary" className="ml-2">{p.discount_percent}%</Badge>}
                                        {(p.discount_value ?? 0) > 0 && <Badge variant="outline" className="ml-1">Rp {(p.discount_value ?? 0).toLocaleString('id-ID')}</Badge>}
                                        {!p.is_active && <Badge variant="destructive" className="ml-1">Nonaktif</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog Hapus Promo */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Promo</DialogTitle>
                        <DialogDescription>
                            Anda yakin ingin menghapus promo ini? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Batal</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Hapus
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
