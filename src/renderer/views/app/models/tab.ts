import { ipcRenderer } from 'electron';
import { observable, computed, action, makeObservable } from 'mobx';
import * as React from 'react';

import store from '../store';
import {
  TABS_PADDING,
  TAB_ANIMATION_DURATION,
  TAB_MIN_WIDTH,
  TAB_MAX_WIDTH,
  TAB_PINNED_WIDTH,
} from '../constants';
import { closeWindow } from '../utils/windows';
import { callViewMethod } from '~/utils/view';
import { animateTab } from '../utils/tabs';
import { NEWTAB_URL } from '~/constants/tabs';

export class ITab {
  public id = -1;

  public addressbarFocused = false;
  public addressbarSelectionRange = [0, 0];

  public width = 0;
  public left = 0;

  public lastUrl = '';
  public isClosing = false;
  public ref = React.createRef<HTMLDivElement>();

  public removeTimeout: any;

  public marginLeft = 0;

  @observable
  public isDragging = false;
  @observable
  public isPinned = false;
  @observable
  public isMuted = false;
  @observable
  public isPlaying = false;
  @observable
  public title = 'New tab';
  @observable
  public loading = true;
  @observable
  public favicon = '';
  @observable
  public tabGroupId = -1;
  @observable
  public addressbarValue: string = null;
  @observable
  public url = '';
  @observable
  public blockedAds = 0;
  @observable
  public hasCredentials = false;

  @computed
  public get isSelected() {
    return store.tabs.selectedTabId === this.id;
  }

  @computed
  public get isHovered() {
    return store.tabs.hoveredTabId === this.id;
  }

  @computed
  public get isExpanded() {
    return this.isHovered || this.isSelected || !store.tabs.scrollable;
  }

  @computed
  public get $isIconSet() {
    return this.favicon !== '' || this.loading;
  }

  public constructor(
    { active, url, pinned }: chrome.tabs.CreateProperties,
    id: number,
  ) {
    makeObservable(this);

    this.url = url;
    this.id = id;
    this.isPinned = pinned;

    if (NEWTAB_URL.startsWith(url)) {
      this.addressbarFocused = true;
    }

    if (active) {
      requestAnimationFrame(() => {
        this.select();
      });
    }

    if (process.env.ENABLE_EXTENSIONS) {
      const { defaultBrowserActions } = store.extensions;

      for (const item of defaultBrowserActions) {
        store.extensions.addBrowserActionToTab(this.id, item);
      }
    }
  }

  @action
  public async updateData() {
    if (!store.isIncognito) {
      await store.startupTabs.addStartupTabItem({
        id: this.id,
        windowId: store.windowId,
        url: this.url,
        favicon: this.favicon,
        pinned: !!this.isPinned,
        title: this.title,
        isUserDefined: false,
        order: store.tabs.list.indexOf(this),
      });
    }
  }

  public get tabGroup() {
    return store.tabGroups.getGroupById(this.tabGroupId);
  }

  @action
  public async select() {
    if (!this.isClosing) {
      store.tabs.selectedTabId = this.id;

      ipcRenderer.send(`web-contents-view-show-${store.windowId}`);

      const focused = this.addressbarFocused;

      await ipcRenderer.invoke(
        `view-select-${store.windowId}`,
        this.id,
        !this.addressbarFocused,
      );

      if (focused) {
        store.inputRef.focus();
        store.inputRef.setSelectionRange(
          this.addressbarSelectionRange[0],
          this.addressbarSelectionRange[1],
        );
      }
    }
  }

  public getWidth(containerWidth: number = null, tabs: ITab[] = null) {
    if (this.isPinned) return TAB_PINNED_WIDTH;

    if (containerWidth === null) {
      containerWidth = store.tabs.containerWidth;
    }

    if (tabs === null) {
      tabs = store.tabs.list.filter((x) => !x.isClosing);
    }

    const pinnedTabs = tabs.filter((x) => x.isPinned).length;

    const realTabsLength = tabs.length - pinnedTabs + store.tabs.removedTabs;

    const width =
      (containerWidth - pinnedTabs * (TAB_PINNED_WIDTH + TABS_PADDING)) /
        realTabsLength -
      TABS_PADDING -
      store.tabs.leftMargins / realTabsLength;

    if (width > TAB_MAX_WIDTH) {
      return TAB_MAX_WIDTH;
    }
    if (width < TAB_MIN_WIDTH) {
      return TAB_MIN_WIDTH;
    }

    return width;
  }

  public getLeft(calcNewLeft = false) {
    const tabs = store.tabs.list.filter((x) => !x.isClosing).slice();

    const index = tabs.indexOf(this);

    let left = 0;

    if (calcNewLeft) store.tabs.calculateTabMargins();

    for (let i = 0; i < index; i++) {
      left +=
        (calcNewLeft ? tabs[i].getWidth() : tabs[i].width) +
        TABS_PADDING +
        tabs[i].marginLeft;
    }

    return left + this.marginLeft;
  }

  public removeFromGroup() {
    if (!this.tabGroup) return;

    if (this.tabGroup.tabs.length === 1) {
      store.tabGroups.list = store.tabGroups.list.filter(
        (x) => x.id !== this.tabGroupId,
      );
    }

    this.tabGroupId = -1;
    store.tabs.updateTabsBounds(true);
  }

  @action
  public setLeft(left: number, animation: boolean) {
    if (store.settings.object.leftDockTabs) {
      // In left dock mode we don't animate or translate tabs; list layout handles position.
      this.left = 0;
      return;
    }
    animateTab('translateX', left, this.ref.current, animation);
    this.left = left;
  }

  @action
  public setWidth(width: number, animation: boolean) {
    if (store.settings.object.leftDockTabs) {
      // In left dock mode, width is controlled by CSS (auto/full width). Avoid inline width animations.
      this.width = width;
      return;
    }
    animateTab('width', width, this.ref.current, animation);
    this.width = width;
  }

  @action
  public close() {
    store.tabs.closedUrl = this.url;
    store.tabs.canShowPreview = false;
    ipcRenderer.send(`hide-tab-preview-${store.windowId}`);

    const selected = store.tabs.selectedTabId === this.id;

    store.startupTabs.removeStartupTabItem(this.id);

    ipcRenderer.send(`view-destroy-${store.windowId}`, this.id);

    const notClosingTabs = store.tabs.list.filter((x) => !x.isClosing);
    let index = notClosingTabs.indexOf(this);

    if (notClosingTabs.length === 1) {
      closeWindow();
    }

    this.isClosing = true;
    if (notClosingTabs.length - 1 === index) {
      const previousTab = store.tabs.list[index - 1];
      if (previousTab) {
        this.setLeft(previousTab.getLeft(true) + this.getWidth(), true);
      }
      store.tabs.updateTabsBounds(true);
    } else {
      store.tabs.removedTabs++;
    }

    this.removeFromGroup();

    this.setWidth(0, true);
    store.tabs.setTabsLefts(true);
    store.tabs.setTabGroupsLefts(true);

    if (selected) {
      index = store.tabs.list.indexOf(this);

      if (
        index + 1 < store.tabs.list.length &&
        !store.tabs.list[index + 1].isClosing &&
        !store.tabs.scrollable
      ) {
        const nextTab = store.tabs.list[index + 1];
        nextTab.select();
      } else if (index - 1 >= 0 && !store.tabs.list[index - 1].isClosing) {
        const prevTab = store.tabs.list[index - 1];
        prevTab.select();
      }
    }

    this.removeTimeout = setTimeout(() => {
      store.tabs.removeTab(this.id);
    }, TAB_ANIMATION_DURATION);
  }

  public callViewMethod = (scope: string, ...args: any[]): Promise<any> => {
    return callViewMethod(this.id, scope, ...args);
  };
}
