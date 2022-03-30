/* eslint-disable no-unused-vars */

const dotenv = require('dotenv');
const catchAsync = require('./../utils/catchAsync');
const Tour = require('../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

dotenv.config({ path: './config.env' });

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

//alias top-5-cheap
exports.aliasTopFive = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  //BUILD AND EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  //SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  let tour;

  //getting tour by slug or _id
  if (req.params.id.includes('-')) {
    tour = await Tour.find({ slug: req.params.id })
      .populate('guides', 'name email')
      .populate('reviews');
  } else {
    tour = await Tour.findById(req.params.id)
      .populate('guides', 'name email')
      .populate('reviews');
  }

  //sending 404 error if !tour
  if (!tour) return next(new AppError('Invalid ID, no tour found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);
// how it was berfore 'factory'
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   //sending 404 error if !tour
//   if (!tour) return next(new AppError('Invalid ID, no tour found', 404));

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

//aggregation pipeline
exports.getToursStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatins: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $avg: '$price' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourDates: { $sum: 1 },
        tourNames: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { month: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan
    }
  });
});

/* eslint-enable no-unused-vars */
