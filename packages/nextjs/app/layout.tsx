import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GlobalHeader from "~~/components/GlobalHeader";
import Footer from "~~/components/Footer";
import LiveTicker from "~~/components/LiveTicker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tollgate — The toll road for AI agents",
  description:
    "Publish MCP servers under ENS names. Agents discover the manifest, pay per tool call, and validate the response — without API keys.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-white text-text-primary min-h-screen flex flex-col antialiased">
        <GlobalHeader />
        <main className="flex-1 pb-9">{children}</main>
        <Footer />
        <LiveTicker />
      </body>
    </html>
  );
}
