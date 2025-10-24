import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';

import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { ClockWrap } from './style';

function formatTime(date: Date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const Clock = observer(() => {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <ClockWrap>
      <div className="time">{formatTime(now)}</div>
    </ClockWrap>
  );
});
