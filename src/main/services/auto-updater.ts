import { app, ipcMain, dialog } from 'electron';

if (process.env.NODE_ENV !== 'production') {
  if (!(global as any).$RefreshReg$) {
    (global as any).$RefreshReg$ = () => {
      /* no-op */
    };
  }
  if (!(global as any).$RefreshSig$) {
    (global as any).$RefreshSig$ = () => (type: unknown) => type;
  }
}
import { autoUpdater } from 'electron-updater';
import { Application } from '../application';
import { join } from 'path';
import { existsSync, writeFileSync, unlinkSync } from 'fs';

const UPDATE_PENDING_MARKER = () =>
  join(app.getPath('userData'), 'update-pending.marker');

export async function installOnNextLaunchIfPending(): Promise<boolean> {
  try {
    const marker = UPDATE_PENDING_MARKER();
    if (existsSync(marker)) {
      try {
        unlinkSync(marker);
      } catch {}
      // Check & download if not already downloaded
      const res = await (autoUpdater as any).checkForUpdates();
      try {
        await (autoUpdater as any).downloadUpdate();
      } catch {}
      try {
        (autoUpdater as any).quitAndInstall(false, true);
        return true;
      } catch {}
    }
  } catch {}
  return false;
}

export const runAutoUpdaterService = () => {
  const updater = autoUpdater as any;

  let updateAvailable = false;
  let updateDownloaded = false;
  let installRequested = false;

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = false;

  if (!app.isPackaged) {
    try {
      updater.forceDevUpdateConfig = true;
    } catch {}
  }

  const broadcast = (channel: string, ...args: any[]) => {
    for (const w of Application.instance.windows.list) {
      try {
        w.send(channel, ...args);
      } catch {}
    }
    try {
      Application.instance.dialogs
        .getDynamic('menu')
        ?.webContentsView?.webContents?.send(channel, ...args);
    } catch {}
  };

  const showError = (message: string) => {
    try {
      dialog.showErrorBox('Update Error', message);
    } catch {}
  };

  const reportError = (err: unknown, context?: string) => {
    const base = err instanceof Error ? err.message : String(err);
    const msg = context ? `${context}\n\n${base}` : base;
    broadcast('update-error', msg);
    showError(msg);
  };

  updater.on('error', (err: unknown) => {
    updateAvailable = false;
    updateDownloaded = false;
    installRequested = false;
    reportError(err, 'Updater emitted an error');
  });

  updater.on('update-available', () => {
    updateAvailable = true;
    updateDownloaded = false;
    broadcast('update-available');
  });

  updater.on('update-not-available', () => {
    updateAvailable = false;
    updateDownloaded = false;
    broadcast('update-not-available');
    if (installRequested) {
      installRequested = false;
      showError(
        `No update available.\nYou're already on version ${app.getVersion()}.`,
      );
    }
  });

  updater.on('update-downloaded', () => {
    updateDownloaded = true;
    if (installRequested) {
      installRequested = false;

      setImmediate(() => {
        try {
          const marker = UPDATE_PENDING_MARKER();
          if (existsSync(marker)) {
            unlinkSync(marker);
          }
        } catch {}
        if (app.isPackaged) {
          try {
            updater.quitAndInstall(false, true);
          } catch (e) {
            reportError(e, 'Failed to quit and install');
          }
        } else {
          showError(
            'Update downloaded (development build).\nInstall is only performed in packaged apps.',
          );
        }
      });
    } else {
      try {
        const marker = UPDATE_PENDING_MARKER();
        writeFileSync(marker, '1');
      } catch {}
    }
  });

  ipcMain.on('update-check', () => {
    updater
      .checkForUpdates()
      .catch((err: unknown) => reportError(err, 'Failed to check for updates'));
  });

  ipcMain.on('update-download-and-install', async () => {
    try {
      installRequested = true;
      // If we don't yet know about an update, perform a fresh check.
      if (!updateAvailable) {
        const info = await updater.checkForUpdates();
        updateAvailable = !!info?.updateInfo?.version;
        if (!updateAvailable) {
          showError(
            `No update available.\nYou're already on version ${app.getVersion()}.`,
          );
          installRequested = false;
          return;
        }
      }
      if (updateDownloaded) {
        setImmediate(() => {
          try {
            const marker = UPDATE_PENDING_MARKER();
            if (existsSync(marker)) {
              unlinkSync(marker);
            }
          } catch {}
          if (app.isPackaged) {
            try {
              updater.quitAndInstall(false, true);
            } catch (e) {
              reportError(e, 'Failed to quit and install');
            }
          } else {
            showError(
              'Update downloaded (development build).\nInstall is only performed in packaged apps.',
            );
          }
        });
        return;
      }
      updater.downloadUpdate().catch((err: unknown) => {
        reportError(err, 'Failed to download the update');
        installRequested = false;
      });
    } catch (err: unknown) {
      reportError(err, 'Update initiation failed');
      installRequested = false;
    }
  });

  setTimeout(() => {
    updater.checkForUpdates().catch(() => {});
  }, 1500);
};
