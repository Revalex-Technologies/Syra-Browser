import { AppWindow } from './windows/app';

import { BrowserWindow, ipcMain } from 'electron';

import { NEWTAB_URL } from '~/constants/tabs';

export class WindowsService {
  public list: AppWindow[] = [];

  public lastFocused: AppWindow | undefined;

  public get current(): AppWindow | undefined {
    return this.lastFocused ?? this.list[0];
  }

  public set current(window: AppWindow | undefined) {
    this.lastFocused = window;
  }

  constructor() {
    ipcMain.handle('get-tab-zoom', (e, tabId) => {
      return this.findByContentsView(tabId).viewManager.views.get(tabId)
        .webContents.zoomFactor;
    });

    ipcMain.handle(
      'tear-off-tab',
      async (
        _e,
        payload: { tabId: number; screenX?: number; screenY?: number },
      ) => {
        try {
          const { tabId, screenX = 0, screenY = 0 } = payload || ({} as any);

          const from = this.findByContentsView(tabId);
          if (!from) return false;
          const view: any = from.viewManager.views.get(tabId);
          if (!view) return false;

          const to = this.open(!!from.incognito);

          try {
            const x = Math.max(0, Math.floor(screenX - 80));
            const y = Math.max(0, Math.floor(screenY - 40));
            to.win.setPosition(x, y, false);
          } catch {}

          try {
            from.viewManager.views.delete(tabId);

            const remaining = from.viewManager.views.size;
            if (remaining === 0) {
              try {
                from.viewManager.create(
                  { url: NEWTAB_URL, active: true },
                  false,
                  false,
                );
              } catch {}
            }
          } catch {}

          try {
            view.reparent(to);
          } catch {}

          try {
            to.viewManager.views.set(tabId, view);
          } catch {}

          try {
            from.send('remove-tab', tabId);
          } catch {}

          const _createTearOffTab = () => {
            try {
              const url = view.url || view.webContents?.getURL?.() || '';
              to.send('create-tab', { url, active: true } as any, false, tabId);
              to.send('select-tab', tabId);
              try {
                to.viewManager.select(tabId, true);
              } catch {}
              try {
                const moved = to.viewManager.views.get(tabId);
                if (moved) {
                  const wc: any = moved.webContents;
                  const isLoading =
                    typeof wc?.isLoading === 'function'
                      ? wc.isLoading()
                      : false;
                  moved.emitEvent('loading', isLoading);
                  moved.updateNavigationState();
                  try {
                    moved.emitEvent('title-updated', wc.getTitle());
                    moved.emitEvent('url-updated', wc.getURL());
                  } catch {}
                  moved.emitEvent('loading', false);
                }
              } catch {}

              setTimeout(() => {
                try {
                  const keep = new Set([tabId]);
                  const ids = Array.from(to.viewManager.views.keys());
                  for (const id of ids) {
                    if (!keep.has(id)) {
                      try {
                        const unwanted = to.viewManager.views.get(id);
                        unwanted?.destroy();
                      } catch {}
                      try {
                        to.viewManager.views.delete(id);
                      } catch {}
                      try {
                        to.send('remove-tab', id);
                      } catch {}
                    }
                  }
                  try {
                    to.viewManager.select(tabId, true);
                  } catch {}
                  try {
                    to.send('select-tab', tabId);
                  } catch {}
                } catch {}
              }, 200);
            } catch {}
          };
          try {
            if (to.win.webContents?.isLoading?.()) {
              to.win.webContents.once('did-finish-load', _createTearOffTab);
            } else {
              _createTearOffTab();
            }
          } catch {}

          return true;
        } catch (err) {
          try {
            console.error('[tear-off-tab] failed:', err);
          } catch {}
          return false;
        }
      },
    );
  }

  public open(incognito = false) {
    const window = new AppWindow(incognito);
    this.list.push(window);

    this.lastFocused = window;

    window.win.on('focus', () => {
      this.lastFocused = window;
    });

    return window;
  }

  public findByContentsView(webContentsId: number) {
    return this.list.find((x) => !!x.viewManager.views.get(webContentsId));
  }

  public fromBrowserWindow(browserWindow: BrowserWindow) {
    if (!browserWindow) return undefined;
    return this.list.find((x) => x.win && x.win.id === browserWindow.id);
  }

  public broadcast(channel: string, ...args: unknown[]) {
    const alive: AppWindow[] = [];
    this.list.forEach((appWindow) => {
      try {
        const win = (appWindow as any)?.win;
        if (!win || typeof win.isDestroyed !== 'function' || win.isDestroyed())
          return;
        const wc = win.webContents;
        if (!wc || typeof wc.isDestroyed !== 'function' || wc.isDestroyed())
          return;
        wc.send(channel, ...args);
        alive.push(appWindow);
      } catch {}
    });
    this.list = alive;
  }
}
