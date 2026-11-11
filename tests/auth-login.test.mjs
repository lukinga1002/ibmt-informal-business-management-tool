import test from 'node:test';
import assert from 'node:assert/strict';
import { navigateToAppLogin } from '../src/lib/authLogin.js';

function capture(href, isDev) {
  const calls = [];
  const auth = {
    loginWithProvider: (...args) => calls.push(['provider', ...args]),
    redirectToLogin: (...args) => calls.push(['hosted', ...args]),
  };
  navigateToAppLogin(auth, href, isDev);
  return calls;
}

test('local Google login returns to the requested local route and port', () => {
  const url = 'http://localhost:5173/rent/sim?tab=council#invoice';
  assert.deepEqual(capture(url, true), [['provider', 'google', url]]);
});

test('loopback IPv4 and IPv6 use Google in development', () => {
  for (const host of ['127.0.0.1', '[::1]']) {
    const url = `http://${host}:5174/rent/landlord/payouts`;
    assert.deepEqual(capture(url, true), [['provider', 'google', url]]);
  }
});

test('bootstrap credentials are excluded from the provider return address', () => {
  assert.deepEqual(capture('http://localhost:5173/rent?access_token=secret&clear_access_token=true&tab=fees', true),
    [['provider', 'google', 'http://localhost:5173/rent?tab=fees']]);
});

test('production builds retain hosted login even on loopback', () => {
  const url = 'http://localhost:5173/rent';
  assert.deepEqual(capture(url, false), [['hosted', url]]);
  assert.deepEqual(capture(url), [['hosted', url]]);
});

test('published and lookalike hosts retain hosted login', () => {
  for (const host of ['lumpy-biz-flow-tanzania.base44.app', 'localhost.example.com', 'example.com']) {
    const url = `https://${host}/rent`;
    assert.deepEqual(capture(url, true), [['hosted', url]]);
  }
});
