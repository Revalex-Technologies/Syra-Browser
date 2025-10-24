import * as React from 'react';
import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import App from './components/App';
import { renderWebUI } from '~/utils/webui-entry';

const Root = () => (
  <StyleSheetManager shouldForwardProp={isPropValid}>
    <App />
  </StyleSheetManager>
);

renderWebUI(Root);
