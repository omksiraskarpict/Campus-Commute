import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRideCompletionDeadline,
  getCompletionStatusLabel,
  isRideEligibleForAutomaticCompletion
} from '../src/services/rideCompletionService.js';

test('ride completion deadline uses end of scheduled date when no explicit end time exists', () => {
  const ride = {
    date: new Date('2026-09-15T00:00:00.000Z'),
    departureTime: '18:30'
  };

  const deadline = getRideCompletionDeadline(ride);
  assert.equal(deadline.getUTCFullYear(), 2026);
  assert.equal(deadline.getUTCMonth(), 8);
  assert.equal(deadline.getUTCDate(), 15);
  assert.equal(deadline.getUTCHours(), 23);
  assert.equal(deadline.getUTCMinutes(), 59);
  assert.equal(deadline.getUTCSeconds(), 59);
});

test('completion labels translate ADMIN and AUTO into friendly labels', () => {
  assert.equal(getCompletionStatusLabel('ADMIN'), 'Completed by admin');
  assert.equal(getCompletionStatusLabel('AUTO'), 'Automatically completed');
  assert.equal(getCompletionStatusLabel(null), 'Not available');
});

test('active rides are eligible for automatic completion only when deadline has passed and status is active', () => {
  const ride = {
    status: 'ACTIVE',
    date: new Date('2026-09-15T00:00:00.000Z'),
    departureTime: '18:30',
    completedAt: null,
    completionMethod: null
  };

  const now = new Date('2026-09-16T00:00:01.000Z');

  assert.equal(isRideEligibleForAutomaticCompletion(ride, now), true);

  const futureRide = { ...ride, date: new Date('2026-09-20T00:00:00.000Z') };
  assert.equal(isRideEligibleForAutomaticCompletion(futureRide, now), false);

  const cancelled = { ...ride, status: 'CANCELLED' };
  assert.equal(isRideEligibleForAutomaticCompletion(cancelled, now), false);
});
