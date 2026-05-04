import "@testing-library/jest-dom/vitest";

const getComputedStyleWithoutPseudo = window.getComputedStyle.bind(window);

Object.defineProperty(window, "getComputedStyle", {
  writable: true,
  value: (element: Element) => getComputedStyleWithoutPseudo(element),
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
