import { observable, makeObservable, runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import { ITheme, ISettings, IDownloadItem } from '~/interfaces';
import { getTheme } from '~/utils/themes';

class Store {
  public settings: ISettings = { ...(window as any).settings };

  @observable.ref
  public theme: ITheme = getTheme(this.settings.theme);

  @observable
  public downloads: IDownloadItem[] = [];

  private _timer: any = null;

  public constructor() {
    makeObservable(this);

    // Keep the theme in sync with settings messages
    window.addEventListener('message', (e: any) => {
      if (e.data && e.data.type === 'set-settings') {
        const next = JSON.parse(e.data.data) as ISettings;
        this.settings = { ...this.settings, ...next };
        this.theme = getTheme(this.settings.theme);
      }
    });

    const fetch = () => {
      ipcRenderer
        .invoke('get-downloads')
        .then((items: IDownloadItem[]) => {
          if (Array.isArray(items)) {
            runInAction(() => {
              this.downloads = items;
            });
          }
        })
        .catch(() => {});
    };

    const start = () => {
      if (this._timer) return;
      fetch();
      this._timer = window.setInterval(fetch, 800);
    };
    const stop = () => {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener('beforeunload', stop);
    start();
  }
}

export default new Store();
