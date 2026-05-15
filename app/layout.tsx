import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITF Workspace",
  description: "Unified Digital Access Portal for ITF Systems",
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
