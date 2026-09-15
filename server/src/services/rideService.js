import mongoose from 'mongoose';
import Ride from '../models/Ride.js';
import JoinRequest from '../models/JoinRequest.js';

/*
 * Create a pending join request.
 *
 * Seats are NOT reduced here.
 * A seat is reduced only after the ride owner accepts.
 */
export async function createJoinRequest({ rideId, userId }) {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    const error = new Error('Invalid ride ID.');
    error.statusCode = 400;
    throw error;
  }

  const ride = await Ride.findById(rideId).lean();

  if (!ride) {
    const error = new Error('Ride not found.');
    error.statusCode = 404;
    throw error;
  }

  if (ride.status !== 'ACTIVE' || ride.availableSeats < 1) {
    const error = new Error('This ride is full or unavailable.');
    error.statusCode = 409;
    throw error;
  }

  if (String(ride.creator) === String(userId)) {
    const error = new Error('You cannot join your own ride.');
    error.statusCode = 409;
    throw error;
  }

  const existing = await JoinRequest.findOne({
    ride: rideId,
    user: userId
  });

  /*
   * Do not allow duplicate pending or accepted requests.
   */
  if (
    existing &&
    ['PENDING', 'ACCEPTED'].includes(existing.status)
  ) {
    const error = new Error(
      existing.status === 'PENDING'
        ? 'You already have a pending request for this ride.'
        : 'You have already joined this ride.'
    );

    error.statusCode = 409;
    throw error;
  }

  /*
   * If the old request was REJECTED or LEFT,
   * reuse the same document and make it PENDING again.
   */
  return JoinRequest.findOneAndUpdate(
    {
      ride: rideId,
      user: userId
    },
    {
      $set: {
        status: 'PENDING',
        requestedAt: new Date(),
        joinedAt: null
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
}


/*
 * Accept a pending join request.
 *
 * The ride owner is identified by creatorId.
 * Seat allocation is atomic.
 */
export async function acceptJoinRequest({
  rideId,
  requestId,
  creatorId
}) {
  if (
    !mongoose.Types.ObjectId.isValid(rideId) ||
    !mongoose.Types.ObjectId.isValid(requestId)
  ) {
    const error = new Error('Invalid ride or request ID.');
    error.statusCode = 400;
    throw error;
  }

  /*
   * First confirm that this request exists and is pending.
   */
  const request = await JoinRequest.findOne({
    _id: requestId,
    ride: rideId,
    status: 'PENDING'
  });

  if (!request) {
    const error = new Error(
      'Join request is no longer pending.'
    );

    error.statusCode = 409;
    throw error;
  }

  /*
   * Confirm that the logged-in user owns the ride.
   */
  const ride = await Ride.findOne({
    _id: rideId,
    creator: creatorId
  });

  if (!ride) {
    const error = new Error(
      'You are not the owner of this ride.'
    );

    error.statusCode = 403;
    throw error;
  }

  /*
   * Atomically reserve one seat.
   *
   * Only ACTIVE rides with at least one available seat
   * can accept a request.
   */
  const allocatedRide = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      creator: creatorId,
      status: 'ACTIVE',
      availableSeats: { $gt: 0 }
    },
    {
      $inc: {
        currentPassengers: 1,
        availableSeats: -1
      }
    },
    {
      new: true
    }
  );

  if (!allocatedRide) {
    const error = new Error(
      'No seats are available.'
    );

    error.statusCode = 409;
    throw error;
  }

  /*
   * Change request from PENDING -> ACCEPTED.
   *
   * This conditional update prevents two users/actions
   * from accepting the same request.
   */
  const accepted = await JoinRequest.findOneAndUpdate(
    {
      _id: requestId,
      ride: rideId,
      status: 'PENDING'
    },
    {
      $set: {
        status: 'ACCEPTED',
        joinedAt: new Date()
      }
    },
    {
      new: true
    }
  );

  /*
   * Another action processed the request first.
   * Return the seat we just allocated.
   */
  if (!accepted) {
    await Ride.findOneAndUpdate(
      {
        _id: rideId,
        currentPassengers: { $gt: 0 }
      },
      {
        $inc: {
          currentPassengers: -1,
          availableSeats: 1
        }
      }
    );

    const error = new Error(
      'This request was already processed.'
    );

    error.statusCode = 409;
    throw error;
  }

  /*
   * If the last seat was taken, mark the ride FULL.
   */
  let finalRide = allocatedRide;

  if (allocatedRide.availableSeats === 0) {
    finalRide = await Ride.findByIdAndUpdate(
      rideId,
      {
        $set: {
          status: 'FULL'
        }
      },
      {
        new: true
      }
    );
  }

  return {
    ride: finalRide,
    request: accepted
  };
}