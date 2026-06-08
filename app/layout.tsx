import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PublicaYa",
  description: "Genera fotos profesionales, descripción y categorías para tus prendas con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className={`${geist.className} h-full`}>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
