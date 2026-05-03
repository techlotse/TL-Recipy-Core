import crypto from 'node:crypto';
import { config } from '../config.js';

const PREFIX = 'enc:v1';

function getKey() {
  return crypto.createHash('sha256').update(config.appSecret).digest();
}

export function encryptSecret(value) {
  if (!value) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join(':');
}

export function decryptSecret(value) {
  if (!value) return '';
  if (!value.startsWith(PREFIX)) return value;

  const [, , ivEncoded, tagEncoded, encryptedEncoded] = value.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivEncoded, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}
