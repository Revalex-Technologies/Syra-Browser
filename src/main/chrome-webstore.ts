import { Application } from './application';
import { getPath } from '~/utils';

export async function setupChromeWebStore(app: Application): Promise<void> {
  if (!process.env.ENABLE_EXTENSIONS) return;

  try {
    const { installChromeWebStore } =
      require('electron-chrome-web-store') as typeof import('electron-chrome-web-store');

    const extPath = getPath('extensions') || undefined;

    await installChromeWebStore({
      session: app.sessions.view,
      extensionsPath: extPath,
      loadExtensions: true,
      allowUnpackedExtensions: false,
      autoUpdate: true,
      minimumManifestVersion: 3,
    });
  } catch (err) {
    console.error('Failed to initialize Chrome Web Store integration:', err);
  }
}
