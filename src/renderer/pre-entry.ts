import { configureRenderer } from '~/common/renderer-config';

if (process.env.ENABLE_EXTENSIONS) {
  try {
    const {
      injectBrowserAction,
    } = require('electron-chrome-extensions/browser-action');
    if (typeof injectBrowserAction === 'function') {
      injectBrowserAction();
    }
  } catch (err) {
    console.error('[pre-entry] Failed to inject browser action:', err);
  }
}

configureRenderer();
