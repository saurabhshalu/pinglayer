import winston from 'winston';
import { config } from '../config/env';

const REDACTED = '[REDACTED]';

const sensitiveKeys = new Set([
  'access_token', 'accessToken', 'token', 'password', 'secret',
  'api_key', 'apiKey', 'key_hash', 'keyHash', 'encrypted_data',
  'authorization', 'credential', 'credentials',
  'waba_id', 'phone_number_id', 'phoneNumberId',
]);

function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 10 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => redactSensitive(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (sensitiveKeys.has(key.toLowerCase()) || sensitiveKeys.has(key)) {
      result[key] = REDACTED;
    } else {
      result[key] = redactSensitive(value, depth + 1);
    }
  }
  return result;
}

const formats = [
  winston.format.timestamp(),
  winston.format((info) => {
    info.message = redactSensitive(info.message);
    if (info.meta) info.meta = redactSensitive(info.meta);
    return info;
  })(),
];

if (config.logging.format === 'json') {
  formats.push(winston.format.json());
} else {
  formats.push(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, requestId, ...rest }) => {
      const rid = requestId ? ` [${requestId}]` : '';
      const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
      return `${timestamp} ${level}${rid}: ${message}${extra}`;
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(...formats),
  transports: [new winston.transports.Console()],
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
