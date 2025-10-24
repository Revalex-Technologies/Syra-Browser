import styled from 'styled-components';

export const Buttons = styled.div`
  display: flex;
  align-items: center;
  margin-right: 4px;
  /* Removed giant reserved space in compact mode to eliminate right gap near window controls */
  padding-right: ${({ theme }: { theme?: any }) =>
    theme?.isCompact ? '0px' : '0px'};
  padding-left: ${({ theme }: { theme?: any }) =>
    theme?.isCompact ? 'var(--unused-overlay-var, 0px)' : '0px'};
  position: relative;
`;

export const Separator = styled.div`
  height: 16px;
  width: 1px;
  margin-left: 4px;
  margin-right: 4px;
  background: ${({ theme }: { theme?: any }) =>
    theme?.['toolbar.separator.color']};
`;
