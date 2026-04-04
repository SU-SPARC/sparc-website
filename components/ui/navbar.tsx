"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "Home",
    description: "Start here for SPARC highlights and updates.",
    image: "/sparc-1.jpg",
  },
  {
    href: "/about",
    label: "About",
    description: "Learn SPARC's mission, focus areas, and story.",
    image: "/sparc-3.jpg",
  },
  {
    href: "/team",
    label: "Team",
    description: "Meet the student leaders and founding members.",
    image: "/sparc-2.jpg",
  },
  {
    href: "/events",
    label: "Events",
    description: "See upcoming workshops, panels, and club sessions.",
    image: "/sparc-8.jpeg",
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Explore member projects and proposal ideas.",
    image: "/sparc-projects.jpeg",
  },
  {
    href: "/join",
    label: "Join",
    description: "Apply to SPARC and learn how recruitment works.",
    image: "/sparc-7.jpeg",
  },
  {
    href: "/contact",
    label: "Contact",
    description: "Reach out by email and stay updated on channels.",
    image: "/sparc-contact.jpeg",
  },
];

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [suppressPreviews, setSuppressPreviews] = useState(false);

    const handleDesktopNavClick = () => {
      setSuppressPreviews(true);
    };

    return (
        <header className="relative z-120 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="flex size-8 sm:size-9 items-center justify-center">
                        <img src="/sparc-logo.png" alt="SPARC" className="size-full object-contain rounded-full" />
                    </div>
                    <div className="hidden sm:flex flex-col leading-tight">
                        <span className="text-sm font-semibold tracking-tight">
                            SPARC
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Suffolk Programming, AI & Research Club
                        </span>
                    </div>
                </Link>

                <nav
                  className="hidden items-center gap-1 text-sm font-medium lg:flex"
                  onMouseLeave={() => setSuppressPreviews(false)}
                >
                  {navItems.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      description={item.description}
                      image={item.image}
                      suppressPreview={suppressPreviews}
                      onNavClick={handleDesktopNavClick}
                    />
                  ))}
                </nav>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button
                        asChild
                        size="sm"
                        className="hidden lg:inline-flex"
                    >
                        <Link href="/join">Join</Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="lg:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <X className="size-5" />
                        ) : (
                            <Menu className="size-5" />
                        )}
                    </Button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="border-t border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
                    <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm font-medium">
                      {navItems.map((item) => (
                        <MobileNavLink
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.label}
                        </MobileNavLink>
                      ))}
                        {/*<div className="border-t border-zinc-200 pt-3 dark:border-zinc-800 mt-2">
                            <Button
                                asChild
                                className="w-full"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Link href="/join">Apply</Link>
                            </Button>
                        </div>*/}
                    </nav>
                </div>
            )}
        </header>
    )
}

function NavLink({
  href,
  title,
  description,
  image,
  suppressPreview,
  onNavClick,
}: {
  href: string;
  title: string;
  description: string;
  image: string;
  suppressPreview: boolean;
  onNavClick: () => void;
}) {
  return (
    <div className="group relative">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      >
        <Link
          href={href}
          onClick={() => {
            onNavClick();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
        >
          {title}
        </Link>
      </Button>

      <div
        className={`pointer-events-none absolute left-1/2 top-full z-200 mt-3 w-72 -translate-x-1/2 translate-y-1 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 opacity-0 shadow-xl transition duration-200 dark:border-zinc-800 dark:bg-zinc-950/95 ${
          suppressPreview
            ? ""
            : "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        }`}
      >
        <div className="relative h-36">
          <Image
            src={image}
            alt={`${title} preview image`}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/35 via-black/5 to-transparent" />
        </div>
        <div className="space-y-1 p-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className="justify-start px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      onClick={onClick}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

