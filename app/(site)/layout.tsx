import Navbar from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

/* Public chrome. The root layout owns <html>, fonts, metadata and the theme
   provider; this route group adds the skip link, the nav and the footer so
   that the signed-in areas (/dashboard, /admin) can use their own shells. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      {/* Not a <main> — every page already renders its own, and
          nesting landmarks breaks screen-reader navigation. This is
          just the skip-link target. */}
      <div id="main">{children}</div>
      <Footer />
    </>
  );
}
