import type { Metadata, Viewport } from "next"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { PwaRegister } from "@/components/pwa-register"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/context/theme-context"
import "./globals.css"

export const metadata: Metadata = {
  applicationName: "Lex-Doc Sorter",
  metadataBase: new URL("https://lex-sorter.ru"),
  title: "Lex-Doc Sorter",
  description: "Сервис подготовки и сортировки юридических документов",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lex-Doc",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Lex-Doc",
    "msapplication-TileColor": "#2563eb",
    "msapplication-TileImage": "/mstile-150.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#050a14" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PwaRegister />
            <PwaInstallPrompt />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
