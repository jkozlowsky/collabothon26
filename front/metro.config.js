// Proxy /api/* and WebSocket /ws/* -> backend on loopback, so the phone reaches the
// backend through the same Expo tunnel it uses for Metro. Also default Metro's HTTP
// server to 127.0.0.1 (Expo SDK 58 otherwise binds *:8081 under --tunnel).
const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const path = require('path');
const net = require('net');
const tls = require('tls');

const config = getDefaultConfig(__dirname);
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8080';

const PATCHED_CREATE_SERVER = Symbol.for('finance-quest.metro.createServerPatched');
const METRO_PROXY_MIDDLEWARES =
  globalThis.__financeQuestMetroProxyMiddlewares ??
  (globalThis.__financeQuestMetroProxyMiddlewares = new WeakSet());

function withoutOrigin(headers) {
  const { origin: _origin, ...rest } = headers;
  return rest;
}

function isWsProxyPath(url) {
  if (!url) return false;
  const { pathname } = new URL(url, 'http://localhost');
  return pathname === '/ws' || pathname.startsWith('/ws/');
}

function isLanExplicitlyRequested() {
  const args = process.argv;
  if (args.includes('--lan')) return true;
  const hostIdx = args.findIndex((arg) => arg === '--host' || arg === '-m');
  if (hostIdx !== -1 && args[hostIdx + 1] === 'lan') return true;
  return args.some((arg) => arg === '--host=lan' || arg === '-m=lan');
}

function proxyWsUpgrade(req, socket, head) {
  const target = new URL(req.url, BACKEND_URL);
  const isTls = target.protocol === 'https:';
  const port = Number(target.port) || (isTls ? 443 : 80);

  let connected = false;
  const upstream = (isTls ? tls : net).connect({ host: target.hostname, port });

  upstream.on('connect', () => {
    connected = true;
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    let hasHost = false;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const key = req.rawHeaders[i];
      const lower = key.toLowerCase();
      if (lower === 'host') {
        hasHost = true;
        lines.push(`${key}: ${target.host}`);
      } else {
        lines.push(`${key}: ${req.rawHeaders[i + 1]}`);
      }
    }
    if (!hasHost) lines.push(`Host: ${target.host}`);
    lines.push('', '');

    upstream.write(lines.join('\r\n'));
    if (head && head.length > 0) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on('error', () => {
    if (!connected && !socket.destroyed) {
      socket.end(
        `HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nBackend unreachable at ${BACKEND_URL}`,
      );
    } else {
      socket.destroy();
    }
  });

  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
  upstream.on('close', () => socket.destroy());
}

function enhanceMetroHttpServer(server) {
  // Force loopback binding unless --lan or METRO_HOST was explicitly requested.
  // Expo SDK 58 passes host=undefined to httpServer.listen() in --tunnel mode,
  // which would otherwise listen on all interfaces (*:8081).
  const originalListen = server.listen.bind(server);
  server.listen = function patchedListen(...args) {
    const forcedHost = process.env.METRO_HOST || (isLanExplicitlyRequested() ? undefined : '127.0.0.1');
    if (forcedHost) {
      if (typeof args[0] === 'object' && args[0] !== null) {
        if (!args[0].host) args[0] = { ...args[0], host: forcedHost };
      } else if (typeof args[1] === 'function' || args[1] === undefined) {
        if (typeof args[1] === 'function') {
          args.splice(1, 0, forcedHost);
        } else {
          args[1] = forcedHost;
        }
      }
    }
    return originalListen(...args);
  };

  // Expo SDK 58's runServer-fork.js registers an 'upgrade' listener that calls
  // socket.destroy() for any pathname outside its built-in websocketEndpoints map.
  // Intercept /ws and /ws/* upgrades before Metro's listener can drop them.
  const handledSockets = new WeakSet();
  for (const method of ['on', 'addListener', 'prependListener']) {
    const originalMethod = server[method].bind(server);
    server[method] = function patchedAddListener(event, listener) {
      if (event !== 'upgrade' || typeof listener !== 'function') {
        return originalMethod(event, listener);
      }
      return originalMethod(event, (req, socket, head) => {
        if (isWsProxyPath(req.url)) {
          if (!handledSockets.has(socket)) {
            handledSockets.add(socket);
            proxyWsUpgrade(req, socket, head);
          }
          return;
        }
        return listener(req, socket, head);
      });
    };
  }
}

if (!http.createServer[PATCHED_CREATE_SERVER]) {
  const originalCreateServer = http.createServer;
  const wrappedCreateServer = function patchedCreateServer(...args) {
    const server = originalCreateServer.apply(this, args);
    const requestListener = typeof args[0] === 'function' ? args[0] : args[1];
    if (
      typeof requestListener === 'function' &&
      Array.isArray(requestListener.stack) &&
      requestListener.stack.some((layer) => METRO_PROXY_MIDDLEWARES.has(layer.handle))
    ) {
      enhanceMetroHttpServer(server);
    }
    return server;
  };
  wrappedCreateServer[PATCHED_CREATE_SERVER] = true;
  http.createServer = wrappedCreateServer;
}

config.server.enhanceMiddleware = (metroMiddleware) => {
  const proxyMiddleware = (req, res, next) => {
    if (!req.url.startsWith('/api/')) return metroMiddleware(req, res, next);

    const target = new URL(req.url, BACKEND_URL);
    const upstream = http.request(
      target,
      // Drop Origin: to the browser this is a same-origin request to Metro, so the backend's CORS
      // allow-list must not apply (it would reject e.g. a tunnel URL or another dev port).
      { method: req.method, headers: { ...withoutOrigin(req.headers), host: target.host } },
      (backendRes) => {
        res.writeHead(backendRes.statusCode, backendRes.headers);
        backendRes.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Backend unreachable at ${BACKEND_URL}`);
    });
    req.pipe(upstream);
  };
  METRO_PROXY_MIDDLEWARES.add(proxyMiddleware);
  return proxyMiddleware;
};

// three's CommonJS entry (picked for r3f's native build, which uses require) calls process.emitWarning,
// which React Native lacks. Send every `three` import to the ES module build: it works everywhere and keeps
// one copy of three in the bundle, which r3f needs.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === 'three'
    ? { type: 'sourceFile', filePath: path.join(path.dirname(require.resolve('three', { paths: [__dirname] })), 'three.module.js') }
    : (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);

module.exports = config;
