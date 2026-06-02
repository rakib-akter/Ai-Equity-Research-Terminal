import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}