const Maid = require("../Models/Maid")
const Hiring = require("../Models/HiringDetail");
const CustomerAccount = require("../Models/Cos.Accounts");


function generateUniqueCode() {
    const uniqueCodeLength = 6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let uniqueCode = '';

    for (let i = 0; i < uniqueCodeLength; i++) {
        uniqueCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return uniqueCode;
}

exports.createHiring = async (req, res) => {
    try {
      const maidId = req.params.id;
      const existingMaid = await Maid.findById(maidId);
      if (!existingMaid) {
        return res.status(404).json({ error: 'Maid not found' });
      }
      
      const { fullName, totalAmount, advanceAmount, cosPhone, hiringBy, paymentMethod, receivedBy, hiringDate } = req.body;
      let hiringSlip;
      const selectedBank = req.body.selectedBank;
      const uniqueCode = generateUniqueCode();
      let receivedByWithBank ;
      if(selectedBank){
        receivedByWithBank = `${receivedBy} (${selectedBank})`
      }
  
      if (req.file) {
        hiringSlip = req.file.path;
      }
  
      const newHiring = new Hiring({
        fullName,
        totalAmount,
        advanceAmount,
        cosPhone,
        hiringSlip,
        hiringBy,
        maidId,
        paymentMethod,
        receivedBy : selectedBank ? receivedByWithBank : receivedBy,
        hiringDate,
        hiringStatus: true
      });
  
  
      if(!existingMaid.isHired){
        existingMaid.isHired = true
      }
      const newPayment = {
        paymentMethod,
        totalAmount,
        receivedAmoount: advanceAmount,
        receivedBy: selectedBank ? receivedByWithBank : receivedBy,
        paySlip: hiringSlip || '',
        timestamp: Date.now()
      };
  
      newHiring.paymentHistory.push(newPayment);
  
      const savedHiring = await newHiring.save();

      const newCustomerAccount = new CustomerAccount({
        customerName: fullName,
        phoneNo: cosPhone,
        profileName: existingMaid.name,
        profileId: existingMaid.code,
        totalAmount: totalAmount,
        receivedAmount: advanceAmount,
        uniqueCode: uniqueCode,
        profileHiringStatus: 'Hired',
        accountHistory: [{
            receivedAmount: advanceAmount,
            receivedBy: selectedBank ? receivedByWithBank : receivedBy,
            paymentMethod: paymentMethod,
            date: hiringDate,
            paymentProof: hiringSlip,
        }]
    });

      const savedCustomerAccount = await newCustomerAccount.save();

      await existingMaid.save();
  
      res.status(201).json({ savedHiring, savedCustomerAccount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
};
exports.getAllAccounts = async (req, res) => {
    try {
        const allAccounts = await CustomerAccount.find();
        res.status(200).json(allAccounts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
};