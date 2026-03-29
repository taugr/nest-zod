import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { PlainItemsController } from './plain-items.controller';

@Module({
  controllers: [ItemsController, PlainItemsController],
})
export class AppModule {}
