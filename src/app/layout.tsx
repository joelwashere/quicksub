import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const opensans = Open_Sans({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "Quicksub",
  description: "Upload and translate videos between languages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${opensans.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
