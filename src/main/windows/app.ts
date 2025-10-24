import {
  BrowserWindow,
  app,
  dialog,
  nativeTheme,
  Menu,
  ipcMain,
  screen,
} from 'electron';

import { enable } from '@electron/remote/main';
import { writeFileSync, promises } from 'fs';
import { resolve, join } from 'path';

import { getPath } from '~/utils';
import { runMessagingService } from '../services';
import { Application } from '../application';
import { isNightly } from '..';
import { ViewManager } from '../view-manager';

export class AppWindow {
  private _hoverWatcher: NodeJS.Timeout | null = null;
  private _overlayVisible = false;

  public win: BrowserWindow;

  public viewManager: ViewManager;

  public incognito: boolean;

  public constructor(incognito: boolean) {
    this.win = new BrowserWindow({
      frame: false,
      minWidth: 400,
      minHeight: 450,
      width: 900,
      height: 700,
      // this is commented out because i use it when taking screenshots
      // for the browser
      // roundedCorners: false,
      titleBarStyle: 'hiddenInset',
      backgroundColor: nativeTheme.shouldUseDarkColors
        ? '#939090ff'
        : '#ffffff',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        javascript: true,
      },
      icon: resolve(
        app.getAppPath(),
        `static/${isNightly ? 'nightly-icons' : 'icons'}/icon.png`,
      ),
      show: false,
    });

    try {
      this.win.setMenuBarVisibility(false);
      this.win.setMenu(null);
      Menu.setApplicationMenu(null);
    } catch {}

    enable(this.win.webContents);

    this.incognito = incognito;

    this.viewManager = new ViewManager(this, incognito);

    // Handle window control events from renderer.
    try {
      ipcMain.removeHandler('window-control');
    } catch {}
    ipcMain.handle('window-control', (_evt, action: string) => {
      switch (action) {
        case 'minimize':
          this.win.minimize();
          break;
        case 'maximize':
          this.win.maximize();
          break;
        case 'unmaximize':
          this.win.unmaximize();
          break;
        case 'toggle-maximize':
          this.win.isMaximized() ? this.win.unmaximize() : this.win.maximize();
          break;
        case 'close':
          this.win.close();
          break;
      }
    });

    const emitPlatformAndState = () => {
      try {
        this.send('platform', process.platform);
        this.send('window-state', {
          maximized: this.win.isMaximized(),
          fullScreen: this.win.isFullScreen(),
          focused: this.win.isFocused(),
        });
      } catch {}
    };
    [
      'maximize',
      'unmaximize',
      'enter-full-screen',
      'leave-full-screen',
      'focus',
      'blur',
    ].forEach((evt) => this.win.on(evt as any, emitPlatformAndState));
    this.win.webContents.on('did-finish-load', emitPlatformAndState);

    runMessagingService(this);

    const windowDataPath = getPath('window-data.json');

    let windowState: any = {};

    (async () => {
      try {
        // Read the last window state from file.
        windowState = JSON.parse(
          await promises.readFile(windowDataPath, 'utf8'),
        );
      } catch (e) {
        await promises.writeFile(windowDataPath, JSON.stringify({}));
      }

      // Merge bounds from the last window state to the current window options.
      if (windowState) {
        this.win.setBounds({ ...windowState.bounds });
      }

      if (windowState) {
        if (windowState.maximized) {
          this.win.maximize();
        }
        if (windowState.fullscreen) {
          this.win.setFullScreen(true);
        }
      }
    })();

    this.win.once('ready-to-show', () => {
      this.win.show();

      if (this.incognito) {
        try {
          dialog.showMessageBox(this.win, {
            type: 'info',
            buttons: ['OK'],
            defaultId: 0,
            title: 'Incognito mode',
            message:
              'Since incognito is not persistant, extensions are disabled',
          });
        } catch {}
      }
      emitPlatformAndState();
    });

    // Update window bounds on resize and on move when window is not maximized.
    this.win.on('resize', () => {
      if (!this.win.isMaximized()) {
        windowState.bounds = this.win.getBounds();
      }

      setTimeout(() => {
        if (process.platform === 'linux') {
          this.viewManager.select(this.viewManager.selectedId, false);
        } else {
          this.viewManager.fixBounds();
        }
      });

      this.webContents.send('tabs-resize');
      setTimeout(() => {
        this.webContents.send('tabs-resize');
      }, 500);
    });

    this.win.on('move', () => {
      if (!this.win.isMaximized()) {
        windowState.bounds = this.win.getBounds();
      }
    });

    const resize = () => {
      setTimeout(() => {
        if (process.platform === 'linux') {
          this.viewManager.select(this.viewManager.selectedId, false);
        } else {
          this.viewManager.fixBounds();
        }
      });

      setTimeout(() => {
        this.webContents.send('tabs-resize');
      }, 500);

      this.webContents.send('tabs-resize');
    };

    this.win.on('maximize', resize);
    this.win.on('restore', resize);
    this.win.on('unmaximize', resize);

    this.win.on('close', (event: Electron.Event) => {
      const { object: settings } = Application.instance.settings;

      if (settings.warnOnQuit && this.viewManager.views.size > 1) {
        const answer = dialog.showMessageBoxSync(null, {
          type: 'question',
          title: `Quit ${app.name}?`,
          message: `Quit ${app.name}?`,
          detail: `You have ${this.viewManager.views.size} tabs open.`,
          buttons: ['Close', 'Cancel'],
        });

        if (answer === 1) {
          event.preventDefault();
          return;
        }
      }

      // Save current window state to a file.
      windowState.maximized = this.win.isMaximized();
      windowState.fullscreen = this.win.isFullScreen();
      writeFileSync(windowDataPath, JSON.stringify(windowState));

      this.viewManager.clear();

      if (Application.instance.windows.list.length === 1) {
        Application.instance.dialogs.destroy();
      }

      if (
        incognito &&
        Application.instance.windows.list.filter((x) => x.incognito).length ===
          1
      ) {
        Application.instance.sessions.clearCache('incognito');
        Application.instance.sessions.unloadIncognitoExtensions();
      }

      Application.instance.windows.list =
        Application.instance.windows.list.filter(
          (x) => x.win.id !== this.win.id,
        );
    });

    // this.webContents.openDevTools({ mode: 'detach' });

    if (process.env.NODE_ENV === 'development') {
      this.webContents.openDevTools({ mode: 'detach' });
      this.win.loadURL('http://localhost:4444/app.html');
    } else {
      const filePath = join(app.getAppPath(), 'build', 'app.html');
      this.win.loadFile(filePath);
    }

    this.win.on('enter-full-screen', () => {
      this.startFullscreenHoverWatcher();
      this.viewManager.fullscreen = true;

      this.send('fullscreen', true);
      this.viewManager.fixBounds();
    });

    this.win.on('leave-full-screen', () => {
      this.stopFullscreenHoverWatcher();
      this.viewManager.fullscreen = false;

      this.send('fullscreen', false);
      this.viewManager.fixBounds();
    });

    this.win.on('enter-html-full-screen', () => {
      this.viewManager.fixBounds();
      this.startFullscreenHoverWatcher();

      this.viewManager.fullscreen = true;
      this.send('html-fullscreen', true);
    });

    this.win.on('leave-html-full-screen', () => {
      this.viewManager.fixBounds();
      this.stopFullscreenHoverWatcher();

      this.viewManager.fullscreen = false;
      this.send('html-fullscreen', false);
    });

    (this.win as any).on('scroll-touch-begin', () => {
      this.send('scroll-touch-begin');
    });

    (this.win as any).on('scroll-touch-end', () => {
      this.viewManager.selected.send('scroll-touch-end');
      this.send('scroll-touch-end');
    });

    this.win.on('focus', () => {
      Application.instance.windows.current = this;
    });
  }

  public get id() {
    return this.win.id;
  }

  public get webContents() {
    try {
      if (!this.win || this.win.isDestroyed()) return null as any;
      const wc = this.win.webContents as any;
      if (!wc || (typeof wc.isDestroyed === 'function' && wc.isDestroyed()))
        return null as any;
      return wc;
    } catch {
      return null as any;
    }
  }

  private startFullscreenHoverWatcher() {
    this.stopFullscreenHoverWatcher();
    const HOVER_THRESHOLD = 4; // px from top edge
    const HYSTERESIS = 48; // px to fully hide after leaving
    const POLL_MS = 60;

    this._hoverWatcher = setInterval(() => {
      try {
        if (!this.viewManager.fullscreen) return;
        if (!this.win.isFocused()) return;

        const cursor = screen.getCursorScreenPoint();
        const wb = this.win.getBounds();
        const withinX = cursor.x >= wb.x && cursor.x <= wb.x + wb.width;
        const atTop = cursor.y >= wb.y && cursor.y <= wb.y + HOVER_THRESHOLD;

        if (withinX && atTop) {
          if (!this._overlayVisible) {
            this._overlayVisible = true;
            this.viewManager.revealOverlay = true;
            this.viewManager.fixBounds();
            try {
              this.send('hover-overlay', true);
            } catch {}
          }
        } else {
          if (this._overlayVisible && cursor.y > wb.y + HYSTERESIS) {
            this._overlayVisible = false;
            this.viewManager.revealOverlay = false;
            this.viewManager.fixBounds();
            try {
              this.send('hover-overlay', false);
            } catch {}
          }
        }
      } catch {}
    }, POLL_MS);
  }

  private stopFullscreenHoverWatcher() {
    if (this._hoverWatcher) {
      clearInterval(this._hoverWatcher);
      this._hoverWatcher = null;
    }
    if (this._overlayVisible) {
      this._overlayVisible = false;
      this.viewManager.revealOverlay = false;
      try {
        this.send('hover-overlay', false);
      } catch {}
      this.viewManager.fixBounds();
    }
  }
  public fixDragging() {
    const bounds = this.win.getBounds();
    this.win.setBounds({
      height: bounds.height + 1,
    });
    this.win.setBounds(bounds);
  }

  public send(channel: string, ...args: any[]) {
    const wc = this.webContents as any;
    if (!wc) {
      return;
    }
    try {
      wc.send(channel, ...args);
    } catch {}
  }

  public updateTitle() {
    const { selected } = this.viewManager;
    if (!selected) return;

    this.win.setTitle(
      selected.title.trim() === ''
        ? app.name
        : `${selected.title} - ${app.name}`,
    );
  }
}
