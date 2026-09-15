import User from '../models/User.js';
import Ride from '../models/Ride.js';
import JoinRequest from '../models/JoinRequest.js';
import Review from '../models/Review.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Report from '../models/Report.js';

const RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365
};

function rangeStart(value) {
  const days = RANGE_DAYS[value] || RANGE_DAYS['7d'];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return start;
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function fillDailySeries(start, days, source) {
  const values = new Map(source.map((item) => [item._id, item.value]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return { date: key, value: values.get(key) || 0 };
  });
}

export async function getAdminAnalytics(range = '7d') {
  const days = RANGE_DAYS[range] || RANGE_DAYS['7d'];
  const start = rangeStart(range);
  const dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

  const [
    userCount,
    activeRides,
    completedRides,
    cancelledRides,
    averageRating,
    rideActivity,
    joinedActivity,
    userGrowth,
    rideStatuses,
    popularRoutes,
    recentRides,
    recentUsers,
    activeRideLocations,
    unreadMessages,
    unreadNotifications,
    openReports
  ] = await Promise.all([
    User.countDocuments(),
    Ride.countDocuments({ status: { $in: ['ACTIVE', 'FULL'] } }),
    Ride.countDocuments({ status: 'COMPLETED' }),
    Ride.countDocuments({ status: 'CANCELLED' }),
    Review.aggregate([{ $group: { _id: null, value: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Ride.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: dateGroup, value: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    JoinRequest.aggregate([
      { $match: { status: 'ACCEPTED', $or: [{ joinedAt: { $gte: start } }, { joinedAt: null, createdAt: { $gte: start } }] } },
      { $project: { joinedAt: { $ifNull: ['$joinedAt', '$createdAt'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$joinedAt' } }, value: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: dateGroup, value: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Ride.aggregate([{ $group: { _id: '$status', value: { $sum: 1 } } }, { $sort: { value: -1 } }]),
    Ride.aggregate([
      { $group: { _id: { source: '$source', destination: '$destination' }, rides: { $sum: 1 }, passengers: { $sum: '$currentPassengers' } } },
      { $sort: { rides: -1 } },
      { $limit: 8 }
    ]),
    Ride.find().populate('creator', 'name email').sort({ createdAt: -1 }).limit(8).lean(),
    User.find().select('-password').sort({ createdAt: -1 }).limit(8).lean(),
    Ride.find({ status: { $in: ['ACTIVE', 'FULL'] }, 'sourceLocation.coordinates.0': { $exists: true }, 'destinationLocation.coordinates.0': { $exists: true } }).select('source destination sourceLocation destinationLocation status').limit(100).lean(),
    Message.countDocuments({ readBy: { $size: 0 } }),
    Notification.countDocuments({ read: false }),
    Report.countDocuments({ status: { $in: ['OPEN', 'REVIEWING'] } })
  ]);

  const activitySource = fillDailySeries(start, days, rideActivity);
  const joinedMap = new Map(joinedActivity.map((item) => [item._id, item.value]));
  const growthSource = fillDailySeries(start, days, userGrowth);
  const totalBeforeRange = await User.countDocuments({ createdAt: { $lt: start } });
  let runningTotal = totalBeforeRange;
  const userGrowthSeries = growthSource.map((item) => {
    runningTotal += item.value;
    return { ...item, total: runningTotal };
  });

  return {
    range,
    metrics: {
      users: userCount,
      activeRides,
      completedRides,
      cancelledRides,
      averageRating: averageRating[0]?.value ? Number(averageRating[0].value.toFixed(1)) : null,
      ratingsCount: averageRating[0]?.count || 0,
      openReports,
      unreadMessages,
      unreadNotifications
    },
    rideActivity: activitySource.map((item) => ({ ...item, createdRides: item.value, joinedRides: joinedMap.get(item.date) || 0 })).map(({ value, ...item }) => item),
    userGrowth: userGrowthSeries.map(({ value, ...item }) => ({ ...item, newUsers: value })),
    rideStatuses: rideStatuses.map((item) => ({ status: item._id, value: item.value })),
    popularRoutes: popularRoutes.map((item) => ({ source: item._id.source, destination: item._id.destination, rides: item.rides, passengers: item.passengers })),
    recentRides,
    recentUsers,
    activeRideLocations
  };
}
