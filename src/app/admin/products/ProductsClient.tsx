'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Product, AccountStock } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash, Package, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getPublicStorageUrl } from '@/lib/utils'

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const [products, setProducts] = useState<Product[]>(initialProducts)

    useEffect(() => {
        setProducts(initialProducts)
    }, [initialProducts])
    const [isOpen, setIsOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [accountStock, setAccountStock] = useState<AccountStock[]>([])
    const [stockLoading, setStockLoading] = useState(false)
    const [addEmail, setAddEmail] = useState('')
    const [addPassword, setAddPassword] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [addingAccount, setAddingAccount] = useState(false)
    const [editingAccount, setEditingAccount] = useState<AccountStock | null>(null)
    const [editAccountEmail, setEditAccountEmail] = useState('')
    const [editAccountPassword, setEditAccountPassword] = useState('')
    const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const formDataDefaults = {
        title: '',
        description: '',
        price: '',
        category: '',
        image_url: '',
        min_buy: 1,
        avg_delivery_time: '',
        instructions: '',
    }
    const [formData, setFormData] = useState(formDataDefaults)

    const resetForm = () => {
        setFormData(formDataDefaults)
        setEditingProduct(null)
        setAccountStock([])
        setAddEmail('')
        setAddPassword('')
        setImageFile(null)
        fileInputRef.current?.setAttribute('value', '')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    useEffect(() => {
        if (!editingProduct?.id) {
            setAccountStock([])
            setStockLoading(false)
            return
        }
        let cancelled = false
        setStockLoading(true)
        fetch(`/api/admin/products/accounts?product_id=${encodeURIComponent(editingProduct.id)}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return
                setAccountStock(Array.isArray(data?.list) ? data.list : [])
            })
            .catch(() => {
                if (!cancelled) setAccountStock([])
            })
            .finally(() => {
                if (!cancelled) setStockLoading(false)
            })
        return () => { cancelled = true }
    }, [editingProduct?.id])

    /** Upload via API kita (proxy) ke ImgBB. */
    const uploadImage = async (file: File): Promise<string> => {
        const form = new FormData()
        form.append('file', file, file.name)

        const res = await fetch('/api/upload-image', {
            method: 'POST',
            body: form,
        })
        const data = await res.json().catch(() => ({}))
        const imageUrl = data?.url ?? data?.data?.url ?? data?.data?.image?.url ?? data?.image?.url
        if (!res.ok) {
            throw new Error(typeof data?.error === 'string' ? data.error : 'Gagal upload gambar')
        }
        if (!imageUrl) {
            throw new Error('URL gambar tidak diterima')
        }
        return imageUrl
    }

    const handleSave = async () => {
        const priceNum = parseFloat(formData.price)
        if (!formData.title?.trim()) {
            toast.error('Title wajib diisi')
            return
        }
        if (Number.isNaN(priceNum) || priceNum < 0) {
            toast.error('Price harus angka yang valid')
            return
        }

        let imageUrl = formData.image_url

        if (imageFile) {
            setUploading(true)
            try {
                imageUrl = await uploadImage(imageFile)
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Gagal upload gambar')
                setUploading(false)
                return
            }
            setUploading(false)
        }

        const productData = {
            title: formData.title.trim(),
            description: formData.description?.trim() ?? '',
            price: priceNum,
            category: formData.category?.trim() ?? '',
            image_url: imageUrl || '',
            min_buy: formData.min_buy,
            avg_delivery_time: formData.avg_delivery_time?.trim() ?? '',
            instructions: formData.instructions?.trim() ?? '',
            is_sold: false,
        }

        try {
            if (editingProduct) {
                const res = await fetch('/api/admin/products', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingProduct.id, ...productData }),
                    credentials: 'include',
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data?.error || 'Update gagal')
                toast.success('Product updated')
                setProducts((prev) =>
                    prev.map((p) => (p.id === editingProduct.id ? { ...p, ...productData } : p))
                )
            } else {
                const res = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData),
                    credentials: 'include',
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data?.error || 'Simpan gagal')
                toast.success('Product created')
                const newRow = data as Product
                setProducts((prev) => [newRow, ...prev])
            }
            setIsOpen(false)
            resetForm()
            router.refresh()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Error')
        }
    }

    const handleAddAccount = async () => {
        if (!editingProduct?.id || !addEmail.trim() || !addPassword.trim()) {
            toast.error('Email dan password wajib')
            return
        }
        setAddingAccount(true)
        try {
            const res = await fetch('/api/admin/products/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    product_id: editingProduct.id,
                    email: addEmail.trim(),
                    password: addPassword.trim(),
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error ?? 'Gagal menambah akun')
                return
            }
            toast.success('Akun ditambahkan')
            setAddEmail('')
            setAddPassword('')
            setAccountStock(Array.isArray(data.list) ? data.list : [])
        } catch (err) {
            const msg = err instanceof Error ? err.message : ''
            if (msg.includes('Abort') || (err as { name?: string })?.name === 'AbortError') return
            toast.error(msg || 'Gagal menambah akun')
        } finally {
            setAddingAccount(false)
        }
    }

    const handleEditAccount = (row: AccountStock) => {
        setEditingAccount(row)
        setEditAccountEmail(row.email)
        setEditAccountPassword(row.password)
    }

    const handleSaveEditAccount = async () => {
        if (!editingAccount || !editingProduct?.id) return
        setAccountActionLoading(editingAccount.id)
        try {
            const res = await fetch('/api/admin/products/accounts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: editingAccount.id,
                    product_id: editingProduct.id,
                    email: editAccountEmail.trim(),
                    password: editAccountPassword.trim(),
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Gagal mengubah akun')
                return
            }
            toast.success('Akun diperbarui')
            setEditingAccount(null)
            if (Array.isArray(data.list)) setAccountStock(data.list)
        } catch {
            toast.error('Gagal mengubah akun')
        } finally {
            setAccountActionLoading(null)
        }
    }

    const handleDeleteAccount = async (row: AccountStock) => {
        if (!editingProduct?.id || row.is_sold) return
        if (!confirm('Hapus akun ini dari stok?')) return
        setAccountActionLoading(row.id)
        try {
            const res = await fetch(`/api/admin/products/accounts?account_id=${encodeURIComponent(row.id)}&product_id=${encodeURIComponent(editingProduct.id)}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Gagal menghapus akun')
                return
            }
            toast.success('Akun dihapus')
            if (Array.isArray(data.list)) setAccountStock(data.list)
        } catch {
            toast.error('Gagal menghapus akun')
        } finally {
            setAccountActionLoading(null)
        }
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setImageFile(null)
        fileInputRef.current?.setAttribute('value', '')
        if (fileInputRef.current) fileInputRef.current.value = ''
        setFormData({
            title: product.title,
            description: product.description ?? '',
            price: product.price.toString(),
            category: product.category ?? '',
            image_url: product.image_url ?? '',
            min_buy: product.min_buy ?? 1,
            avg_delivery_time: product.avg_delivery_time ?? '',
            instructions: product.instructions ?? '',
        })
        setIsOpen(true)
    }

    const handleDelete = (id: string) => {
        setDeletingProductId(id)
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!deletingProductId) return
        setIsDeleting(true)
        try {
            const { error } = await supabase.from('products').delete().eq('id', deletingProductId)
            if (error) {
                toast.error(error.message)
            } else {
                toast.success('Produk dihapus')
                setProducts((prev) => prev.filter((p) => p.id !== deletingProductId))
                router.refresh()
            }
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setDeletingProductId(null)
        }
    }

    const deletingProduct = products.find((p) => p.id === deletingProductId)

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Products</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                            <DialogDescription className="sr-only">Form tambah atau edit produk</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Title</Label>
                                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Category</Label>
                                    <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Price</Label>
                                    <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Min Buy</Label>
                                    <Input type="number" value={formData.min_buy} onChange={(e) => setFormData({ ...formData, min_buy: parseInt(e.target.value) || 1 })} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Avg Delivery Time</Label>
                                <Input value={formData.avg_delivery_time} placeholder="e.g. Instant, 10-30 mins" onChange={(e) => setFormData({ ...formData, avg_delivery_time: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Gambar Produk</Label>
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    <div className="border rounded-lg overflow-hidden bg-muted/30 w-full sm:w-40 h-32 flex items-center justify-center shrink-0">
                                        {imageFile ? (
                                            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-contain" />
                                        ) : formData.image_url ? (
                                            <img src={getPublicStorageUrl(formData.image_url)} alt="Produk" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-muted-foreground text-sm flex flex-col items-center gap-1">
                                                <ImageIcon className="h-8 w-8" />
                                                Belum ada gambar
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                setImageFile(f || null)
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {formData.image_url || imageFile ? 'Ganti gambar' : 'Upload gambar'}
                                        </Button>
                                        {(formData.image_url || imageFile) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground"
                                                onClick={() => {
                                                    setImageFile(null)
                                                    setFormData({ ...formData, image_url: '' })
                                                    if (fileInputRef.current) fileInputRef.current.value = ''
                                                }}
                                            >
                                                Hapus gambar
                                            </Button>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">Atau paste URL gambar (jika upload timeout):</p>
                                        <Input
                                            placeholder="https://..."
                                            value={formData.image_url}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Instructions (dikirim setelah pembelian)</Label>
                                <Textarea value={formData.instructions} placeholder="Cara penggunaan akun..." onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} />
                            </div>

                            {editingProduct && (
                                <div className="border-t pt-4 space-y-4">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Package className="h-4 w-4" />
                                        Stok Akun
                                    </div>
                                    {stockLoading ? (
                                        <p className="text-sm text-muted-foreground">Memuat...</p>
                                    ) : (
                                        <>
                                            <div className="rounded border overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Email</TableHead>
                                                            <TableHead>Password</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="w-24">Aksi</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {accountStock.map((row) => (
                                                            <TableRow key={row.id || row.email + row.created_at}>
                                                                <TableCell className="font-mono text-xs">{row.email}</TableCell>
                                                                <TableCell className="font-mono text-xs">{row.is_sold ? '••••••••' : row.password}</TableCell>
                                                                <TableCell>{row.is_sold ? 'Terjual' : 'Tersedia'}</TableCell>
                                                                <TableCell>
                                                                    {!row.is_sold && (
                                                                        <div className="flex gap-1">
                                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditAccount(row)} disabled={!!accountActionLoading} title="Edit">
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteAccount(row)} disabled={!!accountActionLoading} title="Hapus">
                                                                                {accountActionLoading === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {accountStock.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-muted-foreground text-sm text-center py-4">
                                                                    Belum ada akun. Tambah di bawah.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <div className="flex gap-2 flex-wrap items-end">
                                                <div className="grid gap-1 flex-1 min-w-[140px]">
                                                    <Label className="text-xs">Email</Label>
                                                    <Input placeholder="email@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
                                                </div>
                                                <div className="grid gap-1 flex-1 min-w-[140px]">
                                                    <Label className="text-xs">Password</Label>
                                                    <Input type="password" placeholder="••••••••" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} />
                                                </div>
                                                <Button type="button" size="sm" onClick={handleAddAccount} disabled={addingAccount}>
                                                    {addingAccount ? 'Menambah...' : 'Tambah Akun'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <Button onClick={handleSave} disabled={uploading}>
                                {uploading ? 'Mengupload gambar...' : editingProduct ? 'Update' : 'Save'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Dialog Edit Akun */}
            <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Akun</DialogTitle>
                        <DialogDescription>Ubah email atau password akun stok.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input value={editAccountEmail} onChange={(e) => setEditAccountEmail(e.target.value)} placeholder="email@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Password</Label>
                            <Input type="password" value={editAccountPassword} onChange={(e) => setEditAccountPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setEditingAccount(null)}>Batal</Button>
                            <Button onClick={handleSaveEditAccount} disabled={!!accountActionLoading}>
                                {accountActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Simpan
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Hapus Produk */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Produk</DialogTitle>
                        <DialogDescription>
                            Anda yakin ingin menghapus produk <span className="font-semibold">{deletingProduct?.title}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Tindakan ini tidak dapat dibatalkan. Namun riwayat pemesanan akan tetap tersimpan.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Hapus
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Stok</TableHead>
                            <TableHead>Terjual</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>{product.title}</TableCell>
                                <TableCell>Rp {Number(product.price).toLocaleString('id-ID')}</TableCell>
                                <TableCell>{product.category}</TableCell>
                                <TableCell>{product.available_stock ?? 0}</TableCell>
                                <TableCell>{product.sold_count ?? 0}</TableCell>
                                <TableCell className="flex gap-2">
                                    <Button variant="outline" size="icon" onClick={() => handleEdit(product)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDelete(product.id)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
