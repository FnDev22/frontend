import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Zap, HeadphonesIcon, ArrowRight, Bolt, Search } from 'lucide-react'
import { getPublicStorageUrl } from '@/lib/utils'

export const revalidate = 0

type ProductRow = {
  id: string
  title: string
  description?: string
  price: number
  category?: string
  image_url?: string
  available_stock?: number
  sold_count?: number
}

// Helper component for Typewriter effect
const TypewriterText = ({ text }: { text: string }) => {
  return (
    <span className="inline-block overflow-hidden whitespace-nowrap border-r-4 border-primary animate-typing">
      {text}
    </span>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: products } = await supabase.rpc('get_products_with_stock')
  const list = (products || []) as ProductRow[]
  const isLoggedIn = !!user

  return (
    <>
      <style>{`
        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }
        @keyframes blink {
          50% { border-color: transparent }
        }
        .animate-typing {
          animation: typing 2.5s steps(30, end), blink .75s step-end infinite;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center bg-transparent overflow-hidden border-b border-border py-20 px-4">

        {/* Subtle, Light Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-secondary/10 blur-[80px]" />
        </div>

        <div className="container relative z-10 text-center max-w-4xl mx-auto space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background/50 backdrop-blur-md shadow-sm animate-fade-in-up [animation-delay:200ms] opacity-0 fill-mode-forwards">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Live System Status</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight text-foreground animate-fade-in-up [animation-delay:400ms] opacity-0 fill-mode-forwards leading-[0.9]">
              Akses Premium <br />
              <span className="inline-flex">
                <TypewriterText text="Dikirim Instant." />
              </span>
            </h1>
          </div>

          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:600ms] opacity-0 fill-mode-forwards">
            Platform otomatisasi produk digital #1. Nikmati kemudahan bertransaksi dengan keamanan tingkat tinggi dan pengiriman detik ini juga.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in-up [animation-delay:800ms] opacity-0 fill-mode-forwards">
            <Button asChild size="lg" className="h-14 px-10 rounded-full text-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <Link href="#produk">
                Mulai Belanja <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            {!isLoggedIn && (
              <Button asChild size="lg" variant="ghost" className="h-14 px-8 rounded-full text-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                <Link href="/register">Buat Akun</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="produk" className="py-24 relative bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tight">Katalog Pilihan</h2>
              <p className="text-muted-foreground mt-2">Pilih produk terbaik untuk kebutuhan digitalmu.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {list.map((product, idx) => {
              const hasStock = (product.available_stock ?? 0) > 0
              const sold = product.sold_count ?? 0
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group relative flex flex-col rounded-3xl bg-card border border-border shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden hover:-translate-y-2 animate-fade-in-up fill-mode-forwards"
                  style={{ animationDelay: `${100 * idx}ms`, animationFillMode: 'both' }}
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                    <img
                      src={getPublicStorageUrl(product.image_url) || 'https://placehold.co/600x400/222/FFF?text=IMG'}
                      alt={product.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="backdrop-blur-md bg-background/80 hover:bg-background/90 transition-colors border-0">
                        {product.category || 'Digital'}
                      </Badge>
                    </div>

                    {!hasStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[2px]">
                        <Badge variant="destructive" className="text-sm px-4 py-1">Habis Terjual</Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description || "Deskripsi produk tidak tersedia."}</p>

                    <div className="mt-auto pt-6 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Harga</span>
                        <span className="text-xl font-bold">Rp {Number(product.price).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        <Zap className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" /> {sold} Terjual
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-muted rounded-3xl w-full max-w-3xl mx-auto px-6">
              <Search className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Belum ada produk</h3>
              <p className="text-muted-foreground">Silakan cek kembali dalam beberapa saat.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
