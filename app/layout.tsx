import type { Metadata } from "next";
import { Ultra, Martian_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

/* Poster face. Single weight, latin only, ~15KB.
   Used in exactly two places: the hero and the footer wordmark.
   `preload: false` because it never appears above the fold on any page
   except the home hero, which requests it explicitly. */
const ultra = Ultra({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ultra",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: false,
});

/* Everything else. Variable on two axes — weight 100–800 and width
   75–112.5. The width axis is why body copy can be condensed without
   shrinking the type. ~23KB. */
const martian = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian",
  display: "swap",
  axes: ["wdth"],
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sparc-su.vercel.app"),
  title: {
    default: "SPARC — Suffolk Programming, AI & Research Club",
    template: "%s · SPARC",
  },
  description:
    "A student-led club at Suffolk University where members build software, work on AI, and find real internship opportunities.",
  openGraph: {
    type: "website",
    siteName: "SPARC",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* The font variables go on <html>, not <body>.
     globals.css declares --font-body / --font-mono / --font-poster at :root
     as var(--font-martian) / var(--font-ultra). Custom properties resolve
     where they are declared and then inherit their computed value, so if
     --font-martian is only defined on <body>, the :root declaration is
     already invalid by the time <body> is reached — it inherits an empty
     value and never recovers. Body copy silently fell back to Tailwind's
     sans stack and .poster never applied Ultra. Measured in the browser;
     it compiles clean either way, which is what makes it easy to miss. */
  return (
    <html
      lang="en"
      className={`${ultra.variable} ${martian.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          themes={["light", "dark", "dim"]}
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Navbar />
          {/* Not a <main> — every page already renders its own, and
              nesting landmarks breaks screen-reader navigation. This is
              just the skip-link target. */}
          <div id="main">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
