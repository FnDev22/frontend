'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export function WhatsAppTestComponent() {
    const [testPhoneNumber, setTestPhoneNumber] = useState('62812345678')
    const [testMessage, setTestMessage] = useState('Test pesan dari F-PEDIA!')
    const [checking, setChecking] = useState(false)
    const [testing, setTesting] = useState(false)
    const [healthStatus, setHealthStatus] = useState<any>(null)

    const checkHealth = async () => {
        setChecking(true)
        try {
            const res = await fetch('/api/test-whatsapp', { method: 'GET' })
            const data = await res.json()
            setHealthStatus(data)

            if (data.ok) {
                if (data.service_data?.connected) {
                    toast.success('WhatsApp service terkoneksi! ✅')
                } else {
                    toast.warning('WhatsApp service belum paired/terkoneksi ⚠️')
                }
            } else {
                toast.error('WhatsApp service tidak dapat diakses ❌')
            }
        } catch (error) {
            toast.error('Gagal mengecek WhatsApp service')
            console.error(error)
        } finally {
            setChecking(false)
        }
    }

    const testSendMessage = async () => {
        if (!testPhoneNumber.trim() || !testMessage.trim()) {
            toast.error('Nomor WhatsApp dan pesan harus diisi')
            return
        }

        setTesting(true)
        try {
            const res = await fetch('/api/test-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: testPhoneNumber.trim(),
                    message: testMessage.trim(),
                }),
            })
            const data = await res.json()

            if (data.ok) {
                toast.success('Pesan terkirim! ✅')
            } else {
                toast.error(data.error || 'Gagal mengirim pesan')
            }
        } catch (error) {
            toast.error('Gagal mengirim pesan test')
            console.error(error)
        } finally {
            setTesting(false)
        }
    }

    return (
        <Card className="border-2">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    WhatsApp Service Tester
                </CardTitle>
                <CardDescription>Cek koneksi dan test pengiriman pesan WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Health Status */}
                <div>
                    <Button onClick={checkHealth} disabled={checking} variant="outline" className="w-full">
                        {checking ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Mengecek...
                            </>
                        ) : (
                            'Cek Status WhatsApp Service'
                        )}
                    </Button>

                    {healthStatus && (
                        <div className={`mt-3 p-3 rounded-lg ${healthStatus.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                            <div className="flex items-start gap-2">
                                {healthStatus.ok ? (
                                    <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="text-sm space-y-1">
                                    <p className="font-medium">{healthStatus.message}</p>
                                    {healthStatus.service_data && (
                                        <div className="text-xs opacity-75">
                                            <p>• Status: {healthStatus.service_data.connected ? '🟢 Terhubung' : '🔴 Tidak terhubung'}</p>
                                            {healthStatus.service_data.number && (
                                                <p>• Nomor: {healthStatus.service_data.number}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Send Test Message */}
                <div className="border-t pt-4 space-y-3">
                    <h4 className="text-sm font-medium">Test Kirim Pesan</h4>
                    <div className="space-y-2">
                        <Input
                            placeholder="Nomor WhatsApp (misal: 6281234567890)"
                            value={testPhoneNumber}
                            onChange={(e) => setTestPhoneNumber(e.target.value)}
                        />
                        <Input
                            placeholder="Pesan test"
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                        />
                        <Button onClick={testSendMessage} disabled={testing} className="w-full">
                            {testing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Mengirim...
                                </>
                            ) : (
                                'Kirim Pesan Test'
                            )}
                        </Button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded space-y-1">
                    <p>💡 <strong>Tips:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5">
                        <li>Pastikan WhatsApp service sudah dijalankan di terminal</li>
                        <li>Format nomor: 62812345678 (tanpa + atau 0 di depan)</li>
                        <li>Jika tidak terkoneksi, pair ulang menggunakan terminal</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}
