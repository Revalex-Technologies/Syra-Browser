import { protocol } from 'electron';
import type { Session } from 'electron';
import { join } from 'path';
import { ERROR_PROTOCOL, WEBUI_PROTOCOL } from '~/constants/files';

/**
 * Register schemes as privileged before app ready.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'syra',
    privileges: {
      bypassCSP: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: false,
    },
  },
  {
    scheme: 'syra-error',
    privileges: {
      bypassCSP: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: false,
    },
  },
]);

/**
 * Registers protocol handlers for a given session.
 */
export const registerProtocol = (session: Session) => {
  // 1) Error protocol: always available; serve HTML as a buffer so it renders even if files are missing.
  session.protocol.registerBufferProtocol(
    ERROR_PROTOCOL,
    (request, respond) => {
      try {
        const u = new URL(request.url);
        const fs = require('fs') as typeof import('fs');

        const readCandidate = (): string => {
          const candidates = [
            join(__dirname, 'network-error.html'),
            join(__dirname, '../network-error.html'),
            join(__dirname, '../static/pages/network-error.html'),
            join(__dirname, '../../static/pages/network-error.html'),
          ];
          for (const p of candidates) {
            try {
              if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
            } catch {}
          }
          return '';
        };

        let html = '';
        if (u.hostname === 'network-error') {
          html = readCandidate();
          if (!html) {
            const code = (u.hash || '').replace(/^#/, '');
            html = `<!doctype html><html><head><meta charset="utf-8">
              <meta name="color-scheme" content="dark light" />
              <title>Network error</title>
              <style>
                body{margin:0;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#111;color:#eee;display:flex;min-height:100vh;align-items:center;justify-content:center}
                .main{max-width:560px;padding:24px}
                h2{margin:0 0 8px 0}
                p{opacity:.85}
                button{margin-top:16px;padding:10px 14px;border-radius:8px;border:1px solid #444;background:#222;color:#eee;cursor:pointer}
              </style>
            </head><body>
              <div class="main"><h2>Can’t load that page</h2><p>Error code: <code>${code}</code></p>
              <button onclick="location.reload()">Try again</button></div>
            </body></html>`;
          }
        } else {
          html =
            '<!doctype html><html><meta charset="utf-8"><title>Not found</title></html>';
        }

        return respond({
          data: Buffer.from(html, 'utf8'),
          mimeType: 'text/html',
          charset: 'utf-8',
        });
      } catch (e) {
        const fallback = '<!doctype html><title>Error</title>';
        return respond({
          data: Buffer.from(fallback, 'utf8'),
          mimeType: 'text/html',
          charset: 'utf-8',
        });
      }
    },
  );

  // 2) WebUI protocol: dev proxies to WDS; prod serves files.
  if (process.env.NODE_ENV === 'development') {
    session.protocol.registerHttpProtocol(
      WEBUI_PROTOCOL,
      (request, respond) => {
        const u = new URL(request.url);
        const page =
          u.pathname === '' || u.pathname === '/'
            ? `${u.hostname}.html`
            : decodeURIComponent(
                u.pathname.replace(/^\/+/, '').replace(/\+/g, '/'),
              );
        respond({ url: `http://localhost:4444/${page}` });
      },
    );
  } else {
    session.protocol.registerFileProtocol(
      WEBUI_PROTOCOL,
      (request, respond) => {
        const u = new URL(request.url);
        if (u.pathname === '' || u.pathname === '/') {
          return respond({ path: join(__dirname, `${u.hostname}.html`) });
        }
        const p = decodeURIComponent(
          u.pathname.replace(/^\/+/, '').replace(/\+/g, '/'),
        );
        return respond({ path: join(__dirname, p) });
      },
    );
  }
};
