import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  },
  { _id: false }
);

const vehicleSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    registration: {
      type: String,
      trim: true,
      default: ''
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const recurringSchema = new mongoose.Schema(
  {
    weekdays: {
      type: [Number],
      default: []
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    source: {
      type: String,
      required: true,
      trim: true
    },

    destination: {
      type: String,
      required: true,
      trim: true
    },

    sourceLocation: {
      type: pointSchema,
      default: undefined
    },

    destinationLocation: {
      type: pointSchema,
      default: undefined
    },

    date: {
      type: Date,
      required: true,
      index: true
    },

    departureTime: {
      type: String,
      required: true,
      trim: true
    },

    vehicle: {
      type: vehicleSchema,
      required: true
    },

    maxPassengers: {
      type: Number,
      required: true,
      min: 1
    },

    currentPassengers: {
      type: Number,
      default: 0,
      min: 0
    },

    availableSeats: {
      type: Number,
      required: true,
      min: 0
    },

    pickupFlexibility: {
      type: Number,
      default: 15,
      min: 0
    },

    tripType: {
      type: String,
      enum: ['ONE_TIME', 'RECURRING'],
      default: 'ONE_TIME'
    },

    recurring: {
      type: recurringSchema,
      default: null
    },

    notes: {
      type: String,
      trim: true,
      default: ''
    },

    distance: {
      type: Number,
      min: 0,
      default: null
    },

    estimatedDuration: {
      type: Number,
      min: 0,
      default: null
    },

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'FULL',
        'CANCELLED',
        'COMPLETED',
        'EXPIRED'
      ],
      default: 'ACTIVE',
      index: true
    },

    completedAt: {
      type: Date,
      default: null
    },

    completionMethod: {
      type: String,
      enum: ['ADMIN', 'AUTO'],
      default: null
    }
  },
  {
    timestamps: true
  }
);

/*
 * Make sure the driver cannot offer more passengers
 * than the physical vehicle capacity.
 */
rideSchema.pre('validate', function (next) {
  if (this.vehicle?.capacity && this.maxPassengers > this.vehicle.capacity) {
    return next(
      new Error(
        'Maximum passengers cannot exceed vehicle capacity.'
      )
    );
  }

  if (this.currentPassengers > this.maxPassengers) {
    return next(
      new Error(
        'Current passengers cannot exceed maximum passengers.'
      )
    );
  }

  this.availableSeats =
    this.maxPassengers - this.currentPassengers;

  if (this.availableSeats === 0) {
    this.status = 'FULL';
  } else if (this.status === 'FULL') {
    this.status = 'ACTIVE';
  }

  next();
});

/*
 * Geospatial indexes for nearby ride recommendations.
 */
rideSchema.index({
  sourceLocation: '2dsphere'
});

rideSchema.index({
  destinationLocation: '2dsphere'
});

/*
 * Search/recommendation indexes.
 */
rideSchema.index({
  status: 1,
  date: 1,
  departureTime: 1
});

rideSchema.index({
  creator: 1,
  date: -1
});

rideSchema.index({
  status: 1,
  availableSeats: 1,
  date: 1
});

const Ride =
  mongoose.models.Ride ||
  mongoose.model('Ride', rideSchema);

export default Ride;