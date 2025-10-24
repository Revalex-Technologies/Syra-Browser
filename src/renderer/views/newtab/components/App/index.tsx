import isPropValid from '@emotion/is-prop-valid';
import * as React from 'react';
import { observer } from 'mobx-react-lite';

import store from '../../store';
import { ThemeProvider, StyleSheetManager } from 'styled-components';
import { Wrapper, Content, IconItem, Menu, Image, RightBar } from './style';
import { TopSites } from '../TopSites';
import { Clock } from '../Clock';
import { Weather } from '../Weather';
import { News } from '../News';
import { Preferences } from '../Preferences';
import {
  ICON_TUNE,
  ICON_SETTINGS,
  ICON_HISTORY,
  ICON_BOOKMARKS,
  ICON_DOWNLOAD,
  ICON_EXTENSIONS,
} from '~/renderer/constants/icons';
import { WebUIStyle } from '~/renderer/mixins/default-styles';
import { getWebUIURL } from '~/common/webui';

window.addEventListener('mousedown', () => {
  store.dashboardSettingsVisible = false;
});

const onIconClick = (name: string) => () => {
  window.location.href = getWebUIURL(name);
};

const onTuneClick = () => {
  store.dashboardSettingsVisible = !store.dashboardSettingsVisible;
};

const onRefreshClick = () => {
  store.image = '';
  setTimeout(() => {
    localStorage.setItem('imageDate', '');
    store.loadImage();
  }, 50);
};

export default observer(() => {
  return (
    <ThemeProvider theme={{ ...store.theme }}>
      <div>
        <WebUIStyle />

        <Preferences />

        <Wrapper fullSize={store.fullSizeImage}>
          <Weather />
          <Image src={store.imageVisible ? store.image : ''}></Image>
          <Content>
            {store.topSitesVisible && (
              <>
                <Clock />
                <TopSites />
              </>
            )}
          </Content>

          <RightBar onMouseDown={(e) => e.stopPropagation()}>
            <IconItem
              imageSet={store.imageVisible}
              title="Dashboard settings"
              onClick={onTuneClick}
              icon={ICON_TUNE}
            />
          </RightBar>
          {store.quickMenuVisible && (
            <Menu>
              <IconItem
                imageSet={store.imageVisible}
                title="Settings"
                onClick={onIconClick('settings')}
                icon={ICON_SETTINGS}
              />
              <IconItem
                imageSet={store.imageVisible}
                title="History"
                onClick={onIconClick('history')}
                icon={ICON_HISTORY}
              />
              <IconItem
                imageSet={store.imageVisible}
                title="Bookmarks"
                onClick={onIconClick('bookmarks')}
                icon={ICON_BOOKMARKS}
              />
              <IconItem
                imageSet={store.imageVisible}
                title="Downloads"
                onClick={onIconClick('downloads')}
                icon={ICON_DOWNLOAD}
              />
              {}
            </Menu>
          )}
        </Wrapper>
        {}
      </div>
    </ThemeProvider>
  );
});
