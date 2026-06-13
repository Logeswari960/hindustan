const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mode: {
    type: String,
    enum: ['word', 'sentence', 'freespeech', 'lip-reading', 'games'],
    required: true
  },
  target: {
    type: String,
    required: true
  },
  spoken: {
    type: String,
    required: true
  },
  accuracy: {
    type: Number,
    required: true
  },
  clarity: Number,
  fluency: Number,
  pace: Number,
  confidence: Number,
  stammeringDetected: Boolean,
  repetitionCount: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', sessionSchema);
