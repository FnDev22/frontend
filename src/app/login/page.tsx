'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

function LoginForm() {
    const [mounted, setMounted] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        const error = searchParams.get('error')
        const reason = searchParams.get('reason') || ''
        if (error === 'auth_failed') toast.error(reason || 'Login Google gagal. Coba lagi atau gunakan email/password.')
        if (error === 'missing_code') {
            toast.error('Redirect URL belum dikonfigurasi. Lihat petunjuk di bawah.', { duration: 8000 })
        }
        if (error === 'callback_failed') {
            toast.error(reason || 'Gagal menyelesaikan login.', { duration: 8000 })
        }
    }, [mounted, searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast.error(error.message)
            } else {
                toast.success('Login successful!')
                router.push('/')
                router.refresh()
            }
        } catch (error) {
            toast.error('An error occurred during login')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        try {
            const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                },
            })
            if (error) throw error
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Login Google gagal')
        } finally {
            setLoading(false)
        }
    }

    const hasMissingCodeError = mounted && searchParams.get('error') === 'missing_code'

    if (!mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <div className="w-full max-w-md border border-border rounded-xl bg-card p-6 animate-pulse">
                    <div className="h-7 bg-muted rounded w-3/4 mx-auto mb-2" />
                    <div className="h-4 bg-muted rounded w-full mx-auto mb-6" />
                    <div className="h-10 bg-muted rounded w-full mb-4" />
                    <div className="h-10 bg-muted rounded w-full mb-4" />
                    <div className="h-10 bg-muted rounded w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Login to F-PEDIA</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" onClick={handleGoogleLogin} disabled={loading}>
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Google
                        </Button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2 mt-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button className="w-full mt-4" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            <Link href="/reset-password" className="underline hover:no-underline">Lupa password?</Link>
                        </p>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Belum punya akun? <Link href="/register" className="text-foreground underline hover:no-underline">Daftar</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <div className="w-full max-w-md border border-border rounded-xl p-8 animate-pulse bg-muted/30" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
