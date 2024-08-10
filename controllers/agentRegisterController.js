const AgentRegistration = require("../Models/Agent-Registration");
const Agent = require("../Models/Agent");
const sendEmail = require("../config/sendEmail");

exports.registerAgent = async (req, res) => {
  try {
    const { name, number, email, nationality } = req.body;

    if (!req.files || !req.files.idCardFront || !req.files.idCardBack) {
      return res.status(400).json({
        success: false,
        error: "Both ID card front and back files are required",
      });
    }

    let existingRegistration = await AgentRegistration.findOne({ email });
    let existingEmail = await Agent.findOne({ email });
    if (existingRegistration || existingEmail) {
      return res.status(400).json({
        success: false,
        error: "Registration request already exists for this email",
      });
    }

    const idCardFrontPath = req.files.idCardFront[0].path;
    const idCardBackPath = req.files.idCardBack[0].path;

    const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (
      !allowedMimeTypes.includes(req.files.idCardFront[0].mimetype) ||
      !allowedMimeTypes.includes(req.files.idCardBack[0].mimetype)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only JPEG, PNG, and PDF are allowed.",
      });
    }

    const newRegistration = new AgentRegistration({
      name,
      number,
      email,
      nationality,
      idCardFront: idCardFrontPath,
      idCardBack: idCardBackPath,
      status: "pending",
    });

    await newRegistration.save();

    res.status(201).json({
      success: true,
      message: "Agent registration request submitted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
exports.approveAgent = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const registration = await AgentRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Registration request not found",
      });
    }

    if (registration.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Registration request has already been processed",
      });
    }

    const agent = new Agent({
      email: registration.email,
      status: "invited",
    });

    const inviteToken = agent.getInviteToken();
    await agent.save();

    registration.status = "approved";
    await registration.save();

    const inviteUrl = `${process.env.AGENT_FRONTEND_URL}en/signup/${inviteToken}`;

    await sendEmail({
      email: agent.email,
      subject: "Invitation to join as an agent",
      message: `Your registration has been approved. Please use this link to complete your signup: ${inviteUrl}`,
    });

    res.status(200).json({
      success: true,
      message: "Agent approved and invitation sent successfully",
      inviteUrl: inviteUrl,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.declineAgent = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const registration = await AgentRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Registration request not found",
      });
    }

    if (registration.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Registration request has already been processed",
      });
    }

    registration.status = "declined";
    await registration.save();

    await sendEmail({
      email: registration.email,
      subject: "Agent Registration Status",
      message:
        "We regret to inform you that your agent registration request has been declined.",
    });

    res.status(200).json({
      success: true,
      message: "Agent registration declined successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getAllRegistrations = async (req, res) => {
  try {
    const registrations = await AgentRegistration.find();
    res.status(200).json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const registration = await AgentRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
      });
    }
    res.status(200).json({
      success: true,
      data: registration,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
