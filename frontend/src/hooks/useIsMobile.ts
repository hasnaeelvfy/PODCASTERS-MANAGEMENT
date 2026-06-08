'use client';

import { useMediaQuery } from './useMediaQuery';

/** Matches Tailwind `md` breakpoint — phones & small devices (≤767px). */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}
