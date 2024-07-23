const Agent = require('../Models/Agent');
const AgentMaidRequest = require('../Models/Agent-Maids');

exports.createMaidRequest = async (req, res) => {
  try {
    const { maidName } = req.body;
    const agentId = req.agentId;
    const agentExists = await Agent.findById(agentId);
    if (!agentExists) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found. Unable to create maid request.'
      });
    }

    const maidImage = req.files.maidImage ? req.files.maidImage[0].path : null;
    const maidVideo = req.files.videoLink ? req.files.videoLink[0].path : null;
    const maidPassportFront = req.files.maidPassportFront ? req.files.maidPassportFront[0].path : null;
    const maidPassportBack = req.files.maidPassportBack ? req.files.maidPassportBack[0].path : null;

    const newMaidRequest = new AgentMaidRequest({
      agentId,
      maidName,
      maidImage,
      maidVideo,
      maidPassportFront,
      maidPassportBack
    });

    const savedMaidRequest = await newMaidRequest.save();

    res.status(201).json({
      success: true,
      data: savedMaidRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getAllMaidRequests = async (req, res) => {
  try {
    const maidRequests = await AgentMaidRequest.find();
    res.status(200).json({
      success: true,
      data: maidRequests
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getMaidRequestById = async (req, res) => {
  try {
    const maidRequest = await AgentMaidRequest.findById(req.params.id);
    if (!maidRequest) {
      return res.status(404).json({
        success: false,
        error: 'Maid request not found'
      });
    }
    res.status(200).json({
      success: true,
      data: maidRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateMaidRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const maidRequest = await AgentMaidRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!maidRequest) {
      return res.status(404).json({
        success: false,
        error: 'Maid request not found'
      });
    }
    res.status(200).json({
      success: true,
      data: maidRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};