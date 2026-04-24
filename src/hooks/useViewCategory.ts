import { useCallback, useEffect, useState } from 'react';
import type { Category } from '../types';

const PARAM = 'view';

const SLUG_TO_CATEGORY: Record<string, Category> = {
  total: 'total',
  il: 'immersivelab_points',
  mario: 'mario_points',
  crokinole: 'crokinole_points',
};

const CATEGORY_TO_SLUG: Record<Category, string> = {
  total: 'total',
  immersivelab_points: 'il',
  mario_points: 'mario',
  crokinole_points: 'crokinole',
};

function readFromUrl(): Category {
  if (typeof window === 'undefined') return 'total';
  const slug = new URLSearchParams(window.location.search).get(PARAM);
  return (slug && SLUG_TO_CATEGORY[slug]) || 'total';
}

export function useViewCategory(): [Category, (next: Category) => void] {
  const [category, setCategory] = useState<Category>(readFromUrl);

  useEffect(() => {
    const onPop = (): void => setCategory(readFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const set = useCallback((next: Category) => {
    setCategory(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (next === 'total') {
      url.searchParams.delete(PARAM);
    } else {
      url.searchParams.set(PARAM, CATEGORY_TO_SLUG[next]);
    }
    window.history.replaceState(null, '', url);
  }, []);

  return [category, set];
}
