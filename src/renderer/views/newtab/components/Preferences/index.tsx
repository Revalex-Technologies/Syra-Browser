import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import { observer } from 'mobx-react-lite';

import { Title, SubTitle, Back } from './style';

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from '~/renderer/components/ContextMenu';
import { Switch } from '~/renderer/components/Switch';
import { Dropdown } from '~/renderer/components/Dropdown';

import store, { Preset } from '../../store';
import { ICON_WINDOW, ICON_BACK } from '~/renderer/constants';

const onBackClick = () => {
  store.preferencesContent = 'main';
};

const onCustomClick = () => {
  store.preferencesContent = 'custom';
  store.preset = 'custom';
};

const onNewsVisibilityChange = (value: any) => {
  store.newsBehavior = value;
  localStorage.setItem('newsBehavior', value);
};

const onSwitchClick = (name: string) => () => {
  (store as any)[name] = !(store as any)[name];
  localStorage.setItem(name, (store as any)[name].toString());
};

const onPresetClick = (name: Preset) => () => {
  store.preset = name;
};

export const SwitchItem = observer(
  ({
    children,
    name,
    disabled,
  }: {
    children: any;
    name: string;
    disabled?: boolean;
  }) => {
    return (
      <ContextMenuItem
        $bigger
        disabled={disabled}
        onClick={onSwitchClick(name)}
      >
        <div style={{ flex: 1 }}>{children}</div>
        <Switch value={(store as any)[name]}></Switch>
      </ContextMenuItem>
    );
  },
);

export const Preferences = observer(() => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pickingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    const handleFocus = () => {
      // reset guard when the native dialog closes (focus returns)
      pickingRef.current = false;
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const onPickCustomImage = () => {
    if (!store.imageVisible || store.changeImageDaily) return;
    if (pickingRef.current) return;
    pickingRef.current = true;
    if (fileInputRef.current) {
      try {
        (fileInputRef.current as any).value = '';
      } catch {}
      fileInputRef.current.click();
    }
  };

  const onCustomFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e: any,
  ) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      pickingRef.current = false;
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        try {
          localStorage.setItem('imageURL', dataUrl);
          pickingRef.current = false;
          localStorage.setItem('imageDate', new Date().toString());
        } catch (err) {}

        store.image = dataUrl;
        store.preset = 'custom';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      e.currentTarget.value = '';
    }
  };

  return (
    <ContextMenu
      translucent
      $bigger
      style={{ right: 32, top: 68, width: 275 }}
      visible={store.dashboardSettingsVisible}
      onMouseDown={(e: any) => e.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          overflow: store.overflowVisible ? 'visible' : 'hidden',
          position: 'relative',
          transform: 'translate(0, 0)',
        }}
      >
        <div
          style={{
            opacity: store.preferencesContent === 'main' ? 1 : 0,
            minWidth: 275,
            transition: '0.3s opacity, 0.3s transform',
            top: 0,
            left: 0,
            pointerEvents:
              store.preferencesContent === 'main' ? 'inherit' : 'none',
            transform:
              store.preferencesContent === 'main'
                ? 'none'
                : 'translateX(-100%)',
          }}
        >
          <Title style={{ marginLeft: 20 }}>Page layout</Title>

          <ContextMenuSeparator />

          <ContextMenuItem
            $bigger
            onClick={onPresetClick('focused')}
            selected={store.preset === 'focused'}
            iconSize={28}
            icon={ICON_WINDOW}
          >
            Focused
          </ContextMenuItem>
          <ContextMenuItem
            $bigger
            onClick={onPresetClick('inspirational')}
            selected={store.preset === 'inspirational'}
            iconSize={28}
            icon={ICON_WINDOW}
          >
            Inspirational
          </ContextMenuItem>
          {}
          <ContextMenuItem
            $bigger
            selected={store.preset === 'custom'}
            onClick={onCustomClick}
            iconSize={28}
            icon={ICON_WINDOW}
          >
            Custom
          </ContextMenuItem>
        </div>
        <div
          style={{
            minWidth: 275,
            position: 'relative',
            opacity: store.preferencesContent === 'custom' ? 1 : 0,
            pointerEvents:
              store.preferencesContent === 'custom' ? 'inherit' : 'none',
            transition: '0.3s max-height, 0.3s transform, 0.3s opacity',

            maxHeight: store.preferencesContent === 'custom' ? 300 : 150,
            transform:
              store.preferencesContent === 'custom'
                ? 'translateX(-100%)'
                : 'none',
          }}
        >
          <Title>
            <Back icon={ICON_BACK} onClick={onBackClick}></Back>
            Custom
          </Title>
          <ContextMenuSeparator />
          <SwitchItem name="imageVisible">Show image</SwitchItem>
          <SwitchItem disabled={!store.imageVisible} name="changeImageDaily">
            Change the image daily
          </SwitchItem>
          <ContextMenuItem
            $bigger
            disabled={!store.imageVisible || store.changeImageDaily}
            onClick={onPickCustomImage}
          >
            Choose custom image
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onClick={(e) => e.stopPropagation()}
              onChange={onCustomFileChange}
            />
          </ContextMenuItem>
        </div>
      </div>
    </ContextMenu>
  );
});
