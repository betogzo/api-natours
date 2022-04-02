const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have a content']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Every review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Every review must have an author/user']
    }
  },
  {
    collection: 'reviews',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate('author', 'name email');

  this.populate('user', 'name photo');
  next();
});

//static function to calculate tours ratingsAverage
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  //updating the tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].averageRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

//calling calcAverageRatings func after CREATING a new review
reviewSchema.post('save', function() {
  //'this' points to current review. 'constructor' points the current Model (Review)
  this.constructor.calcAverageRatings(this.tour);
});

//trick to pass data to a pre middleware to a post middleware 
reviewSchema.pre(/^findOneAnd/, async function(next) {
  //creating a new property to store it
  this.r = await this.clone().findOne();
  next();
});

//calling calcAverageRatings func after UPDATING or DELETING an existent review
reviewSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
