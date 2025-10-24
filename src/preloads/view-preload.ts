import {
  contextBridge,
  ipcRenderer as electronIpcRenderer,
  webFrame,
} from 'electron';
(window as any).ipcRenderer = electronIpcRenderer;

export type IpcRendererLike = {
  send: (...args: any[]) => void;
  sendSync?: (...args: any[]) => any;
  invoke?: (...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => any;
  once: (channel: string, listener: (...args: any[]) => void) => any;
  removeListener: (channel: string, listener: (...args: any[]) => void) => any;
  removeAllListeners: (channel?: string) => any;
  postMessage?: (channel: string, message: any, transfer?: any[]) => void;
};

declare global {
  interface Window {
    __electronApi?: { ipcRenderer: IpcRendererLike; remote?: any };
    electron?: { ipcRenderer?: IpcRendererLike; remote?: any };
    ipcRenderer?: IpcRendererLike;
    remote?: any;
  }
}

function pickIpc(): IpcRendererLike {
  const api =
    window.__electronApi?.ipcRenderer ??
    window.electron?.ipcRenderer ??
    (window as any).ipcRenderer;
  if (!api) {
    const no = () => {};
    const noop: any = new Proxy(no, {
      get: () => noop,
      apply: () => undefined,
    });
    return Object.assign(noop, {
      on: no,
      once: no,
      removeListener: no,
      removeAllListeners: no,
    });
  }
  return api;
}

function pickRemote(): any {
  return (
    window.__electronApi?.remote ??
    window.electron?.remote ??
    (window as any).remote ??
    {}
  );
}

export const ipcRenderer: IpcRendererLike = pickIpc();
export const remote: any = pickRemote();

import AutoComplete from './models/auto-complete';
import { ERROR_PROTOCOL, WEBUI_BASE_URL } from '~/constants/files';

const tabId: number = ipcRenderer.sendSync('get-webcontents-id');
export const windowId: number = ipcRenderer.sendSync('get-window-id');

const goBack = () => {
  ipcRenderer.invoke('web-contents-call', {
    webContentsId: tabId,
    method: 'navigationHistory.goBack',
  });
};

const goForward = () => {
  ipcRenderer.invoke('web-contents-call', {
    webContentsId: tabId,
    method: 'navigationHistory.goForward',
  });
};

window.addEventListener('mouseup', (e: any) => {
  if (e.button === 3) {
    e.preventDefault();
    goBack();
  } else if (e.button === 4) {
    e.preventDefault();
    goForward();
  }
});

let beginningScrollLeft: number = null;
let beginningScrollRight: number = null;
let horizontalMouseMove = 0;
let verticalMouseMove = 0;

const resetCounters = () => {
  beginningScrollLeft = null;
  beginningScrollRight = null;
  horizontalMouseMove = 0;
  verticalMouseMove = 0;
};

function getScrollStartPoint(x: number, y: number) {
  let left = 0;
  let right = 0;

  let n = document.elementFromPoint(x, y);

  while (n) {
    // @ts-ignore: element may not have scrollLeft
    if ((n as any).scrollLeft !== undefined) {
      const el = n as any;
      left = Math.max(left, el.scrollLeft);
      right = Math.max(right, el.scrollWidth - el.clientWidth - el.scrollLeft);
    }
    n = (n as HTMLElement).parentElement;
  }
  return { left, right };
}

document.addEventListener('wheel', (e: any) => {
  verticalMouseMove += e.deltaY;
  horizontalMouseMove += e.deltaX;

  if (beginningScrollLeft === null || beginningScrollRight === null) {
    const result = getScrollStartPoint(e.deltaX, e.deltaY);
    beginningScrollLeft = result.left;
    beginningScrollRight = result.right;
  }
});

ipcRenderer.on('scroll-touch-end', () => {
  if (
    horizontalMouseMove - beginningScrollRight > 150 &&
    Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5
  ) {
    if (beginningScrollRight < 10) goForward();
  }

  if (
    horizontalMouseMove + beginningScrollLeft < -150 &&
    Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5
  ) {
    if (beginningScrollLeft < 10) goBack();
  }

  resetCounters();
});

if (process.env.ENABLE_AUTOFILL) {
  window.addEventListener('load', AutoComplete.loadForms);
  window.addEventListener('mousedown', AutoComplete.onWindowMouseDown);
}

const postMsg = (data: any, res: any) => {
  window.postMessage(
    {
      id: data.id,
      result: res,
      type: 'result',
    },
    '*',
  );
};

const hostname = window.location.href.substr(WEBUI_BASE_URL.length);

const settings = ipcRenderer.sendSync('get-settings-sync');

contextBridge.exposeInMainWorld('electron', {
  ipc: {
    invoke: (channel: string, ...args: any[]) =>
      ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: any[]) =>
      ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.on(channel, (_e, ...rest) => listener(...rest)),
    once: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.once(channel, (_e, ...rest) => listener(...rest)),
    removeListener: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.removeListener(channel, listener),
  },
});

try {
  contextBridge.exposeInMainWorld('versions', {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    v8: process.versions.v8,
  });
} catch {}

contextBridge.exposeInMainWorld('settings', settings);

contextBridge.exposeInMainWorld('viewControls', {
  windowId,
  tabId,
  goBack,
  goForward,
});

contextBridge.exposeInMainWorld('webui', {
  isInternal: window.location.href.startsWith(WEBUI_BASE_URL),
  isErrorPage: window.location.protocol === `${ERROR_PROTOCOL}:`,
  getErrorURL: async () => ipcRenderer.invoke(`get-error-url-${tabId}`),
  getHistory: async () => ipcRenderer.invoke('history-get'),
  removeHistory: (ids: string[]) => ipcRenderer.send('history-remove', ids),
  getTopSites: async (count: number) =>
    ipcRenderer.invoke('topsites-get', count),
});

contextBridge.exposeInMainWorld('require', (id: string) => {
  if (id === 'electron') {
    return {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) =>
          ipcRenderer.invoke(channel, ...args),
        send: (channel: string, ...args: any[]) =>
          ipcRenderer.send(channel, ...args),
        on: (channel: string, listener: (...args: any[]) => void) =>
          ipcRenderer.on(channel, (_e, ...rest) => listener(...rest)),
        once: (channel: string, listener: (...args: any[]) => void) =>
          ipcRenderer.once(channel, (_e, ...rest) => listener(...rest)),
        removeListener: (channel: string, listener: (...args: any[]) => void) =>
          ipcRenderer.removeListener(channel, listener),
      },
    };
  }
  return undefined;
});

if (!window.location.href.startsWith(WEBUI_BASE_URL)) {
  (async function () {
    if (settings.doNotTrack) {
      const w = await webFrame.executeJavaScript('window');
      Object.defineProperty(w.navigator, 'doNotTrack', { value: 1 });
    }
  })();
}

if (window.location.href.startsWith(WEBUI_BASE_URL)) {
  window.addEventListener('DOMContentLoaded', () => {
    if (hostname.startsWith('settings')) document.title = 'Settings';
    else if (hostname.startsWith('history')) document.title = 'History';
    else if (hostname.startsWith('bookmarks')) document.title = 'Bookmarks';
    else if (hostname.startsWith('extensions')) document.title = 'Extensions';
    else if (hostname.startsWith('newtab')) document.title = 'New tab';
  });

  window.addEventListener('message', async ({ data }) => {
    if (!data) return;

    if (data.type === 'storage') {
      const res = await ipcRenderer.invoke(`storage-${data.operation}`, {
        scope: data.scope,
        ...data.data,
      });
      postMsg(data, res);
    } else if (data.type === 'credentials-get-password') {
      const res = await ipcRenderer.invoke(
        'credentials-get-password',
        data.data,
      );
      postMsg(data, res);
    } else if (data.type === 'save-settings') {
      ipcRenderer.send('save-settings', { settings: data.data });
    }
  });

  ipcRenderer.on('update-settings', (_e, data) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).settings = {
        ...((window as any).settings || {}),
        ...data,
      };
    } catch {
      /* no-op */
    }
    try {
      const fn = (window as any).updateSettings;
      if (typeof fn === 'function') {
        fn(data);
      }
    } catch {
      /* no-op */
    }
    try {
      window.postMessage(
        { type: 'set-settings', data: JSON.stringify(data) },
        '*',
      );
    } catch {
      /* no-op */
    }

    window.postMessage({ type: 'update-settings', data }, '*');
  });

  ipcRenderer.on('credentials-insert', (_e, data) => {
    window.postMessage({ type: 'credentials-insert', data }, '*');
  });

  ipcRenderer.on('credentials-update', (_e, data) => {
    window.postMessage({ type: 'credentials-update', data }, '*');
  });

  ipcRenderer.on('credentials-remove', (_e, data) => {
    window.postMessage({ type: 'credentials-remove', data }, '*');
  });
}

contextBridge.exposeInMainWorld('api', {
  history: {
    get: async () => ipcRenderer.invoke('history-get'),
    remove: (ids: string[]) => ipcRenderer.send('history-remove', ids),
  },
  topsites: {
    get: async (count: number) => ipcRenderer.invoke('topsites-get', count),
  },
});
