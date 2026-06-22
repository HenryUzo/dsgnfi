import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Dsgnfi AI Studio",
  description: "AI-powered agency workspace for campaign planning and branded content operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
