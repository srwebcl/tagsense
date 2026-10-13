import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TAGSENSE",
  description: "Gestión de activos industriales — identificación por QR/NFC, checklists e informes de mantenimiento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: algunas extensiones del navegador (ej. ColorZilla)
          inyectan atributos como cz-shortcut-listen en <body> antes de que React
          hidrate — no es un bug de la app, ver https://react.dev/link/hydration-mismatch */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
