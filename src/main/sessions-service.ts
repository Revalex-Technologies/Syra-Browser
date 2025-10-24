import {
  session,
  ipcMain,
  app,
  Session,
  Extension,
  DownloadItem,
  WebContents,
  Menu,
  shell,
  BrowserWindow,
} from 'electron';
import { getPath, makeId } from '~/utils';
import { promises, existsSync } from 'fs';
import { resolve, basename, parse, extname } from 'path';
import { Application } from './application';
import { registerProtocol } from './models/protocol';
import { IDownloadItem, BrowserActionChangeType } from '~/interfaces';
import { parseCrx } from '~/utils/crx';
import { pathExists } from '~/utils/files';
import { extractZip } from '~/utils/zip';

import { requestPermission } from './dialogs/permissions';
import { rimraf as rf } from 'rimraf';

interface ExtendedExtension extends Extension {
  backgroundPage?: {
    webContents: WebContents;
  };
}

export class SessionsService {
  public view = session.fromPartition('persist:view');
  public viewIncognito = session.fromPartition('view_incognito');

  public incognitoExtensionsLoaded = false;
  public extensionsLoaded = false;

  public extensions: ExtendedExtension[] = [];
  public extensionsIncognito: ExtendedExtension[] = [];

  public constructor() {
    registerProtocol(this.view);
    registerProtocol(this.viewIncognito);

    this.clearCache('incognito');

    if (process.env.ENABLE_EXTENSIONS) {
      ipcMain.on('load-extensions', () => {
        this.loadExtensions();
      });

      ipcMain.handle('get-extensions', () => {
        return this.extensions;
      });

      ipcMain.handle(
        'inspect-extension',
        (e: Electron.IpcMainInvokeEvent, incognito: boolean, id: string) => {
          const context = incognito
            ? this.extensionsIncognito
            : this.extensions;
          const extension = context.find((ext) => ext.id === id);
          if (extension?.backgroundPage?.webContents) {
            extension.backgroundPage.webContents.openDevTools();
          }
        },
      );
    }

    this.view.setPermissionRequestHandler(
      async (
        webContents: WebContents,
        permission: string,
        callback: (permissionGranted: boolean) => void,
        details: any,
      ) => {
        const window = webContents
          ? Application.instance.windows.findByContentsView(webContents.id)
          : undefined;
        if (!window || webContents.id !== window.viewManager.selectedId) return;

        if (permission === 'fullscreen') {
          callback(true);
          return;
        }

        try {
          const hostname = new URL(details.requestingUrl).hostname;
          const perm: any = await Application.instance.storage.findOne({
            scope: 'permissions',
            query: { url: hostname, permission },
          });

          if (!perm) {
            const response = await requestPermission(
              window.win,
              permission,
              hostname,
              details,
              window.viewManager.selectedId,
            );
            callback(response);
            await Application.instance.storage.insert({
              scope: 'permissions',
              item: {
                url: hostname,
                permission,
                type: response ? 1 : 2,
                mediaTypes: JSON.stringify(details.mediaTypes) || '',
              },
            });
          } else {
            callback(perm.type === 1);
          }
        } catch (e) {
          callback(false);
        }
      },
    );

    const getDownloadItem = (
      item: DownloadItem,
      id: string,
    ): IDownloadItem => ({
      fileName: basename(item.savePath),
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
      savePath: item.savePath,
      id,
    });

    const downloadsDialog = () =>
      Application.instance.dialogs.getDynamic('downloads-dialog')
        ?.webContentsView?.webContents;

    const downloads: IDownloadItem[] = [];

    const activeDownloadItems = new Map<string, DownloadItem>();

    ipcMain.handle('get-downloads', () => {
      return downloads;
    });

    ipcMain.handle('show-download-context-menu', (e, id: string) => {
      const item = downloads.find((d) => d.id === id);
      const di = activeDownloadItems.get(id);
      const canPause = !!di && !(di as any).isPaused?.() && !item?.completed;
      const canResume =
        !!di &&
        ((di as any).isPaused?.() || (di as any).canResume?.()) &&
        !item?.completed;
      const canCancel = !!di && !item?.completed;

      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: 'Pause',
          enabled: !!canPause,
          click: () => {
            try {
              di?.pause?.();
            } catch {}
          },
        },
        {
          label: 'Resume',
          enabled: !!canResume,
          click: () => {
            try {
              di?.resume?.();
            } catch {}
          },
        },
        { type: 'separator' },
        {
          label: 'Cancel',
          enabled: !!canCancel,
          click: () => {
            try {
              di?.cancel?.();
            } catch {}
          },
        },
        { type: 'separator' },
        {
          label: 'Open file',
          enabled: !!(item as any)?.savePath && !!item?.completed,
          click: () => {
            try {
              (item as any)?.savePath && shell.openPath((item as any).savePath);
            } catch {}
          },
        },
        {
          label: 'View in file manager',
          enabled: !!(item as any)?.savePath,
          click: () => {
            try {
              (item as any)?.savePath &&
                shell.showItemInFolder((item as any).savePath);
            } catch {}
          },
        },
      ];

      const menu = Menu.buildFromTemplate(template);
      const win = BrowserWindow.fromWebContents(e.sender);
      try {
        menu.popup({ window: win });
      } catch {
        menu.popup();
      }
    });

    ipcMain.handle('pause-download', (_e, id: string) => {
      const di = activeDownloadItems.get(id);
      if (di && !di.isPaused()) {
        try {
          di.pause();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    });
    ipcMain.handle('resume-download', (_e, id: string) => {
      const di = activeDownloadItems.get(id);
      if (di && (di.isPaused?.() || di.canResume?.())) {
        try {
          di.resume();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    });
    ipcMain.handle('cancel-download', (_e, id: string) => {
      const di = activeDownloadItems.get(id);
      if (di) {
        try {
          di.cancel();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    });

    const setupDownloadListeners = (ses: Session) => {
      ses.on(
        'will-download',
        (
          event: Electron.Event,
          item: DownloadItem,
          webContents: WebContents,
        ) => {
          const preChosenPath =
            typeof item.getSavePath === 'function' ? item.getSavePath() : '';

          const fileName = item.getFilename();
          const id = makeId(32);
          activeDownloadItems.set(id, item);
          const window = webContents
            ? Application.instance.windows.findByContentsView(webContents.id)
            : undefined;

          if (
            !preChosenPath &&
            !Application.instance.settings.object.downloadsDialog
          ) {
            const downloadsPath =
              Application.instance.settings.object.downloadsPath;
            let i = 1;
            let savePath = resolve(downloadsPath, fileName);

            while (existsSync(savePath)) {
              const { name, ext } = parse(fileName);
              savePath = resolve(downloadsPath, `${name} (${i})${ext}`);
              i++;
            }

            item.savePath = savePath;
          }

          const downloadItem = getDownloadItem(item, id);
          (downloadItem as any).savePath =
            (item as any).savePath ||
            (typeof item.getSavePath === 'function'
              ? item.getSavePath()
              : undefined);
          downloads.push(downloadItem);

          downloadsDialog()?.send('download-started', downloadItem);
          window?.send('download-started', downloadItem);

          item.on('updated', (event: Electron.Event, state: string) => {
            if (state === 'interrupted') {
              // interrupted update; wait for final 'done' state
            } else if (state === 'progressing') {
              if (item.isPaused()) {
                console.log('Download is paused');
              }
            }

            const data = getDownloadItem(item, id);

            downloadsDialog()?.send('download-progress', data);
            window?.send('download-progress', data);

            Object.assign(downloadItem, data);
          });

          item.once('done', async (event: Electron.Event, state: string) => {
            const totalBytes =
              typeof item.getTotalBytes === 'function'
                ? item.getTotalBytes()
                : downloadItem.totalBytes || 0;
            const receivedBytes =
              typeof item.getReceivedBytes === 'function'
                ? item.getReceivedBytes()
                : downloadItem.receivedBytes || 0;
            const savePath =
              (item as any).savePath || (downloadItem as any).savePath;
            const hasFile = !!savePath;
            const bytesOk = totalBytes > 0 && receivedBytes >= totalBytes;

            if (state === 'completed' || (bytesOk && hasFile)) {
              const dialog = downloadsDialog();
              dialog?.send('download-completed', id);
              window?.send('download-completed', id, !!dialog);
              downloadItem.completed = true;
              activeDownloadItems.delete(id);
            } else if (state === 'cancelled') {
              const dialog = downloadsDialog();
              dialog?.send('download-cancelled', id);
              window?.send('download-cancelled', id, !!dialog);
              (downloadItem as any).canceled = true;
              activeDownloadItems.delete(id);
            } else if (state === 'interrupted') {
              const dialog = downloadsDialog();
              dialog?.send('download-cancelled', id);
              window?.send('download-cancelled', id, !!dialog);
              (downloadItem as any).canceled = true;
              activeDownloadItems.delete(id);
            } else {
              // Unknown state
              activeDownloadItems.delete(id);
              console.log(`Download finished with state: ${state}`);
            }
          });
        },
      );
    };

    setupDownloadListeners(this.view);
    setupDownloadListeners(session.defaultSession);

    ipcMain.on('clear-browsing-data', () => {
      this.clearCache('normal');
      this.clearCache('incognito');
    });
  }

  public clearCache(sessionType: 'normal' | 'incognito') {
    const ses = sessionType === 'incognito' ? this.viewIncognito : this.view;

    ses.clearCache().catch((err) => {
      console.error(err);
    });

    ses.clearStorageData({
      storages: [
        'cookies',
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
      ],
    });
  }

  public unloadIncognitoExtensions() {
    this.extensionsIncognito.forEach((extension) => {
      try {
        const extModule: any =
          (this.viewIncognito as any).extensions || this.viewIncognito;
        extModule.removeExtension(extension.id);
      } catch (e) {
        console.error(
          `Failed to unload incognito extension ${extension.id}:`,
          e,
        );
      }
    });
    this.extensionsIncognito = [];
    this.incognitoExtensionsLoaded = false;
  }

  public async loadExtensions(sessionType: 'normal' | 'incognito' = 'normal') {
    if (!process.env.ENABLE_EXTENSIONS) return;

    const context =
      sessionType === 'incognito' ? this.viewIncognito : this.view;

    if (
      (sessionType === 'normal' && this.extensionsLoaded) ||
      (sessionType === 'incognito' && this.incognitoExtensionsLoaded)
    ) {
      return;
    }

    const extensionsPath = getPath('extensions');
    const dirs = await promises.readdir(extensionsPath);

    for (const dir of dirs) {
      try {
        const path = resolve(extensionsPath, dir);

        const extModule: any = (context as any).extensions || context;
        const extension = (await extModule.loadExtension(
          path,
        )) as ExtendedExtension;

        if (extension?.manifest?.manifest_version !== 3) {
          continue;
        }

        if (sessionType === 'incognito') {
          this.extensionsIncognito.push(extension);
        } else {
          this.extensions.push(extension);
        }

        try {
          const manifest: any = (extension as any).manifest;
          if (manifest?.background?.service_worker) {
            const svcModule: any =
              (context as any).serviceWorkers || (context as any);
            await svcModule
              .startWorkerForScope(extension.url)
              .catch((error: any) => {
                console.error(
                  'Error starting service worker for extension',
                  extension.id,
                  error,
                );
              });
          }
        } catch (err) {
          console.warn(
            'Could not start service worker for extension',
            extension.id,
            err,
          );
        }

        for (const window of Application.instance.windows.list) {
          window?.send('load-browserAction', extension);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (sessionType === 'incognito') {
      this.incognitoExtensionsLoaded = true;
    } else {
      this.extensionsLoaded = true;
    }
  }

  async uninstallExtension(id: string) {
    if (!process.env.ENABLE_EXTENSIONS) return;

    const extModuleNorm: any = (this.view as any).extensions || this.view;
    const incogModule: any =
      (this.viewIncognito as any).extensions || this.viewIncognito;

    const extension = extModuleNorm.getExtension(id);
    if (extension) {
      await extModuleNorm.removeExtension(id);

      await rf(extension.path);
    }

    const incognitoExtension = incogModule.getExtension(id);
    if (incognitoExtension) {
      await incogModule.removeExtension(id);
    }

    this.extensions = this.extensions.filter((ext) => ext.id !== id);
    this.extensionsIncognito = this.extensionsIncognito.filter(
      (ext) => ext.id !== id,
    );
  }

  public onCreateTab = async (details: chrome.tabs.CreateProperties) => {
    const window = Application.instance.windows.list.find(
      (x) => x.win.id === details.windowId,
    );

    if (!window) throw new Error('Window not found');

    const view = window.viewManager.create(details, false, true);
    return view.id;
  };

  public onBrowserActionUpdate = (
    extensionId: string,
    action: BrowserActionChangeType,
    details: any,
  ) => {
    Application.instance.windows.list.forEach((w) => {
      w.send('set-browserAction-info', extensionId, action, details);
    });
  };
}
