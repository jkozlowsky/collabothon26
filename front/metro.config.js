// Proxy /api/* -> backend, so the phone reaches the backend through the same address
// (LAN or --tunnel) it uses for Metro. No second port/tunnel needed.
const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

config.server.enhanceMiddleware = (metroMiddleware) => (req, res, next) => {
  if (!req.url.startsWith('/api/')) return metroMiddleware(req, res, next);

  const target = new URL(req.url, BACKEND_URL);
  const upstream = http.request(
    target,
    { method: req.method, headers: { ...req.headers, host: target.host } },
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

module.exports = config;
