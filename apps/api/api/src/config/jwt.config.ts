import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as StringValue,
  refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshExpiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d') as StringValue,
}));
