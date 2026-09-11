import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { RouteLoadingIndicator } from "@/components/RouteLoadingIndicator";

export const metadata: Metadata = {
  title: "Convertiva",
  description:
    "A minimal converter platform for image, video, document, and audio files.",
  icons: {
    icon: "/icon.svg",
    apple: "/brand/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" nonce={nonce} />
        <RouteLoadingIndicator />
        {children}
      </body>
    </html>
  );
}

