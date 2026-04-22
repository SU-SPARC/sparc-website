import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/ui/navbar";
import {Footer} from "@/components/ui/footer";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPARC - Suffolk Programming, AI & Research Club",
  description:
    "Suffolk Programming, AI & Research Club (SPARC) is a student-led community for AI, computing, and research at Suffolk University.",
  openGraph: {
    title: "SPARC - Suffolk Programming, AI & Research Club",
    description: "Suffolk Programming, AI & Research Club (SPARC) is a student-led community for AI, computing, and research at Suffolk University.",
    url: "https://sparc-su.vercel.app/",
    siteName: "SPARC",
    type: "website",
    images: [
      {
        url: "https://sparc-su.vercel.app/sparc-8.jpeg",
        width: 1920,
        height: 1080,
        alt: "SPARC - Suffolk Programming, AI & Research Club Preview",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark", "dim"]}
          disableTransitionOnChange
        >
          <Navbar />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

