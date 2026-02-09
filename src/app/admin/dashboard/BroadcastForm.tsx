'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

export function BroadcastForm() {
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [broadcastResult, setBroadcastResult] = useState<{
        total: number
        sent: number
        failed: number
    } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) {
            toast.error('Pesan wajib diisi')
            return
        }
        if (message.trim().length < 5) {
            toast.error('Pesan minimal 5 karakter')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Gagal mengirim broadcast')
                return
            }

            setBroadcastResult({
                total: data.total ?? 0,
                sent: data.sent ?? 0,
                failed: data.failed ?? 0,
            })

            if (data.sent > 0) {
                toast.success(`Pesan berhasil dikirim ke ${data.sent} nomor WhatsApp`)
            }

            if (data.failed > 0) {
                toast.warning(`${data.failed} nomor gagal menerima pesan`)
            }

            if (data.sent === 0 && data.total === 0) {
                toast.info('Tidak ada nomor WhatsApp dari pengguna yang pernah order')
            }

            setMessage('')
        } catch (error) {
            toast.error('Gagal mengirim broadcast')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Broadcast WhatsApp</CardTitle>
                <CardDescription>Kirim pesan ke semua pengguna yang telah melakukan pemesanan</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <label htmlFor="broadcast-msg" className="text-sm font-medium">
                            Pesan
                        </label>
                        <Textarea
                            id="broadcast-msg"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Contoh: Jangan lupa ordermu masih pending, silahkan selesaikan pembayaran..."
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Karakter: {message.length}
                        </p>
                    </div>

                    {broadcastResult && (
                        <div className="bg-muted p-3 rounded-lg space-y-2">
                            <p className="text-sm font-medium">Hasil Broadcast:</p>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Total</p>
                                    <p className="text-lg font-bold">{broadcastResult.total}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-green-600">Terkirim</p>
                                    <p className="text-lg font-bold text-green-600">{broadcastResult.sent}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-red-600">Gagal</p>
                                    <p className="text-lg font-bold text-red-600">{broadcastResult.failed}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" />
                        Kirim Broadcast
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
