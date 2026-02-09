'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Notification = { id: string; title: string; message: string | null; created_at: string; is_read: boolean }

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchNotifications = async () => {
        const res = await fetch('/api/notifications', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unread_count ?? 0)
    }

    useEffect(() => {
        fetchNotifications()
        // Poll setiap 30 menit (30 * 60 * 1000)
        const interval = setInterval(fetchNotifications, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const markRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' })
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
        setUnreadCount((c) => Math.max(0, c - 1))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0" align="end">
                <div className="border-b px-4 py-3">
                    <h3 className="font-semibold text-sm">Notifikasi</h3>
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            Belum ada notifikasi
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-muted/30' : ''}`}
                                    onClick={() => {
                                        markRead(n.id)
                                    }}
                                >
                                    <p className="font-medium text-sm">{n.title}</p>
                                    {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
