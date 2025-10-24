import { ITheme } from '~/interfaces';
import styled, { css } from 'styled-components';

export const StyledSuggestions = styled.div.withConfig({
  shouldForwardProp: (p) => p !== 'visible',
})<{ visible?: boolean }>`
  width: 100%;
  overflow: hidden;
  ${({ visible = false }: { visible?: boolean }) => css`
    display: ${visible ? 'block' : 'none'};
  `};
`;
