import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SITE } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Fusíveis automotivos e componentes elétricos`, template: `%s | ${SITE.name}` },
  description:
    "Fabricante nacional de fusíveis automotivos desde 1977, com linha completa de cordoalhas, terminais e cabos de bateria para distribuidores de autopeças e indústria.",
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE.name },
};

export const viewport: Viewport = {
  themeColor: "#003a63",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${plex.variable} ${plexMono.variable}`} suppressHydrationWarning>
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
