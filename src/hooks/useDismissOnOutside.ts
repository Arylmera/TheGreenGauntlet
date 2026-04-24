import { useEffect, type RefObject } from 'react';

type Options = {
  active: boolean;
  refs: RefObject<HTMLElement | null>[];
  onDismiss: () => void;
  onEscape?: () => void;
};

export function useDismissOnOutside({ active, refs, onDismiss, onEscape }: Options): void {
  useEffect(() => {
    if (!active) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      for (const ref of refs) {
        if (ref.current?.contains(target)) return;
      }
      onDismiss();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss();
        onEscape?.();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, refs, onDismiss, onEscape]);
}
