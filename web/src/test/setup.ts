import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest.config has `globals: false`, so RTL's vitest auto-cleanup integration
// is not registered automatically. Wire it up explicitly so each test starts
// from a clean DOM.
afterEach(() => {
  cleanup();
});
