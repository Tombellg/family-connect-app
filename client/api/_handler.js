const { createApp } = require('../../server/dist/app');

let appPromise;

module.exports = async function handler(req, res) {
  if (!appPromise) {
    appPromise = createApp();
  }

  const app = await appPromise;
  const originalUrl = req.url || '/';

  if (!originalUrl.startsWith('/api')) {
    req.url = `/api${originalUrl === '/' ? '' : originalUrl}`;
  }

  return app(req, res);
};
