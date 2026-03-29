import 'reflect-metadata';
import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? '3100');

  await app.listen(port);
  console.log(`nest-zod playground listening on http://localhost:${port}`);
  console.log(`swagger docs available at http://localhost:${port}/docs`);
}

void bootstrap();
