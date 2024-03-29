const Maid = require("../Models/Maid")
const Hiring = require("../Models/HiringDetail");
const CustomerAccount = require("../Models/Cos.Accounts");
const StaffAccount = require("../Models/staffAccounts");


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
      if (existingMaid.isHired) {
        return res.status(400).json({ error: 'Maid already hired' });
      }
      
      const { fullName, totalAmount, advanceAmount, cosPhone, hiringBy, paymentMethod, receivedBy, hiringDate, staffAccount, staffId } = req.body;
      let hiringSlip;
      const selectedBank = req.body.selectedBank;
      do {
        uniqueCode = generateUniqueCode();
    } while (await CustomerAccount.findOne({ uniqueCode }));

      let receivedByWithBank ;
      let paymentMethodWithBank ;
      if(selectedBank){
        receivedByWithBank = `${receivedBy} (${selectedBank})`
        paymentMethodWithBank = `${paymentMethod} (${selectedBank})`
      }
  
      if (req.file) {
        hiringSlip = req.file.path;
      }
      
      if(!hiringSlip) {
        return res.status(400).json({error: "Cannot proceed without payment proof"})
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
        paySlip: hiringSlip,
        timestamp: Date.now()
      };
  
      newHiring.paymentHistory.push(newPayment);
  
      const savedHiring = await newHiring.save();

      const newCustomerAccount = new CustomerAccount({
        customerName: fullName,
        phoneNo: cosPhone,
        staffId,
        profileName: existingMaid.name,
        profileId: existingMaid._id,
        profileCode: existingMaid.code,
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
            staffAccount,
        }]
    });

      const savedCustomerAccount = await newCustomerAccount.save();

      if (receivedBy) {
        const existingStaffAccount = await StaffAccount.findOne({staffName : receivedBy});
        if (!existingStaffAccount) {
          return res.status(400).json({ error: 'Staff account not found' });
        }
  
        existingStaffAccount.balance += advanceAmount;
        existingStaffAccount.totalReceivedAmount += advanceAmount;
        existingStaffAccount.accountHistory.push({
          amount: advanceAmount,
          paymentMethod : selectedBank ? paymentMethodWithBank  : paymentMethod,
          receivedFrom: fullName,
          type: 'Received',
          date: hiringDate,
          proof: hiringSlip,
        });
  
        await existingStaffAccount.save();
      }

      await existingMaid.save();
  
      res.status(201).json({ savedHiring, savedCustomerAccount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
};

exports.listMaidAgain = async (req, res) => {
    try {
      const maidId = req.params.id;
      const existingMaid = await Maid.findById(maidId);
      if (!existingMaid) {
        return res.status(404).json({ error: 'Maid not found' });
      }
  
      if (!existingMaid.isHired) {
        return res.status(400).json({ error: 'Maid is not hired' });
      }
  
      const { option, officeCharges, returnAmount, staffAccount, receivedAmount, unHiringReason, paymentMethod, receivedBy,  newMaidId, newMaidPrice, sendedBy } = req.body;
      let paymentProof;
      const selectedBank = req.body.selectedBank;
  
      let receiverWithBank;
      let senderWithBank;
      let receivedPaymentMethodWithBank;
      let sendedPaymentMethodWithBank;
      if (selectedBank && receivedBy) {
        receiverWithBank = `${receivedBy} (${selectedBank})`;
        receivedPaymentMethodWithBank = `${paymentMethod} (${selectedBank})`;
      }
      if (selectedBank && sendedBy) {
        senderWithBank = `${sendedBy} (${selectedBank})`;
        sendedPaymentMethodWithBank = `${paymentMethod} (${selectedBank})`;
      }
  
      if (req.file) {
        paymentProof = req.file.path;
      }
      if (receivedAmount > 0 || returnAmount > 0 ) {
        if(!paymentProof){
          return res.status(400).json({ error: 'Payment Proof Is Necessery' });
        }
      }

      if (option === 'return') {
        const hiringRecord = await Hiring.findOne({ maidId }).sort({ timestamp: -1 });
        if (!hiringRecord) {
          return res.status(404).json({ error: 'Hiring record not found' });
        }


        hiringRecord.hiringStatus = false;
        hiringRecord.returnAmount = returnAmount;
        hiringRecord.officeCharges= officeCharges;
        hiringRecord.paymentMethod = paymentMethod;
        hiringRecord.receivedBy = selectedBank ? receiverWithBank : receivedBy;
        hiringRecord.paymentProof = paymentProof;
        hiringRecord.unHiringReason = unHiringReason;
  
        const updatedHiring = await hiringRecord.save();
  
        const customerAccount = await CustomerAccount.findOne({ profileId: maidId }).sort({ timestamp: -1 });
        if (!customerAccount) {
          return res.status(404).json({ error: 'Customer account not found' });
        }
        
        customerAccount.profileHiringStatus = 'Return';
        customerAccount.accountHistory.push({
          officeCharges,
          returnAmount,
          paymentMethod,
          sendedBy: selectedBank ? senderWithBank : sendedBy,
          paymentProof,
          staffAccount,
          date: Date.now(),
        });
        
        const receivedAfterOfficeCharges = customerAccount.receivedAmount - parseFloat(officeCharges);        
        customerAccount.receivedAmount = receivedAfterOfficeCharges >= 0 ? receivedAfterOfficeCharges : 0;
        customerAccount.returnAmount = parseFloat(returnAmount);

        if (customerAccount.receivedAmount < customerAccount.returnAmount) {
            return res.status(400).json("Return Amount exceeded recieved amount");
        }

        if (customerAccount.receivedAmount === customerAccount.returnAmount) {
            customerAccount.cosPaymentStatus = "Fully Paid"
        }

        customerAccount.profileId = null;
        const updatedCustomerAccount = await customerAccount.save();
  
        existingMaid.isHired = false;


        if (receivedBy) {
          const existingStaffAccount = await StaffAccount.findOne({staffName : receivedBy});
          if (!existingStaffAccount) {
            return res.status(400).json({ error: 'Staff account not found' });
          }
    
          existingStaffAccount.balance += receivedAmount;
          existingStaffAccount.totalReceivedAmount += receivedAmount;
          existingStaffAccount.accountHistory.push({
            amount: receivedAmount,
            paymentMethod : selectedBank ? receivedPaymentMethodWithBank : paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: 'Received',
            proof: paymentProof,
          });
    
          await existingStaffAccount.save();
        } else if (sendedBy) {
          const existingStaffAccount = await StaffAccount.findOne({staffName : sendedBy});
          if (!existingStaffAccount) {
            return res.status(400).json({ error: 'Staff account not found' });
          }
    
          existingStaffAccount.balance -= returnAmount;
          existingStaffAccount.totalSentAmount += returnAmount;
          existingStaffAccount.accountHistory.push({
            amount: returnAmount,
            paymentMethod : selectedBank ? sendedPaymentMethodWithBank : paymentMethod,
            sendedTo: customerAccount.customerName,
            type: 'Sent',
            proof: paymentProof,
          });
    
          await existingStaffAccount.save();
        }

        await existingMaid.save();
  
        res.status(200).json({ updatedHiring, updatedCustomerAccount });
      } else if (option === 'replace') {
        const newMaid = await Maid.findById(newMaidId);
        if (!newMaid) {
          return res.status(404).json({ error: 'New maid not found' });
        }
  
        if (newMaid.isHired) {
          return res.status(400).json({ error: 'New maid is already hired' });
        }
  

        const oldHiringRecord = await Hiring.findOne({ maidId }).sort({ timestamp: -1 });
        if (!oldHiringRecord) {
          return res.status(404).json({ error: 'Old hiring record not found' });
        }
  
        oldHiringRecord.hiringStatus = false;
        oldHiringRecord.officeCharges = officeCharges;
        oldHiringRecord.returnAmount = returnAmount || 0;
        oldHiringRecord.paymentMethod = paymentMethod;
        oldHiringRecord.receivedBy = selectedBank ? receiverWithBank : receivedBy;
        oldHiringRecord.paymentProof = paymentProof;
  
        const updatedOldHiring = await oldHiringRecord.save();
  
        const customerAccount = await CustomerAccount.findOne({ profileId: maidId });
        if (!customerAccount) {
          return res.status(404).json({ error: 'Customer account not found' });
        }

        customerAccount.profileHiringStatus = 'Replaced';
        customerAccount.accountHistory.push({
          officeCharges,
          returnAmount,
          receivedAmount : receivedAmount || 0,
          paymentMethod,
          receivedBy : selectedBank ? receiverWithBank : receivedBy,
          sendedBy : selectedBank ? senderWithBank : sendedBy,
          paymentProof,
          staffAccount,
          date: Date.now(),
        });

        const receivedAfterOfficeCharges = customerAccount.receivedAmount - parseFloat(officeCharges);        
        customerAccount.receivedAmount = receivedAfterOfficeCharges >= 0 ? receivedAfterOfficeCharges : 0;

        const balance = newMaidPrice >= customerAccount.receivedAmount;

        if (balance) {
          customerAccount.totalAmount = newMaidPrice;
          receivedAmount ? customerAccount.receivedAmount += parseFloat(receivedAmount) : "";
        } else {
          customerAccount.totalAmount = newMaidPrice;
          returnAmount ? customerAccount.returnAmount += parseFloat(returnAmount) : "";
        }

        if (customerAccount.receivedAmount === customerAccount.totalAmount) {
            customerAccount.cosPaymentStatus = "Fully Paid"
        }
        customerAccount.profileName = newMaid.name;
        customerAccount.profileId = newMaidId;
        customerAccount.profileCode = newMaid.code;
  
        const updatedCustomerAccount = await customerAccount.save();
  
        existingMaid.isHired = false;
        
        await existingMaid.save();
  
        const newHiring = new Hiring({
          fullName: customerAccount.customerName,
          totalAmount: newMaidPrice,
          advanceAmount: customerAccount.receivedAmount,
          cosPhone: customerAccount.phoneNo,
          hiringSlip: paymentProof,
          hiringBy: oldHiringRecord.hiringBy,
          maidId: newMaidId,
          paymentMethod,
          receivedBy : selectedBank ? receiverWithBank : receivedBy,
          hiringDate: Date.now(),
          hiringStatus: true,
        });
  
        newHiring.paymentHistory.push({
          paymentMethod,
          totalAmount: newMaidPrice,
          receivedAmoount: receivedAmount || 0,
          receivedBy : selectedBank ? receiverWithBank : receivedBy,
          paySlip: paymentProof,
          timestamp: Date.now(),
        });
  
        const savedNewHiring = await newHiring.save();
  
        newMaid.isHired = true;

        if (receivedBy) {
          const existingStaffAccount = await StaffAccount.findOne({staffName : receivedBy});
          if (!existingStaffAccount) {
            return res.status(400).json({ error: 'Staff account not found' });
          }
    
          existingStaffAccount.balance += receivedAmount;
          existingStaffAccount.totalReceivedAmount += receivedAmount;
          existingStaffAccount.accountHistory.push({
            amount: receivedAmount,
            paymentMethod : selectedBank ? receivedPaymentMethodWithBank : paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: 'Received',
            proof: paymentProof,
          });
    
          await existingStaffAccount.save();
        } else if (sendedBy) {
          const existingStaffAccount = await StaffAccount.findOne({staffName : sendedBy});
          if (!existingStaffAccount) {
            return res.status(400).json({ error: 'Staff account not found' });
          }
    
          existingStaffAccount.balance -= returnAmount;
          existingStaffAccount.totalSentAmount += returnAmount;
          existingStaffAccount.accountHistory.push({
            amount: returnAmount,
            paymentMethod : selectedBank ? sendedPaymentMethodWithBank : paymentMethod,
            sendedTo: customerAccount.customerName,
            type: 'Sent',
            proof: paymentProof,
          });
    
          await existingStaffAccount.save();
        }

        await newMaid.save();
  
        res.status(201).json({ updatedOldHiring, updatedCustomerAccount, savedNewHiring });
      } else {
        return res.status(400).json({ error: 'Invalid option' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
};


exports.getAllAccountsSummary = async (req, res) => {
  try {
    const allAccounts = await CustomerAccount.find();

    let totalAmount = 0;
    let receivedAmount = 0;
    let remainingAmount = 0;
    let returnAmount = 0;
    let receivedByDetails = {};
    let sendedByDetails = {};
    let remainingRecievedDetails = {};

    allAccounts.forEach(account => {
      returnAmount += account.returnAmount || 0;
      if (account.profileHiringStatus === 'Hired' || account.profileHiringStatus === 'Replaced') {
        totalAmount += account.totalAmount || 0;
        receivedAmount += account.receivedAmount || 0;
      } else if (account.profileHiringStatus === 'Return') {
        receivedAmount += (account.receivedAmount || 0) - (account.returnAmount || 0);
      }

      account.accountHistory.forEach(history => {
        const receivedByName = (history.receivedBy || '').split('(')[0].trim();
        const sendedByName = (history.sendedBy || '').split('(')[0].trim();

        if (receivedByName) {
          if (!receivedByDetails.hasOwnProperty(receivedByName)) {
            receivedByDetails[receivedByName] = {
              total: 0,
              cash: 0,
              cheque: 0,
              bankTransfer: {
                total: 0,
              },
              bankDetails: {},
            };
          }
          receivedByDetails[receivedByName].total += parseFloat(history.receivedAmount);

          if (history.paymentMethod === 'Bank Transfer') {
            const bankName = (history.receivedBy || '').split('(')[1].replace(')', '').trim();
            if (!receivedByDetails[receivedByName].bankDetails.hasOwnProperty(bankName)) {
              receivedByDetails[receivedByName].bankDetails[bankName] = 0;
            }
            receivedByDetails[receivedByName].bankDetails[bankName] += parseFloat(history.receivedAmount);

            receivedByDetails[receivedByName].bankTransfer.total += parseFloat(history.receivedAmount);
            receivedByDetails[receivedByName].bankTransfer[bankName] = receivedByDetails[receivedByName].bankDetails[bankName];
          }

          if (history.paymentMethod === 'Cash') {
            receivedByDetails[receivedByName].cash += parseFloat(history.receivedAmount);
          } else if (history.paymentMethod === 'Cheque') {
            receivedByDetails[receivedByName].cheque += parseFloat(history.receivedAmount);
          }
        }

        if (sendedByName) {
          if (!sendedByDetails.hasOwnProperty(sendedByName)) {
            sendedByDetails[sendedByName] = {
              total: 0,
              cash: 0,
              cheque: 0,
              bankTransfer: {
                total: 0,
              },
              bankDetails: {},
            };
          }
          sendedByDetails[sendedByName].total += parseFloat(history.returnAmount || 0);

          if (history.paymentMethod === 'Bank Transfer') {
            const bankName = (history.sendedBy || '').split('(')[1].replace(')', '').trim();
            if (!sendedByDetails[sendedByName].bankDetails.hasOwnProperty(bankName)) {
              sendedByDetails[sendedByName].bankDetails[bankName] = 0;
            }
            sendedByDetails[sendedByName].bankDetails[bankName] += parseFloat(history.returnAmount || 0);

            sendedByDetails[sendedByName].bankTransfer.total += parseFloat(history.returnAmount || 0);
            sendedByDetails[sendedByName].bankTransfer[bankName] = sendedByDetails[sendedByName].bankDetails[bankName];
          }

          if (history.paymentMethod === 'Cash') {
            sendedByDetails[sendedByName].cash += parseFloat(history.returnAmount || 0);
          } else if (history.paymentMethod === 'Cheque') {
            sendedByDetails[sendedByName].cheque += parseFloat(history.returnAmount || 0);
          }
        }
      });
    });

    remainingAmount = totalAmount - receivedAmount;

    Object.keys(receivedByDetails).forEach(name => {
      const receivedTotal = receivedByDetails[name].total || 0;
      const sendedTotal = sendedByDetails[name] ? sendedByDetails[name].total || 0 : 0;
      receivedByDetails[name].remaining = receivedTotal - sendedTotal;
    });
    Object.keys(receivedByDetails).forEach(name => {
      remainingRecievedDetails[name] = {
        total: receivedByDetails[name].remaining,
        cash: receivedByDetails[name].cash - (sendedByDetails[name] ? sendedByDetails[name].cash || 0 : 0),
        cheque: receivedByDetails[name].cheque - (sendedByDetails[name] ? sendedByDetails[name].cheque || 0 : 0),
        bankTransfer: {
          total: receivedByDetails[name].bankTransfer.total - (sendedByDetails[name] ? sendedByDetails[name].bankTransfer.total || 0 : 0),
        },
        bankDetails: {},
      };

      Object.keys(receivedByDetails[name].bankDetails).forEach(bank => {
        remainingRecievedDetails[name].bankDetails[bank] =
          receivedByDetails[name].bankDetails[bank] - (sendedByDetails[name] && sendedByDetails[name].bankDetails[bank] || 0);
      });

      Object.keys(receivedByDetails[name].bankTransfer).forEach(bank => {
        if (bank !== 'total') {
          remainingRecievedDetails[name].bankTransfer[bank] =
            receivedByDetails[name].bankTransfer[bank] - (sendedByDetails[name] && sendedByDetails[name].bankTransfer[bank] || 0);
        }
      });
    });
    Object.keys(sendedByDetails).forEach(sender => {
      const receiver = sendedByDetails[sender].receivedBy;
      if (receiver) {
        remainingRecievedDetails[receiver] = remainingRecievedDetails[receiver] || {
          total: 0,
          cash: 0,
          cheque: 0,
          bankTransfer: {
            total: 0,
          },
          bankDetails: {},
        };
    
        remainingRecievedDetails[receiver].total += sendedByDetails[sender].total;
        remainingRecievedDetails[receiver].cash += sendedByDetails[sender].cash;
        remainingRecievedDetails[receiver].cheque += sendedByDetails[sender].cheque;
        remainingRecievedDetails[receiver].bankTransfer.total += sendedByDetails[sender].bankTransfer.total;
    
        Object.keys(sendedByDetails[sender].bankDetails).forEach(bank => {
          remainingRecievedDetails[receiver].bankDetails[bank] = (remainingRecievedDetails[receiver].bankDetails[bank] || 0) + sendedByDetails[sender].bankDetails[bank];
        });
      }
    });
    
    res.status(200).json({
      totalAmount,
      receivedAmount,
      remainingAmount,
      returnAmount,
      receivedByDetails,
      sendedByDetails,
      remainingRecievedDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.updateHiringAndPaymentById = async (req, res) => {
    try {
      const hiringId = req.params.id;
      const updatedPaymentData = req.body;
      const existingHiring = await Hiring.findById(hiringId);
  
      if (!existingHiring) {
        return res.status(404).json({ error: 'Hiring information not found' });
      }
  
      let paySlip;
  
      if (req.file) {
        paySlip = req.file.path;
      }
      if(!paySlip) {
        return res.status(400).json({error: "Cannot proceed without payment proof"})
      }
      const updatedReceivedAmount = parseFloat(updatedPaymentData.amountGivenByCustomer) || 0;
      const newAdvanceAmount = existingHiring.advanceAmount + updatedReceivedAmount;
  
      if (newAdvanceAmount > existingHiring.totalAmount) {
        return res.status(400).json({ error: 'Advance amount cannot exceed total amount' });
      }
  
      const newPayment = {
        paymentMethod: updatedPaymentData.paymentMethod,
        totalAmount: existingHiring.totalAmount,
        receivedAmoount: updatedReceivedAmount,
        receivedBy: updatedPaymentData.selectedBank ? `${updatedPaymentData.receivedBy} (${updatedPaymentData.selectedBank})` : updatedPaymentData.receivedBy,
        paySlip,
        timestamp: Date.now(),
      };
  
      existingHiring.paymentHistory.push(newPayment);
      existingHiring.advanceAmount = parseFloat(newAdvanceAmount);
      existingHiring.paymentMethod = updatedPaymentData.paymentMethod;
      existingHiring.receivedBy = updatedPaymentData.selectedBank ? `${updatedPaymentData.receivedBy} (${updatedPaymentData.selectedBank})` : updatedPaymentData.receivedBy;
      existingHiring.hiringSlip = paySlip;
  
      const savedHiring = await existingHiring.save();
      const customerAccount = await CustomerAccount.findOne({ profileId: existingHiring.maidId });
  
      if (!customerAccount) {
        return res.status(404).json({ error: 'Customer account not found' });
      }
  
      customerAccount.receivedAmount += parseFloat(updatedReceivedAmount);
      if (existingHiring.totalAmount === customerAccount.receivedAmount) {
        customerAccount.cosPaymentStatus = 'Fully Paid';
      } else {
        customerAccount.cosPaymentStatus = 'Partially Paid';
      }
  
      const newAccountHistoryItem = {
        receivedAmount: updatedReceivedAmount,
        receivedBy: newPayment.receivedBy,
        paymentMethod: newPayment.paymentMethod,
        date: newPayment.timestamp,
        staffAccount : updatedPaymentData.staffAccount,
        paymentProof: newPayment.paySlip,
      };
  
      customerAccount.accountHistory.push(newAccountHistoryItem);
  

      if (newPayment.receivedBy) {
        const existingStaffAccount = await StaffAccount.findOne({staffName : updatedPaymentData.receivedBy});
        if (!existingStaffAccount) {
          return res.status(400).json({ error: 'Staff account not found' });
        }
  
        existingStaffAccount.balance += updatedReceivedAmount;
        existingStaffAccount.totalReceivedAmount += updatedReceivedAmount;
        existingStaffAccount.accountHistory.push({
          amount: updatedReceivedAmount,
          paymentMethod : updatedPaymentData.selectedBank ? `${updatedPaymentData.paymentMethod} (${updatedPaymentData.selectedBank})` : updatedPaymentData.paymentMethod,
          receivedFrom: customerAccount.customerName,
          type: 'Received',
          proof: newPayment.paySlip,
        });
  
        await existingStaffAccount.save();
      }

      const savedCustomerAccount = await customerAccount.save();
  
      res.status(200).json({ savedHiring, savedCustomerAccount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
};


exports.updatePartialPaymentFromAccount = async (req, res) => {
    try {
      const accountId = req.params.accountId;
      const paymentData = req.body;
  
      if (!accountId || !paymentData) {
        return res.status(400).json({ error: 'Missing required fields one' });
      }
      let paySlip;
  
      if (req.file) {
        paySlip = req.file.path;
      }
      if(!paySlip) {
        return res.status(400).json({error: "Cannot proceed without payment proof"})
      }

      const customerAccount = await CustomerAccount.findById(accountId);
      if (!customerAccount) {
        return res.status(404).json({ error: 'Customer account not found' });
      }
      if (customerAccount.profileHiringStatus === 'Hired' || customerAccount.profileHiringStatus === 'Replaced') {
        if ( !(paymentData.amountGivenByCustomer || paymentData.amountReturnToCustomer) || !paymentData.paymentMethod) {
            return res.status(400).json({ error: 'Missing required fields hired or replace' });
          }
        const updatedReceivedAmount = parseFloat(paymentData.amountGivenByCustomer) || 0;
        const updatedRturnAmount = parseFloat(paymentData.amountReturnToCustomer) || 0;
        const newReceivedAmount = customerAccount.receivedAmount + updatedReceivedAmount;
        
        if(paymentData.amountReturnToCustomer && parseFloat(paymentData.amountReturnToCustomer) > 0) {
          customerAccount.receivedAmount -= parseFloat(paymentData.amountReturnToCustomer);
          customerAccount.returnAmount > 0 ? customerAccount.returnAmount += parseFloat(paymentData.amountReturnToCustomer) : customerAccount.returnAmount = parseFloat(paymentData.amountReturnToCustomer) 
        }else{
          customerAccount.receivedAmount = newReceivedAmount;
        }

        if (newReceivedAmount > customerAccount.totalAmount && !paymentData.amountReturnToCustomer) {
          return res.status(400).json({ error: 'Received amount cannot exceed total amount' });
        }
    
        customerAccount.cosPaymentStatus = newReceivedAmount === customerAccount.totalAmount ? 'Fully Paid' : 'Partially Paid';
    
        const newAccountHistoryItem = {
          receivedAmount: paymentData.amountGivenByCustomer && updatedReceivedAmount,
          returnAmount : paymentData.amountReturnToCustomer && updatedRturnAmount ,
          receivedBy: paymentData.amountGivenByCustomer && paymentData.selectedBank ? `${paymentData.receivedBy} (${paymentData.selectedBank})` : paymentData.receivedBy,
          sendedBy: paymentData.amountReturnToCustomer && paymentData.selectedBank ? `${paymentData.sendedBy} (${paymentData.selectedBank})` : paymentData.sendedBy,
          paymentMethod: paymentData.paymentMethod,
          paymentProof : paySlip,
          staffAccount: paymentData.staffAccount,
          date: Date.now(),
        };
        customerAccount.accountHistory.push(newAccountHistoryItem);
    
        const savedCustomerAccount = await customerAccount.save();
    
          const latestHiring = await Hiring.findOne({ maidId : customerAccount.profileId })
          .sort({ timestamp: -1 }).limit(1);
  
          if (latestHiring) {
          latestHiring.advanceAmount += updatedReceivedAmount;
          latestHiring.paymentHistory.push({
                receivedAmoount: updatedReceivedAmount,
                receivedBy: paymentData.selectedBank ? `${paymentData.receivedBy} (${paymentData.selectedBank})` : paymentData.receivedBy,
                paymentMethod: paymentData.paymentMethod,
                totalAmount: latestHiring.totalAmount,
                paySlip,
          });
          await latestHiring.save();
          }
    
          if (newAccountHistoryItem.receivedBy) {
            const existingStaffAccount = await StaffAccount.findOne({staffName : paymentData.receivedBy});
            if (!existingStaffAccount) {
              return res.status(400).json({ error: 'Staff account not found' });
            }
      
            existingStaffAccount.balance += newAccountHistoryItem.receivedAmount;
            existingStaffAccount.totalReceivedAmount += newAccountHistoryItem.receivedAmount;
            existingStaffAccount.accountHistory.push({
              amount: newAccountHistoryItem.receivedAmount,
              paymentMethod: paymentData.selectedBank ? `${paymentData.paymentMethod} (${paymentData.selectedBank})` : paymentData.paymentMethod,
              receivedFrom: customerAccount.customerName,
              type: 'Received',
              proof: paySlip,
            });
      
            await existingStaffAccount.save();
          } else if (newAccountHistoryItem.sendedBy) {
            const existingStaffAccount = await StaffAccount.findOne({staffName : paymentData.sendedBy});
            if (!existingStaffAccount) {
              return res.status(400).json({ error: 'Staff account not found' });
            }
      
            existingStaffAccount.balance -= newAccountHistoryItem.returnAmount;
            existingStaffAccount.totalSentAmount += newAccountHistoryItem.returnAmount;
            existingStaffAccount.accountHistory.push({
              amount: newAccountHistoryItem.returnAmount,
              paymentMethod: paymentData.selectedBank ? `${paymentData.paymentMethod} (${paymentData.selectedBank})` : paymentData.paymentMethod,
              sendedTo: customerAccount.customerName,
              type: 'Sent',
              proof: paySlip,
            });
            await existingStaffAccount.save();
          }


        res.status(200).json({ message: 'Payment updated successfully', savedCustomerAccount });
      } else {
        if ( !paymentData.amountReturnToCustomer || !paymentData.paymentMethod) {
            return res.status(400).json({ error: 'Missing required fields return' });
          }
        const updatedReturnAmount = parseFloat(paymentData.amountReturnToCustomer) || 0;
        const newReturnAmount = customerAccount.returnAmount + updatedReturnAmount;

        if (newReturnAmount > customerAccount.receivedAmount) {
          return res.status(400).json({ error: 'Received amount cannot exceed recieved amount' });
        }
    
        customerAccount.cosPaymentStatus = newReturnAmount === customerAccount.receivedAmount ? 'Fully Paid' : 'Partially Paid';
        customerAccount.returnAmount = newReturnAmount;
        const newAccountHistoryItem = {
          returnAmount: updatedReturnAmount,
          sendedBy: paymentData.selectedBank ? `${paymentData.sendedBy} (${paymentData.selectedBank})` : paymentData.sendedBy,
          paymentMethod: paymentData.paymentMethod,
          paymentProof : paySlip,
          staffAccount: paymentData.staffAccount,
          date: Date.now(),
        };
        
        customerAccount.accountHistory.push(newAccountHistoryItem);
    
        const savedCustomerAccount = await customerAccount.save();
        if (newAccountHistoryItem.receivedAmount) {
          const existingStaffAccount = await StaffAccount.findOne({staffName : paymentData.receivedBy});
          if (!existingStaffAccount) {
            return res.status(400).json({ error: 'Staff account not found' });
          }
    
          existingStaffAccount.balance += newAccountHistoryItem.receivedAmount;
          existingStaffAccount.totalReceivedAmount += newAccountHistoryItem.receivedAmount;
          existingStaffAccount.accountHistory.push({
            amount: newAccountHistoryItem.receivedAmount,
            receivedFrom: customerAccount.customerName,
            paymentMethod: paymentData.selectedBank ? `${paymentData.paymentMethod} (${paymentData.selectedBank})` : paymentData.paymentMethod,
            type: 'Received',
            proof: paySlip,
          });
    
          await existingStaffAccount.save();
        } else if (newAccountHistoryItem.sendedBy) {
          const existingStaffAccount = await StaffAccount.findOne({staffName : paymentData.sendedBy});
          if (!existingStaffAccount) {
            return res.status(400).json({ error: 'Staff account not found' });
          }
    
          existingStaffAccount.balance -= newAccountHistoryItem.returnAmount;
          existingStaffAccount.totalSentAmount += newAccountHistoryItem.returnAmount;
          existingStaffAccount.accountHistory.push({
            amount: newAccountHistoryItem.returnAmount,
            paymentMethod: paymentData.selectedBank ? `${paymentData.paymentMethod} (${paymentData.selectedBank})` : paymentData.paymentMethod,
            sendedTo: customerAccount.customerName,
            type: 'Sent',
            proof: paySlip,
          });
    
          await existingStaffAccount.save();
        }
    
        res.status(200).json({ message: 'Payment updated successfully', savedCustomerAccount });
      }
      
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
exports.getMyCustomerAccounts = async (req, res) => {
    try {
        const staffId = req.params.staffId;
        const myAccount = await CustomerAccount.find({staffId});

        if(!myAccount) {
          return res.status(404).json({ error: 'Accounts information not found' });
        }

        res.status(200).json(myAccount);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
};

exports.getAccountByMaidId = async (req, res) => {
    try {
        const maidId = req.params.maidId;

        const accountOfMaidId = await CustomerAccount.findOne({ profileId : maidId });

        if (!accountOfMaidId) {
            return res.status(404).json({ error: 'Account not found for Maid ID' });
        }

        res.status(200).json(accountOfMaidId);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
};
