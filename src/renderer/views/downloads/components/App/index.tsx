import isPropValid from '@emotion/is-prop-valid';

import * as React from 'react';
import { observer } from 'mobx-react-lite';

import store from '../../store';
import {
  ThemeProvider,
  StyleSheetManager,
  createGlobalStyle,
} from 'styled-components';
import { Container, Content, LeftContent } from '~/renderer/components/Pages';
import styled from 'styled-components';
import { baseStyle, WebUIStyle } from '~/renderer/mixins/default-styles';
import { body2 } from '~/renderer/mixins/typography';
import { GlobalNavigationDrawer } from '~/renderer/components/GlobalNavigationDrawer';
import { IDownloadItem } from '~/interfaces';
import DownloadRow from '../DownloadRow';
import { Page, Title, SubTitle, List, Header, Scroller } from './style';

/** Keep the drawer buttons aligned like other pages (slight upward nudge). */
const ButtonNudge = createGlobalStyle`
  [title] {
    transform: translateY(-2px);
  }
`;

/** Apply standard Web UI text/spacing without altering page background. */
const DownloadsWebUIStyle = createGlobalStyle`
  ${baseStyle};

  body {
    overflow-y: auto;
    ${body2()};
  }
`;

/** Prevent outer page scrollbar on this view. */
const GlobalNoScroll = createGlobalStyle`
  html, body {
    height: 100%;
    margin: 0;
    overflow: hidden;
  }
  #app {
    height: 100%;
  }
`;

const LocalContent = styled(Content)`
  overflow: hidden;
`;

const App = observer(() => {
  React.useEffect(() => {
    document.title = 'Downloads Manager';
  }, []);

  return (
    <ThemeProvider theme={{ ...store.theme }}>
      <WebUIStyle />
      <GlobalNoScroll />
      <ButtonNudge />
      <Container>
        <DownloadsWebUIStyle />
        <GlobalNavigationDrawer />
        <LocalContent>
          <Page>
            <Header>
              <Title>Downloads</Title>
              <SubTitle>Items you download will appear here.</SubTitle>
            </Header>
            <Scroller>
              <List>
                {store.downloads.map((item: IDownloadItem) => (
                  <DownloadRow key={item.id} item={item} />
                ))}
              </List>
            </Scroller>
          </Page>
        </LocalContent>
      </Container>
    </ThemeProvider>
  );
});

export default App;
