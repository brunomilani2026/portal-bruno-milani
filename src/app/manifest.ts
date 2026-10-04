import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bruno Milani — Meus sistemas",
    short_name: "Meu Dia",
    description: "Portal pessoal do Bruno Milani: Meu Dia, Briefing e atalhos para os sistemas.",
    start_url: "/central",
    display: "standalone",
    background_color: "#f5f5f3",
    theme_color: "#73162f",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
