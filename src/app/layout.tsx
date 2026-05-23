import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shrink — Local Image Compressor & Optimizer",
  description: "Securely compress, resize, and convert images (JPEG, PNG, WEBP, AVIF, HEIC) fully offline in your browser sandbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#FBFBFB] dark:bg-[#0c0d0e] text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-200">
        <AppProvider>
          <div className="flex-1 flex flex-col md:flex-row min-h-screen">
            {/* Sidebar Navigation Panel */}
            <Sidebar />

            {/* Right Side Main Viewport */}
            <div className="flex-1 flex flex-col min-h-screen md:pl-72 relative">
              {/* Header Top Navbar */}
              <Header />

              {/* Central Main Workspace Content Router */}
              <main className="flex-1 pt-16 flex flex-col">
                {children}
              </main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}

