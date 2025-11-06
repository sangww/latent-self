import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latent Self",
  description: "Digital Art by Sang Leigh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ backgroundColor: '#000000', margin: 0, padding: 0, border: 'none', outline: 'none' }}>
        {children}
      </body>
    </html>
  );
}
