import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Pastikan URL gambar Supabase Storage memakai endpoint public (menghindari 400). */
export function getPublicStorageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return ''
  if (url.includes('/object/public/')) return url
  return url.replace('/storage/v1/object/', '/storage/v1/object/public/')
}
