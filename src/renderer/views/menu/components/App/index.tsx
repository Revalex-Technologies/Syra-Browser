import isPropValid from '@emotion/is-prop-valid';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

import { StyledApp } from './style';
import { QuickMenu } from '../QuickMenu';
import store from '../../store';
import { UIStyle } from '~/renderer/mixins/default-styles';

function __applyFirstOpenTransition(el: HTMLElement | null, active: boolean) {
  if (!el) return;
  el.style.willChange = 'opacity, transform';
  el.style.transition = 'opacity 160ms ease, transform 200ms ease';
  if (!active) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.pointerEvents = 'none';
    return;
  }

  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  el.style.pointerEvents = 'auto';

  void el.offsetWidth;
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

export const App = observer(() => {
  const __qmRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    __applyFirstOpenTransition(__qmRef.current, true);
  }, []);

  return (
    <div ref={__qmRef}>
      <ThemeProvider
        theme={{ ...store.theme, dark: store.theme['dialog.lightForeground'] }}
      >
        <StyledApp>
          <UIStyle />
          <QuickMenu />
        </StyledApp>
      </ThemeProvider>
    </div>
  );
});
