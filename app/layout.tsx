import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Family Connect",
  description: "Synchronisez votre famille avec Google Tasks et Google Agenda.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
        <Script src="https://accounts.google.com/gsi/client" async defer strategy="afterInteractive" />
      </body>
    </html>
  );
}
