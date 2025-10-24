import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import { observer } from 'mobx-react-lite';
import * as React from 'react';

import { StyledToolbar } from './style';
import { NavigationButtons } from '../NavigationButtons';
import { AddressBar } from '../AddressBar';
import { RightButtons } from '../RightButtons';
import store from '../../store';

const noDragStyle: React.CSSProperties & {
  WebkitAppRegion?: 'no-drag' | 'drag';
} = {
  position: 'absolute',
  right: 0,
  top: 0,
  WebkitAppRegion: 'no-drag',
  display: 'flex',
  alignItems: 'center',
};

export const Toolbar = observer(() => {
  return (
    <StyledToolbar>
      <NavigationButtons />
      <AddressBar />
      <RightButtons />
    </StyledToolbar>
  );
});
