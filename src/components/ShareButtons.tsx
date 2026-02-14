'use client'

import { Button } from '@/components/ui/button'
import { Facebook, Twitter, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export function ShareButtons({ title, description, url }: { title: string, description: string, url: string }) {

    const handleShare = (platform: 'wa' | 'fb' | 'twitter' | 'copy') => {
        const text = `Cek produk ini: ${title} - ${description}`
        const fullUrl = typeof window !== 'undefined' ? window.location.href : url

        if (platform === 'wa') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + fullUrl)}`, '_blank')
        } else if (platform === 'fb') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`, '_blank')
        } else if (platform === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`, '_blank')
        } else {
            navigator.clipboard.writeText(fullUrl)
            toast.success('Link disalin ke clipboard')
        }
    }

    return (
        <div className="flex gap-2 mt-4">
            <Button variant="outline" size="icon" onClick={() => handleShare('wa')} className="text-green-600 hover:text-green-700">
                <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleShare('fb')} className="text-blue-600 hover:text-blue-700">
                <Facebook className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleShare('twitter')} className="text-sky-500 hover:text-sky-600">
                <Twitter className="h-5 w-5" />
            </Button>
        </div>
    )
}
