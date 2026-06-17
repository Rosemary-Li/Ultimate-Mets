import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Ultimate Mets Database",
  description:
    "Every player, every season, every game, every postseason moment in New York Mets franchise history — searchable, comparable, and connected.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <TopBar />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
