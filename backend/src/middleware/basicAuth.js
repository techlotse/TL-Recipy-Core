import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest();
}

function safeEqual(actual, expected) {
  return timingSafeEqual(hashValue(actual), hashValue(expected));
}

export function parseBasicAuthHeader(header = '') {
  const [scheme, encoded] = String(header).split(' ');
  if (scheme?.toLowerCase() !== 'basic' || !encoded) return null;

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;

    return {
      email: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export function isProtectedApiRequest(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const path = String(req.path || req.url || '').split('?')[0];
  const mutates = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (path.startsWith('/api/settings')) return true;
  if (path.startsWith('/api/imports')) return true;
  if (path.startsWith('/api/backups')) return true;
  if (path.startsWith('/api/recipes')) return mutates;
  if (path.startsWith('/api/tags')) return mutates;
  return false;
}

export function validBasicCredentials(credentials) {
  if (!credentials) return false;
  return (
    safeEqual(credentials.email, config.basicAuth.email) &&
    safeEqual(credentials.password, config.basicAuth.password)
  );
}

export function requireBasicAuth(req, res, next) {
  if (!isProtectedApiRequest(req)) {
    next();
    return;
  }

  const credentials = parseBasicAuthHeader(req.headers.authorization);
  if (validBasicCredentials(credentials)) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', `Basic realm="${config.basicAuth.realm}", charset="UTF-8"`);
  res.status(401).json({
    error: {
      message: 'Authentication required'
    }
  });
}
