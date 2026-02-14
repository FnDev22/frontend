'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Upload, FileJson } from 'lucide-react'
import { Product } from '@/types'

export default function BulkUploadPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [textData, setTextData] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase.from('products').select('id, title, created_at').order('created_at', { ascending: false })
                if (error) {
                    console.error('Fetch products error:', error)
                    toast.error('Gagal memuat produk: ' + error.message)
                } else if (data) {
                    setProducts(data as any)
                }
            } catch (err) {
                console.error('Fetch products exception:', err)
                toast.error('Gagal menghubungi database')
            } finally {
                setLoading(false)
            }
        }
        fetchProducts()
    }, [])

    /** Parse accounts from text (email:password or email,password per line) */
    const parseTextAccounts = (text: string) => {
        return text.trim().split('\n').map(line => {
            const parts = line.includes(',') ? line.split(',') : line.split(':')
            const email = parts[0]?.trim()
            const password = parts.slice(1).join(':').trim()
            if (email && password) return { email, password }
            return null
        }).filter(Boolean)
    }

    /** Handle JSON file upload */
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string

                if (file.name.endsWith('.json')) {
                    // Parse JSON - expecting array of {email, password} or [{email, password}]
                    const json = JSON.parse(content)
                    const accounts = Array.isArray(json) ? json : [json]
                    const lines = accounts
                        .filter((a: any) => a.email && a.password)
                        .map((a: any) => `${a.email}:${a.password}`)
                        .join('\n')
                    if (lines) {
                        setTextData(prev => prev ? prev + '\n' + lines : lines)
                        toast.success(`${accounts.filter((a: any) => a.email && a.password).length} akun dimuat dari file JSON`)
                    } else {
                        toast.error('File JSON tidak berisi data akun yang valid. Format: [{"email":"...", "password":"..."}]')
                    }
                } else {
                    // Plain text file (txt/csv) - each line is email:password
                    setTextData(prev => prev ? prev + '\n' + content.trim() : content.trim())
                    const lineCount = content.trim().split('\n').length
                    toast.success(`${lineCount} baris dimuat dari file`)
                }
            } catch (err) {
                toast.error('Gagal membaca file. Pastikan format JSON valid.')
            }
        }
        reader.readAsText(file)

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleImport = async () => {
        if (!selectedProductId) {
            toast.error('Pilih produk terlebih dahulu')
            return
        }
        if (!textData.trim()) {
            toast.error('Masukkan data akun')
            return
        }

        setImporting(true)
        try {
            const accounts = parseTextAccounts(textData)

            if (accounts.length === 0) {
                toast.error('Format data tidak valid. Gunakan format email:password per baris.')
                setImporting(false)
                return
            }

            const response = await fetch('/api/admin/products/import-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProductId,
                    accounts
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Gagal import')

            toast.success(`Berhasil mengimport ${result.count} akun!`)
            setTextData('')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="container max-w-4xl py-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Stok Akun</h1>
                <p className="text-muted-foreground">Tambahkan banyak akun sekaligus untuk produk tertentu.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Import Akun</CardTitle>
                    <CardDescription>
                        Format: <code>email:password</code> atau <code>email,password</code> (satu per baris).
                        Bisa juga upload file <code>.json</code> atau <code>.txt</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Pilih Produk</Label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger>
                                <SelectValue placeholder={loading ? "Memuat produk..." : "Pilih produk..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label>Upload File (JSON / TXT)</Label>
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,.txt,.csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileJson className="mr-2 h-4 w-4" /> Pilih File
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                JSON: <code>{`[{"email":"...","password":"..."}]`}</code>
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Data Akun</Label>
                        <Textarea
                            placeholder={`user1@example.com:password123\nuser2@example.com:pass456\n...`}
                            rows={10}
                            className="font-mono text-sm"
                            value={textData}
                            onChange={(e) => setTextData(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {textData.trim() ? `${textData.trim().split('\n').length} baris terdeteksi` : 'Setiap baris akan dianggap sebagai satu stok akun.'}
                        </p>
                    </div>

                    <Button onClick={handleImport} disabled={importing || !selectedProductId || !textData.trim()} className="w-full sm:w-auto">
                        {importing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Mengimport...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Import Stok
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
