import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latent Sheep - AI Art Installation",
  description: "Social media art installation for AI-generated images",
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
