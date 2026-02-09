'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { supabase } from '@/lib/supabase'
import { type User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, ShoppingBag, Sun, Moon, LayoutDashboard, Package, ShoppingCart, Users, LogOut, Home } from 'lucide-react'
import { Profile } from '@/types'
import { NotificationBell } from '@/components/NotificationBell'

const ADMIN_EMAIL = 'ae132118@gmail.com'

/** Hindari request ke Google CDN (sering 429) yang bikin halaman lama. */
function safeAvatarUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined
    if (url.includes('googleusercontent.com')) return undefined
    return url
}

interface NavbarProps {
    initialUser?: User | null
}

export function Navbar({ initialUser }: NavbarProps) {
    const [user, setUser] = useState<Profile | null>(initialUser ? {
        id: initialUser.id,
        email: initialUser.email || '',
        full_name: initialUser.user_metadata?.full_name || initialUser.email || 'Profil',
        whatsapp_number: '',
        role: initialUser.email === ADMIN_EMAIL ? 'admin' : 'user',
        avatar_url: initialUser.user_metadata?.avatar_url || '',
        created_at: new Date().toISOString(),
    } : null)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const logoSrc = mounted && resolvedTheme === 'light' ? '/logo2.png' : '/logo.png'

    const profileFromAuth = (authUser: { id: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string } }): Profile => ({
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: authUser.user_metadata?.full_name ?? authUser.email ?? 'Profil',
        whatsapp_number: '',
        role: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
        avatar_url: authUser.user_metadata?.avatar_url ?? '',
        created_at: new Date().toISOString(),
    })

    useEffect(() => {
        const getUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .maybeSingle()
                setUser(profile ?? profileFromAuth(authUser))
            } else {
                setUser(null)
            }
        }
        getUser()
        setMounted(true)

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle()
                setUser(profile ?? profileFromAuth(session.user))
            } else {
                setUser(null)
            }
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        router.push('/login')
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 sm:h-16 items-center justify-between gap-2 px-3 sm:px-4 md:px-6 max-w-[100vw]">
                <Link href="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-lg sm:text-xl tracking-tighter min-w-0 shrink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoSrc} alt="F-PEDIA" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 object-contain rounded" />
                    <span className="truncate">F-PEDIA</span>
                </Link>

                {/* Desktop: md and up */}
                <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-sm font-medium shrink-0">
                    <Link href="/" className="transition-colors hover:text-foreground text-muted-foreground whitespace-nowrap" aria-label="Home">
                        <Home className="h-5 w-5" />
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="relative text-muted-foreground h-9 w-9" aria-label="Toggle theme">
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                    {user && <NotificationBell />}
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 rounded-full pl-1 pr-2 h-9">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={safeAvatarUrl(user.avatar_url)} alt={user.full_name} />
                                        <AvatarFallback className="text-xs">{user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="hidden lg:inline text-sm font-medium text-muted-foreground truncate max-w-[140px]">{user.email}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-0.5">
                                        <p className="text-sm font-medium leading-none truncate">{user.full_name || 'Profil'}</p>
                                        <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/user" className="flex items-center gap-2">
                                        <LayoutDashboard className="h-4 w-4" />
                                        Dashboard Saya
                                    </Link>
                                </DropdownMenuItem>
                                {(user.role === 'admin' || user.email === ADMIN_EMAIL) && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Admin</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin/dashboard" className="flex items-center gap-2">
                                                <LayoutDashboard className="h-4 w-4" />
                                                Dashboard Admin
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin/products" className="flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                Produk
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin/orders" className="flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4" />
                                                Pesanan
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin/users" className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Pengguna
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground">
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-1.5 lg:gap-2">
                            <Button variant="ghost" size="sm" className="h-9" asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                            <Button size="sm" className="h-9" asChild>
                                <Link href="/register">Daftar</Link>
                            </Button>
                        </div>
                    )}
                </nav>

                {/* Mobile & Tablet: below md */}
                <div className="flex items-center gap-1 md:hidden shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-10 w-10 text-muted-foreground" aria-label="Toggle theme">
                        <Sun className="h-5 w-5 dark:hidden" />
                        <Moon className="h-5 w-5 hidden dark:block" />
                    </Button>
                    {user && <NotificationBell />}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Menu">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[min(100vw-2rem,320px)] overflow-y-auto">
                            <nav className="grid gap-1 py-4">
                                <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                    <Home className="h-4 w-4" />
                                    Home
                                </Link>
                                {user ? (
                                    <>
                                        <div className="px-3 py-2 border-b">
                                            <p className="text-sm font-medium truncate">{user.full_name || 'Profil'}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                        <Link href="/dashboard/user" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                            <LayoutDashboard className="h-4 w-4" />
                                            Dashboard Saya
                                        </Link>
                                        {(user.role === 'admin' || user.email === ADMIN_EMAIL) && (
                                            <>
                                                <p className="px-3 pt-2 text-xs text-muted-foreground">Admin</p>
                                                <Link href="/admin/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                                    <LayoutDashboard className="h-4 w-4" />
                                                    Dashboard Admin
                                                </Link>
                                                <Link href="/admin/products" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                                    <Package className="h-4 w-4" />
                                                    Produk
                                                </Link>
                                                <Link href="/admin/orders" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                                    <ShoppingCart className="h-4 w-4" />
                                                    Pesanan
                                                </Link>
                                                <Link href="/admin/users" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                                    <Users className="h-4 w-4" />
                                                    Pengguna
                                                </Link>
                                            </>
                                        )}
                                        <Button variant="outline" onClick={handleLogout} className="justify-start w-full mt-2 h-11 gap-2">
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                            Login
                                        </Link>
                                        <Link href="/register" className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                                            Daftar
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}
