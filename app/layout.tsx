import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavHeader } from "@/components/nav-header";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/footer"
import { SoundProvider } from "@/components/sound-provider"
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
  title: "🏥🩸 LaPD",
  description: "Guess the diagnosis from clinical clues",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <SoundProvider>
            <div className="flex min-h-screen flex-col">
              <NavHeader />
              <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
