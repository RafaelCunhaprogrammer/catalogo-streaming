import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const isBrowserLike = typeof window !== 'undefined';

// O jsdom não implementa matchMedia; o site e o Motion consultam essa API.
// (Testes de rotas internas usam o ambiente "node", sem window.)
if (isBrowserLike && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  if (!isBrowserLike) return;
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
});
