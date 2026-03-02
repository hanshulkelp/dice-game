import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env before anything else
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/api/.env') });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Strip unknown fields & validate all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip properties not in the DTO
      forbidNonWhitelisted: true, // throw 400 if unknown fields are sent
      transform: true,          // auto-cast primitives to their DTO types
    }),
  );

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();