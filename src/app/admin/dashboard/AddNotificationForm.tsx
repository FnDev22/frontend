'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function AddNotificationForm() {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            toast.error('Judul wajib diisi')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), message: message.trim() || undefined }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Gagal membuat notifikasi')
                return
            }
            toast.success('Notifikasi berhasil dikirim')
            setTitle('')
            setMessage('')
        } catch {
            toast.error('Gagal membuat notifikasi')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Kirim notifikasi ke semua user</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="notif-title">Judul</Label>
                        <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Promo spesial" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="notif-msg">Pesan (opsional)</Label>
                        <Textarea id="notif-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Detail notifikasi..." rows={3} className="resize-none" />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kirim Notifikasi
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
