import styled from 'styled-components';
import { ITheme } from '~/interfaces';

export const Page = styled.div`
  background-color: ${(props: { theme: ITheme }) =>
    props.theme.backgroundColor};
  color: ${(props: { theme: ITheme }) =>
    props.theme['pages.textColor'] ?? 'inherit'};
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* prevent outer page scrollbar */
`;

export const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
`;

export const SubTitle = styled.div`
  opacity: 0.72;
  margin-bottom: 24px;
`;

export const List = styled.div`
  max-width: 1024px;
  margin: 0 auto;
  padding: 0 64px 32px;
`;

export const Scroller = styled.div`
  flex: 1;
  width: 100%;
  overflow: auto; /* scrollbar at the edge of the page/content */
`;

export const Header = styled.div`
  max-width: 1024px;
  margin: 64px auto 0;
  padding: 0 64px 16px;
`;
