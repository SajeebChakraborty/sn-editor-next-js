/**
 * Production HTTP server for cPanel / Passenger / any Node host.
 * Startup file: apps/web/server.js
 */
const http = require('http');
const { parse } = require('url');
const path = require('path');
const next = require('next');

process.chdir(__dirname);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);

const app = next({
  dev,
  hostname,
  port,
  dir: __dirname,
});
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url || '/', true);
      handle(req, res, parsedUrl).catch((err) => {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal server error');
      });
    });

const passenger = typeof globalThis.PhusionPassenger !== 'undefined';
    if (passenger) {
      globalThis.PhusionPassenger.configure({ autoInstall: false });
      server.listen('passenger', () => {
        console.log('SN Editor ready (Passenger)');
      });
      return;
    }

    server.listen(port, hostname, () => {
      console.log(`SN Editor ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
