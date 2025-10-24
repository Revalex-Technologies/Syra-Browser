import { RpcMainEvent, RpcMainHandler } from '@wexond/rpc-electron';
import {
  getExtensionMainChannel,
  ExtensionMainService,
} from '~/common/rpc/extensions';
import { Application } from './application';

export class ExtensionServiceHandler
  implements RpcMainHandler<ExtensionMainService>
{
  constructor() {
    getExtensionMainChannel().getReceiver().handler = this;
  }

  uninstall(e: RpcMainEvent, id: string): void {
    Application.instance.sessions.uninstallExtension(id);
  }
}
