import { RendererToMainChannel } from '@wexond/rpc-electron';

export interface ResponseDetails {
  statusCode: number;
  data: string; // binary string
  headers?: Record<string, string | string[] | undefined>;
}

export interface NetworkService {
  request(url: string): Promise<ResponseDetails>;
}

let _networkMainChannel: RendererToMainChannel<NetworkService> | undefined;
export const getNetworkMainChannel = () =>
  (_networkMainChannel ??= new RendererToMainChannel<NetworkService>(
    'NetworkService',
  ));
