import '@testing-library/jest-dom/vitest';

// jsdom doesn't include ResizeObserver - polyfill for Radix ScrollArea and similar components
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
