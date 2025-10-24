import { RendererToMainChannel } from '@wexond/rpc-electron';

export interface ExtensionMainService {
  uninstall(id: string): void;
}

let _extensionMainChannel:
  | RendererToMainChannel<ExtensionMainService>
  | undefined;
export const getExtensionMainChannel = () =>
  (_extensionMainChannel ??= new RendererToMainChannel<ExtensionMainService>(
    'ExtensionMainService',
  ));
