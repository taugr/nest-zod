import { NestFactory } from '@nestjs/core';
import type { LoggerService, LogLevel } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

export type CreateAppOptions = {
  logger?: false | LoggerService | LogLevel[];
};

export async function createApp(options?: CreateAppOptions) {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: options?.logger,
  });
  app.getHttpAdapter().getInstance().set('query parser', 'extended');

  const config = new DocumentBuilder()
    .setTitle('nest-zod playground')
    .setDescription(
      'Demonstrates Zod-backed NestJS validation, serialization, and Swagger metadata.',
    )
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  return app;
}
