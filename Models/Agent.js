const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ['agent', 'admin'],
    default: 'agent'
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'blocked'],
    default: 'invited'
  },
  inviteToken: String,
  inviteTokenExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

agentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

agentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

agentSchema.methods.getInviteToken = function() {
  const inviteToken = crypto.randomBytes(20).toString('hex');

  this.inviteToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex');

  this.inviteTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return inviteToken;
};

agentSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role, name: this.name },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "5d"
    }
  );
};


const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;