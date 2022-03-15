const { promisify } = require('util');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const sendEmail = require('./../utils/email');

dotenv.config({ path: './config.env' });

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

//SIGNUP
exports.signup = catchAsync(async (req, res) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    photo: req.body.photo,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  });

  //generating authentication token
  const token = signToken(newUser._id);

  res.status(200).json({
    //sending the authentication token to the new user
    status: 'success',
    token,
    data: {
      user: newUser
    }
  });
});

//LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password exists
  if (!email || !password)
    return next(new AppError('Please provide an email and password!', 400));

  //2) check if email and password are correct
  const user = await User.findOne({ email }).select('+password'); // "+" because password field is select:false on User Schema

  //returning if email or password is incorrect
  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Invalid email or password', 401));

  //generating authentication token
  const token = signToken(user.id);

  //3) send jwt to the client
  res.status(200).json({
    status: 'success',
    token
  });
});

//PROTECT
exports.protect = catchAsync(async (req, res, next) => {
  //1) getting token and checking if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next(new AppError("You're not logged in!", 401));

  //2) Verifying token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if the user (token owner) still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError('The user no longer exists', 401));

  //4) Check if user changed password after token signing
  if (currentUser.passwordChangedAfter(decoded.iat))
    return next(new AppError('Password has changed, please login again', 401));

  //granting access if all verification steps has passed
  req.user = currentUser; //passing data to the next middleware
  next();
});

//AUTHORIZATION - RESTRICT
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You don't have permission to perform this action!", 403)
      );
    next();
  };
};

//FORGOT PASSWORD
exports.forgot = catchAsync(async (req, res, next) => {
  //find the user based on the inputed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('User not found', 404));

  //generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/${resetToken}`;

  const message = `Send a PATCH request to ${resetURL} with the new password and its passwordConfirm`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset instructions (valid for 10 minutes)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset token sent to user email'
    });
  } catch (error) {
    //reseting password token and its expiration in case of error
    user.passwordResetToken = undefined;
    user.passwordResetExpiration = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again', 500)
    );
  }
});
