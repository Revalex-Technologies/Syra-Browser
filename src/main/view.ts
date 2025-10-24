import { WebContentsView, app, ipcMain } from 'electron';
import { getViewMenu } from './menus/view';
import { AppWindow } from './windows';
import { IHistoryItem, IBookmark } from '~/interfaces';
import {
  ERROR_PROTOCOL,
  NETWORK_ERROR_HOST,
  WEBUI_BASE_URL,
} from '~/constants/files';
import { NEWTAB_URL } from '~/constants/tabs';
import {
  ZOOM_FACTOR_MIN,
  ZOOM_FACTOR_MAX,
  ZOOM_FACTOR_INCREMENT,
} from '~/constants/web-contents';
import { TabEvent } from '~/interfaces/tabs';
import { Queue } from '~/utils/queue';
import { Application } from './application';
import { getUserAgentForURL } from './user-agent';

interface IAuthInfo {
  url: string;
}
export class View {
  public webContentsView: WebContentsView;

  public isNewTab = false;
  public homeUrl: string;
  public favicon = '';
  public incognito = false;

  public errorURL = '';

  private hasError = false;

  private window: AppWindow;

  public bounds: any;

  public lastHistoryId: string;

  public bookmark: IBookmark;

  public findInfo = {
    occurrences: '0/0',
    text: '',
  };

  public requestedAuth: IAuthInfo;
  public requestedPermission: any;

  private historyQueue = new Queue();

  private lastUrl = '';

  private _boundUpdateBounds?: () => void;
  private _resizeListenersAttached = false;

  public constructor(window: AppWindow, url: string, incognito: boolean) {
    const path = require('path');
    this.webContentsView = new WebContentsView({
      webPreferences: {
        preload: path.join(app.getAppPath(), 'build', 'view-preload.bundle.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        partition: incognito ? 'view_incognito' : 'persist:view',
        webSecurity: true,
        javascript: true,
      },
    });

    try {
      const { enable } = require('@electron/remote/main');
      enable(this.webContentsView.webContents);
    } catch (err) {
      console.warn('Failed to enable remote for browser view:', err);
    }

    this.incognito = incognito;

    this.webContents.userAgent = getUserAgentForURL(
      this.webContents.userAgent,
      '',
    );

    (this.webContents as any).windowId = window.win.id;

    this.window = window;
    this.homeUrl = url;

    this.webContents.session.webRequest.onBeforeSendHeaders(
      (details: any, callback: any) => {
        const { object: settings } = Application.instance.settings;
        if (settings.doNotTrack) details.requestHeaders['DNT'] = '1';
        callback({ requestHeaders: details.requestHeaders });
      },
    );

    ipcMain.handle(`get-error-url-${this.id}`, async (e: any) => {
      return this.errorURL;
    });

    this.webContents.on('context-menu', (e: any, params: any) => {
      const menu = getViewMenu(this.window, params, this.webContents);
      menu.popup();
    });

    this.webContents.addListener('found-in-page', (e: any, result: any) => {
      Application.instance.dialogs
        .getDynamic('find')
        .webContentsView.webContents.send('found-in-page', result);
    });

    this.webContents.addListener('page-title-updated', (e: any, title: any) => {
      this.window.updateTitle();
      this.updateData();

      this.emitEvent('title-updated', title);
      this.updateURL(this.webContents.getURL());
    });

    this.webContents.addListener('did-navigate', async (e: any, url: any) => {
      this.emitEvent('did-navigate', url);

      await this.addHistoryItem(url);
      this.updateURL(url);
    });

    this.webContents.addListener(
      'did-navigate-in-page',
      async (e: any, url: any, isMainFrame: any) => {
        if (isMainFrame) {
          this.emitEvent('did-navigate', url);

          await this.addHistoryItem(url, true);
          this.updateURL(url);
        }
      },
    );

    this.webContents.addListener('did-stop-loading', () => {
      this.updateNavigationState();
      this.emitEvent('loading', false);
      this.updateURL(this.webContents.getURL());
    });

    this.webContents.addListener('did-start-loading', () => {
      this.hasError = false;
      this.updateNavigationState();
      this.emitEvent('loading', true);
      this.updateURL(this.webContents.getURL());
    });

    try {
      (this.webContents as any).setWindowOpenHandler?.((details: any) => {
        const url = details?.url || '';
        const frameName = (details as any)?.frameName || '';
        const disposition = (details as any)?.disposition || 'foreground-tab';
        try {
          if (disposition === 'background-tab') {
            this.window.viewManager.create({ url, active: false }, true);
          } else if (
            disposition === 'foreground-tab' ||
            disposition === 'new-window'
          ) {
            this.window.viewManager.create({ url, active: true }, true);
          } else if (frameName === '_self') {
            this.window.viewManager.selected.webContents.loadURL(url);
          } else {
            this.window.viewManager.create({ url, active: true }, true);
          }
        } catch (err) {}
        return { action: 'deny' };
      });
    } catch {}
    this.webContents.addListener(
      'did-start-navigation',
      async (e: any, ...args: any[]) => {
        this.updateNavigationState();

        this.favicon = '';

        this.emitEvent('load-commit', ...args);
        this.updateURL(this.webContents.getURL());
      },
    );

    this.webContents.on(
      'did-start-navigation',
      (e: any, url: any, isInPlace: any, isMainFrame: any) => {
        if (!isMainFrame) return;
        const newUA = getUserAgentForURL(this.webContents.userAgent, url);
        if (this.webContents.userAgent !== newUA) {
          this.webContents.userAgent = newUA;
        }
      },
    );
    this.webContents.addListener(
      'did-fail-load',
      (
        e: any,
        errorCode: any,
        errorDescription: any,
        validatedURL: any,
        isMainFrame: any,
      ) => {
        if (isMainFrame && errorCode !== -3) {
          this.errorURL = validatedURL;

          this.hasError = true;

          try {
            this.webContents.stop();
          } catch {}
          // Avoid loops if the error page itself fails
          if (!validatedURL?.startsWith(`${ERROR_PROTOCOL}://`)) {
            setTimeout(() => {
              if (!this.webContents.isDestroyed()) {
                this.webContents.loadURL(
                  `${ERROR_PROTOCOL}://${NETWORK_ERROR_HOST}/#${errorCode}|${encodeURIComponent(validatedURL || '')}`,
                );
              }
            }, 0);
          }
        }
      },
    );

    // Extra safety: show our internal error page on renderer crash
    this.webContents.addListener(
      'render-process-gone',
      (event: any, details: any) => {
        try {
          if (!this.webContents.isDestroyed()) {
            this.webContents.loadURL(
              `${ERROR_PROTOCOL}://${NETWORK_ERROR_HOST}/#render-process-gone|${encodeURIComponent(this.webContents.getURL() || '')}`,
            );
          }
        } catch {}
      },
    );

    this.webContents.addListener(
      'page-favicon-updated',
      async (e: any, favicons: any) => {
        let iconUrl =
          Array.isArray(favicons) && favicons.length > 0 ? favicons[0] : '';

        if (!iconUrl && this.url) {
          try {
            const origin = new URL(this.url).origin;
            iconUrl = origin + '/favicon.ico';
          } catch {}
        }

        if (!iconUrl) {
          this.favicon = '';
          return;
        }

        this.favicon = iconUrl;
        this.updateData();

        try {
          let fav = this.favicon;
          if (fav.startsWith('http')) {
            fav = await Application.instance.storage.addFavicon(fav);
          }
          this.emitEvent('favicon-updated', fav);
        } catch (e) {
          try {
            const origin = new URL(this.url).origin;
            const fallback = origin + '/favicon.ico';
            if (fallback !== this.favicon) {
              const fav =
                await Application.instance.storage.addFavicon(fallback);
              this.emitEvent('favicon-updated', fav);
            }
          } catch {}
          this.favicon = '';
        }
      },
    );

    this.webContents.addListener(
      'zoom-changed',
      (e: any, zoomDirection: any) => {
        const newZoomFactor =
          this.webContents.zoomFactor +
          (zoomDirection === 'in'
            ? ZOOM_FACTOR_INCREMENT
            : -ZOOM_FACTOR_INCREMENT);

        if (
          newZoomFactor <= ZOOM_FACTOR_MAX &&
          newZoomFactor >= ZOOM_FACTOR_MIN
        ) {
          this.webContents.zoomFactor = newZoomFactor;
          this.emitEvent('zoom-updated', this.webContents.zoomFactor);
          window.viewManager.emitZoomUpdate();
        } else {
          e.preventDefault();
        }
      },
    );

    this.webContents.addListener(
      'certificate-error',
      (
        event: Electron.Event,
        url: string,
        error: string,
        certificate: Electron.Certificate,
        callback: Function,
      ) => {
        console.log(certificate, error, url);

        const allowInsecure =
          process.env.NODE_ENV === 'development' ||
          (this.incognito && process.env.ALLOW_INSECURE_IN_INCOGNITO === '1');

        if (allowInsecure) {
        } else {
          try {
          } catch {}
          event.preventDefault();
          callback(false);
          return;
        }
        event.preventDefault();
        callback(true);
      },
    );

    this.webContents.addListener('media-started-playing', () => {
      this.emitEvent('media-playing', true);
    });

    this.webContents.addListener('media-paused', () => {
      this.emitEvent('media-paused', true);
    });

    if (url.startsWith(NEWTAB_URL)) this.isNewTab = true;

    this.webContents.loadURL(url);

    this._boundUpdateBounds = () => {
      try {
        if (!this.window?.win || this.window.win.isDestroyed()) return;
        const { x, y, width, height } = this.window.win.getContentBounds();

        const w = Math.max(0, width ?? 0);
        const h = Math.max(0, height ?? 0);
        const __curB = (this.webContentsView as any).getBounds?.() || {
          x: 0,
          y: 0,
        };
        (this.webContentsView as any).setBounds?.({
          x: __curB.x ?? 0,
          y: __curB.y ?? 0,
          width: w,
          height: Math.max(0, h - (__curB.y ?? 0)),
        });
      } catch (err) {}
    };

    const winRef = this.window.win;

    const attachResizeListeners = () => {
      if (this._resizeListenersAttached) return;
      this._resizeListenersAttached = true;
      winRef.on('resize', this._boundUpdateBounds!);
      winRef.on('enter-full-screen', this._boundUpdateBounds!);
      winRef.on('leave-full-screen', this._boundUpdateBounds!);
      winRef.on('maximize', this._boundUpdateBounds!);
      winRef.on('unmaximize', this._boundUpdateBounds!);

      this._boundUpdateBounds!();
    };
    attachResizeListeners();
  }

  public get webContents() {
    const wc = (this as any)?.webContentsView?.webContents;
    if (!wc) {
      throw new Error('WebContents is unavailable (view destroyed)');
    }
    return wc;
  }

  public get url() {
    return this.webContents.getURL();
  }

  public get title() {
    return this.webContents.getTitle();
  }

  public get id() {
    return this.webContents.id;
  }

  public get isSelected() {
    return this.id === this.window.viewManager.selectedId;
  }

  public updateNavigationState() {
    if (this.webContentsView.webContents.isDestroyed()) return;

    if (this.window.viewManager.selectedId === this.id) {
      this.window.send('update-navigation-state', {
        canGoBack: this.webContents.navigationHistory.canGoBack(),
        canGoForward: this.webContents.navigationHistory.canGoForward(),
      });
    }
  }

  public destroy() {
    try {
      if ((this as any)._isDestroyed) return;
    } catch {}

    try {
      if (
        this._boundUpdateBounds &&
        this.window?.win &&
        !this.window.win.isDestroyed()
      ) {
        this.window.win.removeListener('resize', this._boundUpdateBounds);
        this.window.win.removeListener(
          'enter-full-screen',
          this._boundUpdateBounds,
        );
        this.window.win.removeListener(
          'leave-full-screen',
          this._boundUpdateBounds,
        );
        this.window.win.removeListener('maximize', this._boundUpdateBounds);
        this.window.win.removeListener('unmaximize', this._boundUpdateBounds);
      }
    } catch {}
    this._resizeListenersAttached = false;
    this._boundUpdateBounds = undefined;

    try {
      const child: any = (this as any)?.webContentsView;
      const win = this.window?.win;
      if (child && win && !win.isDestroyed()) {
        try {
          win.contentView.removeChildView(child);
        } catch {}
      }
    } catch {}

    try {
      const wc: any = (this as any)?.webContentsView?.webContents;
      if (wc) {
        try {
          wc.removeAllListeners?.();
        } catch {}
        const isDestroyed =
          typeof wc.isDestroyed === 'function' ? wc.isDestroyed() : false;
        if (!isDestroyed) {
          try {
            wc.destroy?.();
          } catch {}
        }
      }
    } catch {}

    try {
      const wcId = (this as any)?.webContentsView?.webContents?.id;
      if (wcId != null) {
        try {
          ipcMain.removeHandler(`get-error-url-${wcId}`);
        } catch {}
      }
    } catch {}

    try {
      (this as any).webContentsView = null as any;
    } catch {}
    try {
      (this as any)._isDestroyed = true;
    } catch {}
  }

  public async updateCredentials() {
    if (
      !process.env.ENABLE_AUTOFILL ||
      this.webContentsView.webContents.isDestroyed()
    )
      return;

    const item = await Application.instance.storage.findOne<any>({
      scope: 'formfill',
      query: {
        url: this.hostname,
      },
    });

    this.emitEvent('credentials', item != null);
  }

  public async addHistoryItem(url: string, inPage = false) {
    if (
      url !== this.lastUrl &&
      !url.startsWith(WEBUI_BASE_URL) &&
      !url.startsWith(`${ERROR_PROTOCOL}://`) &&
      !this.incognito
    ) {
      const historyItem: IHistoryItem = {
        title: this.title,
        url,
        favicon: this.favicon,
        date: new Date().getTime(),
      };

      await this.historyQueue.enqueue(async () => {
        this.lastHistoryId = (
          await Application.instance.storage.insert<IHistoryItem>({
            scope: 'history',
            item: historyItem,
          })
        )._id;

        historyItem._id = this.lastHistoryId;

        Application.instance.storage.history.push(historyItem);
      });
    } else if (!inPage) {
      await this.historyQueue.enqueue(async () => {
        this.lastHistoryId = '';
      });
    }
  }

  public updateURL = (url: string) => {
    if (this.lastUrl === url) return;

    this.emitEvent('url-updated', this.hasError ? this.errorURL : url);

    this.lastUrl = url;

    this.isNewTab = url.startsWith(NEWTAB_URL);

    this.updateData();

    if (process.env.ENABLE_AUTOFILL) this.updateCredentials();

    this.updateBookmark();
  };

  public updateBookmark() {
    this.bookmark = Application.instance.storage.bookmarks.find(
      (x) => x.url === this.url,
    );

    if (!this.isSelected) return;

    this.window.send('is-bookmarked', !!this.bookmark);
  }

  public async updateData() {
    if (!this.incognito) {
      const id = this.lastHistoryId;
      if (id) {
        const { title, url, favicon } = this;

        this.historyQueue.enqueue(async () => {
          await Application.instance.storage.update({
            scope: 'history',
            query: {
              _id: id,
            },
            value: {
              title,
              url,
              favicon,
            },
            multi: false,
          });

          const item = Application.instance.storage.history.find(
            (x) => x._id === id,
          );

          if (item) {
            item.title = title;
            item.url = url;
            item.favicon = favicon;
          }
        });
      }
    }
  }

  public send(channel: string, ...args: any[]) {
    this.webContents.send(channel, ...args);
  }

  public get hostname() {
    return new URL(this.url).hostname;
  }

  public emitEvent(event: TabEvent, ...args: any[]) {
    this.window.send('tab-event', event, this.id, args);
  }

  public reparent(newWindow: AppWindow): void {
    // Detach from old window
    try {
      const oldWin = this.window?.win;
      if (oldWin && this._boundUpdateBounds) {
        oldWin.removeListener('resize', this._boundUpdateBounds);
        oldWin.removeListener('enter-full-screen', this._boundUpdateBounds);
        oldWin.removeListener('leave-full-screen', this._boundUpdateBounds);
        oldWin.removeListener('maximize', this._boundUpdateBounds);
        oldWin.removeListener('unmaximize', this._boundUpdateBounds);
      }
      if (oldWin && !oldWin.isDestroyed()) {
        try {
          (oldWin as any).contentView?.removeChildView?.(this.webContentsView);
        } catch {}
      }
    } catch {}

    // Point to new window
    this.window = newWindow;
    try {
      (this.webContents as any).windowId = newWindow.win.id;
    } catch {}

    // Attach to new window
    try {
      const cv: any = (newWindow.win as any).contentView;
      if (cv && typeof cv.addChildView === 'function') {
        cv.addChildView(this.webContentsView);
      }
    } catch {}

    // Reattach resize listeners
    try {
      if (this._boundUpdateBounds) {
        const winRef = newWindow.win;
        winRef.on('resize', this._boundUpdateBounds);
        winRef.on('enter-full-screen', this._boundUpdateBounds);
        winRef.on('leave-full-screen', this._boundUpdateBounds);
        winRef.on('maximize', this._boundUpdateBounds);
        winRef.on('unmaximize', this._boundUpdateBounds);
        this._boundUpdateBounds();
      }
    } catch {}

    try {
      this.webContents.focus();
    } catch {}
  }
}
