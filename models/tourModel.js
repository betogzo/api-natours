const { type } = require('express/lib/response');
const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'Tour name max. characters: 40'],
      minlength: [10, 'Tour name min. characters: 10'],
      validate: {
        validator: function(val) {
          return validator.isAlpha(val, 'en-US', { ignore: ' ' });
        },
        message: 'Tour name must have only letters (a-z)!'
      }
    },
    slug: String,
    rating: {
      type: Number,
      default: 4.5
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maximum group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult.'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.'],
      max: [5, 'Rating must be below or equal to 5.']
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      //custom validator
      validate: {
        validator: function(value) {
          return this.price > value; //this keyword won't work for update, only for creating a new document
        },
        message: "The discount can't be greater than the tour price!"
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false //hide by default
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    // guides: Array <- for embedding
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    //options
    collection: 'tours',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//virtual property (not stored on DB)
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

//virtual populate (reviews of each tour)
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

//DOCUMENT MIDDLEWARE - 'pre' runs before .save() and .create() (not before insertMany!)
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true }); // "this" = the current document
  next();
});

//document embedding
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//QUERY MIDDLEWARE - "this" = current query
//reg. expression to any word starting with "find" (find, findOne etc)
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

//AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function(next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
