import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';

import Ride from '../models/Ride.js';
import JoinRequest from '../models/JoinRequest.js';
import Notification from '../models/Notification.js';

import { requireAuth } from '../middleware/auth.js';

import {
  createJoinRequest,
  acceptJoinRequest
} from '../services/rideService.js';

import { rankRides } from '../services/recommendationService.js';

const router = Router();

const rideInput = z.object({
  source: z.string().min(2).max(200),

  destination: z.string().min(2).max(200),

  date: z.coerce.date(),

  departureTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/),

  maxPassengers: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(20),

  vehicle: z
    .object({
      model: z.string().max(100).optional(),
      type: z.string().max(50).optional(),
      registration: z.string().max(50).optional(),
      capacity: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
    })
    .optional(),

  pickupFlexibility: z
    .coerce
    .number()
    .min(0)
    .max(120)
    .optional(),

  tripType: z
    .enum(['ONE_TIME', 'RECURRING'])
    .optional(),

  notes: z
    .string()
    .max(500)
    .optional()
});


/*
 * GET /api/rides
 *
 * Find available rides.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const query = {
      status: 'ACTIVE',
      date: { $gte: new Date() },
      creator: { $ne: req.user._id }
    };

    if (req.query.source) {
      const source = String(req.query.source);

      query.source = {
        $regex: source.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        ),
        $options: 'i'
      };
    }

    if (req.query.destination) {
      const destination = String(req.query.destination);

      query.destination = {
        $regex: destination.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        ),
        $options: 'i'
      };
    }

    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      if (!Number.isNaN(start.getTime())) {
        query.date = {
          $gte: start,
          $lt: end
        };
      }
    }

    const rides = await Ride.find(query)
      .populate(
        'creator',
        'name rating department year profileImage'
      )
      .sort({
        date: 1,
        departureTime: 1
      })
      .limit(50)
      .lean();

    res.json({
      rides: rankRides(rides, {
        requestedSource: req.query.source || '',
        requestedDestination:
          req.query.destination || '',
        requestedTime:
          req.query.time || ''
      })
    });
  } catch (error) {
    next(error);
  }
});


/*
 * GET /api/rides/mine
 *
 * Returns:
 * - rides created by current user
 * - rides joined by current user
 * - pending rides requested by current user
 * - incoming pending requests for rides created by current user
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const created = await Ride.find({
      creator: userId
    })
      .sort({
        date: -1,
        departureTime: -1
      })
      .limit(50)
      .populate(
        'creator',
        'name rating'
      )
      .lean();

    const createdRideIds = created.map(
      (ride) => ride._id
    );

    /*
     * Rides this user has ACCEPTED.
     */
    const joinedRequests = await JoinRequest.find({
      user: userId,
      status: 'ACCEPTED'
    })
      .populate({
        path: 'ride',
        populate: {
          path: 'creator',
          select: 'name rating'
        }
      })
      .sort({
        joinedAt: -1
      })
      .limit(50)
      .lean();

    /*
     * Rides where this user still has a PENDING request.
     */
    const pendingRequests = await JoinRequest.find({
      user: userId,
      status: 'PENDING'
    })
      .populate({
        path: 'ride',
        populate: {
          path: 'creator',
          select: 'name rating'
        }
      })
      .sort({
        requestedAt: -1
      })
      .limit(50)
      .lean();

    /*
    * Requests sent by other students for
    * rides owned by the current user. Keep the
    * complete history so owners can see status.
     */
    const incomingRequests =
      createdRideIds.length > 0
        ? await JoinRequest.find({
            ride: {
              $in: createdRideIds
            }
          })
            .populate(
              'user',
              'name email rating department year profileImage'
            )
            .populate(
              'ride',
              'source destination date departureTime availableSeats status creator'
            )
            .sort({
              requestedAt: -1
            })
            .limit(100)
            .lean()
        : [];

    res.json({
      created,

      joined: joinedRequests
        .map((item) => item.ride)
        .filter(Boolean),

      pending: pendingRequests
        .map((item) => item.ride)
        .filter(Boolean),

        rejected: await JoinRequest.find({
          user: userId,
          status: 'REJECTED'
        })
          .populate({
            path: 'ride',
            populate: {
              path: 'creator',
              select: 'name rating'
            }
          })
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean()
          .then((items) => items.map((item) => item.ride).filter(Boolean)),

      incomingRequests
    });
  } catch (error) {
    next(error);
  }
});


/*
 * POST /api/rides
 *
 * Create a ride.
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = rideInput.parse(req.body);

    const capacity =
      data.vehicle?.capacity ||
      data.maxPassengers;

    if (data.maxPassengers > capacity) {
      return res.status(400).json({
        message:
          'Maximum passengers cannot exceed vehicle capacity.'
      });
    }

    if (data.date < new Date()) {
      return res.status(400).json({
        message:
          'Ride date cannot be in the past.'
      });
    }

    const ride = await Ride.create({
      ...data,

      creator: req.user._id,

      currentPassengers: 0,

      availableSeats:
        data.maxPassengers,

      vehicle: {
        ...data.vehicle,
        capacity
      }
    });

    res.status(201).json({
      ride: await ride.populate(
        'creator',
        'name rating'
      )
    });
  } catch (error) {
    next(error);
  }
});


/*
 * POST /api/rides/:id/join
 *
 * Student requests to join.
 */
router.post(
  '/:id/join',
  requireAuth,
  async (req, res, next) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message: 'Invalid ride ID.'
        });
      }

      const request =
        await createJoinRequest({
          rideId: req.params.id,
          userId: req.user._id
        });

      const ride = await Ride.findById(
        req.params.id
      ).populate(
        'creator',
        'name rating preferences'
      );

      if (!ride) {
        return res.status(404).json({
          message: 'Ride not found.'
        });
      }

      /*
       * Create notification for ride owner.
       *
       * Notification failure should NOT undo
       * a successfully-created join request.
       */
      try {
        if (
          ride.creator?.preferences
            ?.rideNotifications !== false
        ) {
          await Notification.create({
            user: ride.creator._id,

            type: 'NEW_JOIN',

            title: 'New join request',

            message:
              `${req.user.name} requested to join your ride.`,

            relatedRide: ride._id,

            relatedRequest: request._id
          });
        }
      } catch (notificationError) {
        console.error(
          'Could not create join notification:',
          notificationError.message
        );
      }

      /*
       * Send real-time notification.
       */
      try {
        const io = req.app.get('io');

        io
          ?.to(`user:${ride.creator._id}`)
          .emit('notification', {
            type: 'NEW_JOIN',
            relatedRide: ride._id,
            relatedRequest: request._id
          });
      } catch (socketError) {
        console.error(
          'Join notification socket error:',
          socketError.message
        );
      }

      res.status(201).json({
        request,
        ride
      });
    } catch (error) {
      next(error);
    }
  }
);


/*
 * POST /api/rides/:id/leave
 */
router.post(
  '/:id/leave',
  requireAuth,
  async (req, res, next) => {
    try {
      const request =
        await JoinRequest.findOneAndUpdate(
          {
            ride: req.params.id,
            user: req.user._id,
            status: 'ACCEPTED'
          },
          {
            $set: {
              status: 'LEFT'
            }
          },
          {
            new: true
          }
        );

      if (!request) {
        return res.status(404).json({
          message:
            'You are not an active participant in this ride.'
        });
      }

      const ride =
        await Ride.findOneAndUpdate(
          {
            _id: req.params.id,
            currentPassengers: {
              $gt: 0
            }
          },
          {
            $inc: {
              currentPassengers: -1,
              availableSeats: 1
            },
            $set: {
              status: 'ACTIVE'
            }
          },
          {
            new: true
          }
        );

      if (ride) {
        req.app
          .get('io')
          ?.to(`ride:${req.params.id}`)
          .emit('rideUpdated', {
            ride
          });
      }

      res.json({
        ride
      });
    } catch (error) {
      next(error);
    }
  }
);


/*
 * GET /api/rides/:id/requests
 *
 * Ride owner gets requests for their ride.
 */
router.get(
  '/:id/requests',
  requireAuth,
  async (req, res, next) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message: 'Invalid ride ID.'
        });
      }

      const ride = await Ride.findOne({
        _id: req.params.id,
        creator: req.user._id
      });

      if (!ride) {
        return res.status(404).json({
          message: 'Ride not found.'
        });
      }

      const requests =
        await JoinRequest.find({
          ride: ride._id
        })
          .populate(
            'user',
            'name email rating department year profileImage'
          )
          .sort({
            createdAt: -1
          })
          .lean();

      res.json({
        requests
      });
    } catch (error) {
      next(error);
    }
  }
);


/*
 * POST /api/rides/:id/requests/:requestId/accept
 */
router.post(
  '/:id/requests/:requestId/accept',
  requireAuth,
  async (req, res, next) => {
    try {
      const result =
        await acceptJoinRequest({
          rideId: req.params.id,

          requestId:
            req.params.requestId,

          creatorId:
            req.user._id
        });

      /*
       * Notify the student.
       */
      try {
        await Notification.create({
          user: result.request.user,

          type: 'REQUEST_ACCEPTED',

          title:
            'Ride request accepted',

          message:
            'Your request was accepted. You are now part of this ride.',

          relatedRide:
            result.ride._id,

          relatedRequest:
            result.request._id
        });
      } catch (notificationError) {
        console.error(
          'Could not create acceptance notification:',
          notificationError.message
        );
      }

      /*
       * Notify all ride participants.
       */
      req.app
        .get('io')
        ?.to(`ride:${result.ride._id}`)
        .emit('rideUpdated', {
          ride: result.ride
        });

      /*
       * Notify accepted student directly.
       */
      req.app
        .get('io')
        ?.to(`user:${result.request.user}`)
        .emit('notification', {
          type: 'REQUEST_ACCEPTED',

          relatedRide:
            result.ride._id,

          relatedRequest:
            result.request._id
        });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);


/*
 * POST /api/rides/:id/requests/:requestId/reject
 */
router.post(
  '/:id/requests/:requestId/reject',
  requireAuth,
  async (req, res, next) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        ) ||
        !mongoose.Types.ObjectId.isValid(
          req.params.requestId
        )
      ) {
        return res.status(400).json({
          message:
            'Invalid ride or request ID.'
        });
      }

      const ride =
        await Ride.findOne({
          _id: req.params.id,
          creator: req.user._id
        });

      if (!ride) {
        return res.status(404).json({
          message: 'Ride not found.'
        });
      }

      const request =
        await JoinRequest.findOneAndUpdate(
          {
            _id: req.params.requestId,

            ride: req.params.id,

            status: 'PENDING'
          },
          {
            $set: {
              status: 'REJECTED'
            }
          },
          {
            new: true
          }
        );

      if (!request) {
        return res.status(409).json({
          message:
            'Join request is no longer pending.'
        });
      }

      try {
        await Notification.create({
          user: request.user,

          type: 'REQUEST_REJECTED',

          title:
            'Ride request declined',

          message:
            'Your request was declined.',

          relatedRide:
            req.params.id,

          relatedRequest:
            request._id
        });
      } catch (notificationError) {
        console.error(
          'Could not create rejection notification:',
          notificationError.message
        );
      }

      req.app
        .get('io')
        ?.to(`user:${request.user}`)
        .emit('notification', {
          type: 'REQUEST_REJECTED',

          relatedRide:
            req.params.id,

          relatedRequest:
            request._id
        });

      res.json({
        request
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;