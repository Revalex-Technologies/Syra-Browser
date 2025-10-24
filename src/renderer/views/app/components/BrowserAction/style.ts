import styled from 'styled-components';

export const ExtensionsWrapper = styled.div<{ present?: boolean }>`
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  margin-left: ${({ present, theme }: { present?: boolean; theme?: any }) =>
    theme?.isCompact ? '0' : present ? '6px' : '0'};
`;
