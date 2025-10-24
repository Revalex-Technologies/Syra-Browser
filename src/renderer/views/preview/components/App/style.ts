import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { maxLines } from '~/renderer/mixins';
import { TAB_MAX_WIDTH } from '~/renderer/views/app/constants/tabs';
import { PersistentDialogStyle } from '~/renderer/mixins/dialogs';

export const StyledApp = styled(PersistentDialogStyle).withConfig({
  shouldForwardProp: (p) => p !== 'xTransition',
})<{ xTransition: boolean; theme?: ITheme }>`
  margin: 0;
  padding: 12px;
  font-size: 13px;
  max-width: ${TAB_MAX_WIDTH}px;

  ${({ theme, xTransition }: { theme?: ITheme; xTransition: boolean }) => css`
    color: ${theme['dialog.textColor']};
    transition: 0.15s opacity${xTransition ? ', 0.08s transform' : ''};
  `}
`;

export const Title = styled.div`
  ${maxLines(1)}
  font-weight: 600;
  line-height: 1.3rem;
`;

export const Domain = styled.div`
  ${maxLines(1)}
  opacity: 0.65;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.2rem;
`;

export const Divider = styled.div`
  height: 1px;
  background: ${({ theme }: { theme?: ITheme }) =>
    theme['dialog.separator.color']};
  margin: 8px 0 10px 0;
  opacity: 0.75;
`;

export const MemoryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 12px;
  line-height: 1;
  & > span {
    opacity: 0.7;
  }
  & > strong {
    font-weight: 600;
  }
`;
