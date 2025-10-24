import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
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
} from './style';
import { IDownloadItem } from '~/interfaces';

const showDownloadContextMenu = (
  item: IDownloadItem,
  ev?: React.MouseEvent,
) => {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  const menu = Menu.buildFromTemplate([
    {
      label: 'Pause',
      enabled: !item.completed,
      click: () => ipcRenderer.invoke('pause-download', item.id),
    },
    {
      label: 'Resume',
      enabled: !item.completed,
      click: () => ipcRenderer.invoke('resume-download', item.id),
    },
    { type: 'separator' },
    {
      label: 'Cancel',
      enabled: !item.completed,
      click: () => ipcRenderer.invoke('cancel-download', item.id),
    },
    { type: 'separator' },
    {
      label: 'Open file',
      enabled: !!item.savePath && !!item.completed,
      click: () => item.savePath && shell.openPath(item.savePath),
    },
    {
      label: 'View in file manager',
      enabled: !!item.savePath,
      click: () => item.savePath && shell.showItemInFolder(item.savePath),
    },
  ]);
  menu.popup({ window: getCurrentWindow() });
};

import { shell, ipcRenderer } from 'electron';
import { Menu, getCurrentWindow } from '@electron/remote';

const prettyBytes = (input: number): string => {
  if (typeof input !== 'number' || !isFinite(input)) return '0 B';
  const neg = input < 0;
  const num = Math.abs(input);
  if (num < 1) return `${neg ? '-' : ''}${num} B`;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const exponent = Math.min(Math.floor(Math.log10(num) / 3), units.length - 1);
  const value = Number((num / Math.pow(1000, exponent)).toFixed(2));
  return `${neg ? '-' : ''}${value} ${units[exponent]}`;
};

const onClick = (item: IDownloadItem) => () => {
  if (item.completed && item.savePath) {
    shell.openPath(item.savePath);
  }
};

const onMoreClick =
  (item: IDownloadItem) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

export const DownloadItem = observer(({ item }: { item: IDownloadItem }) => {
  let received = prettyBytes(item.receivedBytes);
  const total = prettyBytes(item.totalBytes);

  const receivedSplit = received.split(' ');

  if (receivedSplit[1] === total.split(' ')[1]) {
    received = receivedSplit[0];
  }

  const totalBytes = Number(item.totalBytes) || 0;
  const receivedBytes = Number(item.receivedBytes) || 0;
  const progressPercent =
    totalBytes > 0
      ? Math.max(0, Math.min(1, receivedBytes / totalBytes)) * 100
      : 100;

  return (
    <StyledDownloadItem onClick={onClick(item)}>
      <Icon></Icon>
      <Info>
        <Title>{item.fileName}</Title>
        {(item as any).canceled ? (
          <SecondaryText>Canceled</SecondaryText>
        ) : item.completed ? (
          <SecondaryText>Completed</SecondaryText>
        ) : null}
        {!item.completed && !(item as any).canceled && (
          <>
            <ProgressBackground>
              <Progress style={{ width: `${progressPercent}%` }}></Progress>
            </ProgressBackground>
            <SecondaryText>{`${received}/${total}`}</SecondaryText>
          </>
        )}
      </Info>
      <Separator></Separator>
      <MoreButton
        onClick={(e: any) => showDownloadContextMenu(item, e)}
        onContextMenu={(e: any) => showDownloadContextMenu(item, e)}
      ></MoreButton>
    </StyledDownloadItem>
  );
});
