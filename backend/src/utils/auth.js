const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const getDataDir = require('./dataDir');

function loadOrCreateSecret() {
  const secretPath = path.join(getDataDir(), '.auth-secret');
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

const SECRET = loadOrCreateSecret();

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  const hashBuf = Buffer.from(hash, 'hex');
  const candidateBuf = Buffer.from(candidate, 'hex');
  if (hashBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, candidateBuf);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload, expiresInSeconds = 60 * 60 * 12) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const encodedBody = base64url(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', SECRET).update(encodedBody).digest('base64url');
  return `${encodedBody}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encodedBody, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', SECRET).update(encodedBody).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPin, verifyPin, signToken, verifyToken };
