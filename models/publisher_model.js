import mongoose from 'mongoose';

const PublisherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    default: ''
  },
  contact: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Publisher = mongoose.model('Publisher', PublisherSchema);
export default Publisher;
