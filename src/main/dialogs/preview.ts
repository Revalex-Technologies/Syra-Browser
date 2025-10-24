import { BrowserWindow, app } from 'electron';
import { Application } from '../application';
import { DIALOG_MARGIN_TOP, DIALOG_MARGIN } from '~/constants/design';
import { PersistentDialog } from './dialog';
import { ERROR_PROTOCOL } from '~/constants/files';

const HEIGHT = 256;

export class PreviewDialog extends PersistentDialog {
  private memoryInterval: any = null;
  public visible = false;
  public tab: { id?: number; x?: number; y?: number } = {};

  constructor() {
    super({
      name: 'preview',
      bounds: {
        height: HEIGHT,
      },
      hideTimeout: 150,
    });
  }

  public rearrange() {
    const { width } = this.browserWindow.getContentBounds();
    super.rearrange({ width, y: this.tab.y });
  }

  public async show(browserWindow: BrowserWindow) {
    super.show(browserWindow, false);

    const { id, url, title, errorURL } = Application.instance.windows
      .fromBrowserWindow(browserWindow)
      .viewManager.views.get(this.tab.id);

    const appWindow =
      Application.instance.windows.fromBrowserWindow(browserWindow);
    const view = appWindow.viewManager.views.get(this.tab.id);

    let memoryMB: number | null = null;
    try {
      const pid = view.webContents.getOSProcessId();
      const metrics = app.getAppMetrics?.() || [];
      const proc = metrics.find((m: any) => m.pid === pid);
      const mem = proc?.memory;
      let bytes: number | null = null;
      if (mem) {
        if (typeof mem.privateBytes === 'number') bytes = mem.privateBytes;
        else if (typeof mem.workingSetSize === 'number') {
          const v = mem.workingSetSize;
          bytes = v < 10_000_000 ? v * 1024 : v;
        }
      }
      memoryMB =
        bytes != null ? Math.max(1, Math.round(bytes / (1024 * 1024))) : null;
    } catch (e) {
      memoryMB = null;
    }

    try {
      const appWindow =
        Application.instance.windows.fromBrowserWindow(browserWindow);
      const view = appWindow.viewManager.views.get(this.tab.id);
      if (view) {
        const pid = view.webContents.getOSProcessId();
        setInterval(() => {
          try {
            const metrics = app.getAppMetrics?.() || [];
            const proc = metrics.find((m: any) => m.pid === pid);
            let memoryMB: number | null = null;
            if (proc?.memory?.workingSetSize) {
              const ws = proc.memory.workingSetSize;
              memoryMB =
                ws > 1024 * 1024
                  ? Math.round(ws / 1024 / 1024)
                  : Math.round(ws / 1024);
            }
            this.send('memory-update', { memoryMB });
          } catch (e) {
            // ignore
          }
        }, 2000);
      }
    } catch (e) {
      // ignore
    }

    const stopPolling = () => {
      if (this.memoryInterval) {
        clearInterval(this.memoryInterval);
        this.memoryInterval = null;
      }
    };
    stopPolling();
    const readMemoryMB = () => {
      try {
        const pid =
          (view.webContents as any).getProcessId?.() ??
          view.webContents.getOSProcessId?.();
        const metrics = app.getAppMetrics?.() || [];
        const proc = metrics.find((m: any) => m.pid === pid);
        const mem = proc?.memory;
        let bytes: number | null = null;
        if (mem) {
          if (typeof mem.privateBytes === 'number') bytes = mem.privateBytes;
          else if (typeof mem.workingSetSize === 'number') {
            const v = mem.workingSetSize;
            bytes = v < 10_000_000 ? v * 1024 : v;
          }
        }
        const mb =
          bytes != null ? Math.max(1, Math.round(bytes / (1024 * 1024))) : null;
        return mb;
      } catch {
        return null;
      }
    };

    const firstMB = readMemoryMB();
    this.send('visible', true, {
      id,
      url: url.startsWith(`${ERROR_PROTOCOL}://`) ? errorURL : url,
      title,
      x: this.tab.x - 8,
      memoryMB: firstMB,
    });

    this.memoryInterval = setInterval(() => {
      const mb = readMemoryMB();
      if (mb != null) {
        this.send('memory-update', { memoryMB: mb });
      }
    }, 1000);
  }

  public hide(bringToTop = true) {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    super.hide(bringToTop);
  }
}
