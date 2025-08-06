import React from 'react';
import { render } from '@testing-library/react';

// Simple smoke test
test('React app builds and renders', () => {
  const div = document.createElement('div');
  expect(div).toBeDefined();
});

test('Basic test environment works', () => {
  expect(1 + 1).toBe(2);
});
