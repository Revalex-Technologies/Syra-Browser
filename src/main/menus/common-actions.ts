import { extname } from 'path';
import { dialog } from 'electron';
import { Application } from '../application';

export const saveAs = async () => {
  const { title, webContents } =
    Application.instance.windows.current.viewManager.selected;

  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: title,
    filters: [
      { name: 'Webpage, Complete', extensions: ['html', 'htm'] },
      { name: 'Webpage, HTML Only', extensions: ['htm', 'html'] },
    ],
  });

  if (canceled) return;

  const ext = extname(filePath);

  webContents.savePage(filePath, ext === '.htm' ? 'HTMLOnly' : 'HTMLComplete');
};

export const viewSource = async () => {
  const { viewManager } = Application.instance.windows.current;

  viewManager.create(
    {
      url: `view-source:${viewManager.selected.url}`,
      active: true,
    },
    true,
  );
};

export const printPage = () => {
  const windowsService = Application.instance.windows;
  const currentWindow = windowsService?.current;
  const selectedView = currentWindow?.viewManager?.selected;
  const wc = selectedView?.webContents || currentWindow?.win?.webContents;

  if (wc && typeof (wc as any).print === 'function') {
    try {
      (wc as any).print();
    } catch (err) {
      console.error('Print failed:', err);
    }
  } else {
    console.warn('[printPage] No active webContents to print.');
  }
};
