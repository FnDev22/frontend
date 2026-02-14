'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

export type WholesaleTier = {
    min_qty: number
    price: number
}

interface Props {
    value: WholesaleTier[]
    onChange: (value: WholesaleTier[]) => void
}

export function WholesalePriceInput({ value = [], onChange }: Props) {
    const [tiers, setTiers] = useState<WholesaleTier[]>(value)

    useEffect(() => {
        setTiers(value)
    }, [value])

    const addTier = () => {
        const newTiers = [...tiers, { min_qty: 2, price: 0 }]
        setTiers(newTiers)
        onChange(newTiers)
    }

    const removeTier = (index: number) => {
        const newTiers = tiers.filter((_, i) => i !== index)
        setTiers(newTiers)
        onChange(newTiers)
    }

    const updateTier = (index: number, field: keyof WholesaleTier, val: number) => {
        const newTiers = tiers.map((t, i) => {
            if (i === index) {
                return { ...t, [field]: val }
            }
            return t
        })
        setTiers(newTiers)
        onChange(newTiers)
    }

    return (
        <div className="space-y-3 border p-4 rounded-lg bg-muted/20">
            <div className="flex justify-between items-center">
                <Label>Harga Grosir (Tiered Pricing)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTier}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Tier
                </Button>
            </div>

            {tiers.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                    Belum ada harga grosir diatur.
                </p>
            )}

            {tiers.map((tier, index) => (
                <div key={index} className="flex gap-2 items-end">
                    <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Min. Qty</Label>
                        <Input
                            type="number"
                            min={2}
                            value={tier.min_qty}
                            onChange={(e) => updateTier(index, 'min_qty', parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Harga Satuan</Label>
                        <Input
                            type="number"
                            min={0}
                            value={tier.price}
                            onChange={(e) => updateTier(index, 'price', parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeTier(index)}
                        className="mb-0.5"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}

            <p className="text-xs text-muted-foreground mt-2">
                * Harga grosir akan otomatis diterapkan saat checkout jika jumlah pembelian memenuhi syarat.
            </p>
        </div>
    )
}
