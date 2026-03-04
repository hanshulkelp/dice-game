import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../modules/users/user.entity';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    url: config.get<string>('DATABASE_URL'),
    entities: [User],
    migrations: [],
    synchronize: true,
    logging: true,
  }),
};