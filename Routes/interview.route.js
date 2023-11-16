const express = require('express');
const Interview = require("../Models/Interview")
const router = express.Router();
// const verifyAdminToken = require("../middlewears/verifyAdminToken")
// CRUD

router.get('/', async(req, res) =>{
    try {
        const allNumbers = await Interview.find();
        res.status(200).json(allNumbers);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
});

router.post('/', async(req, res) =>{
    try {
        const { phoneNumber, maidId, maidName, clientEmail } = req.body;

        const interview = new Interview({
          userPhoneNumber: phoneNumber,
          maidId: maidId,
          maidName: maidName,
          clientEmail: clientEmail,
        });
    
        const savedInterview = await interview.save();
    
        res.status(201).json(savedInterview);
      } catch (error) {
        console.error('Error planning interview:', error);
        res.status(500).json({ error: 'An error occurred' });
      }
});

router.put('/status/:id', async (req, res) => {
  try {
    const interviewId = req.params.id;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    interview.Status = 'Done';

    const updatedInterview = await interview.save();

    res.status(200).json(updatedInterview);
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.delete("/:id", async (req, res)=>{
    try {
        const userId = req.params.id;
    
        const deletedUser = await Interview.findByIdAndDelete(userId);
    
        if (!deletedUser) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
})

module.exports = router;