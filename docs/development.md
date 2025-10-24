# Development

## electron remote package

We install `@electron/remote` because the built in remote was removed from electron a long time ago, then we hook it like this

```ts
import { enable } from '@electron/remote/main';

// we enable remote within the webContents
enable(this.win.webContents);
```

## IPC

Now, the preferred way to communicate between processes is to use [`@wexond/rpc-electron`](https://github.com/wexond/rpc) package.

Example:

Handling the IPC message in the main process:

[`src/main/network/network-service-handler.ts`](../src/main/network/network-service-handler.ts)


Sending the IPC message to the main process:

```ts
const { data } = await networkMainChannel.getInvoker().request('http://localhost');
```

Common RPC interface

[`src/common/rpc/network.ts`](../src/common/rpc/network.ts)

## Node integration

We turn of `nodeIntegration` in the view and enable `contextIsolation`for security, this also fixes websites from not properly loading because theres no fallback for them (in wexond 5.2.0 this was not enabled).

## Project structure

Common interfaces, constants etc. should land into the `common` directory.
