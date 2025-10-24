import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { DialogStyle, DIALOG_BORDER_RADIUS } from '~/renderer/mixins/dialogs';

export const StyledApp = styled(DialogStyle).withConfig({
  shouldForwardProp: (p) => !['visible'].includes(p as string),
})<{ visible: boolean; theme?: ITheme }>`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px;
  font-size: 13px;

  ${({ theme }: { theme?: ITheme; visible: boolean }) => css`
    &::-webkit-scrollbar {
      width: 6px;
      -webkit-app-region: no-drag;
      background-color: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: ${theme['dialog.lightForeground']
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(0, 0, 0, 0.2)'};

      &:hover {
        background-color: ${theme['dialog.lightForeground']
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)'};
      }
    }
    color: ${theme['dialog.lightForeground'] ? 'white' : 'black'};
  `};
`;

export const Items = styled.div`
  flex: 1 1 auto;
  overflow: auto;
`;

export const Footer = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 8px;

  & .button {
    width: 100%;
    border-radius: 8px;
    background-color: transparent !important;
  }

  ${({ theme }: { theme?: ITheme }) => css`
    & .button:hover {
      background-color: ${theme['dialog.lightForeground']
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.06)'};
    }
    & .button:active::before {
      opacity: 0.16;
    }
  `};
`;
