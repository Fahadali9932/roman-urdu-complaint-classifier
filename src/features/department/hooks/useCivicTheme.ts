import { useState, useEffect, useCallback } from 'react';
import { canonicalizeDepartmentKey } from '../services/departmentThemes';

export type CivicThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'awaaz_dept_theme_mode';
const LEGACY_STORAGE_KEY = 'aawaaz-demo-theme';

export function syncDocumentDepartment(deptKey?: string | null) {
  if (typeof document === 'undefined') return;
  if (deptKey) {
    const canonical = canonicalizeDepartmentKey(deptKey);
    document.documentElement.setAttribute('data-dept', canonical);
  } else {
    document.documentElement.removeAttribute('data-dept');
  }
}

export function useDepartmentAtmosphereEffect(departmentCode?: string | null) {
  useEffect(() => {
    if (!departmentCode) return;
    const canonical = canonicalizeDepartmentKey(departmentCode);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-dept', canonical);
    }
    return () => {
      // Keep or reset on unmount if navigating away from department
    };
  }, [departmentCode]);
}

export function useCivicTheme() {
  const [theme, setThemeState] = useState<CivicThemeMode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const applyTheme = useCallback((mode: CivicThemeMode) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_STORAGE_KEY, theme);
    }
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((mode: CivicThemeMode) => {
    setThemeState(mode);
  }, []);

  return { theme, toggleTheme, setTheme };
}
