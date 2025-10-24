import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { DialogStyle } from '~/renderer/mixins/dialogs';

export const StyledApp = styled(DialogStyle).withConfig({
  shouldForwardProp: (p) => p !== '$visible',
})<{ $visible?: boolean }>`
  padding: 16px;
  ${({ $visible = true }) => css`
    display: ${$visible ? 'block' : 'none'};
  `}
  ${({ theme }: { theme?: ITheme }) => css`
    color: ${theme && theme['dialog.lightForeground'] ? '#fff' : '#000'};
  `}
`;

export const Label = styled.div`
  font-size: 16px;
  min-width: 45px;
  text-align: center;
`;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  & .button:not(:last-child) {
    margin-right: 8px;
  }
`;

export const Spacer = styled.div`
  flex: 1;
`;
