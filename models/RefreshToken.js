import mongoose from 'mongoose';


const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' 
  },
    revoked: { type: Boolean, default: false }

});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;



