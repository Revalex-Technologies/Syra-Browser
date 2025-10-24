import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { injectFonts } from '~/renderer/mixins';
import { configureUI } from '~/common/renderer-config';

export const renderWebUI = (Component: any) => {
  injectFonts();
  configureUI();

  const el = document.getElementById('app') as HTMLElement | null;
  if (!el) {
    console.error('syra WebUI: #app element not found');
    return;
  }

  try {
    // Prefer React 18 root API if available at runtime

    const client = require('react-dom/client');
    if (client && typeof client.createRoot === 'function') {
      const root = client.createRoot(el);
      root.render(React.createElement(Component));
      return;
    }
  } catch (e) {
    // fall through to legacy render
  }

  // Legacy React 17 path
  (ReactDOM as any).render(React.createElement(Component), el);
};
