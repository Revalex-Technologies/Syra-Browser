import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import store from '~/renderer/views/app/store';
import { ExtensionsWrapper } from './style';

/**
 * Renders the BrowserAction (<browser-action-list/>) area and reports whether any
 * extension actions are actually present so the parent can reserve spacing only when needed.
 * This encapsulates all extension-specific UI so other UI components don't need to know about it.
 */
export const RemovedActions = observer(
  ({ onPresenceChange }: { onPresenceChange?: (present: boolean) => void }) => {
    const listRef = React.useRef<any>(null);

    // No browser actions at all in incognito window
    if (store.isIncognito) {
      try {
        onPresenceChange?.(false);
      } catch {}
      return null;
    }

    // Manifest V3 path: injected custom element provides presence via layout
    if (process.env.ENABLE_EXTENSIONS) {
      const { selectedTabId } = store.tabs;
      const [present, setPresent] = React.useState(false);

      React.useEffect(() => {
        const el = listRef.current as HTMLElement | null;
        const RO = (window as any).ResizeObserver;
        const handle = () => {
          const isPresent = !!el && el.offsetWidth > 0;
          setPresent(isPresent);
          try {
            onPresenceChange?.(isPresent);
          } catch {}
        };
        let cleanup: (() => void) | undefined;

        if (el) {
          handle();
          if (RO) {
            const ro = new RO(handle);
            ro.observe(el);
            cleanup = () => ro.disconnect();
          } else {
            const id = window.setInterval(handle, 300);
            cleanup = () => window.clearInterval(id);
          }
        }

        return cleanup;
      }, [onPresenceChange, store.tabs.selectedTabId]);

      return (
        <ExtensionsWrapper present={present}>
          {React.createElement('browser-action-list', {
            id: 'actions',
            alignment: 'bottom right',
            partition: 'persist:view',
            tab: selectedTabId ?? undefined,
            ref: listRef,
          } as any)}
        </ExtensionsWrapper>
      );
    }

    const { selectedTabId } = store.tabs;
    const hasMv2 =
      !!selectedTabId &&
      store.extensions.browserActions.some((x) => x.tabId === selectedTabId);
    React.useEffect(() => {
      try {
        onPresenceChange?.(hasMv2);
      } catch {}
    }, [hasMv2, onPresenceChange]);

    return <ExtensionsWrapper present={hasMv2}>{null}</ExtensionsWrapper>;
  },
);

export const BrowserActionsExtensions = RemovedActions;
