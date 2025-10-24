import * as React from 'react';

import {
  StyledNavigationDrawer,
  MenuItems,
  Search,
  Input,
  Title,
  Header,
} from './style';
import { NavigationDrawerItem } from './NavigationDrawerItem';

export const NavigationDrawer = ({
  children,
  title,
  search,
  onSearchInput,
  style,
  dense,
  hideLabels,
}: {
  children?: any;
  title?: string;
  search?: boolean;
  onSearchInput?: (event: React.FormEvent<HTMLInputElement>) => void;
  onBackClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  style?: any;
  dense?: boolean;
  hideLabels?: boolean;
}) => {
  const clonedChildren = React.Children.map(children, (child: any) => {
    if (React.isValidElement(child) && child.type === NavigationDrawerItem) {
      return React.cloneElement(child as any, { dense, hideLabels } as any);
    }
    return child;
  });

  return (
    <StyledNavigationDrawer style={style} dense={dense} hideLabels={hideLabels}>
      {title !== '' && (
        <Header>
          <Title>{title}</Title>
        </Header>
      )}
      {search && (
        <Search>
          <Input placeholder="Search" onInput={onSearchInput} />
        </Search>
      )}
      <MenuItems>{clonedChildren}</MenuItems>
    </StyledNavigationDrawer>
  );
};

NavigationDrawer.Item = NavigationDrawerItem;
