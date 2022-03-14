const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'An user must have a name'],
    unique: true,
    trim: true,
    maxlength: [20, 'User name max. characters: 20'],
    minlength: [2, 'User name min. characters: 2']
  },
  email: {
    type: String,
    required: [true, 'An user must have an email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [
      validator.isEmail,
      'Please provide an valid email (john@example.com)'
    ]
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'guide', 'lead-guide'],
    default: 'user'
  },
  password: {
    type: String,
    trim: true,
    required: [true, 'Every user needs a password'],
    minlength: [6, 'User password must have at least 6 characters'],
    select: false //to never show it on an output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'You have to confirm your password'],
    validate: [
      //this only works on SAVE or CREATE!
      function(e) {
        return e === this.password;
      },
      "Password and its confirmation don't match"
    ]
  },
  passwordChangedAt: Date
});

//encrypting the password before saving it to the DB
userSchema.pre('save', async function(next) {
  //only run this if password was actually modified
  if (!this.isModified('password')) return next();

  //encrypting the password
  this.password = await bcrypt.hash(this.password, 12);

  //not persisting the password confirmation on the DB
  this.passwordConfirm = undefined;

  next();
});

//using instance method to check if inputed password is valid
userSchema.methods.correctPassword = async (
  candidatePassword,
  userPassword
) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//instance method to compare token and password-change dates
userSchema.methods.passwordChangedAfter = function(jwtTimeStamp) {
  if (this.passwordChangedAt) {
    //converting to the same timestamp format
    const passwordChangeTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    //comparing (true = password has changed since token's signing)
    return jwtTimeStamp < passwordChangeTimeStamp;
  }

  //default: false - means password hasn't changed
  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
