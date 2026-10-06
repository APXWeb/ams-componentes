import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SITE } from "@/lib/site";
import "./globals.css";

// mesma dupla tipográfica das propostas Intercientifica: títulos em Figtree, texto em Noto Sans
const figtree = Figtree({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-figtree", display: "swap" });
const noto = Noto_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-noto", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Fusíveis automotivos e componentes elétricos`, template: `%s | ${SITE.name}` },
  description:
    "Fabricante nacional de fusíveis automotivos desde 1977, com linha completa de cordoalhas, terminais e cabos de bateria para distribuidores de autopeças e indústria.",
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE.name },
  ...(process.env.PREVIEW_MODE === "1" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#003a63",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} ${noto.variable}`} suppressHydrationWarning>
      <head>
        {/* ativa as animações de entrada apenas quando há JavaScript */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
