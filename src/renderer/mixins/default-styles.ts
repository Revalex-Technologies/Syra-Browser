import { css, createGlobalStyle } from 'styled-components';
import { ITheme } from '~/interfaces';
import { body2 } from './typography';

export const baseStyle = css`
  body {
    user-select: none;
    cursor: default;
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  * {
    box-sizing: border-box;
  }
  ${({ theme }: { theme?: ITheme }) =>
    theme &&
    (theme as any)['pages.lightForeground'] &&
    css`
      ::selection {
        color: #000 !important;
        background-color: rgba(145, 185, 230, 0.99) !important;
      }
    `};
`;

export const UIStyle = createGlobalStyle`
  ${baseStyle};

  body {
    font-family: system-ui, sans-serif;
  }
`;

export const WebUIStyle = createGlobalStyle`
  ${baseStyle};

  body {
    overflow-y: auto;
    ${body2()};
    ${({ theme }: { theme?: ITheme }) => css`
      background-color: ${theme['pages.backgroundColor']};
      color: ${theme['pages.textColor']};
    `};
  }
`;
