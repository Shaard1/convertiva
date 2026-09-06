import type { Metadata } from "next";
import "./globals.css";
import { RouteLoadingIndicator } from "@/components/RouteLoadingIndicator";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Convertiva",
  description:
    "A minimal converter platform for image, video, document, and audio files.",
  icons: {
    icon: "/brand/favicon.png",
    shortcut: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
};

const themeScript = `
  (function () {
    try {
      var storedTheme = localStorage.getItem("convertly-theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var theme = storedTheme || (prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.dataset.theme = theme;
    } catch (error) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <RouteLoadingIndicator />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

