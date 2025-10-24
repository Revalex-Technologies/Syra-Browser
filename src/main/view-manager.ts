import { ipcMain } from 'electron';
import { VIEW_Y_OFFSET, DEFAULT_TAB_MARGIN_TOP } from '~/constants/design';
import { View } from './view';
import { AppWindow } from './windows';
import { WEBUI_BASE_URL } from '~/constants/files';
import { Application } from './application';

import {
  ZOOM_FACTOR_MIN,
  ZOOM_FACTOR_MAX,
  ZOOM_FACTOR_INCREMENT,
} from '~/constants/web-contents';

import { EventEmitter } from 'events';

export class ViewManager extends EventEmitter {
  public views = new Map<number, View>();
  public selectedId = 0;
  public recentlyClosed: { title: string; url: string }[] = [];
  public _fullscreen = false;
  public revealOverlay = false;

  public incognito: boolean;

  private window: AppWindow;

  public get fullscreen() {
    return this._fullscreen;
  }

  public set fullscreen(val: boolean) {
    this._fullscreen = val;
    this.fixBounds();
  }

  public constructor(window: AppWindow, incognito: boolean) {
    super();

    this.window = window;
    this.incognito = incognito;

    const { id } = window.win;
    ipcMain.handle(`view-create-${id}`, (e, details) => {
      return this.create(details, false, false).id;
    });

    ipcMain.handle(`views-create-${id}`, (e, options) => {
      return options.map((option: any) => {
        return this.create(option, false, false).id;
      });
    });

    ipcMain.on(`add-tab-${id}`, (e, details) => {
      this.create(details);
    });

    ipcMain.on('Print', (e, details) => {
      const selectedView = this.views.get(this.selectedId);
      if (selectedView?.webContents) {
        try {
          selectedView.webContents.print();
        } catch (err) {
          console.error('Print failed (selected view):', err);
        }
        return;
      }
      const sender = e?.sender;
      if (sender && typeof (sender as any).print === 'function') {
        try {
          (sender as any).print();
        } catch (err) {
          console.error('Print failed (sender):', err);
        }
        return;
      }
      console.warn('[Print] No active view/webContents available to print.');
    });

    ipcMain.handle(`view-select-${id}`, (e, tabId: number, focus: boolean) => {
      if (process.env.ENABLE_EXTENSIONS && Application.instance.extensions) {
        const view = this.views.get(tabId);
        if (view) {
          try {
            Application.instance.extensions.selectTab(
              view.webContentsView.webContents,
            );
          } catch {}
        }
        this.select(tabId, focus);
      } else {
        this.select(tabId, focus);
      }
    });

    ipcMain.on(`view-destroy-${id}`, (e, id: number) => {
      this.destroy(id);
    });

    ipcMain.on(`mute-view-${id}`, (e, tabId: number) => {
      const view = this.views.get(tabId);
      view.webContents.setAudioMuted(true);
    });

    ipcMain.on(`unmute-view-${id}`, (e, tabId: number) => {
      const view = this.views.get(tabId);
      view.webContents.setAudioMuted(false);
    });

    ipcMain.on(`web-contents-view-clear-${id}`, () => {
      this.clear();
    });

    ipcMain.on('change-zoom', (e, zoomDirection) => {
      const newZoomFactor =
        this.selected.webContents.zoomFactor +
        (zoomDirection === 'in'
          ? ZOOM_FACTOR_INCREMENT
          : -ZOOM_FACTOR_INCREMENT);

      if (
        newZoomFactor <= ZOOM_FACTOR_MAX &&
        newZoomFactor >= ZOOM_FACTOR_MIN
      ) {
        this.selected.webContents.zoomFactor = newZoomFactor;
        this.selected.emitEvent(
          'zoom-updated',
          this.selected.webContents.zoomFactor,
        );
      } else {
        e.preventDefault();
      }
      this.emitZoomUpdate();
    });

    ipcMain.on('reset-zoom', (e: any) => {
      this.selected.webContents.zoomFactor = 1;
      this.selected.emitEvent(
        'zoom-updated',
        this.selected.webContents.zoomFactor,
      );
      this.emitZoomUpdate();
    });

    this.setBoundsListener();
  }

  public get selected() {
    return this.views.get(this.selectedId);
  }

  public get settingsView() {
    return Object.values(this.views).find((r) =>
      r.url.startsWith(`${WEBUI_BASE_URL}settings`),
    );
  }

  public create(
    details: chrome.tabs.CreateProperties,
    isNext = false,
    sendMessage = true,
  ) {
    const view = new View(this.window, details.url, this.incognito);

    const { webContents } = view.webContentsView;
    const { id } = view;

    this.views.set(id, view);

    if (process.env.ENABLE_EXTENSIONS) {
      try {
        Application.instance.extensions?.addTab(webContents, this.window.win);
      } catch {}
    }

    webContents.once('destroyed', () => {
      if (process.env.ENABLE_EXTENSIONS) {
        try {
          Application.instance.extensions?.removeTab(webContents);
        } catch {}
      }
      this.views.delete(id);

      try {
        const wc: any =
          (view as any)?.webContentsView?.webContents ?? view?.webContents;
        const title =
          wc && typeof wc.getTitle === 'function'
            ? wc.getTitle()
            : 'Closed Tab';
        const url = wc && typeof wc.getURL === 'function' ? wc.getURL() : '';
        this.recentlyClosed.unshift({ title, url });
        if (this.recentlyClosed.length > 25) this.recentlyClosed.pop();
      } catch {}
    });

    if (sendMessage) {
      this.window.send('create-tab', { ...details }, isNext, id);
    }
    return view;
  }

  public clear() {
    try {
      const contentView = this.window.win?.contentView as any;
      if (contentView && typeof contentView.removeChildView === 'function') {
        for (const v of this.views.values()) {
          try {
            contentView.removeChildView(v.webContentsView);
          } catch {}
          try {
            v.destroy();
          } catch {}
        }
      } else {
        for (const v of this.views.values()) {
          try {
            v.destroy();
          } catch {}
        }
      }
    } finally {
      if (typeof (this.views as any).clear === 'function') {
        (this.views as Map<number, any>).clear();
      }
      this.selectedId = -1 as any;
    }
  }

  public select(id: number, focus = true) {
    const { selected } = this;
    const view = this.views.get(id);

    if (!view) {
      return;
    }

    this.selectedId = id;

    this.window.webContents.send('select-tab', id);

    if (selected) {
      this.window.win.contentView.removeChildView(selected.webContentsView);
    }

    this.window.win.contentView.addChildView(view.webContentsView);

    if (focus) {
      view.webContents.focus();
    } else {
      this.window.webContents.focus();
    }

    this.window.updateTitle();
    view.updateBookmark();

    this.fixBounds();

    view.updateNavigationState();

    this.emit('activated', id);

    this.emitZoomUpdate(false);
  }

  public async fixBounds() {
    const view = this.selected;
    if (!view) return;

    const { width, height } = this.window.win.getContentBounds();

    const sizes: any = await this.window.win.webContents.executeJavaScript(`
  (() => {
    const app = document.getElementById('app');
    const dock = document.getElementById('left-dock');
    const toolbarContentHeight = app ? app.offsetHeight : 0;
    const leftDockWidth = dock ? dock.offsetWidth : 0;
    return { toolbarContentHeight, leftDockWidth };
  })()
`);

    const overlayVisible = !!this.revealOverlay;
    const leftDock = (sizes && sizes.leftDockWidth) || 0;
    const toolbarH = (sizes && sizes.toolbarContentHeight) || 0;

    const left = this.fullscreen ? (overlayVisible ? leftDock : 0) : leftDock;
    const top = this.fullscreen ? (overlayVisible ? toolbarH : 0) : toolbarH;

    const newBounds = {
      x: left,
      y: Math.max(0, top),
      width: Math.max(0, width - left),
      height: Math.max(0, height - top),
    };

    const prev = (view as any).bounds || {};
    if (
      prev.x !== newBounds.x ||
      prev.y !== newBounds.y ||
      prev.width !== newBounds.width ||
      prev.height !== newBounds.height
    ) {
      try {
        if (
          (view as any).webContentsView &&
          typeof (view as any).webContentsView.setBounds === 'function'
        ) {
          (view as any).webContentsView.setBounds(newBounds);
        }
      } catch {}
      (view as any).bounds = newBounds as any;
    }
  }

  private setBoundsListener() {
    this.window.webContents.executeJavaScript(`
        const {ipcRenderer} = require('electron');
        const resizeObserver = new ResizeObserver(([{ contentRect }]) => {
          ipcRenderer.send('resize-height');
        });
        const app = document.getElementById('app');
        resizeObserver.observe(app);
        const dock = document.getElementById('left-dock');
        if (dock) {
          const dockResize = new ResizeObserver(() => ipcRenderer.send('resize-height'));
          dockResize.observe(dock);
        }
      `);

    this.window.webContents.on(
      'ipc-message',
      (_event: unknown, message: string, ..._args: unknown[]) => {
        if (message === 'resize-height') {
          this.fixBounds();
        }
      },
    );
  }

  public destroy(id: number) {
    const view = this.views.get(id);
    if (!view) return;

    this.views.delete(id);

    try {
      const wc: any =
        (view as any)?.webContentsView?.webContents ?? view?.webContents;
      const title =
        wc && typeof wc.getTitle === 'function' ? wc.getTitle() : 'Closed Tab';
      const url = wc && typeof wc.getURL === 'function' ? wc.getURL() : '';
      this.recentlyClosed.unshift({ title, url });
      if (this.recentlyClosed.length > 25) this.recentlyClosed.pop();
    } catch {}
    try {
      const wc: any = (view as any)?.webContentsView?.webContents;
      if (
        process.env.ENABLE_EXTENSIONS &&
        wc &&
        Application.instance.extensions
      ) {
        try {
          const alive =
            typeof wc.isDestroyed === 'function' ? !wc.isDestroyed() : true;
          if (alive) Application.instance.extensions.removeTab(wc);
        } catch {}
      }
    } catch {}

    try {
      const child: any = (view as any)?.webContentsView;
      const win = this.window?.win;
      if (child && win && !win.isDestroyed()) {
        try {
          win.contentView.removeChildView(child);
        } catch {}
      }
    } catch {}

    try {
      view.destroy();
    } catch {}

    try {
      this.emit('removed', id);
    } catch {}
  }

  public emitZoomUpdate(showDialog = true) {
    Application.instance.dialogs
      .getDynamic('zoom')
      ?.webContentsView?.webContents?.send(
        'zoom-factor-updated',
        this.selected.webContents.zoomFactor,
      );

    this.window.webContents.send(
      'zoom-factor-updated',
      this.selected.webContents.zoomFactor,
      showDialog,
    );
  }
}
