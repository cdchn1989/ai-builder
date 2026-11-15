import { createServer } from 'node:http';
import { createApp } from './infrastructure/http/app';

const port = Number(process.env.PORT ?? 3000);
const server = createServer(createApp());

server.listen(port, '0.0.0.0', () => {
  console.log(`[api] escuchando en http://0.0.0.0:${port}`);
});
