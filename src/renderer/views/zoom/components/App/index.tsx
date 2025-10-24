import isPropValid from '@emotion/is-prop-valid';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

import { StyledApp, Label, Buttons, Spacer } from './style';
import { ToolbarButton } from '../../../app/components/ToolbarButton';
import store from '../../store';
import { Button } from '~/renderer/components/Button';
import { ipcRenderer } from 'electron';
import { UIStyle } from '~/renderer/mixins/default-styles';

import { ICON_UP, ICON_DOWN } from '~/renderer/constants/icons';

const onPlus = () => {
  ipcRenderer.send('change-zoom', 'in');
};

const onMinus = () => {
  ipcRenderer.send('change-zoom', 'out');
};

const onReset = () => {
  ipcRenderer.send('change-zoom', 'reset');
};

ipcRenderer.on('zoom-factor', (_e, zoomFactor: number) => {
  store.zoomFactor = zoomFactor;
});

export const App = observer(() => {
  return (
    <StyleSheetManager
      shouldForwardProp={(propName) =>
        isPropValid(propName) || propName.startsWith('$')
      }
    >
      <ThemeProvider theme={{ ...store.theme }}>
        <StyledApp
          $visible={store.visible}
          onMouseEnter={() => store.stopHideTimer()}
          onMouseLeave={() => store.resetHideTimer()}
        >
          <UIStyle />
          <Buttons>
            <ToolbarButton icon={ICON_UP} onClick={onPlus} />
            <Label>{Math.round(store.zoomFactor * 100)}%</Label>
            <ToolbarButton icon={ICON_DOWN} onClick={onMinus} />
            <Spacer />
            <Button
              onClick={onReset}
              background={
                store.theme['dialog.lightForeground']
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.08)'
              }
              foreground={
                store.theme['dialog.lightForeground'] ? 'white' : 'black'
              }
            >
              Reset
            </Button>
          </Buttons>
        </StyledApp>
      </ThemeProvider>
    </StyleSheetManager>
  );
});
