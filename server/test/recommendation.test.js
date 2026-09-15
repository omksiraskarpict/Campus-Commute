import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRides } from '../src/services/recommendationService.js';

test('ranks a compatible ride ahead of a distant time and route match', () => {
  const rides = [
    { source: 'Pune Station', destination: 'PICT Campus', departureTime: '08:00', maxPassengers: 3, availableSeats: 2 },
    { source: 'Kothrud', destination: 'University Road', departureTime: '11:30', maxPassengers: 3, availableSeats: 1 }
  ];
  const ranked = rankRides(rides, { requestedSource: 'Pune', requestedDestination: 'PICT', requestedTime: '08:05' });
  assert.equal(ranked[0].source, 'Pune Station');
  assert.equal(ranked[0].matchLabel, 'Excellent match');
  assert.ok(ranked[0].matchScore > ranked[1].matchScore);
});

test('never produces a score outside the 0 to 100 range', () => {
  const [ride] = rankRides([{ source: 'A', destination: 'B', departureTime: '00:00', maxPassengers: 1, availableSeats: 0 }], { requestedSource: 'X', requestedDestination: 'Y', requestedTime: '23:59' });
  assert.ok(ride.matchScore >= 0 && ride.matchScore <= 100);
});
