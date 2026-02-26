import "@testing-library/jest-dom";

Element.prototype.scrollIntoView = () => {};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfill ResizeObserver for Radix UI components in the JSDOM test environment
class ResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    // no-op for tests
  }

  unobserve() {
    // no-op for tests
  }

  disconnect() {
    // no-op for tests
  }
}

// @ts-expect-error - attach to global for tests
global.ResizeObserver = ResizeObserver;
