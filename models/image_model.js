import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

const Image = mongoose.model('Image', ImageSchema);
export default Image;