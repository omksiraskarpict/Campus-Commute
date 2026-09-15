const clamp = (value) => Math.max(0, Math.min(1, value));
const normalise = (value, max) => clamp(1 - Math.abs(value) / max);

export function scoreRide({ ride, requestedSource = '', requestedDestination = '', requestedTime = '' }) {
  const source = requestedSource.toLowerCase();
  const destination = requestedDestination.toLowerCase();
  const sourceMatch = source && ride.source.toLowerCase().includes(source) ? 1 : 0.55;
  const destinationMatch = destination && ride.destination.toLowerCase().includes(destination) ? 1 : 0.55;
  const timeMinutes = requestedTime ? Number(requestedTime.split(':')[0]) * 60 + Number(requestedTime.split(':')[1]) : null;
  const rideMinutes = ride.departureTime ? Number(ride.departureTime.split(':')[0]) * 60 + Number(ride.departureTime.split(':')[1]) : timeMinutes;
  const timeMatch = timeMinutes === null ? 0.7 : normalise(Math.abs(rideMinutes - timeMinutes), 90);
  const seats = clamp(ride.availableSeats / Math.max(ride.maxPassengers, 1));
  const score = Math.round((sourceMatch * 0.27 + destinationMatch * 0.27 + timeMatch * 0.22 + seats * 0.14 + 0.1) * 100);
  return { ...ride, matchScore: score, matchLabel: score >= 85 ? 'Excellent match' : score >= 70 ? 'Good match' : 'Nearby ride' };
}

export function rankRides(rides, criteria) { return rides.map((ride) => scoreRide({ ride, ...criteria })).sort((a, b) => b.matchScore - a.matchScore); }
