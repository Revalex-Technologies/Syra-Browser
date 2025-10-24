import { existsSync, promises as fs } from 'fs';
import { resolve, join } from 'path';
import {
  app,
  session,
  Session,
  WebContents,
  webContents,
  ipcMain,
} from 'electron';
import type * as Ghostery from '@ghostery/adblocker-electron';
import { getPath } from '~/utils';
import { Application } from '../application';

declare const __non_webpack_require__: NodeJS.Require | undefined;

const nodeRequire: NodeJS.Require =
  typeof __non_webpack_require__ !== 'undefined' && __non_webpack_require__
    ? __non_webpack_require__
    : (eval('require') as NodeJS.Require);

const { ElectronBlocker } = nodeRequire(
  '@ghostery/adblocker-electron',
) as typeof Ghostery;

const DEBUG = !!process.env.DEBUG;

function dlog(...args: any[]) {
  if (DEBUG) console.log('[adblock]', ...args);
}
function always(...args: any[]) {
  console.log('[adblock]', ...args);
}

let FILTERS_DIR!: string;
let ENGINE_PATH!: string;

function resolveGhosteryPreloadPath(): string {
  const candidates = [
    () => nodeRequire.resolve('@ghostery/adblocker-electron-preload'),
    () =>
      nodeRequire.resolve(
        '@ghostery/adblocker-electron-preload/dist/preload.cjs',
      ),
    () =>
      nodeRequire.resolve(
        '@ghostery/adblocker-electron-preload/dist/preload.js',
      ),
  ];
  for (const tryResolve of candidates) {
    try {
      return tryResolve();
    } catch {}
  }
  return '';
}
const PRELOAD_PATH = (() => {
  try {
    return resolveGhosteryPreloadPath();
  } catch {
    return '';
  }
})();

let blocker: InstanceType<typeof ElectronBlocker> | null = null;
let adblockInitialized = false;

const enabledSessions = new WeakSet<Session>();
const preloadedSessions = new WeakSet<Session>();
const preloadIds = new WeakMap<Session, { frame: string; sw: string }>();

let globalWebContentsHooked = false;

function makeIpcHandleIdempotent(): void {
  const anyIpc = ipcMain as any;
  if (anyIpc.__idempotentPatched) return;

  const originalHandle = ipcMain.handle.bind(ipcMain);
  (ipcMain as any).handle = (
    channel: string,
    listener: (...args: any[]) => any,
  ) => {
    try {
      ipcMain.removeHandler(channel);
    } catch {}
    return originalHandle(channel, listener);
  };

  anyIpc.__idempotentPatched = true;
  dlog('ipcMain.handle patched to be idempotent');
}

function wireDebugEvents(b: InstanceType<typeof ElectronBlocker>) {
  try {
    // @ts-ignore (events exposed in Electron env)
    b.on('request-blocked', (details: any) =>
      dlog('request-blocked:', details?.url ?? details),
    );
    // @ts-ignore
    b.on('request-redirected', (details: any) =>
      dlog('request-redirected:', details?.url ?? details),
    );
    // @ts-ignore
    b.on('request-whitelisted', (details: any) =>
      dlog('request-whitelisted:', details?.url ?? details),
    );
  } catch {}
}

async function ensureDirsReady(): Promise<void> {
  if (!FILTERS_DIR || !ENGINE_PATH) {
    const userDataAdblockDir =
      getPath('adblock') || resolve(app.getPath('userData'), 'adblock');
    FILTERS_DIR = userDataAdblockDir;
    ENGINE_PATH = join(FILTERS_DIR, 'engine.bin');
  }
  try {
    await fs.mkdir(FILTERS_DIR, { recursive: true });
  } catch {}
}

async function createOrLoadBlocker(): Promise<
  InstanceType<typeof ElectronBlocker>
> {
  await ensureDirsReady();
  const eng = await (ElectronBlocker as any).fromPrebuiltAdsAndTracking(
    fetch as any,
    {
      path: ENGINE_PATH,
      read: fs.readFile,
      write: fs.writeFile,
    },
  );
  dlog('engine ready', existsSync(ENGINE_PATH) ? '(cached)' : '(fresh)');
  return eng as InstanceType<typeof ElectronBlocker>;
}

function emitBlockedEvent(request: any) {
  try {
    const win = Application.instance?.windows.findByContentsView?.(
      request.tabId,
    );
    if (!win) return;
    const view = win.viewManager?.views.get?.(request.tabId);
    view?.emitEvent?.('blocked-ad');
  } catch {}
}

async function registerPreloadForSession(ses: Session): Promise<void> {
  if (process.env.ADBLOCKER_PRELOAD !== '1') {
    dlog('skipping Ghostery preload (set ADBLOCKER_PRELOAD=1 to enable)');
    return;
  }
  if (!PRELOAD_PATH) {
    dlog(
      'no Ghostery preload found — cosmetic counter UI disabled, network blocking unaffected',
    );
    return;
  }

  if (preloadedSessions.has(ses)) return;

  const anySes = ses as any;
  if (typeof anySes.registerPreloadScript !== 'function') {
    dlog('registerPreloadScript not available; skipping preload');
    return;
  }

  const ids = preloadIds.get(ses) ?? {
    frame: 'adblock-frame',
    sw: 'adblock-sw',
  };
  preloadIds.set(ses, ids);

  const list =
    typeof anySes.getPreloadScripts === 'function'
      ? await anySes.getPreloadScripts()
      : [];
  const hasFrame =
    Array.isArray(list) &&
    list.some((p: any) => p.id === ids.frame || p.filePath === PRELOAD_PATH);
  const hasSW = Array.isArray(list) && list.some((p: any) => p.id === ids.sw);

  if (!hasFrame) {
    await anySes.registerPreloadScript({
      id: ids.frame,
      filePath: PRELOAD_PATH,
      type: 'frame',
    });
    dlog('preload registered (frame):', PRELOAD_PATH);
  }
  if (!hasSW) {
    try {
      dlog('preload registered (service-worker):', PRELOAD_PATH);
    } catch {
      dlog('service-worker preload not supported in this Electron; skipping');
    }
  }

  preloadedSessions.add(ses);
}

async function enableForSession(ses: Session): Promise<void> {
  if (!blocker) return;

  await registerPreloadForSession(ses);

  if (!enabledSessions.has(ses)) {
    blocker.enableBlockingInSession(ses);
    enabledSessions.add(ses);
    dlog('enabled in session (IPC + webRequest wired)');

    try {
      (blocker as any).on?.('request-blocked', emitBlockedEvent);
      (blocker as any).on?.('request-redirected', emitBlockedEvent);
    } catch {}
  }
}

function hookAllWebContents(): void {
  if (globalWebContentsHooked) return;
  globalWebContentsHooked = true;

  app.on('web-contents-created', async (_evt, wc: WebContents) => {
    try {
      await enableForSession(wc.session);
      dlog(
        `adblock wired for ${wc.getType?.() ?? 'webContents'} (partition=${(wc.session as any).partition})`,
      );
    } catch (e) {
      dlog('failed wiring for new web-contents:', e);
    }
  });

  for (const wc of webContents.getAllWebContents?.() ?? []) {
    void enableForSession(wc.session);
  }
}

export const runAdblockService = async (
  ses: Session = session.defaultSession,
): Promise<void> => {
  makeIpcHandleIdempotent();

  if (!app.isReady()) {
    await app.whenReady();
  }

  if (!adblockInitialized) {
    try {
      blocker = await createOrLoadBlocker();
    } catch (e) {
      console.error(
        '[adblock] Failed to load adblock engine (cached). Retrying without cache:',
        e,
      );
      try {
        blocker = (await (ElectronBlocker as any).fromPrebuiltAdsAndTracking(
          fetch as any,
        )) as InstanceType<typeof ElectronBlocker>;
      } catch (e2) {
        console.error(
          '[adblock] FATAL: could not initialize ElectronBlocker:',
          e2,
        );
        return;
      }
    }
    adblockInitialized = true;
    wireDebugEvents(blocker!);
  }

  if (!blocker) {
    console.error('[adblock] Not started — blocker is null');
    return;
  }

  await enableForSession(ses);
  hookAllWebContents();

  if (!(runAdblockService as any)._printed) {
    always(
      'service running (ghostery preload:',
      PRELOAD_PATH ? 'ok' : 'missing',
      ')',
    );
    (runAdblockService as any)._printed = true;
  }
};

export const stopAdblockService = async (
  ses: Session = session.defaultSession,
): Promise<void> => {
  if (enabledSessions.has(ses)) {
    try {
      blocker?.disableBlockingInSession(ses);
    } catch {}
    enabledSessions.delete(ses);
  }

  if (preloadedSessions.has(ses)) {
    const anySes = ses as any;
    const ids = preloadIds.get(ses);
    if (ids && typeof anySes.unregisterPreloadScript === 'function') {
      try {
        anySes.unregisterPreloadScript(ids.frame);
      } catch {}
      try {
        anySes.unregisterPreloadScript(ids.sw);
      } catch {}
      dlog('preload unregistered:', ids);
    }
    preloadedSessions.delete(ses);
    preloadIds.delete(ses);
  }
};

if (process.type === 'browser') {
  app.once('ready', () => void runAdblockService());
}
