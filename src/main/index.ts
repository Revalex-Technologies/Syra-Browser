import { registerProtocol } from './models/protocol';
import { ipcMain, app, webContents, session } from 'electron';
import { setIpcMain } from '@wexond/rpc-electron';
setIpcMain(ipcMain);

import { initialize } from '@electron/remote/main';

initialize();

require('source-map-support').install();

import { platform } from 'os';
import { Application } from './application';

export const isNightly = app.name === 'syra-nightly';

app.name = isNightly ? 'Syra Nightly' : 'Syra';

(process.env as any)['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;

app.commandLine.appendSwitch('--enable-transparent-visuals');
app.commandLine.appendSwitch(
  'enable-features',
  'CSSColorSchemeUARendering, ImpulseScrollAnimations, ParallelDownloading',
);

if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

ipcMain.setMaxListeners(0);

const application = Application.instance;
application.start();

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('window-all-closed', () => {
  if (platform() !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('get-webcontents-id', (e: any) => {
  e.returnValue = e.sender.id;
});

ipcMain.on('get-window-id', (e: any) => {
  e.returnValue = (e.sender as any).windowId;
});

ipcMain.handle(
  `web-contents-call`,
  async (
    e,
    {
      webContentsId,
      method,
      args = [],
    }: { webContentsId: number; method: string; args: any[] },
  ) => {
    try {
      const wc = webContents.fromId(webContentsId);
      if (!wc || wc.isDestroyed()) {
        throw new Error(
          `WebContents with id ${webContentsId} not found or destroyed`,
        );
      }

      const segments = method.replace(/^webContents\./, '').split('.');
      let target: any = wc as any;
      const fnName = segments.pop()!;
      for (const seg of segments) {
        if (typeof target[seg] === 'undefined') {
          throw new Error(`Property ${seg} is not available on WebContents`);
        }
        target = target[seg];
      }
      const callable = target[fnName];
      if (typeof callable !== 'function') {
        throw new Error(
          `${fnName} is not a function on ${segments.join('.') || 'WebContents'}`,
        );
      }
      let result: any;
      try {
        result = callable.apply(target, args);
      } catch (err: any) {
        if (err && (err.code === 'ERR_ABORTED' || err.errno === -3)) {
          return null;
        }
        console.error('Error in webContents method:', method, err);
        throw err;
      }
      if (result instanceof Promise) {
        return await result.catch((err: any): any => {
          if (err && (err.code === 'ERR_ABORTED' || err.errno === -3)) {
            // Swallow navigation aborts; they are normal when navigating away mid-load
            return null;
          }
          console.error('Error in webContents method:', method, err);
          throw err;
        });
      }
      return result;
    } catch (error: any) {
      if (error && (error.code === 'ERR_ABORTED' || error.errno === -3)) {
        // benign abort, ignore
        return null;
      }
      console.error('Error in web-contents-call handler:', error);
      throw error;
    }
  },
);

app.whenReady().then(() => {
  try {
    registerProtocol(session.defaultSession);
  } catch (e) {
    console.error('registerProtocol defaultSession failed', e);
  }
});
