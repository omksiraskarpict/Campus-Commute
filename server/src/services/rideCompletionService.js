import Ride from '../models/Ride.js';

/*
 * The app stores ride dates as Date objects and uses the scheduled date as the
 * completion anchor when no explicit ride end time exists. We keep the rule in
 * the server timezone by treating the ride's date as a UTC day and completing at
 * 23:59:59.999 UTC for that same scheduled day. This avoids browser-local time
 * drift and keeps automatic completion deterministic across server restarts.
 */
export function getRideCompletionDeadline(ride) {
  if (!ride || !ride.date) {
    return null;
  }

  const date = new Date(ride.date);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const deadline = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23,
    59,
    59,
    999
  ));

  return deadline;
}

export function isRideEligibleForAutomaticCompletion(ride, now = new Date()) {
  if (!ride || !now || Number.isNaN(new Date(now).getTime())) {
    return false;
  }

  if (ride.status !== 'ACTIVE') {
    return false;
  }

  const deadline = getRideCompletionDeadline(ride);

  if (!deadline) {
    return false;
  }

  return deadline <= new Date(now);
}

export function getCompletionStatusLabel(value) {
  if (value === 'ADMIN') return 'Completed by admin';
  if (value === 'AUTO') return 'Automatically completed';
  return 'Not available';
}

export async function completeOverdueActiveRides(now = new Date()) {
  const currentTime = new Date(now);
  const rides = await Ride.find({ status: 'ACTIVE' }).select('status date departureTime').lean();

  const dueRideIds = rides
    .filter((ride) => isRideEligibleForAutomaticCompletion(ride, currentTime))
    .map((ride) => ride._id);

  if (!dueRideIds.length) {
    return { completed: 0, ids: [] };
  }

  const results = await Promise.all(
    dueRideIds.map(async (rideId) => {
      const ride = await Ride.findOne({
        _id: rideId,
        status: 'ACTIVE'
      });

      if (!ride) {
        return null;
      }

      const deadline = getRideCompletionDeadline(ride);
      const completionTime = deadline || new Date(currentTime);

      ride.status = 'COMPLETED';
      ride.completedAt = completionTime;
      ride.completionMethod = 'AUTO';

      await ride.save();
      console.log(`[Ride Scheduler] Ride ${rideId} automatically completed.`);
      return rideId;
    })
  );

  return {
    completed: results.filter(Boolean).length,
    ids: results.filter(Boolean)
  };
}
