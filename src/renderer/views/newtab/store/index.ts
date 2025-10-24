import { observable, computed, makeObservable, autorun } from 'mobx';
import { ISettings, ITheme, IVisitedItem } from '~/interfaces';
import { getTheme } from '~/utils/themes';
import { INewsItem } from '~/interfaces/news-item';
import { getNetworkMainChannel } from '~/common/rpc/network';

type NewsBehavior = 'on-scroll' | 'always-visible' | 'hidden';
export type Preset = 'focused' | 'inspirational' | 'informational' | 'custom';

export class Store {
  @observable
  public settings: ISettings = { ...(window as any).settings };

  @computed
  public get theme(): ITheme {
    return getTheme(this.settings.theme);
  }

  @observable
  public news: INewsItem[] = [];

  @observable
  private _newsBehavior: NewsBehavior = 'on-scroll';

  @computed
  public get newsBehavior() {
    return this._newsBehavior;
  }

  public set newsBehavior(value: NewsBehavior) {
    this._newsBehavior = value;
    if (value === 'always-visible') this.loadNews().catch(console.error);
  }

  @computed
  public get fullSizeImage() {
    return true;
  }

  @observable
  public image = '';

  @observable
  private _imageVisible = true;

  public set imageVisible(value: boolean) {
    this._imageVisible = value;
    if (value && this.image === '') this.loadImage();
  }

  @computed
  public get imageVisible() {
    return this._imageVisible;
  }

  @observable
  private _changeImageDaily = true;

  public get changeImageDaily() {
    return this._changeImageDaily;
  }
  public set changeImageDaily(value: boolean) {
    const was = this._changeImageDaily;
    this._changeImageDaily = value;
    try {
      localStorage.setItem('changeImageDaily', JSON.stringify(value));
    } catch {}

    if (value) {
      const todayKey = this.getTodayKey();
      const currentImg = this.image || '';
      const custom = this.getStoredCustomImage();
      const isUsingCustomNow = !!custom && currentImg === custom;

      if (isUsingCustomNow) {
        try {
          localStorage.removeItem('imageURL');
          localStorage.removeItem('imageData');
          localStorage.removeItem('imageDate');
        } catch {}
        this.image = '';
        if (this.imageVisible) this.loadImage();
      } else {
        try {
          if (currentImg) {
            if (currentImg.startsWith('data:')) {
              localStorage.setItem('imageData', currentImg);
              localStorage.setItem('imageURL', currentImg);
            } else {
              localStorage.setItem('imageURL', currentImg);
            }
            localStorage.setItem('imageDate', todayKey);
          } else if (this.imageVisible) {
            this.loadImage();
          }
        } catch {}
      }
    } else {
      if (this._preset === 'custom') {
        const custom = this.getStoredCustomImage();
        if (custom) this.image = custom;
      }
    }

    if (!was && value && this.image === '' && this.imageVisible) {
      this.loadImage();
    }
  }

  @observable
  public topSitesVisible = true;

  @observable
  public quickMenuVisible = true;

  @observable
  public overflowVisible = false;

  @observable
  private _preferencesContent: 'main' | 'custom' = 'main';

  public set preferencesContent(value: 'main' | 'custom') {
    this._preferencesContent = value;
    this.overflowVisible = false;
  }

  @computed
  public get preferencesContent() {
    return this._preferencesContent;
  }

  @observable
  private _dashboardSettingsVisible = false;

  public set dashboardSettingsVisible(value: boolean) {
    this._dashboardSettingsVisible = value;
    if (!value) this.preferencesContent = 'main';
  }

  @computed
  public get dashboardSettingsVisible() {
    return this._dashboardSettingsVisible;
  }

  @observable
  private _preset: Preset = 'inspirational';

  @computed
  public get preset() {
    return this._preset;
  }

  public set preset(value: Preset) {
    this._preset = value;

    if (['focused', 'informational', 'inspirational'].includes(value)) {
      this.quickMenuVisible = true;
      this.topSitesVisible = true;
      if (!this._changeImageDaily) this.changeImageDaily = true;
    }

    if (['focused', 'inspirational'].includes(value)) {
      this.newsBehavior = 'on-scroll';
    }

    if (['informational', 'inspirational'].includes(value)) {
      this.imageVisible = true;
    }

    if (value === 'focused') {
      this.imageVisible = false;
    } else if (value === 'informational') {
      this.newsBehavior = 'always-visible';
    }

    localStorage.setItem('preset', value);

    if (value !== 'custom') {
      if (this.imageVisible && this.image === '') this.loadImage();
    } else {
      if (!this._changeImageDaily) {
        const custom = this.getStoredCustomImage();
        if (custom) this.image = custom;
      }
    }
  }

  private page = 1;
  private loaded = true;

  @observable
  public topSites: IVisitedItem[] = [];

  constructor() {
    makeObservable(this);

    (window as any).updateSettings = (settings: ISettings) => {
      this.settings = { ...this.settings, ...settings };
    };

    window.addEventListener('message', (e: any) => {
      if (
        e.data &&
        (e.data.type === 'update-settings' || e.data.type === 'set-settings')
      ) {
        try {
          const raw = e.data.data;
          const next: ISettings =
            typeof raw === 'string' ? JSON.parse(raw) : raw;
          this.settings = { ...this.settings, ...next };
        } catch {
          /* ignore parse errors */
        }
      }
    });

    this._preset = (localStorage.getItem('preset') as Preset) || this._preset;

    [
      'changeImageDaily',
      'quickMenuVisible',
      'topSitesVisible',
      'imageVisible',
    ].forEach((x) => {
      const raw = localStorage.getItem(x);
      if (raw != null) {
        try {
          (this as any)[x] = JSON.parse(raw);
        } catch {
          (this as any)[x] = raw === 'true';
        }
      }
    });

    const nb = localStorage.getItem('newsBehavior') as NewsBehavior | null;
    if (nb) this.newsBehavior = nb;

    if (!this._changeImageDaily && this._preset === 'custom') {
      const custom = this.getStoredCustomImage();
      if (custom) this.image = custom;
    }

    if (this.imageVisible && this.image === '') {
      this.loadImage();
    }

    this.loadTopSites().catch(console.error);

    autorun(() => {
      if (this._preset !== 'custom' || this._changeImageDaily) return;
      const img = this.image;
      if (!img || !img.startsWith('data:')) return;

      try {
        localStorage.setItem('customImageData', img);
        localStorage.setItem('imageDate', this.getTodayKey());
      } catch {}
    });
  }

  private getTodayKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getStoredCustomImage(): string | null {
    try {
      const custom = localStorage.getItem('customImageData');
      return custom || null;
    } catch {
      return null;
    }
  }

  public async loadImage() {
    const todayKey = this.getTodayKey();

    const normKey = (s: string | null): string | null => {
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const dt = new Date(s);
      if (isNaN(dt.getTime())) return null;
      const yy = dt.getFullYear();
      const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
      const dd = dt.getDate().toString().padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    if (this._changeImageDaily) {
      let storedData: string | null = null;
      let storedDate: string | null = null;
      try {
        storedData =
          localStorage.getItem('imageData') || localStorage.getItem('imageURL');
        storedDate = normKey(localStorage.getItem('imageDate'));
      } catch {}

      if (storedDate === todayKey && storedData) {
        this.image = storedData;
        return;
      }

      const url = 'https://picsum.photos/1920/1080';

      try {
        const resp = await fetch(url);
        const blob = await resp.blob();

        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        this.image = dataUrl;

        try {
          localStorage.setItem('imageURL', dataUrl);
          localStorage.setItem('imageData', dataUrl);
          localStorage.setItem('imageDate', todayKey);
        } catch {}
      } catch (e) {
        console.error(e);

        if (storedData) this.image = storedData;
      }
      return;
    }

    if (this._preset === 'custom') {
      const custom = this.getStoredCustomImage();
      if (custom) {
        this.image = custom;
        return;
      }
      this.image = '';
      return;
    }

    let storedData: string | null = null;
    try {
      storedData =
        localStorage.getItem('imageData') || localStorage.getItem('imageURL');
    } catch {}
    if (storedData) {
      this.image = storedData;
    } else {
      const url = 'https://picsum.photos/1920/1080';
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        this.image = dataUrl;
      } catch (e) {
        console.error(e);
      }
    }
  }

  public async loadTopSites() {
    try {
      this.topSites = await (window as any).api.topsites.get(8);
    } catch (e) {
      console.error('loadTopSites failed:', e);
      this.topSites = [];
    }
  }

  public async loadNews() {
    try {
      const { data } = await getNetworkMainChannel().getInvoker().request('');
      const json = JSON.parse(data);

      if (json && Array.isArray(json.articles)) {
        if (this.page === 1) {
          this.news = json.articles;
        } else {
          this.news = this.news.concat(json.articles);
        }
        this.page += 1;
        this.loaded = true;
      } else {
        throw new Error('Error fetching news');
      }
    } catch (e) {
      console.error('loadNews failed:', e);
      throw e;
    }
  }
}

export default new Store();
