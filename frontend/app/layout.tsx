import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sagepilot AI - Autonomous AI Order Supervisor Dashboard",
  description: "Long-running event-driven AI Order Supervisor workflow control center built with Temporal Python SDK, FastAPI, and Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
