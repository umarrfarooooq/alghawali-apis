const Visa = require("../Models/Visa")
const fs = require('fs');
const path = require('path');

exports.getAllVisas = async (req, res) => {
    try {
      const allVisas = await Visa.find();
      res.status(200).json({ visas: allVisas });
    } catch (error) {
      console.error('Error fetching visa details:', error);
      res.status(500).json({ error: 'An error occurred', message: error.message });
    }
  };  

exports.addVisaDetails = async (req, res) => {
    try {
      const {
        maidName,
        dateEntry,
        visaEndTime,
      } = req.body;
      
        const maidImage = req.files['maidImage'][0].path;
        const visaFile = req.files['visaFile'][0].path;

      const newVisa = new Visa({
        maidName,
        dateEntry,
        visaEndTime,
        visaFile,
        maidImage
      });
  
      await newVisa.save();
  
      res.status(201).json({ message: 'Visa details added successfully' });
    } catch (error) {
      console.error('Error adding visa details:', error);
      res.status(500).json({ error: 'An error occurred', message: error.message });
    }
};
  
exports.extendVisaById = async (req, res) => {
    try {
      const {
        newVisaEntryDate,
        newVisaEndDate,
      } = req.body;
      
      const { id } = req.params;
  
      const visaDetails = await Visa.findById(id);
  

      if (!visaDetails) {
        return res.status(404).json({ message: 'Visa details not found' });
      }
  
      
    let visaFile;
    if (req.file) {
        visaFile = req.file.path;
    }

      const extension = {
        newVisaEntryDate: visaDetails.dateEntry,
        newVisaEndDate: visaDetails.visaEndTime,
        visaFile: visaDetails.visaFile
      };
  
      visaDetails.dateEntry = newVisaEntryDate;
      visaDetails.visaEndTime = newVisaEndDate;
      visaDetails.extendedTime += 1;
      visaDetails.visaFile = visaFile;
      visaDetails.extensionHistory.push(extension);
  
      await visaDetails.save();
  
      res.status(200).json({ message: 'Visa extended successfully', visaDetails });
    } catch (error) {
      console.error('Error extending visa:', error);
      res.status(500).json({ error: 'An error occurred', message: error.message });
    }
  };

  exports.updateMaidProfile = async (req, res) => {
    try {
      const { id } = req.params;
      const { maidName } = req.body;
  
      let visa = await Visa.findById(id);
  
      if (!visa) {
        return res.status(404).json({ message: 'Visa not found' });
      }
  
      if (req.file) {
        if (visa.maidImage) {
          const imagePath = path.join(__dirname, '..', visa.maidImage);
          await fs.promises.unlink(imagePath);
          console.log('Existing visa image deleted successfully');
        }
  
        visa.maidImage = req.file.path;
      }
  
      visa.maidName = maidName;
  
      visa = await visa.save();
  
      res.status(200).json({ message: 'visa profile updated successfully', visa });
    } catch (error) {
      console.error('Error updating visa profile:', error);
      res.status(500).json({ error: 'An error occurred', message: error.message });
    }
  };

  
exports.updateHiringStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let visa = await Visa.findById(id);
    if (!visa) {
      return res.status(404).json({ message: 'Visa not found' });
    }

    visa.hiringStatus = !visa.hiringStatus;


    visa = await visa.save();

    res.status(200).json({ message: 'Hiring status updated successfully', visa });
  } catch (error) {
    console.error('Error updating hiring status:', error);
    res.status(500).json({ error: 'An error occurred', message: error.message });
  }
};


  exports.deleteVisaById = async (req, res) => {
    try {
      const { id } = req.params;
  
      const visaDetails = await Visa.findById(id);
  
      if (!visaDetails) {
        return res.status(404).json({ message: 'Visa details not found' });
      }
        const historyFiles = visaDetails.extensionHistory.map((extension) => {
        return path.join(__dirname, '..', extension.visaFile);
      });
  
      for (const file of historyFiles) {
        try {
          await fs.promises.unlink(file);
          console.log('History file deleted successfully');
        } catch (err) {
          console.error('Error deleting history file:', err);
        }
      }
  
      const filesToDelete = [
        path.join(__dirname, '..', visaDetails.visaFile),
        path.join(__dirname, '..', visaDetails.maidImage)
      ];
  
      for (const file of filesToDelete) {
        try {
          await fs.promises.unlink(file);
          console.log('File deleted successfully');
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
  
      await Visa.findByIdAndDelete(id);
  
      res.status(200).json({ message: 'Visa details and history deleted successfully' });
    } catch (error) {
      console.error('Error deleting visa details:', error);
      res.status(500).json({ error: 'An error occurred', message: error.message });
    }
  };
