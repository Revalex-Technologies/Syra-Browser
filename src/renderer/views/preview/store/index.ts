import { ipcRenderer } from 'electron';
import { observable, computed, makeObservable } from 'mobx';

import { WEBUI_BASE_URL, WEBUI_PROTOCOL } from '~/constants/files';
import { DialogStore } from '~/models/dialog-store';

export class Store extends DialogStore {
  private timeout: any;
  private timeout1: any;

  @observable
  public title = '';

  @observable
  public memoryMB: number | null = null;

  @observable
  public hasSample: boolean = false;

  @observable
  public url = '';

  @observable
  public x = 0;

  @observable
  public xTransition = false;

  @computed
  public get domain() {
    let protocol: string | undefined;
    let hostname: string | undefined;
    try {
      const parsed = new URL(this.url);
      protocol = parsed.protocol;
      hostname = parsed.hostname;
    } catch {
      protocol = undefined;
      hostname = undefined;
    }

    if (
      WEBUI_BASE_URL.startsWith(WEBUI_PROTOCOL) &&
      this.url.startsWith(WEBUI_BASE_URL)
    ) {
      return `${protocol ?? ''}//${hostname ?? ''}`;
    }

    if (protocol === 'file:') {
      return 'local or shared file';
    }

    return hostname ?? '';
  }

  constructor() {
    super({ visibilityWrapper: false, persistent: true });

    makeObservable(this);

    ipcRenderer.on('memory', (_, { memoryMB }) => {
      this.memoryMB = memoryMB ?? null;
    });

    ipcRenderer.on('visible', (e, visible, tab) => {
      if (
        tab &&
        typeof (tab as any).memoryMB === 'number' &&
        !Number.isNaN((tab as any).memoryMB)
      ) {
        this.memoryMB = (tab as any).memoryMB;
        this.hasSample = true;
      }
      this.memoryMB = this.memoryMB ?? null;
      this.hasSample = false;
      clearTimeout(this.timeout);
      clearTimeout(this.timeout1);

      if (!visible) {
        this.visible = false;
      }

      if (visible) {
        this.timeout1 = setTimeout(() => {
          this.xTransition = true;
        }, 80);

        ipcRenderer.on('memory-update', (e, payload) => {
          const { memoryMB } = payload || ({} as any);
          if (typeof memoryMB === 'number') {
            this.memoryMB = memoryMB;
          } else if (this.memoryMB == null) {
            this.memoryMB = null;
          }
        });
      } else if (!visible) {
        this.timeout = setTimeout(() => {
          this.xTransition = false;
        }, 100);
      }

      if (tab) {
        this.title = tab.title;
        this.url = tab.url;
        this.x = tab.x;

        if (visible && this.title !== '' && this.url !== '') {
          this.visible = visible;
        }
      }
    });

    ipcRenderer.on('memory-update', (e, payload) => {
      const { memoryMB } = (payload || {}) as any;
      if (typeof memoryMB === 'number' && !Number.isNaN(memoryMB)) {
        this.memoryMB = memoryMB;
        this.hasSample = true;
      }
    });
  }
}

export default new Store();
