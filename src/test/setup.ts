import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
