const Agent = require("../Models/Agent");
const AgentMaidRequest = require("../Models/Agent-Maids");

exports.createMaidRequest = async (req, res) => {
  try {
    const {
      maidName,
      maritalStatus,
      numberOfChildren,
      experienceYears,
      experienceCountry,
      religion,
      otherReligion,
      languages,
      otherLanguages,
      education,
    } = req.body;

    const agentId = req.agentId;
    const agentExists = await Agent.findById(agentId);
    if (!agentExists) {
      return res.status(404).json({
        success: false,
        error: "Agent not found. Unable to create maid request.",
      });
    }

    const maidImage = req.files.maidImage ? req.files.maidImage[0].path : null;
    const maidVideo = req.files.videoLink ? req.files.videoLink[0].path : null;
    const maidPassportFront = req.files.maidPassportFront
      ? req.files.maidPassportFront[0].path
      : null;
    const maidPassportBack = req.files.maidPassportBack
      ? req.files.maidPassportBack[0].path
      : null;

    let processedLanguages = Array.isArray(languages) ? languages : [languages];
    if (otherLanguages) {
      processedLanguages = [...processedLanguages, otherLanguages];
    }

    const processedReligion = religion === "Other" ? otherReligion : religion;

    const newMaidRequest = new AgentMaidRequest({
      agentId,
      maidName,
      maidImage,
      maidVideo,
      maidPassportFront,
      maidPassportBack,
      maritalStatus,
      numberOfChildren: parseInt(numberOfChildren),
      experience: {
        years: experienceYears,
        country: experienceCountry,
      },
      religion: processedReligion,
      languages: processedLanguages,
      education,
    });

    const savedMaidRequest = await newMaidRequest.save();

    res.status(201).json({
      success: true,
      data: savedMaidRequest,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getAllMaidRequests = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      search = "",
      maritalStatus,
      religion,
      status,
    } = req.query;
    const offsetNumber = parseInt(offset, 10);
    const limitNumber = parseInt(limit, 10);
    const filter = {};
    if (maritalStatus) filter.maritalStatus = maritalStatus;
    if (religion) filter.religion = religion;
    if (status) filter.status = status;
    if (search) {
      filter.maidName = { $regex: search, $options: "i" };
    }
    const total = await AgentMaidRequest.countDocuments(filter);
    const maidRequests = await AgentMaidRequest.find(filter)
      .skip(offsetNumber)
      .limit(limitNumber)
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: maidRequests,
      total,
      hasMore: total > offsetNumber + maidRequests.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getAgentMaids = async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      offset = 0,
      limit = 10,
      search = "",
      maritalStatus,
      religion,
      status,
    } = req.query;
    const offsetNumber = parseInt(offset, 10);
    const limitNumber = parseInt(limit, 10);

    const filter = { agentId };
    if (maritalStatus) filter.maritalStatus = maritalStatus;
    if (religion) filter.religion = religion;
    if (status) filter.status = status;
    if (search) {
      filter.maidName = { $regex: search, $options: "i" };
    }

    const total = await AgentMaidRequest.countDocuments(filter);
    const maidRequests = await AgentMaidRequest.find(filter)
      .skip(offsetNumber)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: maidRequests,
      total,
      hasMore: total > offsetNumber + maidRequests.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.deleteAgentMaidRequest = async (req, res) => {
  try {
    const { agentId, maidRequestId } = req.params;

    const deletedMaidRequest = await AgentMaidRequest.findOneAndDelete({
      _id: maidRequestId,
      agentId,
    });

    if (!deletedMaidRequest) {
      return res.status(404).json({
        success: false,
        message: "Maid request not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Maid request deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getMaidRequestById = async (req, res) => {
  try {
    const maidRequest = await AgentMaidRequest.findById(req.params.id);
    if (!maidRequest) {
      return res.status(404).json({
        success: false,
        error: "Maid request not found",
      });
    }
    res.status(200).json({
      success: true,
      data: maidRequest,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.updateMaidRequest = async (req, res) => {
  try {
    const { agentId, maidRequestId } = req.params;
    const { maidName, maritalStatus, numberOfChildren, education, religion, languages } = req.body;
    const { maidImage, maidPassportFront, maidPassportBack, maidVideo } = req.files;
    const files = {
      maidImage: maidImage ? maidImage[0].path : undefined,
      maidPassportFront: maidPassportFront ? maidPassportFront[0].path : undefined,
      maidPassportBack: maidPassportBack ? maidPassportBack[0].path : undefined,
      maidVideo: maidVideo ? maidVideo[0].path : undefined,
    };

    const experience = {
      years: req.body['experience.years'] || '',
      country: req.body['experience.country'] || ''
    };
    console.log("Received data:", {
      maidName,
      maritalStatus,
      numberOfChildren,
      education,
      religion,
      experience,
      languages,
      files,
    });
    
    const updates = {
      maidName,
      maritalStatus,
      numberOfChildren,
      education,
      religion,
      experience,
      languages,
      ...files,
    };

    console.log("Update data:", updates);

    const authorizedAgent = await Agent.findById(agentId);
    if (!authorizedAgent)
      return res.status(401).json({
        success: false,
        error: "Unauthorized access. Agent not found.",
      });

    const existingMaidRequest = await AgentMaidRequest.findOne({
      _id: maidRequestId,
      agentId,
    });
    if (!existingMaidRequest)
      return res.status(404).json({
        success: false,
        error: "Maid request not found or unauthorized.",
      });

    const updatedMaidRequest = await AgentMaidRequest.findOneAndUpdate(
      { _id: maidRequestId, agentId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedMaidRequest)
      return res.status(400).json({ success: false, error: "Error updating maid request." });

    res.status(200).json({ success: true, data: updatedMaidRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Server error." });
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
        error: "Maid request not found",
      });
    }
    res.status(200).json({
      success: true,
      data: maidRequest,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
