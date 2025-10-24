import isPropValid from '@emotion/is-prop-valid';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

import { StyledApp, Title, Row, Label, Buttons } from './style';
import store from '../../store';
import { Input } from '~/renderer/components/Input';
import { Dropdown } from '~/renderer/components/Dropdown';
import { Button } from '~/renderer/components/Button';

import { ipcRenderer } from 'electron';
import { getBookmarkTitle } from '~/renderer/views/bookmarks/utils';
import { UIStyle } from '~/renderer/mixins/default-styles';

const onDone = () => {
  store.hide();
};

const updateBookmark = () => {
  if (!store.bookmark) return;
  ipcRenderer.send('bookmarks-update', store.bookmark._id, store.bookmark);
};

const onChange = () => {
  store.bookmark.title = store.titleRef.current.value;
  updateBookmark();
};

const onFolderChange = (value: string) => {
  const folder = store.folders.find((f) => f._id === value);
  if (!folder) return;
  store.currentFolder = folder;
  store.bookmark.parent = folder._id;
  updateBookmark();
};

const onRemove = () => {
  if (!store.bookmark) return;
  ipcRenderer.send('bookmarks-remove', [store.bookmark._id]);
  store.hide();
};

export const App = observer(() => {
  return (
    <ThemeProvider theme={{ ...store.theme }}>
      <StyledApp visible={store.visible}>
        <UIStyle />
        <Title>{store.dialogTitle}</Title>
        <Row>
          <Label>Name</Label>
          <Input
            tabIndex={0}
            className="textfield"
            ref={store.titleRef}
            onChange={onChange}
          />
        </Row>
        <Row>
          <Label>Folder</Label>
          <div className="dropdown">
            <Dropdown
              defaultValue={store.currentFolder ? store.currentFolder._id : ''}
              onChange={onFolderChange}
            >
              {store.folders.map((folder) => (
                <Dropdown.Item key={folder._id} value={folder._id}>
                  {getBookmarkTitle(folder)}
                </Dropdown.Item>
              ))}
            </Dropdown>
          </div>
        </Row>
        <Buttons>
          <Button onClick={onDone}>Done</Button>
          <Button
            onClick={onRemove}
            background={
              store.theme['dialog.lightForeground']
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.08)'
            }
            foreground={
              store.theme['dialog.lightForeground'] ? 'white' : 'black'
            }
          >
            Remove
          </Button>
        </Buttons>
      </StyledApp>
    </ThemeProvider>
  );
});
