'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
    const [phone, setPhone] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'verify' | null>(null)
    const router = useRouter()

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!phone.trim()) {
            toast.error('Masukkan nomor WhatsApp')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, purpose: 'reset_password' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Gagal mengirim OTP')

            toast.success('Kode OTP dikirim ke WhatsApp')
            setStep('verify')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal mengirim OTP')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async () => {
        if (!otpCode || !newPassword) {
            toast.error('Lengkapi form')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    otpCode,
                    newPassword
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Gagal mereset password')

            toast.success('Password berhasil diubah, silakan login')
            router.push('/login')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal mereset password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                    <CardDescription className="text-center">
                        Masukkan email Anda. Kami akan mengirim link untuk mengatur ulang password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!step && (
                        <form onSubmit={handleSendOtp} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Nomor WhatsApp</Label>
                                <Input
                                    id="phone"
                                    type="text"
                                    placeholder="62xxxxxxxxxx"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Kirim Kode OTP
                            </Button>
                        </form>
                    )}

                    {step === 'verify' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Kode OTP</Label>
                                <Input
                                    type="text"
                                    placeholder="Masukkan 6 digit kode"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="text-center text-lg tracking-widest"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password Baru</Label>
                                <Input
                                    type="password"
                                    placeholder="Password baru"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ubah Password
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={() => setStep(null)}>Kembali</Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/login" className="text-sm text-muted-foreground underline hover:no-underline">
                        Kembali ke Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
