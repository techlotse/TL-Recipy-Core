import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isProtectedApiRequest,
  parseBasicAuthHeader,
  requireBasicAuth,
  validBasicCredentials
} from '../src/middleware/basicAuth.js';

function basicHeader(email = 'admin@example.com', password = 'change-me') {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

function mockResponse() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('parses basic auth credentials', () => {
  assert.deepEqual(parseBasicAuthHeader(basicHeader('cook@example.com', 'secret')), {
    email: 'cook@example.com',
    password: 'secret'
  });
  assert.equal(parseBasicAuthHeader('Bearer token'), null);
});

test('protects management routes and keeps read-only views public', () => {
  assert.equal(isProtectedApiRequest({ method: 'GET', path: '/api/recipes' }), false);
  assert.equal(isProtectedApiRequest({ method: 'GET', path: '/api/recipes/abc' }), false);
  assert.equal(isProtectedApiRequest({ method: 'GET', path: '/api/tags' }), false);
  assert.equal(isProtectedApiRequest({ method: 'POST', path: '/api/recipes' }), true);
  assert.equal(isProtectedApiRequest({ method: 'PUT', path: '/api/recipes/abc' }), true);
  assert.equal(isProtectedApiRequest({ method: 'POST', path: '/api/recipes/abc/translations' }), true);
  assert.equal(isProtectedApiRequest({ method: 'DELETE', path: '/api/recipes/abc' }), true);
  assert.equal(isProtectedApiRequest({ method: 'POST', path: '/api/imports/url' }), true);
  assert.equal(isProtectedApiRequest({ method: 'GET', path: '/api/settings' }), true);
  assert.equal(isProtectedApiRequest({ method: 'GET', path: '/api/backups/export' }), true);
});

test('accepts configured default basic auth credentials', () => {
  assert.equal(validBasicCredentials(parseBasicAuthHeader(basicHeader())), true);
  assert.equal(validBasicCredentials(parseBasicAuthHeader(basicHeader('admin@example.com', 'wrong'))), false);
});

test('basic auth middleware challenges protected routes', () => {
  const req = { method: 'POST', path: '/api/imports/url', headers: {} };
  const res = mockResponse();
  let calledNext = false;

  requireBasicAuth(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.headers['WWW-Authenticate'], /^Basic realm=/);
});

test('basic auth middleware allows public routes without credentials', () => {
  const req = { method: 'GET', path: '/api/recipes', headers: {} };
  const res = mockResponse();
  let calledNext = false;

  requireBasicAuth(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(res.statusCode, 0);
});
