import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import { observer } from 'mobx-react-lite';

import store from '../../store';
import { isURL } from '~/utils';
import { callViewMethod } from '~/utils/view';
import { ipcRenderer } from 'electron';
import { Menu, getCurrentWindow } from '@electron/remote';
import { ToolbarButton } from '../ToolbarButton';
import {
  StyledAddressBar,
  InputContainer,
  Input,
  Text,
  SecurityButton,
} from './style';
import {
  ICON_SEARCH,
  ICON_SECURE,
  ICON_NOT_SECURE,
} from '~/renderer/constants';
import { SiteButtons } from '../SiteButtons';
import { DEFAULT_TITLEBAR_HEIGHT } from '~/constants/design';
import { NEWTAB_URL } from '~/constants/tabs';
import { WEBUI_BASE_URL } from '~/constants/files';

const onAddressBarContextMenu = (e: React.MouseEvent<HTMLElement>) => {
  const PADDING = '\\u2003'.repeat(16);
  try {
    e.preventDefault();
    const inputEl =
      (e.currentTarget as HTMLElement).tagName === 'INPUT'
        ? (e.currentTarget as HTMLInputElement)
        : (document.querySelector(
            '[data-addressbar-input="true"]',
          ) as HTMLInputElement) || (store?.inputRef as HTMLInputElement);

    if (inputEl) inputEl.focus();

    const pad = '\u2003\u2003\u2003\u2003'; // em-spaces
    const template = [
      {
        label: 'Undo' + pad,
        role: 'undo',
        accelerator: process.platform === 'darwin' ? 'Cmd+Z' : 'Ctrl+Z',
      },
      { type: 'separator' },
      {
        label: 'Copy' + pad,
        role: 'copy',
        accelerator: process.platform === 'darwin' ? 'Cmd+C' : 'Ctrl+C',
      },
      {
        label: 'Paste' + pad,
        role: 'paste',
        accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V',
      },
      { type: 'separator' },
      {
        label: 'Delete' + pad,
        role: 'delete',
        accelerator: process.platform === 'darwin' ? 'Fn+Delete' : 'Delete',
      },
      { type: 'separator' },
      {
        label: 'Select All' + pad,
        role: 'selectAll',
        accelerator: process.platform === 'darwin' ? 'Cmd+A' : 'Ctrl+A',
      },
      { type: 'separator' },
    ] as any;
    const menu = Menu.buildFromTemplate(template);
    if (typeof getCurrentWindow === 'function') {
      menu.popup({ window: getCurrentWindow() });
    } else {
      menu.popup();
    }
  } catch (err) {
    console.error('AddressBar context menu error:', err);
  }
};

let mouseUpped = false;

const onMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
  e.stopPropagation();

  if (!store.isCompact) return;

  store.addressbarTextVisible = false;
  store.addressbarFocused = true;
};

const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  store.addressbarTextVisible = false;
  store.addressbarFocused = true;

  if (store.tabs.selectedTab) {
    store.tabs.selectedTab.addressbarFocused = true;
  }

  if (store.isCompact) {
    e.currentTarget.select();
  }
};

const onSelect = (e: React.MouseEvent<HTMLInputElement>) => {
  if (store.tabs.selectedTab) {
    store.tabs.selectedTab.addressbarSelectionRange = [
      e.currentTarget.selectionStart,
      e.currentTarget.selectionEnd,
    ];
  }
};

const onMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
  if (
    !store.isCompact &&
    window.getSelection().toString().length === 0 &&
    !mouseUpped
  ) {
    e.currentTarget.select();
  }

  mouseUpped = true;
};

const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Escape' || e.key === 'Enter') {
    store.tabs.selectedTab.addressbarValue = null;
  }

  if (e.key === 'Escape') {
    const target = e.currentTarget;
    requestAnimationFrame(() => {
      target.select();
    });
  }

  if (e.key === 'Enter') {
    store.addressbarFocused = false;
    e.currentTarget.blur();
    const { value } = e.currentTarget;
    let url = value;

    if (isURL(value)) {
      url = value.indexOf('://') === -1 ? `http://${value}` : value;
    } else {
      url = store.settings.searchEngine.url.replace('%s', value);
    }

    store.tabs.selectedTab.addressbarValue = url;
    callViewMethod(store.tabs.selectedTabId, 'loadURL', url);
  }
};

let addressbarRef: HTMLDivElement;

const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  store.tabs.selectedTab.addressbarValue = e.currentTarget.value;

  const { left, top, width } = addressbarRef.getBoundingClientRect();

  if (e.currentTarget.value.trim() !== '') {
    ipcRenderer.send(`search-show-${store.windowId}`, {
      text: e.currentTarget.value,
      cursorPos: e.currentTarget.selectionStart,
      x: left,
      y: Math.round(top),
      isCompact: store.isCompact,
      width: width,
    });
    store.addressbarEditing = true;
  }
};

const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
  window.getSelection().removeAllRanges();
  store.addressbarTextVisible = true;
  store.addressbarFocused = false;
  mouseUpped = false;

  const { selectedTab } = store.tabs;

  if (selectedTab) {
    selectedTab.addressbarFocused = false;
  }
};

const LockIconSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="16"
    height="16"
    aria-hidden="true"
  >
    <path
      d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 8V7a3 3 0 10-6 0v3h6zm-3 4a2 2 0 110 4 2 2 0 010-4z"
      fill="currentColor"
    />
  </svg>
);

const NotSecureIconSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="16"
    height="16"
    aria-hidden="true"
  >
    <path
      d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
      fill="currentColor"
    />
  </svg>
);

export const AddressBar = observer(() => {
  const [appIconUrl, setAppIconUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const p = await ipcRenderer.invoke('get-app-icon-path');
        if (p) setAppIconUrl(p);
      } catch {}
    })();
  }, []);
  return (
    <StyledAddressBar
      onContextMenuCapture={onAddressBarContextMenu}
      ref={(r: any) => (addressbarRef = r)}
      focus={store.addressbarFocused}
    >
      {(() => {
        const tab = store.tabs.selectedTab;
        const showDynamic =
          store.settings.object?.showDynamicSecurityButton !== false;
        const url = tab?.url || '';
        const isNewTab = url.startsWith(NEWTAB_URL);
        const isInternal = !isNewTab && url.startsWith(WEBUI_BASE_URL);
        const isSecure = /^https:\/\//i.test(url);
        const isNotSecure =
          /^http:\/\//i.test(url) || (!isSecure && !isInternal && !!url);

        // TODO: (dialog) Later: open a dynamic security-chip + internal page indacation dialog from this button
        // const openSecurityChipDialog = async () => {
        //   try {
        //     await ipcRenderer.invoke('open-security-chip-dialog', {
        //       source: isInternal ? 'internal' : /^chrome-extension:\/\//i.test(url) ? 'extension' : 'other',
        //       url,
        //     });
        //   } catch (e) { /* swallow for now */ }
        // };

        const isExtension = /^chrome-extension:\/\//i.test(url);
        const isTrusted = isInternal || isExtension;

        if (!showDynamic) {
          return (
            <ToolbarButton
              toggled={false}
              icon={ICON_SEARCH}
              size={16}
              dense
              iconStyle={{ transform: 'scale(-1,1) translateY(0.5px)' }}
            />
          );
        } else if (isNewTab) {
          return (
            <ToolbarButton
              toggled={false}
              icon={ICON_SEARCH}
              size={16}
              dense
              iconStyle={{ transform: 'scale(-1,1) translateY(0.5px)' }}
            />
          );
        }

        const expanded = isTrusted || isNotSecure;
        const danger = isNotSecure && !isTrusted;
        const icon = isTrusted
          ? appIconUrl || ICON_SECURE
          : isSecure
            ? ICON_SECURE
            : ICON_NOT_SECURE;
        const label = isInternal
          ? 'syra'
          : isExtension
            ? 'Extension'
            : danger
              ? 'Not Secure'
              : '';

        return (
          <SecurityButton
            expanded={expanded}
            danger={danger}
            onClick={() => {}}
          >
            <img
              className="icon"
              src={icon}
              alt=""
              style={{
                width: 16,
                height: 16,
                maxWidth: 16,
                maxHeight: 16,
                display: 'inline-block',
                filter:
                  store.theme['toolbar.lightForeground'] &&
                  !danger &&
                  !isTrusted
                    ? 'brightness(0) invert(1)'
                    : 'none',
                marginLeft: isSecure && !isInternal ? '1.5px' : '-1px',
              }}
            />
            {expanded && <div className="label">{label}</div>}
          </SecurityButton>
        );
      })()}

      <InputContainer onContextMenuCapture={onAddressBarContextMenu}>
        <Input
          data-addressbar-input="true"
          onContextMenuCapture={onAddressBarContextMenu}
          ref={(r: any) => (store.inputRef = r)}
          spellCheck={false}
          onKeyDown={onKeyDown}
          onMouseDown={onMouseDown}
          onSelect={onSelect}
          onBlur={onBlur}
          onFocus={onFocus}
          onMouseUp={onMouseUp}
          onChange={onChange}
          placeholder="Search or type in a URL"
          visible={!store.addressbarTextVisible || store.addressbarValue === ''}
          value={store.addressbarValue}
        ></Input>
        <Text
          visible={store.addressbarTextVisible && store.addressbarValue !== ''}
        >
          {store.addressbarUrlSegments.map((item, key) => (
            <div
              key={key}
              style={{
                opacity: item.grayOut ? 0.54 : 1,
              }}
            >
              {item.value}
            </div>
          ))}
        </Text>
      </InputContainer>
      {!store.isCompact && <SiteButtons />}
    </StyledAddressBar>
  );
});
