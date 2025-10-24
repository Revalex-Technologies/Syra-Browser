import * as React from 'react';
import { observer } from 'mobx-react-lite';

import { StyledNavigationDrawerItem, Icon } from './style';

export const NavigationDrawerItem = observer(
  ({
    children,
    selected,
    onClick,
    icon,
    dense,
    hideLabels,
  }: {
    children: any;
    selected?: boolean;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    icon?: string;
    dense?: boolean;
    hideLabels?: boolean;
  }) => {
    const titleText =
      typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : '';

    return (
      <StyledNavigationDrawerItem
        title={titleText}
        selected={selected}
        onClick={onClick}
        hideLabels={hideLabels}
      >
        {icon && (
          <Icon
            style={{ backgroundImage: `url(${icon})` }}
            hideLabels={hideLabels}
          />
        )}
        {/* Only render the label when hideLabels is false */}
        {!hideLabels && <span className="label">{children}</span>}
      </StyledNavigationDrawerItem>
    );
  },
);
