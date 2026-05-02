import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ChessMate — Play. Learn. Dominate.",
  description: "Modern chess platform with AI opponent, multiplayer, and coaching",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-900">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
