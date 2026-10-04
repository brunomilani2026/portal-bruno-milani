import type { Metadata, Viewport } from "next";
import { Assistant, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const corpo = Assistant({ subsets: ["latin"], variable: "--fonte-corpo", display: "swap" });
const titulo = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--fonte-titulo", display: "swap" });

export const metadata: Metadata = {
  title: "Bruno Milani — Meus sistemas",
  description: "Portal pessoal de acesso aos sistemas do Bruno Milani.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#73162f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
