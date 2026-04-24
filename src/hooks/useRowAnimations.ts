import { useLayoutEffect, useRef } from 'react';

const SHIFT_DURATION_MS = 400;

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

export function useRowAnimations<T>(
  tbodyRef: React.RefObject<HTMLTableSectionElement>,
  deps: T,
): void {
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    if (REDUCED_MOTION) {
      prevRectsRef.current = measureRows(tbodyRef.current);
      return;
    }
    const tbody = tbodyRef.current;
    if (!tbody) return;

    const newRects = measureRows(tbody);
    const prevRects = prevRectsRef.current;

    for (const [key, rect] of newRects) {
      const prev = prevRects.get(key);
      if (!prev) continue;
      const dy = prev.top - rect.top;
      if (dy === 0) continue;
      const row = tbody.querySelector<HTMLTableRowElement>(
        `tr[data-key="${cssEscape(key)}"]`,
      );
      if (row) playRowShift(row, dy);
    }

    prevRectsRef.current = newRects;
  }, [deps, tbodyRef]);
}

function measureRows(tbody: HTMLTableSectionElement | null): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>();
  if (!tbody) return m;
  tbody.querySelectorAll<HTMLTableRowElement>('tr[data-key]').forEach((row) => {
    const key = row.dataset.key;
    if (key) m.set(key, row.getBoundingClientRect());
  });
  return m;
}

function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}

function playRowShift(row: HTMLTableRowElement, dy: number): void {
  row.style.transform = `translateY(${dy}px)`;
  row.style.transition = 'transform 0s';
  requestAnimationFrame(() => {
    row.style.transition = `transform ${SHIFT_DURATION_MS}ms ease-out`;
    row.style.transform = '';
    const clear = (): void => {
      row.style.transition = '';
      row.removeEventListener('transitionend', clear);
    };
    row.addEventListener('transitionend', clear);
  });
}
