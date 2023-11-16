const express = require('express');
const Maid = require("../Models/Maid")
const Interview = require("../Models/Interview")
const router = express.Router();
const verifyAdminToken = require("../middlewears/verifyAdminToken")


router.get('/', verifyAdminToken, async (req, res) =>{
    try{
        const allMaids = await Maid.find().sort({ timestamp: -1 });
        res.render("home", {maids:allMaids})
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
    
});

router.get('/add-maid',verifyAdminToken, (req, res) =>{
    res.render("addMaid")
});

router.get('/edit-maid/:id',verifyAdminToken, async (req, res) =>{
    const maidId = req.params.id;
    try {
        const foundMaid = await Maid.findOne({_id: maidId});
        res.render("edit-profile", {maidData: foundMaid})
    } catch (error) {
        res.send(500).json({error: "An error occured"})
    }
});
router.get("/interviews",verifyAdminToken, async(req, res) =>{
    try {
        const allNumbers = await Interview.find().sort({ timestamp: -1 });
        res.render("interviews", {interviewDetails: allNumbers})
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
})


module.exports = router;