import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Equity Research Terminal",
  description: "Free SEC financial dashboard and rule-based investment memo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-sky-500 text-sm font-bold text-slate-950">
                Æ
              </span>
              <span className="text-sm font-semibold tracking-tight text-slate-200 group-hover:text-white">
                AI Equity Research Terminal
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/compare"
                className="font-medium text-slate-400 transition-colors hover:text-sky-300"
              >
                Compare
              </Link>
              <span className="hidden text-xs text-slate-500 sm:block">
                Data: SEC EDGAR
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
