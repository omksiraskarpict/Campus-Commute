import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSocialLoginUser } from '../src/services/socialAuthService.js';

test('matches an existing account by verified email and preserves role', () => {
  const existingUser = {
    _id: 'u-1',
    name: 'Dana Lee',
    email: 'dana@college.edu',
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    verificationStatus: 'VERIFIED'
  };

  const resolved = resolveSocialLoginUser({
    existingUsers: [existingUser],
    provider: 'google',
    providerId: 'google-1',
    email: 'dana@college.edu',
    name: 'Dana Lee',
    role: 'ADMIN'
  });

  assert.equal(resolved.user._id, 'u-1');
  assert.equal(resolved.isNewUser, false);
  assert.equal(resolved.user.role, 'ADMIN');
});

test('creates a new student account with default role and never escalates admin', () => {
  const resolved = resolveSocialLoginUser({
    existingUsers: [],
    provider: 'microsoft',
    providerId: 'ms-88',
    email: 'sam@college.edu',
    name: 'Sam',
    role: 'ADMIN'
  });

  assert.equal(resolved.isNewUser, true);
  assert.equal(resolved.user.role, 'STUDENT');
  assert.equal(resolved.user.email, 'sam@college.edu');
  assert.equal(resolved.user.providerId, 'ms-88');
});

test('does not create duplicate user when provider identity already exists', () => {
  const existingUser = {
    _id: 'u-2',
    name: 'Riya Shah',
    email: 'riya@college.edu',
    role: 'STUDENT',
    accountStatus: 'ACTIVE',
    providerId: 'google-2'
  };

  const resolved = resolveSocialLoginUser({
    existingUsers: [existingUser],
    provider: 'google',
    providerId: 'google-2',
    email: 'riya@college.edu',
    name: 'Riya Shah'
  });

  assert.equal(resolved.user._id, 'u-2');
  assert.equal(resolved.isNewUser, false);
});
