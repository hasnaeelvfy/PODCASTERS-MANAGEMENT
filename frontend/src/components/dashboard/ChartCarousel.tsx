'use client';

import { ReactNode } from 'react';

interface ChartCarouselProps {
  children: ReactNode[];
}

/** Horizontally swipeable chart panels on mobile; stacked grid on desktop. */
export function ChartCarousel({ children }: ChartCarouselProps) {
  return (
    <>
      <div className="md:hidden -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scroll pb-1">
          {children.map((child, i) => (
            <div key={i} className="snap-center shrink-0 w-[calc(100vw-2rem)] max-w-full">
              {child}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-[var(--text-dimmed)] mt-2">Glissez pour voir plus →</p>
      </div>
      <div className="hidden md:grid md:grid-cols-2 gap-4">{children}</div>
    </>
  );
}
