import isPropValid from '@emotion/is-prop-valid';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

import { StyledApp, Items, Footer } from './style';
import { Button } from '~/renderer/components/Button';
import store from '../../store';
import { DownloadItem } from '../DownloadItem';
import { ipcRenderer } from 'electron';
import { UIStyle } from '~/renderer/mixins/default-styles';
import { getWebUIURL } from '~/common/webui';

export const App = observer(() => {
  const onOpenDownloads = () => {
    ipcRenderer.send(`add-tab-${store.windowId}`, {
      url: getWebUIURL('downloads'),
      active: true,
    });
    store.hide();
  };
  const footerHeight = 44;
  const height =
    8 + Math.min(8, store.downloads.length) * (64 + 8) + footerHeight;
  ipcRenderer.send(`height-${store.id}`, height);

  return (
    <ThemeProvider theme={{ ...store.theme }}>
      <StyledApp style={{ maxHeight: store.maxHeight }} visible={store.visible}>
        <UIStyle />
        <Items>
          {store.downloads.map((item) => (
            <DownloadItem item={item} key={item.id} />
          ))}
        </Items>
        <Footer>
          <Button
            foreground={store.theme['dialog.textColor']}
            onClick={onOpenDownloads}
          >
            View downloads
          </Button>
        </Footer>
      </StyledApp>
    </ThemeProvider>
  );
});
