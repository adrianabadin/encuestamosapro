import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relevamiento Sanitario Territorial | MOSAPRO",
  description:
    "Movimiento Sanitario Provincial — Relevamiento participativo para la transformación del sistema de salud bonaerense.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-mosapro.png", sizes: "305x287", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#567c7f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap"
        />
      </head>
      <body className="min-h-dvh flex flex-col bg-[#f3f6f7] text-[#1f2f40]">
        {children}
      </body>
    </html>
  );
}
