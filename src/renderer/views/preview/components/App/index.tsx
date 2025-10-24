import isPropValid from '@emotion/is-prop-valid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

import { StyledApp, Title, Domain, Divider, MemoryRow } from './style';
import store from '../../store';
import { UIStyle } from '~/renderer/mixins/default-styles';

export const App = observer(() => {
  const [calcState, setCalcState] = useState(false);
  useEffect(() => {
    if (!store.visible) {
      setCalcState(false);
      return undefined;
    }
    setCalcState(true);
    const t = setTimeout(() => setCalcState(false), 1000);
    return () => clearTimeout(t);
  }, [store.visible]);

  return (
    <ThemeProvider theme={{ ...store.theme }}>
      <UIStyle />
      <StyledApp
        style={{ transform: `translate3d(${store.x}px, 0, 0)` }}
        xTransition={store.xTransition}
        visible={store.visible}
      >
        <Title>{store.title}</Title>
        <Domain>{store.domain}</Domain>
        <Divider />
        <MemoryRow>
          <span>Memory</span>
          <strong>
            {calcState && !store.hasSample
              ? 'Calculating…'
              : store.hasSample && store.memoryMB != null
                ? `${store.memoryMB} MB`
                : 'N/A'}
          </strong>
        </MemoryRow>
      </StyledApp>
    </ThemeProvider>
  );
});
