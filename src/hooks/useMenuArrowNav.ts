import { useCallback, type KeyboardEvent, type RefObject } from 'react';

export function useMenuArrowNav(
  menuRef: RefObject<HTMLElement | null>,
  itemSelector: string,
) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(itemSelector) ?? [],
      );
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + delta + items.length) % items.length;
      items[nextIndex]?.focus();
      e.preventDefault();
    },
    [menuRef, itemSelector],
  );
}
