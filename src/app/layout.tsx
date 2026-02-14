import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WhatsAppFloating } from "@/components/WhatsAppFloating";
import { createClient } from "@/lib/supabase-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F-PEDIA",
  description: "Toko online produk digital akun berkualitas",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

import { SecurityProvider } from "@/components/SecurityProvider";

// ... existing imports

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user?.email === 'ae132118@gmail.com' || user?.user_metadata?.role === 'admin';

  return (
    <html lang="id" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SecurityProvider isAdmin={!!isAdmin}>
          <ThemeProvider>
            <Navbar initialUser={user} />
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
            <WhatsAppFloating />
          </ThemeProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
