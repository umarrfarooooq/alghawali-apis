const Medical = require("../Models/Medical");

exports.getAllMedicals = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { maidName: { $regex: search, $options: "i" } },
          { passportNo: { $regex: search, $options: "i" } },
        ],
      };
    }

    const medicals = await Medical.find(query).sort({ timestamp: -1 });
    res.status(200).json({ medicals: medicals });
  } catch (error) {
    console.error("Error fetching medical records:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.createMedicalManually = async (req, res) => {
  try {
    const {
      maidName,
      passportNo,
      medicalStatus = "to be done",
      entryDate,
    } = req.body;

    if (!maidName || !passportNo || !entryDate) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Maid name, passport number and entry date are required",
      });
    }

    const existingMedical = await Medical.findOne({ passportNo });
    if (existingMedical) {
      return res.status(409).json({
        error: "Duplicate record",
        message: "Medical record already exists for this passport number",
      });
    }

    const newMedical = new Medical({
      maidName,
      passportNo,
      entryDate,
      medicalStatus,
    });

    await newMedical.save();
    res.status(200).json({ message: "Medical record created successfully" });
  } catch (error) {
    console.error("Error creating medical record:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.getMedicalByPassport = async (req, res) => {
  try {
    const { passportNo } = req.params;
    const medical = await Medical.findOne({ passportNo });

    if (!medical) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    res.status(200).json(medical);
  } catch (error) {
    console.error("Error fetching medical record:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.updateMedicalStatus = async (req, res) => {
  try {
    const { passportNo } = req.params;
    const { medicalStatus, medicalDate } = req.body;

    const medicalFile =
      req.files &&
      req.files["medicalFile"] &&
      req.files["medicalFile"][0] &&
      req.files["medicalFile"][0].path;

    const mohFile =
      req.files &&
      req.files["mohFile"] &&
      req.files["mohFile"][0] &&
      req.files["mohFile"][0].path;

    const medical = await Medical.findOne({ passportNo });

    if (!medical) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    medical.medicalStatus = medicalStatus;
    if (medicalDate) medical.medicalDate = medicalDate;
    if (medicalFile) medical.medicalFile = medicalFile;
    if (mohFile) medical.mohFile = mohFile;

    await medical.save();

    res.status(200).json({
      message: "Medical status updated successfully",
      medical,
    });
  } catch (error) {
    console.error("Error updating medical status:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.getMedicalsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const medicals = await Medical.find({ medicalStatus: status }).sort({
      timestamp: -1,
    });

    res.status(200).json(medicals);
  } catch (error) {
    console.error("Error fetching medical records by status:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.deleteMedical = async (req, res) => {
  try {
    const { passportNo } = req.params;
    const medical = await Medical.findOneAndDelete({ passportNo });

    if (!medical) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    res.status(200).json({
      message: "Medical record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting medical record:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.getMedicalStats = async (req, res) => {
  try {
    const stats = await Medical.aggregate([
      {
        $group: {
          _id: "$medicalStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      "to be done": 0,
      "in process": 0,
      unfit: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
    });

    res.status(200).json(formattedStats);
  } catch (error) {
    console.error("Error getting medical statistics:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};
