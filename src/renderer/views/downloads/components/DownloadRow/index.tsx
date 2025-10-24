import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { shell, ipcRenderer } from 'electron';
import { IDownloadItem } from '~/interfaces';
import {
  StyledDownloadItem,
  Title,
  Progress,
  ProgressBackground,
  Info,
  Icon,
  MoreButton,
  Separator,
  SecondaryText,
} from '~/renderer/views/downloads-dialog/components/DownloadItem/style';

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

const showDownloadContextMenu = (
  item: IDownloadItem,
  ev?: React.MouseEvent,
) => {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  try {
    ipcRenderer.invoke('show-download-context-menu', item.id);
  } catch {}
};

const DownloadRow = observer(({ item }: { item: IDownloadItem }) => {
  const progressPercent =
    item.totalBytes > 0
      ? Math.round((item.receivedBytes / item.totalBytes) * 100)
      : 0;

  const total = formatBytes(item.totalBytes);
  const received = formatBytes(item.receivedBytes);

  return (
    <StyledDownloadItem
      onContextMenu={(e: any) => showDownloadContextMenu(item, e)}
    >
      <Icon />
      <Info>
        <Title>{item.fileName}</Title>
        {(item as any).canceled ? (
          <SecondaryText>Cancelled</SecondaryText>
        ) : item.completed ? (
          <SecondaryText>Completed</SecondaryText>
        ) : (
          <>
            <ProgressBackground>
              <Progress style={{ width: `${progressPercent}%` }} />
            </ProgressBackground>
            <SecondaryText>{`${received}/${total}`}</SecondaryText>
          </>
        )}
      </Info>
      <Separator />
      <MoreButton onClick={(e: any) => showDownloadContextMenu(item, e)} />
    </StyledDownloadItem>
  );
});

export default DownloadRow;
