const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: true  // Show password in MongoDB
  },
  fullName: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    enum: ['stuttering', 'stroke', 'autism', 'developmental_delay', 'articulation', 'english_fluency', 'aphasia', 'dysarthria', 'other'],
    required: true
  },
  userType: {
    type: String,
    enum: ['child', 'adult'],
    default: 'child'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

module.exports = mongoose.model('User', userSchema);
