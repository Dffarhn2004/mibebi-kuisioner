import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bisnis Analysis Position | Mibebi",
  description:
    "Analisis posisi bisnis resto Mibebi: diagnosis operasional, peluang penjualan, dan rekomendasi fitur berdasarkan Business Health Check.",
  applicationName: "Bisnis Analysis Position",
  themeColor: "#D83028",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Bisnis Analysis Position",
    title: "Bisnis Analysis Position | Mibebi",
    description:
      "Analisis posisi bisnis resto Mibebi: diagnosis operasional, peluang penjualan, dan rekomendasi fitur.",
    images: [
      {
        url: "/LogoMibebiTransparan.png",
        width: 512,
        height: 512,
        alt: "Bisnis Analysis Position — Mibebi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bisnis Analysis Position | Mibebi",
    description:
      "Analisis posisi bisnis resto Mibebi: diagnosis operasional, peluang penjualan, dan rekomendasi fitur.",
    images: ["/LogoMibebiTransparan.png"],
  },
  icons: {
    icon: [{ url: "/LogoMibebiTransparan.png", type: "image/png" }],
    shortcut: ["/LogoMibebiTransparan.png"],
    apple: [
      {
        url: "/LogoMibebiTransparan.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
