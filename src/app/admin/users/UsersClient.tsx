'use client'

import { Profile } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useState } from 'react'

export default function UsersClient({ initialUsers }: { initialUsers: Profile[] }) {
    const [users, setUsers] = useState<Profile[]>(initialUsers)
    const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
    const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')

    const handlePasswordChange = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Gagal mengubah password')
                return
            }

            toast.success('Password berhasil diubah')
            setChangingPasswordUserId(null)
            setNewPassword('')
        } catch (error) {
            toast.error('Gagal mengubah password')
            console.error(error)
        }
    }

    const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
        setChangingRoleId(userId)
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Gagal mengubah role')
                return
            }

            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
            toast.success('Role user berhasil diubah')
        } catch (error) {
            toast.error('Gagal mengubah role')
            console.error(error)
        } finally {
            setChangingRoleId(null)
        }
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Users</h1>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback>{user.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.full_name || 'No Name'}</span>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.whatsapp_number || '-'}</TableCell>
                                <TableCell>
                                    <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value as 'user' | 'admin')} disabled={changingRoleId === user.id}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <button
                                        className="text-xs underline text-muted-foreground hover:text-foreground"
                                        onClick={() => setChangingPasswordUserId(user.id)}
                                    >
                                        Ganti Password
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No users found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Change Password Modal */}
            {changingPasswordUserId && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-4">Ubah Password User</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password Baru</label>
                                <input
                                    type="password"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                    onClick={() => {
                                        setChangingPasswordUserId(null)
                                        setNewPassword('')
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                                    onClick={() => handlePasswordChange(changingPasswordUserId)}
                                    disabled={!newPassword || newPassword.length < 6}
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
