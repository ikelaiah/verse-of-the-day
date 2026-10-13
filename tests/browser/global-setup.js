import { once } from 'node:events';
import { createStaticServer } from '../../scripts/serve.mjs';

export default async function globalSetup() {
  const server = createStaticServer(process.cwd(), { basePath: '/verse-of-the-day' });
  server.listen(8765, '127.0.0.1');
  await once(server, 'listening');

  return async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  };
}
