'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { History, Search, ShieldAlert } from 'lucide-react'

type LoginLog = {
    id: string
    user_id: string
    email: string
    role: string
    ip_address: string
    device_info: string
    created_at: string
}

export default function LogsClient({ logs }: { logs: LoginLog[] }) {
    const [search, setSearch] = useState('')

    const filteredLogs = logs.filter(log =>
        log.email?.toLowerCase().includes(search.toLowerCase()) ||
        log.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
        log.device_info?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <History className="h-6 w-6" />
                    Aktivitas Login
                </h1>
                <p className="text-muted-foreground">Monitoring akses login pengguna.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">History Login ({filteredLogs.length})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari email, IP, atau device..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Waktu</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Device</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Tidak ada data log.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{log.email}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{log.user_id.split('-')[0]}...</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.role === 'admin' ? 'default' : 'secondary'}>
                                                    {log.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {log.ip_address}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {log.device_info}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
