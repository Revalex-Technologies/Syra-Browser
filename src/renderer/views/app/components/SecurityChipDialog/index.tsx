import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
/**
 * SecurityChipDialog (Renderer) - Scaffold
 * ----------------------------------------
 * Placeholder React component to configure the dynamic security button.
 * Not wired into the app tree yet.
 *
 * TODO (later):
 *  - Build actual form controls for:
 *    • Override label/icon per origin
 *    • Trust rules (treat as internal/extension/other)
 *    • Per-scheme toggles (http/https/chrome-extension/webui)
 *  - Wire to IPC to load/save preferences
 */
import * as React from 'react';

export const SecurityChipDialog: React.FC = () => {
  // TODO: replace with real UI
  return (
    <div style={{ padding: 16 }}>
      <h3>Security Chip Settings (TODO)</h3>
      <p>
        Configure the dynamic security button for Internal / Extension / Not
        Secure states.
      </p>
      <ul>
        <li>TODO: custom label</li>
        <li>TODO: custom icon</li>
        <li>TODO: per-origin rules</li>
      </ul>
    </div>
  );
};

export default SecurityChipDialog;
