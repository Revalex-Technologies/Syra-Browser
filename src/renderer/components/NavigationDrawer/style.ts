import styled, { css } from 'styled-components';

import { transparency, ICON_SEARCH } from '~/renderer/constants';
import { ITheme } from '~/interfaces';
import { centerIcon, noButtons } from '~/renderer/mixins';

export const StyledNavigationDrawer = styled.div.withConfig({
  shouldForwardProp: (p) => !['dense', 'hideLabels'].includes(p as string),
})<{
  dense?: boolean;
  hideLabels?: boolean;
}>`
  height: 100%;
  left: 0;
  display: flex;
  flex-flow: column;
  transition: 0.2s width;

  ${({
    theme,
    dense,
    hideLabels,
  }: {
    theme?: ITheme;
    dense?: boolean;
    hideLabels?: boolean;
  }) => css`
    /* Remove horizontal padding in compact mode; keep it otherwise */
    padding: ${dense ? 0 : '0 32px'};

    width: ${dense ? 56 : 320}px;

    background-color: ${dense
      ? hideLabels
        ? theme['pages.navigationDrawer2.backgroundColor']
        : theme['pages.navigationDrawer1.backgroundColor']
      : theme['pages.navigationDrawer2.backgroundColor']};
  `}
`;

export const MenuItems = styled.div.withConfig({
  shouldForwardProp: (p) => !['dense'].includes(p as string),
})<{ dense?: boolean }>`
  display: flex;
  flex-flow: column;
  flex: 1;
  margin-top: 24px;
  padding-bottom: 24px;
  overflow: hidden auto;
  ${noButtons('6px', 'rgba(0, 0, 0, 0.04)', 'rgba(0, 0, 0, 0.12)')};
`;

export const Header = styled.div.withConfig({
  shouldForwardProp: (p) => !['dense'].includes(p as string),
})`
  display: flex;
  margin-top: 32px;
  align-items: center;
`;

export const Title = styled.div.withConfig({
  shouldForwardProp: (p) => !['dense'].includes(p as string),
})`
  font-size: 24px;
  font-weight: 300;
`;

export const Input = styled.input.withConfig({
  shouldForwardProp: (p) => !['dense'].includes(p as string),
})`
  border: none;
  outline: none;

  width: 100%;
  padding-left: 42px;
  background-color: transparent;
  height: 100%;
  font-size: 14px;

  ${({ theme }: { theme?: ITheme }) => css`
    color: ${theme['pages.lightForeground']
      ? 'white'
      : `rgba(0, 0, 0, ${transparency.text.high})`};

    &::placeholder {
      color: ${theme['pages.lightForeground']
        ? 'rgba(255, 255, 255, 0.54)'
        : `rgba(0, 0, 0, ${transparency.text.medium})`};
    }
  `}
`;

export const Search = styled.div.withConfig({
  shouldForwardProp: (p) => !['dense'].includes(p as string),
})`
  margin-top: 24px;
  height: 42px;
  border-radius: 30px;

  position: relative;

  ${({ theme }: { theme?: ITheme }) => css`
    background-color: ${theme['pages.lightForeground']
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.04)'};
  `}

  &:after {
    content: '';
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    ${centerIcon(16)};
    background-image: url(${ICON_SEARCH});

    ${({ theme }: { theme?: ITheme }) => css`
      filter: ${theme['pages.lightForeground'] ? 'invert(100%)' : 'none'};
    `}
  }
`;
