import 'zone.js/node';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

console.log('Server starting...');
console.log('browserDistFolder:', browserDistFolder);
console.log('import.meta.dirname:', import.meta.dirname);

const app = express();
const angularApp = new AngularNodeAppEngine();


app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http://localhost:8081 http://localhost:8082; connect-src 'self' http://localhost:* ws://localhost:*; frame-src 'self' http://localhost:*;"
  );
  next();
});


app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});


if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}


export const reqHandler = createNodeRequestHandler(app);

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).setHeader('Content-Security-Policy', "default-src 'self' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http://localhost:8081 http://localhost:8082;").send(`
    <pre>${err.message || err}</pre>
  `);
});
