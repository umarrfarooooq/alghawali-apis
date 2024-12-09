const Visa = require("../Models/Visa");
const fs = require("fs");
const path = require("path");
const Medical = require("../Models/Medical");

exports.getAllVisas = async (req, res) => {
  try {
    const { search, page = 1 } = req.query;

    let query = {};

    if (search) {
      query = {
        $or: [
          { maidName: { $regex: search, $options: "i" } },
          { passportNo: { $regex: search, $options: "i" } },
        ],
      };
    }

    const visaCount = await Visa.countDocuments(query);

    const perPage = visaCount > 0 ? visaCount : 15;

    const offset = (page - 1) * perPage;

    const allVisas = await Visa.find(query).skip(offset).limit(Number(perPage));

    res.status(200).json({ visas: allVisas });
  } catch (error) {
    console.error("Error fetching visa details:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.addVisaDetails = async (req, res) => {
  try {
    const { maidName, dateEntry, visaEndTime, passportNo, nationality } =
      req.body;

    const maidImage =
      req.files &&
      req.files["maidImage"] &&
      req.files["maidImage"][0] &&
      req.files["maidImage"][0].path;
    
    const visaFile =
      req.files &&
      req.files["visaFile"] &&
      req.files["visaFile"][0] &&
      req.files["visaFile"][0].path;

    const newVisa = new Visa({
      maidName,
      dateEntry,
      visaEndTime,
      passportNo,
      visaFile,
      maidImage,
    });

    let saveOperations = [newVisa.save()];

    if (nationality?.toLowerCase() !== 'myanmar') {
      const newMedical = new Medical({
        maidName,
        entryDate: dateEntry,
        passportNo,
        medicalStatus: "to be done",
      });
      saveOperations.push(newMedical.save());
    }

    await Promise.all(saveOperations);

    res.status(201).json({
      message: nationality?.toLowerCase() === 'myanmar' 
        ? "Visa details added successfully"
        : "Visa details added successfully with corresponding medical record",
    });
  } catch (error) {
    console.error("Error adding visa details:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.extendVisaById = async (req, res) => {
  try {
    const { newVisaEndDate } = req.body;

    const { id } = req.params;

    const visaDetails = await Visa.findById(id);

    if (!visaDetails) {
      return res.status(404).json({ message: "Visa details not found" });
    }

    let visaFile;
    if (req.file) {
      visaFile = req.file.path;
    }
    const prevVisaEndDate = new Date(visaDetails.visaEndTime);
    const newVisaEntryDate = new Date(prevVisaEndDate);
    newVisaEntryDate.setDate(prevVisaEndDate.getDate() + 1);

    const extension = {
      newVisaEntryDate: visaDetails.dateEntry,
      newVisaEndDate: visaDetails.visaEndTime,
      visaFile: visaDetails.visaFile,
    };

    visaDetails.dateEntry = newVisaEntryDate;
    visaDetails.visaEndTime = newVisaEndDate;
    visaDetails.extendedTime += 1;
    visaDetails.visaFile = visaFile;
    visaDetails.extensionHistory.push(extension);

    await visaDetails.save();

    res
      .status(200)
      .json({ message: "Visa extended successfully", visaDetails });
  } catch (error) {
    console.error("Error extending visa:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.updateMaidProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { maidName } = req.body;

    let visa = await Visa.findById(id);

    if (!visa) {
      return res.status(404).json({ message: "Visa not found" });
    }

    if (req.file) {
      if (visa.maidImage) {
        const imagePath = path.join(__dirname, "..", visa.maidImage);
        await fs.promises.unlink(imagePath);
        console.log("Existing visa image deleted successfully");
      }

      visa.maidImage = req.file.path;
    }

    visa.maidName = maidName;

    visa = await visa.save();

    res
      .status(200)
      .json({ message: "visa profile updated successfully", visa });
  } catch (error) {
    console.error("Error updating visa profile:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.updateHiringStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let visa = await Visa.findById(id);
    if (!visa) {
      return res.status(404).json({ message: "Visa not found" });
    }

    visa.hiringStatus = !visa.hiringStatus;

    visa = await visa.save();

    res
      .status(200)
      .json({ message: "Hiring status updated successfully", visa });
  } catch (error) {
    console.error("Error updating hiring status:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};

exports.deleteVisaById = async (req, res) => {
  try {
    const { id } = req.params;

    const visaDetails = await Visa.findById(id);

    if (!visaDetails) {
      return res.status(404).json({ message: "Visa details not found" });
    }

    const historyFiles = visaDetails.extensionHistory
      .map((extension) => {
        return extension.visaFile
          ? path.join(__dirname, "..", extension.visaFile)
          : null;
      })
      .filter(Boolean);

    const historyFilePromises = historyFiles.map((file) => {
      return new Promise((resolve, reject) => {
        if (file) {
          fs.unlink(file, (err) => {
            if (err) {
              console.error("Error deleting history file:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });

    await Promise.all(historyFilePromises);

    const filesToDelete = [
      visaDetails.visaFile
        ? path.join(__dirname, "..", visaDetails.visaFile)
        : null,
      visaDetails.maidImage
        ? path.join(__dirname, "..", visaDetails.maidImage)
        : null,
    ].filter(Boolean);

    const filePromises = filesToDelete.map((file) => {
      return new Promise((resolve, reject) => {
        if (file) {
          fs.unlink(file, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });

    await Promise.all(filePromises);

    await Visa.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Visa details and history deleted successfully" });
  } catch (error) {
    console.error("Error deleting visa details:", error);
    res
      .status(500)
      .json({ error: "An error occurred", message: error.message });
  }
};
