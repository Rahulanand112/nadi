import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/features/theme/theme-script";
import { ServiceWorkerRegistration } from "@/components/features/pwa/service-worker-registration";
import { InstallPrompt } from "@/components/features/pwa/install-prompt";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nadi",
    template: "%s | Nadi",
  },
  description:
    "Shared task and habit tracking for families and small teams. Nadi keeps every member's tasks personal and every household's progress visible.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    // iOS does not read the manifest at all -- this specific tag is the only
    // thing that puts an icon on the home screen instead of a blank square.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    // Without this, Safari opens an installed Nadi inside its own chrome
    // (address bar, tab strip) instead of full-screen -- indistinguishable
    // from a bookmark, which defeats the point of installing at all.
    capable: true,
    statusBarStyle: "default",
    title: "Nadi",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        {children}

        {/* Renders nothing. Registers /sw.js -- the prerequisite for both
            "Add to Home Screen" working properly and Slice 3's push. Lives
            in the root layout, not a specific page, so every entry point
            into Nadi gets a service worker, not just the dashboard. */}
        <ServiceWorkerRegistration />

        {/* The one visible piece of this slice: a dismissible banner
            offering to install Nadi, shown only once the browser confirms
            it is actually possible (Android's beforeinstallprompt fired, or
            iOS is detected). */}
        <InstallPrompt />
      </body>
    </html>
  );
}
