const CustomRequirements = require('../Models/CustomRequirements');

exports.addCustomRequest = async (req, res) => {
  try {
    const { name, phoneNumber, category, experience, maritalStatus } = req.body;
    const requiredNationality = (req.body.nationality === 'Other') ? req.body.otherNationality : req.body.nationality;
    const requiredReligion = (req.body.religion === 'Other') ? req.body.otherReligion : req.body.religion;
    const allLanguages = Array.isArray(req.body.languages)
    ? req.body.languages.includes('Other')
      ? [...req.body.languages.filter(lang => lang !== 'Other'), req.body.otherLanguages]
      : req.body.languages
    : [];


    const newCustomRequest = new CustomRequirements({
      name,
      phoneNumber,
      category,
      nationality: requiredNationality,
      languages : allLanguages,
      religion : requiredReligion,
      experience,
      maritalStatus,
    });

    const savedRequest = await newCustomRequest.save();

    res.status(201).json(savedRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.getAllRequirements = async (req, res) => {
  try {
    const allRequirements = await CustomRequirements.find();
    res.status(200).json(allRequirements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.deleteCustomRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    const deletedRequest = await CustomRequirements.findByIdAndDelete(requestId);
    if (!deletedRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.editCustomRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const updatedRequestData = req.body;

    const existingRequest = await CustomRequirements.findByIdAndUpdate(requestId, updatedRequestData, { new: true });
    if (!existingRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    res.status(200).json(existingRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.markRequestAsDone = async (req, res) => {
  try {
    const requestId = req.params.id;

    const existingRequest = await CustomRequirements.findByIdAndUpdate(requestId, { pendingStatus: 'done' }, { new: true });
    if (!existingRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    res.status(200).json(existingRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};
