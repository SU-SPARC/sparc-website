"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NewsItem = {
  title: string;
  date: string;
  image: string;
};

type NewsCarouselProps = {
  items: NewsItem[];
  href?: string;
  autoAdvanceMs?: number;
};

export default function NewsCarousel({
  items,
  href = "/events",
  autoAdvanceMs = 3500,
}: NewsCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const canSlide = items.length > 1;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const target = container.children[index] as HTMLElement | undefined;
    if (!target) {
      return;
    }

    container.scrollTo({ left: target.offsetLeft, behavior });
  }, []);

  useEffect(() => {
    if (!canSlide || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollToIndex(next);
        return next;
      });
    }, autoAdvanceMs);

    return () => window.clearInterval(timer);
  }, [autoAdvanceMs, canSlide, isPaused, items.length, scrollToIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canSlide) {
      return;
    }

    let ticking = false;

    const updateActiveFromScroll = () => {
      const children = Array.from(container.children) as HTMLElement[];
      if (children.length === 0) {
        ticking = false;
        return;
      }

      const containerLeft = container.getBoundingClientRect().left;
      let nearest = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      children.forEach((child, index) => {
        const distance = Math.abs(child.getBoundingClientRect().left - containerLeft);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nearest = index;
        }
      });

      setActiveIndex(nearest);
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateActiveFromScroll);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [canSlide]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <Link
            href={href}
            key={`${item.image}-${index}`}
            className="group relative h-64 min-w-70 overflow-hidden rounded-2xl sm:min-w-85 snap-start"
            aria-label={`Open events page from: ${item.title}`}
          >
            <Image
              unoptimized
              src={item.image}
              alt={item.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

            <div className="absolute left-3 top-3 right-3">
              <p className="inline-block bg-black/50 rounded-2xl px-3 py-1 text-sm font-semibold text-zinc-100">
                {item.title}
              </p>
            </div>

            <div className="absolute left-3 bottom-3">
              <p className="bg-black/50 rounded-2xl px-3 py-1.5 text-sm font-sm text-zinc-100">
                {item.date}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {canSlide && (
        <div className="flex items-center justify-center gap-1.5">
          {items.map((_, index) => (
            <button
              key={`news-dot-${index}`}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                scrollToIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                activeIndex === index ? "w-6 bg-zinc-900 dark:bg-zinc-100" : "w-2 bg-zinc-400 dark:bg-zinc-600"
              }`}
              aria-label={`Go to news item ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
