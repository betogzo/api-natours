const express = require('express');
const authController = require('./../controllers/authController');
const reviewController = require('./../controllers/reviewController');

const router = express.Router({ mergeParams: true });
//mergeParams -> accept params coming from another route (tours, for example, which is nested to this one)

router
  .route('/')
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.setTourAndUserIds,
    reviewController.createReview
  )
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    reviewController.getAllReviews
  );

router
  .route('/:id')
  .get(authController.protect, reviewController.getReview)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    reviewController.deleteReview
  )
  .patch(reviewController.updateReview);

module.exports = router;
