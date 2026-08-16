import type { Metadata } from "next";
import { Cinzel, Crimson_Pro, Courier_Prime } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Códice — Grimorio de Worldbuilding",
  description: "Compañero de worldbuilding y creación de universos en español.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${crimsonPro.variable} ${courierPrime.variable}`}
    >
      <body className="bg-ink text-parchment font-body min-h-screen antialiased selection:bg-gold/20 selection:text-parchment">
        {children}
      </body>
    </html>
  );
}
