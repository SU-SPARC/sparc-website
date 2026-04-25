"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type HeroSlideshowProps = {
  images: string[];
  autoAdvanceMs?: number;
};

export default function HeroSlideshow({
  images,
  autoAdvanceMs = 4200,
}: HeroSlideshowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shuffledImages = useMemo(() => {
    const next = [...images];

    // Fisher-Yates shuffle to randomize order for each load.
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }

    return next;
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const hasSlides = shuffledImages.length > 0;
  const canSlide = shuffledImages.length > 1;

  const boundedIndex = useMemo(() => {
    if (!hasSlides) {
      return 0;
    }

    return Math.min(Math.max(activeIndex, 0), shuffledImages.length - 1);
  }, [activeIndex, hasSlides, shuffledImages.length]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const target = container.children[index] as HTMLElement | undefined;
    if (!target) {
      return;
    }

    // Scroll only inside the slideshow container to avoid moving page scroll.
    container.scrollTo({
      left: target.offsetLeft,
      behavior,
    });
  }, []);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (!hasSlides) {
        return;
      }

      const wrapped = (nextIndex + shuffledImages.length) % shuffledImages.length;
      setActiveIndex(wrapped);
      scrollToIndex(wrapped);
    },
    [hasSlides, shuffledImages.length, scrollToIndex],
  );

  const goToNext = useCallback(() => {
    goToIndex(boundedIndex + 1);
  }, [boundedIndex, goToIndex]);

  const goToPrevious = useCallback(() => {
    goToIndex(boundedIndex - 1);
  }, [boundedIndex, goToIndex]);

  useEffect(() => {
    if (!canSlide || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % shuffledImages.length;
        scrollToIndex(next);
        return next;
      });
    }, autoAdvanceMs);

    return () => window.clearInterval(timer);
  }, [autoAdvanceMs, canSlide, isPaused, scrollToIndex, shuffledImages.length]);

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

  if (!hasSlides) {
    return null;
  }

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="SPARC gallery slideshow"
      >
        {shuffledImages.map((image, index) => (
          <div key={`${image}-${index}`} className="relative h-48 w-full shrink-0 snap-start sm:h-56 md:h-64">
            <Image
              unoptimized
              src={image}
              alt={`SPARC gallery image ${index + 1}`}
              fill
              className="rounded-2xl object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {canSlide && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/40 bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 sm:inline-flex"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-4" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/40 bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 sm:inline-flex"
            aria-label="Next image"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {shuffledImages.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                onClick={() => goToIndex(index)}
                className={`pointer-events-auto h-2 rounded-full transition-all ${boundedIndex === index ? "w-6 bg-white" : "w-2 bg-white/55"
                  }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
