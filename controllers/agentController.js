const Agent = require('../Models/Agent');
const sendEmail = require('../config/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const crypto = require('crypto');

exports.inviteAgent = async (req, res) => {
  try {
    const { email } = req.body;

    let agent = await Agent.findOne({ email });

    if (agent) {
      return res.status(400).json({
        success: false,
        error: 'Agent already exists'
      });
    }

    agent = new Agent({
      email,
      status: 'invited'
    });

    const inviteToken = agent.getInviteToken();

    await agent.save();

    const inviteUrl = `${req.protocol}://${req.get('host')}/complete-signup/${inviteToken}`;

    await sendEmail({
      email: agent.email,
      subject: 'Invitation to join as an agent',
      message: `You've been invited to join as an agent. Please use this link to complete your signup: ${inviteUrl}`
    });

    res.status(200).json({
      success: true,
      inviteUrl : inviteUrl,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.completeSignup = async (req, res) => {
  try {
    const inviteToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const agent = await Agent.findOne({
      inviteToken,
      inviteTokenExpire: { $gt: Date.now() }
    });

    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired invite token'
      });
    }

    agent.password = req.body.password;
    agent.name = req.body.name;
    agent.status = 'active';
    agent.inviteToken = undefined;
    agent.inviteTokenExpire = undefined;

    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Signup completed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email and password'
      });
    }

    const agent = await Agent.findOne({ email }).select('+password');

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isMatch = await agent.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (agent.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Your account is not active. Please complete the signup process.'
      });
    }

    const token = agent.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.toggleAgentBlock = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    if (agent.status === 'invited') {
      return res.status(400).json({
        success: false,
        error: 'Cannot block an invited agent. They must complete signup first.'
      });
    }

    agent.status = agent.status === 'blocked' ? 'active' : 'blocked';
    await agent.save();

    res.status(200).json({
      success: true,
      data: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        status: agent.status
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { name, email, sub } = ticket.getPayload();

    let agent = await Agent.findOne({ email });

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'You need to be invited to use this system. Please contact an administrator.'
      });
    }

    if (agent.status === 'blocked') {
      return res.status(401).json({
        success: false,
        error: 'Your account has been blocked. Please contact an administrator.'
      });
    }

    if (agent.status === 'invited') {
      agent.name = name;
      agent.googleId = sub;
      agent.status = 'active';
      agent.inviteToken = undefined;
      agent.inviteTokenExpire = undefined;
    } else {
      if (!agent.googleId) {
        agent.googleId = sub;
      }
    }
    const jwtToken = agent.getSignedJwtToken();
    await agent.save();


    res.status(200).json({
      success: true,
      token: jwtToken
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};