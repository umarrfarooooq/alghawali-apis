const { isValidObjectId } = require("mongoose");
const Maid = require("../Models/Maid");
const Hiring = require("../Models/HiringDetail");
const CustomerAccount = require("../Models/Cos.Accounts");
const StaffAccount = require("../Models/staffAccounts");
const roles = require("../config/roles");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const CustomerAccountV2 = require("../Models/Customer-Account-v2");

function generateUniqueCode() {
  const uniqueCodeLength = 6;
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let uniqueCode = "";

  for (let i = 0; i < uniqueCodeLength; i++) {
    uniqueCode += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return uniqueCode;
}

exports.createHiring = async (req, res) => {
  try {
    const maidId = req.params.id;
    const {
      fullName,
      totalAmount,
      advanceAmount,
      cosPhone,
      hiringBy,
      paymentMethod,
      receivedBy,
      hiringDate,
      staffAccount,
      staffId,
      isMonthlyHiring,
      monthlyHiringDuration,
    } = req.body;
    const selectedBank = req.body.selectedBank;

    if (!isValidObjectId(maidId)) {
      return res.status(400).json({ error: "Invalid maid ID" });
    }
    if (
      !fullName ||
      typeof fullName !== "string" ||
      fullName.trim().length === 0
    ) {
      return res.status(400).json({ error: "Valid full name is required" });
    }
    if (
      !totalAmount ||
      isNaN(parseFloat(totalAmount)) ||
      parseFloat(totalAmount) <= 0
    ) {
      return res.status(400).json({ error: "Valid total amount is required" });
    }
    if (
      !advanceAmount ||
      isNaN(parseFloat(advanceAmount)) ||
      parseFloat(advanceAmount) < 0
    ) {
      return res
        .status(400)
        .json({ error: "Valid advance amount is required" });
    }
    if (parseFloat(advanceAmount) > parseFloat(totalAmount)) {
      return res
        .status(400)
        .json({ error: "Advance amount cannot be greater than total amount" });
    }
    if (!cosPhone) {
      return res.status(400).json({ error: "phone number is required" });
    }
    if (
      !hiringBy ||
      typeof hiringBy !== "string" ||
      hiringBy.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Valid hiring by information is required" });
    }
    if (
      !paymentMethod ||
      typeof paymentMethod !== "string" ||
      paymentMethod.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Valid payment method is required" });
    }
    if (
      !receivedBy ||
      typeof receivedBy !== "string" ||
      receivedBy.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Valid received by information is required" });
    }
    if (!hiringDate || isNaN(Date.parse(hiringDate))) {
      return res.status(400).json({ error: "Valid hiring date is required" });
    }
    if (
      !staffAccount ||
      typeof staffAccount !== "string" ||
      staffAccount.trim().length === 0
    ) {
      return res.status(400).json({ error: "Valid staff account is required" });
    }
    if (!isValidObjectId(staffId)) {
      return res.status(400).json({ error: "Invalid staff ID" });
    }

    if (
      isMonthlyHiring &&
      (!monthlyHiringDuration ||
        isNaN(parseFloat(monthlyHiringDuration)) ||
        parseFloat(monthlyHiringDuration) <= 0)
    ) {
      return res.status(400).json({
        error: "Valid monthly hiring duration is required for monthly hiring",
      });
    }
    if (
      selectedBank &&
      (typeof selectedBank !== "string" || selectedBank.trim().length === 0)
    ) {
      return res.status(400).json({
        error: "If provided, selected bank must be a non-empty string",
      });
    }
    const existingMaid = await Maid.findById(maidId);
    if (!existingMaid) {
      return res.status(404).json({ error: "Maid not found" });
    }
    if (existingMaid.isHired || existingMaid.isMonthlyHired) {
      return res.status(400).json({ error: "Maid already hired" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Cannot proceed without payment proof" });
    }

    const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
    const compressedImagePath = `uploads/images/${uniqueImageName}`;
    await sharp(req.file.path)
      .resize({ width: 800 })
      .webp({ quality: 70 })
      .toFile(compressedImagePath);
    const hiringSlip = compressedImagePath;

    let uniqueCode;
    do {
      uniqueCode = generateUniqueCode();
    } while (await CustomerAccount.findOne({ uniqueCode }));

    const receivedByWithBank = selectedBank
      ? `${receivedBy} (${selectedBank})`
      : receivedBy;
    const paymentMethodWithBank = selectedBank
      ? `${paymentMethod} (${selectedBank})`
      : paymentMethod;

    let monthlyHireStartDate, monthlyHireEndDate;
    if (isMonthlyHiring) {
      monthlyHireStartDate = new Date(hiringDate);
      monthlyHireEndDate = new Date(hiringDate);
      monthlyHireEndDate.setMonth(
        monthlyHireEndDate.getMonth() + parseFloat(monthlyHiringDuration)
      );
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
      receivedBy: receivedByWithBank,
      hiringDate,
      hiringStatus: true,
      paymentHistory: [
        {
          paymentMethod,
          totalAmount,
          receivedAmoount: advanceAmount,
          receivedBy: receivedByWithBank,
          paySlip: hiringSlip,
          timestamp: Date.now(),
        },
      ],
    });

    const newCustomerAccount = new CustomerAccount({
      customerName: fullName,
      phoneNo: cosPhone,
      staffId,
      profileName: existingMaid.name,
      profileId: existingMaid._id,
      totalAmount: parseFloat(totalAmount),
      profileCode: existingMaid.code,
      uniqueCode: uniqueCode,
      profileHiringStatus: isMonthlyHiring ? "MonthlyHired" : "Hired",
      isMonthlyHiring,
      monthlyHiringDuration: isMonthlyHiring
        ? parseFloat(monthlyHiringDuration)
        : undefined,
      monthlyHireStartDate: isMonthlyHiring ? monthlyHireStartDate : undefined,
      monthlyHireEndDate: isMonthlyHiring ? monthlyHireEndDate : undefined,
      accountHistory: [
        {
          receivedAmount: advanceAmount,
          receivedBy: receivedByWithBank,
          paymentMethod: paymentMethod,
          date: hiringDate,
          paymentProof: hiringSlip,
          staffAccount,
          isMonthlyPayment: isMonthlyHiring,
          monthlyPeriodCovered: isMonthlyHiring
            ? `${monthlyHireStartDate.toISOString().split("T")[0]} to ${
                new Date(
                  monthlyHireStartDate.getTime() + 30 * 24 * 60 * 60 * 1000
                )
                  .toISOString()
                  .split("T")[0]
              }`
            : undefined,
        },
      ],
    });

    if (isMonthlyHiring) {
      existingMaid.isMonthlyHired = true;
      existingMaid.monthlyHireEndDate = monthlyHireEndDate;
    } else {
      existingMaid.isHired = true;
    }

    const operations = [newHiring.save(), existingMaid.save()];

    if (receivedBy) {
      const existingStaffAccount = await StaffAccount.findOne({
        staffName: receivedBy,
      });
      if (!existingStaffAccount) {
        return res.status(400).json({ error: "Staff account not found" });
      }

      if (
        req.staffRoles &&
        req.staffRoles.includes(roles.fullAccessOnAccounts)
      ) {
        existingStaffAccount.balance += parseFloat(advanceAmount);
        existingStaffAccount.totalReceivedAmount += parseFloat(advanceAmount);
        newCustomerAccount.accountHistory[0].approved = true;
        newCustomerAccount.receivedAmount += parseFloat(advanceAmount);
        existingStaffAccount.accountHistory.push({
          amount: parseFloat(advanceAmount),
          paymentMethod: paymentMethodWithBank,
          receivedFrom: fullName,
          type: "Received",
          date: new Date(hiringDate),
          proof: hiringSlip,
          approved: true,
        });
      } else {
        const pendingTransaction = {
          amount: parseFloat(advanceAmount),
          paymentMethod: paymentMethodWithBank,
          receivedFrom: fullName,
          type: "Received",
          date: new Date(hiringDate),
          proof: hiringSlip,
          receivedBy,
          requestedBy: staffAccount,
          approved: false,
        };
        existingStaffAccount.pendingApprovals.push(pendingTransaction);
        newCustomerAccount.accountHistory[0].pendingStaffId =
          existingStaffAccount.pendingApprovals[
            existingStaffAccount.pendingApprovals.length - 1
          ]._id;
      }
      operations.push(existingStaffAccount.save());
    }
    operations.push(newCustomerAccount.save());
    await Promise.all(operations);

    res.status(201).json({
      message: receivedBy
        ? req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
          ? "Transaction processed successfully"
          : "Transaction sent for approval"
        : "Hiring created successfully",
      savedHiring: newHiring,
      savedCustomerAccount: newCustomerAccount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "An error occurred" });
  }
};

exports.listMaidAgain = async (req, res) => {
  try {
    const maidId = req.params.id;
    const existingMaid = await Maid.findById(maidId);
    if (!existingMaid) {
      return res.status(404).json({ error: "Maid not found" });
    }

    const {
      option,
      officeCharges,
      returnAmount,
      staffAccount,
      receivedAmount,
      unHiringReason,
      paymentMethod,
      receivedBy,
      newMaidId,
      newMaidPrice,
      sendedBy,
    } = req.body;
    let paymentProof;
    const selectedBank = req.body.selectedBank;
    if (!isValidObjectId(maidId)) {
      return res.status(400).json({ error: "Invalid maid ID" });
    }
    if (!["return", "replace"].includes(option)) {
      return res.status(400).json({ error: "Invalid option" });
    }
    if (
      officeCharges &&
      (isNaN(parseFloat(officeCharges)) || parseFloat(officeCharges) < 0)
    ) {
      return res.status(400).json({ error: "Invalid office charges" });
    }
    if (
      returnAmount &&
      (isNaN(parseFloat(returnAmount)) || parseFloat(returnAmount) < 0)
    ) {
      return res.status(400).json({ error: "Invalid return amount" });
    }
    if (
      !staffAccount ||
      typeof staffAccount !== "string" ||
      staffAccount.trim().length === 0
    ) {
      return res.status(400).json({ error: "Valid staff account is required" });
    }
    if (
      receivedAmount &&
      (isNaN(parseFloat(receivedAmount)) || parseFloat(receivedAmount) < 0)
    ) {
      return res.status(400).json({ error: "Invalid received amount" });
    }
    if (
      unHiringReason &&
      (typeof unHiringReason !== "string" || unHiringReason.trim().length === 0)
    ) {
      return res.status(400).json({ error: "Invalid unhiring reason" });
    }
    if (
      paymentMethod &&
      (typeof paymentMethod !== "string" || paymentMethod.trim().length === 0)
    ) {
      return res.status(400).json({ error: "Invalid payment method" });
    }
    if (
      receivedBy &&
      (typeof receivedBy !== "string" || receivedBy.trim().length === 0)
    ) {
      return res.status(400).json({ error: "Invalid received by" });
    }
    if (option === "replace") {
      if (!isValidObjectId(newMaidId)) {
        return res.status(400).json({ error: "Invalid new maid ID" });
      }
      if (isNaN(parseFloat(newMaidPrice)) || parseFloat(newMaidPrice) <= 0) {
        return res.status(400).json({ error: "Invalid new maid price" });
      }
    }
    if (
      sendedBy &&
      (typeof sendedBy !== "string" || sendedBy.trim().length === 0)
    ) {
      return res.status(400).json({ error: "Invalid sended by" });
    }
    if (
      selectedBank &&
      (typeof selectedBank !== "string" || selectedBank.trim().length === 0)
    ) {
      return res.status(400).json({ error: "Invalid selected bank" });
    }

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
      const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;
      await sharp(req.file.path)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);
      paymentProof = compressedImagePath;
    }

    if (receivedAmount > 0 || returnAmount > 0) {
      if (!paymentProof) {
        return res.status(400).json({ error: "Payment Proof Is Necessery" });
      }
    }

    if (existingMaid.isMonthlyHired) {
      existingMaid.isMonthlyHired = false;
      existingMaid.monthlyHireEndDate = null;
    } else if (!existingMaid.isHired) {
      return res.status(400).json({ error: "Maid is not hired" });
    }

    if (option === "return") {
      const hiringRecord = await Hiring.findOne({ maidId }).sort({
        timestamp: -1,
      });
      if (!hiringRecord) {
        return res.status(404).json({ error: "Hiring record not found" });
      }

      hiringRecord.hiringStatus = false;
      hiringRecord.returnAmount = returnAmount || 0;
      hiringRecord.officeCharges = officeCharges || 0;
      hiringRecord.paymentMethod = paymentMethod ? paymentMethod : "";
      hiringRecord.receivedBy = selectedBank ? receiverWithBank : receivedBy;
      hiringRecord.paymentProof = paymentProof;
      hiringRecord.unHiringReason = unHiringReason;

      const updatedHiring = await hiringRecord.save();

      const customerAccount = await CustomerAccount.findOne({
        profileId: maidId,
      }).sort({ timestamp: -1 });
      if (!customerAccount) {
        return res.status(404).json({ error: "Customer account not found" });
      }

      customerAccount.profileHiringStatus = "Return";
      customerAccount.isMonthlyHiring = false;
      customerAccount.monthlyHiringDuration = undefined;
      customerAccount.monthlyHireStartDate = undefined;
      customerAccount.monthlyHireEndDate = undefined;
      customerAccount.monthlyPaymentStatus = undefined;

      const receivedAfterOfficeCharges =
        customerAccount.receivedAmount - parseFloat(officeCharges) || 0;
      customerAccount.profileId = null;
      if (
        receivedAfterOfficeCharges <
          customerAccount.returnAmount + returnAmount ||
        0
      ) {
        return res.status(400).json("Return Amount exceeded recieved amount");
      }
      customerAccount.receivedAmount = receivedAfterOfficeCharges
        ? receivedAfterOfficeCharges
        : 0;

      if (receivedBy) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: receivedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }

        if (
          req.staffRoles &&
          req.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance += parseFloat(receivedAmount);
          existingStaffAccount.totalReceivedAmount +=
            parseFloat(receivedAmount);

          customerAccount.accountHistory.push({
            officeCharges,
            receivedAmount,
            paymentMethod,
            receivedBy: selectedBank ? receiverWithBank : receivedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: true,
          });

          customerAccount.receivedAmount += parseFloat(receivedAmount) || 0;

          if (customerAccount.receivedAmount === customerAccount.returnAmount) {
            customerAccount.cosPaymentStatus = "Fully Paid";
          }

          existingStaffAccount.accountHistory.push({
            amount: parseFloat(receivedAmount),
            paymentMethod: selectedBank
              ? receivedPaymentMethodWithBank
              : paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: "Received",
            proof: paymentProof,
            approved: true,
          });

          await existingStaffAccount.save();
          await customerAccount.save();
          existingMaid.isHired = false;
          await existingMaid.save();
          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: parseFloat(receivedAmount),
            paymentMethod: selectedBank
              ? receivedPaymentMethodWithBank
              : paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: "Received",
            receivedBy,
            requestedBy: staffAccount,
            proof: paymentProof,
            approved: false,
          };
          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          customerAccount.accountHistory.push({
            officeCharges,
            receivedAmount,
            paymentMethod,
            receivedBy: selectedBank ? receiverWithBank : receivedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          });

          await customerAccount.save();
          existingMaid.isHired = false;
          await existingMaid.save();
          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      } else if (sendedBy) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: sendedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }

        if (
          req.staffRoles &&
          req.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance -= parseFloat(returnAmount) || 0;
          existingStaffAccount.totalSentAmount += parseFloat(returnAmount) || 0;
          existingStaffAccount.accountHistory.push({
            amount: parseFloat(returnAmount),
            paymentMethod: selectedBank
              ? sendedPaymentMethodWithBank
              : paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paymentProof,
            approved: true,
          });

          await existingStaffAccount.save();

          customerAccount.accountHistory.push({
            officeCharges,
            returnAmount,
            paymentMethod,
            sendedBy: selectedBank ? senderWithBank : sendedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: true,
          });

          customerAccount.returnAmount += parseFloat(returnAmount) || 0;

          if (customerAccount.receivedAmount === customerAccount.returnAmount) {
            customerAccount.cosPaymentStatus = "Fully Paid";
          }

          await customerAccount.save();
          existingMaid.isHired = false;
          await existingMaid.save();
          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: parseFloat(returnAmount),
            paymentMethod: selectedBank
              ? sendedPaymentMethodWithBank
              : paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paymentProof,
            sendedFrom: sendedBy,
            requestedBy: staffAccount,
            approved: false,
          };

          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          customerAccount.accountHistory.push({
            officeCharges,
            returnAmount,
            paymentMethod,
            sendedBy: selectedBank ? senderWithBank : sendedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          });

          await customerAccount.save();
          existingMaid.isHired = false;
          await existingMaid.save();
          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      }
      existingMaid.isHired = false;
      await existingMaid.save();
      await customerAccount.save();
      res.status(200).json({ updatedHiring });
    } else if (option === "replace") {
      const newMaid = await Maid.findById(newMaidId);
      if (!newMaid) {
        return res.status(404).json({ error: "New maid not found" });
      }

      if (newMaid.isHired || newMaid.isMonthlyHired) {
        return res.status(400).json({ error: "New maid is already hired" });
      }

      const oldHiringRecord = await Hiring.findOne({ maidId }).sort({
        timestamp: -1,
      });
      if (!oldHiringRecord) {
        return res.status(404).json({ error: "Old hiring record not found" });
      }

      oldHiringRecord.hiringStatus = false;
      oldHiringRecord.officeCharges = officeCharges;
      oldHiringRecord.returnAmount = returnAmount || 0;
      oldHiringRecord.paymentMethod = paymentMethod;
      oldHiringRecord.receivedBy = selectedBank ? receiverWithBank : receivedBy;
      oldHiringRecord.paymentProof = paymentProof;

      const updatedOldHiring = await oldHiringRecord.save();

      const customerAccount = await CustomerAccount.findOne({
        profileId: maidId,
      });
      if (!customerAccount) {
        return res.status(404).json({ error: "Customer account not found" });
      }

      customerAccount.profileHiringStatus = "Replaced";
      customerAccount.isMonthlyHiring = false;
      customerAccount.monthlyHiringDuration = undefined;
      customerAccount.monthlyHireStartDate = undefined;
      customerAccount.monthlyHireEndDate = undefined;
      customerAccount.monthlyPaymentStatus = undefined;

      const receivedAfterOfficeCharges =
        customerAccount.receivedAmount - parseFloat(officeCharges) || 0;

      if (receivedAfterOfficeCharges < parseFloat(returnAmount)) {
        return res.status(400).json("Return Amount exceeded recieved amount");
      }

      customerAccount.receivedAmount = receivedAfterOfficeCharges
        ? receivedAfterOfficeCharges
        : customerAccount.receivedAmount;

      const balance = newMaidPrice >= customerAccount.receivedAmount;
      customerAccount.totalAmount = newMaidPrice;

      if (customerAccount.receivedAmount === customerAccount.totalAmount) {
        customerAccount.cosPaymentStatus = "Fully Paid";
      }
      customerAccount.profileName = newMaid.name;
      customerAccount.profileId = newMaidId;
      customerAccount.profileCode = newMaid.code;

      const newHiring = new Hiring({
        fullName: customerAccount.customerName,
        totalAmount: newMaidPrice,
        advanceAmount: customerAccount.receivedAmount,
        cosPhone: customerAccount.phoneNo,
        hiringSlip: paymentProof,
        hiringBy: oldHiringRecord.hiringBy,
        maidId: newMaidId,
        paymentMethod,
        receivedBy: selectedBank ? receiverWithBank : receivedBy,
        hiringDate: Date.now(),
        hiringStatus: true,
      });

      newHiring.paymentHistory.push({
        paymentMethod,
        totalAmount: newMaidPrice,
        receivedAmoount: receivedAmount || 0,
        receivedBy: selectedBank ? receiverWithBank : receivedBy,
        paySlip: paymentProof,
        timestamp: Date.now(),
      });

      const savedNewHiring = await newHiring.save();

      // existingMaid.isHired = false;
      // newMaid.isHired = true;
      // await existingMaid.save();
      // await newMaid.save();

      if (receivedBy) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: receivedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }

        if (
          req.staffRoles &&
          req.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance += parseFloat(receivedAmount);
          existingStaffAccount.totalReceivedAmount +=
            parseFloat(receivedAmount);

          customerAccount.accountHistory.push({
            officeCharges,
            receivedAmount,
            paymentMethod,
            receivedBy: selectedBank ? receiverWithBank : receivedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: true,
          });

          customerAccount.receivedAmount =
            receivedAfterOfficeCharges >= 0
              ? receivedAfterOfficeCharges
              : customerAccount.receivedAmount;

          if (balance) {
            receivedAmount
              ? (customerAccount.receivedAmount += parseFloat(receivedAmount))
              : "";
          } else {
            returnAmount
              ? (customerAccount.returnAmount += parseFloat(returnAmount))
              : "";
          }

          if (customerAccount.receivedAmount === customerAccount.returnAmount) {
            customerAccount.cosPaymentStatus = "Fully Paid";
          }

          existingStaffAccount.accountHistory.push({
            amount: parseFloat(receivedAmount),
            paymentMethod: selectedBank
              ? receivedPaymentMethodWithBank
              : paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: "Received",
            proof: paymentProof,
            approved: true,
          });

          existingMaid.isHired = false;
          newMaid.isHired = true;
          await existingStaffAccount.save();
          await customerAccount.save();
          await existingMaid.save();
          await newMaid.save();

          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: parseFloat(receivedAmount),
            paymentMethod: selectedBank
              ? receivedPaymentMethodWithBank
              : paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: "Received",
            proof: paymentProof,
            receivedBy,
            requestedBy: StaffAccount,
            approved: false,
          };
          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          customerAccount.accountHistory.push({
            officeCharges,
            receivedAmount,
            paymentMethod,
            sendedBy: selectedBank ? senderWithBank : sendedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          });

          existingMaid.isHired = false;
          newMaid.isHired = true;
          await existingMaid.save();
          await newMaid.save();
          await customerAccount.save();

          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      } else if (sendedBy) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: sendedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }

        if (
          req.staffRoles &&
          req.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance -= parseFloat(returnAmount);
          existingStaffAccount.totalSentAmount += parseFloat(returnAmount) || 0;
          existingStaffAccount.accountHistory.push({
            amount: parseFloat(returnAmount),
            paymentMethod: selectedBank
              ? sendedPaymentMethodWithBank
              : paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paymentProof,
            approved: true,
          });

          await existingStaffAccount.save();

          customerAccount.accountHistory.push({
            officeCharges,
            returnAmount,
            paymentMethod,
            sendedBy: selectedBank ? senderWithBank : sendedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: true,
          });

          if (balance) {
            receivedAmount
              ? (customerAccount.receivedAmount += parseFloat(receivedAmount))
              : "";
          } else {
            returnAmount
              ? (customerAccount.returnAmount += parseFloat(returnAmount))
              : "";
          }

          if (customerAccount.receivedAmount === customerAccount.returnAmount) {
            customerAccount.cosPaymentStatus = "Fully Paid";
          }

          existingMaid.isHired = false;
          newMaid.isHired = true;
          await existingMaid.save();
          await newMaid.save();
          await customerAccount.save();

          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: parseFloat(returnAmount),
            paymentMethod: selectedBank
              ? sendedPaymentMethodWithBank
              : paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            sendedBy,
            requestedBy: staffAccount,
            proof: paymentProof,
            approved: false,
          };

          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          customerAccount.accountHistory.push({
            officeCharges,
            returnAmount,
            paymentMethod,
            sendedBy: selectedBank ? senderWithBank : sendedBy,
            paymentProof,
            staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          });

          existingMaid.isHired = false;
          newMaid.isHired = true;
          await existingMaid.save();
          await newMaid.save();

          await customerAccount.save();
          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      }

      existingMaid.isHired = false;
      newMaid.isHired = true;
      await existingMaid.save();
      await newMaid.save();
      const updatedCustomerAccount = await customerAccount.save();
      res
        .status(201)
        .json({ updatedOldHiring, updatedCustomerAccount, savedNewHiring });
    } else {
      return res.status(400).json({ error: "Invalid option" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
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

    allAccounts.forEach((account) => {
      returnAmount += account.returnAmount || 0;
      if (
        account.profileHiringStatus === "Hired" ||
        account.profileHiringStatus === "Replaced"
      ) {
        totalAmount += account.totalAmount || 0;
        receivedAmount += account.receivedAmount || 0;
      } else if (account.profileHiringStatus === "Return") {
        receivedAmount +=
          (account.receivedAmount || 0) - (account.returnAmount || 0);
      }

      account.accountHistory.forEach((history) => {
        const receivedByName = (history.receivedBy || "").split("(")[0].trim();
        const sendedByName = (history.sendedBy || "").split("(")[0].trim();

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
          receivedByDetails[receivedByName].total += parseFloat(
            history.receivedAmount
          );

          if (history.paymentMethod === "Bank Transfer") {
            const bankName = (history.receivedBy || "")
              .split("(")[1]
              .replace(")", "")
              .trim();
            if (
              !receivedByDetails[receivedByName].bankDetails.hasOwnProperty(
                bankName
              )
            ) {
              receivedByDetails[receivedByName].bankDetails[bankName] = 0;
            }
            receivedByDetails[receivedByName].bankDetails[bankName] +=
              parseFloat(history.receivedAmount);

            receivedByDetails[receivedByName].bankTransfer.total += parseFloat(
              history.receivedAmount
            );
            receivedByDetails[receivedByName].bankTransfer[bankName] =
              receivedByDetails[receivedByName].bankDetails[bankName];
          }

          if (history.paymentMethod === "Cash") {
            receivedByDetails[receivedByName].cash += parseFloat(
              history.receivedAmount
            );
          } else if (history.paymentMethod === "Cheque") {
            receivedByDetails[receivedByName].cheque += parseFloat(
              history.receivedAmount
            );
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
          sendedByDetails[sendedByName].total += parseFloat(
            history.returnAmount || 0
          );

          if (history.paymentMethod === "Bank Transfer") {
            const bankName = (history.sendedBy || "")
              .split("(")[1]
              .replace(")", "")
              .trim();
            if (
              !sendedByDetails[sendedByName].bankDetails.hasOwnProperty(
                bankName
              )
            ) {
              sendedByDetails[sendedByName].bankDetails[bankName] = 0;
            }
            sendedByDetails[sendedByName].bankDetails[bankName] += parseFloat(
              history.returnAmount || 0
            );

            sendedByDetails[sendedByName].bankTransfer.total += parseFloat(
              history.returnAmount || 0
            );
            sendedByDetails[sendedByName].bankTransfer[bankName] =
              sendedByDetails[sendedByName].bankDetails[bankName];
          }

          if (history.paymentMethod === "Cash") {
            sendedByDetails[sendedByName].cash += parseFloat(
              history.returnAmount || 0
            );
          } else if (history.paymentMethod === "Cheque") {
            sendedByDetails[sendedByName].cheque += parseFloat(
              history.returnAmount || 0
            );
          }
        }
      });
    });

    remainingAmount = totalAmount - receivedAmount;

    Object.keys(receivedByDetails).forEach((name) => {
      const receivedTotal = receivedByDetails[name].total || 0;
      const sendedTotal = sendedByDetails[name]
        ? sendedByDetails[name].total || 0
        : 0;
      receivedByDetails[name].remaining = receivedTotal - sendedTotal;
    });
    Object.keys(receivedByDetails).forEach((name) => {
      remainingRecievedDetails[name] = {
        total: receivedByDetails[name].remaining,
        cash:
          receivedByDetails[name].cash -
          (sendedByDetails[name] ? sendedByDetails[name].cash || 0 : 0),
        cheque:
          receivedByDetails[name].cheque -
          (sendedByDetails[name] ? sendedByDetails[name].cheque || 0 : 0),
        bankTransfer: {
          total:
            receivedByDetails[name].bankTransfer.total -
            (sendedByDetails[name]
              ? sendedByDetails[name].bankTransfer.total || 0
              : 0),
        },
        bankDetails: {},
      };

      Object.keys(receivedByDetails[name].bankDetails).forEach((bank) => {
        remainingRecievedDetails[name].bankDetails[bank] =
          receivedByDetails[name].bankDetails[bank] -
          ((sendedByDetails[name] && sendedByDetails[name].bankDetails[bank]) ||
            0);
      });

      Object.keys(receivedByDetails[name].bankTransfer).forEach((bank) => {
        if (bank !== "total") {
          remainingRecievedDetails[name].bankTransfer[bank] =
            receivedByDetails[name].bankTransfer[bank] -
            ((sendedByDetails[name] &&
              sendedByDetails[name].bankTransfer[bank]) ||
              0);
        }
      });
    });
    Object.keys(sendedByDetails).forEach((sender) => {
      const receiver = sendedByDetails[sender].receivedBy;
      if (receiver) {
        remainingRecievedDetails[receiver] = remainingRecievedDetails[
          receiver
        ] || {
          total: 0,
          cash: 0,
          cheque: 0,
          bankTransfer: {
            total: 0,
          },
          bankDetails: {},
        };

        remainingRecievedDetails[receiver].total +=
          sendedByDetails[sender].total;
        remainingRecievedDetails[receiver].cash += sendedByDetails[sender].cash;
        remainingRecievedDetails[receiver].cheque +=
          sendedByDetails[sender].cheque;
        remainingRecievedDetails[receiver].bankTransfer.total +=
          sendedByDetails[sender].bankTransfer.total;

        Object.keys(sendedByDetails[sender].bankDetails).forEach((bank) => {
          remainingRecievedDetails[receiver].bankDetails[bank] =
            (remainingRecievedDetails[receiver].bankDetails[bank] || 0) +
            sendedByDetails[sender].bankDetails[bank];
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
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.updateHiringAndPaymentById = async (req, res) => {
  try {
    const hiringId = req.params.id;
    const updatedPaymentData = req.body;
    const existingHiring = await Hiring.findById(hiringId);

    if (!existingHiring) {
      return res.status(404).json({ error: "Hiring information not found" });
    }

    let paySlip;

    if (req.file) {
      const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;
      await sharp(req.file.path)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);
      paySlip = compressedImagePath;
    }

    if (!paySlip) {
      return res
        .status(400)
        .json({ error: "Cannot proceed without payment proof" });
    }
    const updatedReceivedAmount =
      parseFloat(updatedPaymentData.amountGivenByCustomer) || 0;
    const newAdvanceAmount =
      existingHiring.advanceAmount + updatedReceivedAmount;

    if (newAdvanceAmount > existingHiring.totalAmount) {
      return res
        .status(400)
        .json({ error: "Advance amount cannot exceed total amount" });
    }

    const newPayment = {
      paymentMethod: updatedPaymentData.paymentMethod,
      totalAmount: existingHiring.totalAmount,
      receivedAmoount: updatedReceivedAmount,
      receivedBy: updatedPaymentData.selectedBank
        ? `${updatedPaymentData.receivedBy} (${updatedPaymentData.selectedBank})`
        : updatedPaymentData.receivedBy,
      paySlip,
      timestamp: Date.now(),
    };

    existingHiring.paymentHistory.push(newPayment);
    existingHiring.advanceAmount = parseFloat(newAdvanceAmount);
    existingHiring.paymentMethod = updatedPaymentData.paymentMethod;
    existingHiring.receivedBy = updatedPaymentData.selectedBank
      ? `${updatedPaymentData.receivedBy} (${updatedPaymentData.selectedBank})`
      : updatedPaymentData.receivedBy;
    existingHiring.hiringSlip = paySlip;

    const savedHiring = await existingHiring.save();
    const customerAccount = await CustomerAccount.findOne({
      profileId: existingHiring.maidId,
    });

    if (!customerAccount) {
      return res.status(404).json({ error: "Customer account not found" });
    }

    if (newPayment.receivedBy) {
      const existingStaffAccount = await StaffAccount.findOne({
        staffName: updatedPaymentData.receivedBy,
      });
      if (!existingStaffAccount) {
        return res.status(400).json({ error: "Staff account not found" });
      }

      if (
        req.staffRoles &&
        req.staffRoles.includes(roles.fullAccessOnAccounts)
      ) {
        existingStaffAccount.balance += updatedReceivedAmount;
        existingStaffAccount.totalReceivedAmount += updatedReceivedAmount;
        existingStaffAccount.accountHistory.push({
          amount: updatedReceivedAmount,
          paymentMethod: updatedPaymentData.selectedBank
            ? `${updatedPaymentData.paymentMethod} (${updatedPaymentData.selectedBank})`
            : updatedPaymentData.paymentMethod,
          receivedFrom: customerAccount.customerName,
          type: "Received",
          proof: newPayment.paySlip,
          approved: true,
        });

        await existingStaffAccount.save();

        customerAccount.receivedAmount += parseFloat(updatedReceivedAmount);
        if (existingHiring.totalAmount === customerAccount.receivedAmount) {
          customerAccount.cosPaymentStatus = "Fully Paid";
        } else {
          customerAccount.cosPaymentStatus = "Partially Paid";
        }

        const newAccountHistoryItem = {
          receivedAmount: updatedReceivedAmount,
          receivedBy: newPayment.receivedBy,
          paymentMethod: newPayment.paymentMethod,
          date: newPayment.timestamp,
          staffAccount: updatedPaymentData.staffAccount,
          paymentProof: newPayment.paySlip,
          approved: true,
        };

        customerAccount.accountHistory.push(newAccountHistoryItem);

        await customerAccount.save();

        return res
          .status(200)
          .json({ message: "Transaction processed successfully" });
      } else {
        const pendingTransaction = {
          amount: updatedReceivedAmount,
          paymentMethod: updatedPaymentData.selectedBank
            ? `${updatedPaymentData.paymentMethod} (${updatedPaymentData.selectedBank})`
            : updatedPaymentData.paymentMethod,
          receivedFrom: customerAccount.customerName,
          type: "Received",
          receivedBy: newPayment.receivedBy,
          requestedBy: updatedPaymentData.staffAccount,
          proof: newPayment.paySlip,
          approved: false,
        };

        existingStaffAccount.pendingApprovals.push(pendingTransaction);
        await existingStaffAccount.save();

        const newAccountHistoryItem = {
          receivedAmount: updatedReceivedAmount,
          receivedBy: newPayment.receivedBy,
          paymentMethod: newPayment.paymentMethod,
          date: newPayment.timestamp,
          staffAccount: updatedPaymentData.staffAccount,
          paymentProof: newPayment.paySlip,
          pendingStaffId:
            existingStaffAccount.pendingApprovals[
              existingStaffAccount.pendingApprovals.length - 1
            ]._id,
          approved: false,
        };

        customerAccount.accountHistory.push(newAccountHistoryItem);

        await customerAccount.save();
        return res
          .status(200)
          .json({ message: "Transaction sent for approval" });
      }
    }

    const savedCustomerAccount = await customerAccount.save();

    res.status(200).json({ savedHiring, savedCustomerAccount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.updatePartialPaymentFromAccount = async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const paymentData = req.body;

    if (!accountId || !paymentData) {
      return res.status(400).json({ error: "Missing required fields one" });
    }
    let paySlip;

    if (req.file) {
      const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;
      await sharp(req.file.path)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);
      paySlip = compressedImagePath;
    }

    if (!paySlip) {
      return res
        .status(400)
        .json({ error: "Cannot proceed without payment proof" });
    }

    const customerAccount = await CustomerAccount.findById(accountId);
    if (!customerAccount) {
      return res.status(404).json({ error: "Customer account not found" });
    }
    if (
      customerAccount.profileHiringStatus === "Hired" ||
      customerAccount.profileHiringStatus === "Replaced"
    ) {
      if (
        !(
          paymentData.amountGivenByCustomer ||
          paymentData.amountReturnToCustomer
        ) ||
        !paymentData.paymentMethod
      ) {
        return res
          .status(400)
          .json({ error: "Missing required fields hired or replace" });
      }
      const updatedReceivedAmount =
        parseFloat(paymentData.amountGivenByCustomer) || 0;
      const updatedRturnAmount =
        parseFloat(paymentData.amountReturnToCustomer) || 0;
      const newReceivedAmount =
        customerAccount.receivedAmount + updatedReceivedAmount;

      const latestHiring = await Hiring.findOne({
        maidId: customerAccount.profileId,
      })
        .sort({ timestamp: -1 })
        .limit(1);

      if (latestHiring) {
        latestHiring.advanceAmount += updatedReceivedAmount;
        latestHiring.paymentHistory.push({
          receivedAmoount: updatedReceivedAmount,
          receivedBy: paymentData.selectedBank
            ? `${paymentData.receivedBy} (${paymentData.selectedBank})`
            : paymentData.receivedBy,
          paymentMethod: paymentData.paymentMethod,
          totalAmount: latestHiring.totalAmount,
          paySlip,
        });
        await latestHiring.save();
      }

      if (paymentData.amountGivenByCustomer) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: paymentData.receivedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }
        const newAccountHistoryItem = {
          receivedAmount:
            paymentData.amountGivenByCustomer && updatedReceivedAmount,
          returnAmount:
            paymentData.amountReturnToCustomer && updatedRturnAmount,
          receivedBy:
            paymentData.amountGivenByCustomer && paymentData.selectedBank
              ? `${paymentData.receivedBy} (${paymentData.selectedBank})`
              : paymentData.receivedBy,
          sendedBy:
            paymentData.amountReturnToCustomer && paymentData.selectedBank
              ? `${paymentData.sendedBy} (${paymentData.selectedBank})`
              : paymentData.sendedBy,
          paymentMethod: paymentData.paymentMethod,
          paymentProof: paySlip,
          staffAccount: paymentData.staffAccount,
          date: Date.now(),
          approved: true,
        };

        if (
          req.staffRoles &&
          req.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance += newAccountHistoryItem.receivedAmount;
          existingStaffAccount.totalReceivedAmount +=
            newAccountHistoryItem.receivedAmount;
          existingStaffAccount.accountHistory.push({
            amount: newAccountHistoryItem.receivedAmount,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: "Received",
            proof: paySlip,
            approved: true,
          });

          await existingStaffAccount.save();

          if (
            paymentData.amountReturnToCustomer &&
            parseFloat(paymentData.amountReturnToCustomer) > 0
          ) {
            customerAccount.receivedAmount -= parseFloat(
              paymentData.amountReturnToCustomer
            );
            customerAccount.returnAmount > 0
              ? (customerAccount.returnAmount += parseFloat(
                  paymentData.amountReturnToCustomer
                ))
              : (customerAccount.returnAmount = parseFloat(
                  paymentData.amountReturnToCustomer
                ));
          } else {
            customerAccount.receivedAmount = newReceivedAmount;
          }

          if (
            newReceivedAmount > customerAccount.totalAmount &&
            !paymentData.amountReturnToCustomer
          ) {
            return res
              .status(400)
              .json({ error: "Received amount cannot exceed total amount" });
          }

          customerAccount.cosPaymentStatus =
            newReceivedAmount === customerAccount.totalAmount
              ? "Fully Paid"
              : "Partially Paid";

          customerAccount.accountHistory.push(newAccountHistoryItem);

          await customerAccount.save();

          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: newAccountHistoryItem.receivedAmount,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            receivedFrom: customerAccount.customerName,
            type: "Received",
            receivedBy: paymentData.receivedBy,
            requestedBy: paymentData.staffAccount,
            proof: paySlip,
            approved: false,
          };

          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          const newAccountHistoryForApprovalItem = {
            receivedAmount:
              paymentData.amountGivenByCustomer && updatedReceivedAmount,
            returnAmount:
              paymentData.amountReturnToCustomer && updatedRturnAmount,
            receivedBy:
              paymentData.amountGivenByCustomer && paymentData.selectedBank
                ? `${paymentData.receivedBy} (${paymentData.selectedBank})`
                : paymentData.receivedBy,
            sendedBy:
              paymentData.amountReturnToCustomer && paymentData.selectedBank
                ? `${paymentData.sendedBy} (${paymentData.selectedBank})`
                : paymentData.sendedBy,
            paymentMethod: paymentData.paymentMethod,
            paymentProof: paySlip,
            staffAccount: paymentData.staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          };
          customerAccount.accountHistory.push(newAccountHistoryForApprovalItem);

          await customerAccount.save();

          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      } else if (paymentData.amountReturnToCustomer) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: paymentData.sendedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }
        const newAccountHistoryItem = {
          receivedAmount:
            paymentData.amountGivenByCustomer && updatedReceivedAmount,
          returnAmount:
            paymentData.amountReturnToCustomer && updatedRturnAmount,
          receivedBy:
            paymentData.amountGivenByCustomer && paymentData.selectedBank
              ? `${paymentData.receivedBy} (${paymentData.selectedBank})`
              : paymentData.receivedBy,
          sendedBy:
            paymentData.amountReturnToCustomer && paymentData.selectedBank
              ? `${paymentData.sendedBy} (${paymentData.selectedBank})`
              : paymentData.sendedBy,
          paymentMethod: paymentData.paymentMethod,
          paymentProof: paySlip,
          staffAccount: paymentData.staffAccount,
          date: Date.now(),
          approved: true,
        };
        if (
          req.staffRoles &&
          req.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance -= newAccountHistoryItem.returnAmount;
          existingStaffAccount.totalSentAmount +=
            newAccountHistoryItem.returnAmount || 0;
          existingStaffAccount.accountHistory.push({
            amount: newAccountHistoryItem.returnAmount,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paySlip,
            approved: true,
          });

          await existingStaffAccount.save();

          if (
            paymentData.amountReturnToCustomer &&
            parseFloat(paymentData.amountReturnToCustomer) > 0
          ) {
            customerAccount.receivedAmount -= parseFloat(
              paymentData.amountReturnToCustomer
            );
            customerAccount.returnAmount > 0
              ? (customerAccount.returnAmount += parseFloat(
                  paymentData.amountReturnToCustomer
                ))
              : (customerAccount.returnAmount = parseFloat(
                  paymentData.amountReturnToCustomer
                ));
          } else {
            customerAccount.receivedAmount = newReceivedAmount;
          }

          if (
            newReceivedAmount > customerAccount.totalAmount &&
            !paymentData.amountReturnToCustomer
          ) {
            return res
              .status(400)
              .json({ error: "Received amount cannot exceed total amount" });
          }

          customerAccount.cosPaymentStatus =
            newReceivedAmount === customerAccount.totalAmount
              ? "Fully Paid"
              : "Partially Paid";

          customerAccount.accountHistory.push(newAccountHistoryItem);

          await customerAccount.save();

          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: newAccountHistoryItem.returnAmount,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paySlip,
            sendedBy: paymentData.sendedBy,
            requestedBy: paymentData.staffAccount,
            approved: false,
          };

          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          const newAccountHistoryForApprovalItem = {
            receivedAmount:
              paymentData.amountGivenByCustomer && updatedReceivedAmount,
            returnAmount:
              paymentData.amountReturnToCustomer && updatedRturnAmount,
            receivedBy:
              paymentData.amountGivenByCustomer && paymentData.selectedBank
                ? `${paymentData.receivedBy} (${paymentData.selectedBank})`
                : paymentData.receivedBy,
            sendedBy:
              paymentData.amountReturnToCustomer && paymentData.selectedBank
                ? `${paymentData.sendedBy} (${paymentData.selectedBank})`
                : paymentData.sendedBy,
            paymentMethod: paymentData.paymentMethod,
            paymentProof: paySlip,
            staffAccount: paymentData.staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          };
          customerAccount.accountHistory.push(newAccountHistoryForApprovalItem);

          await customerAccount.save();
          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      }

      res.status(200).json({
        message: "Payment updated successfully",
        savedCustomerAccount,
      });
    } else {
      if (!paymentData.amountReturnToCustomer || !paymentData.paymentMethod) {
        return res
          .status(400)
          .json({ error: "Missing required fields return" });
      }
      const updatedReturnAmount =
        parseFloat(paymentData.amountReturnToCustomer) || 0;
      const newReturnAmount =
        customerAccount.returnAmount + updatedReturnAmount;

      if (newReturnAmount > customerAccount.receivedAmount) {
        return res
          .status(400)
          .json({ error: "Received amount cannot exceed recieved amount" });
      }

      const newAccountHistoryItem = {
        returnAmount: updatedReturnAmount,
        sendedBy: paymentData.selectedBank
          ? `${paymentData.sendedBy} (${paymentData.selectedBank})`
          : paymentData.sendedBy,
        paymentMethod: paymentData.paymentMethod,
        paymentProof: paySlip,
        staffAccount: paymentData.staffAccount,
        date: Date.now(),
        approved: true,
      };

      await customerAccount.save();

      if (newAccountHistoryItem.receivedAmount) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: paymentData.receivedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }

        if (
          existingStaffAccount.staffRoles &&
          existingStaffAccount.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance += newAccountHistoryItem.receivedAmount;
          existingStaffAccount.totalReceivedAmount +=
            newAccountHistoryItem.receivedAmount;
          existingStaffAccount.accountHistory.push({
            amount: newAccountHistoryItem.receivedAmount,
            receivedFrom: customerAccount.customerName,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            type: "Received",
            proof: paySlip,
            approved: true,
          });

          await existingStaffAccount.save();

          customerAccount.cosPaymentStatus =
            newReturnAmount === customerAccount.receivedAmount
              ? "Fully Paid"
              : "Partially Paid";
          customerAccount.returnAmount = newReturnAmount;
          customerAccount.accountHistory.push(newAccountHistoryItem);

          await customerAccount.save();
          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: newAccountHistoryItem.receivedAmount,
            receivedFrom: customerAccount.customerName,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            type: "Received",
            receivedBy: paymentData.receivedBy,
            requestedBy: paymentData.staffAccount,
            proof: paySlip,
            approved: false,
          };

          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          const newAccountHistoryForApprovalItem = {
            receivedAmount:
              paymentData.amountGivenByCustomer && updatedReceivedAmount,
            receivedBy:
              paymentData.amountGivenByCustomer && paymentData.selectedBank
                ? `${paymentData.receivedBy} (${paymentData.selectedBank})`
                : paymentData.receivedBy,
            paymentMethod: paymentData.paymentMethod,
            paymentProof: paySlip,
            staffAccount: paymentData.staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          };
          customerAccount.accountHistory.push(newAccountHistoryForApprovalItem);

          await customerAccount.save();
          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      } else if (newAccountHistoryItem.returnAmount) {
        const existingStaffAccount = await StaffAccount.findOne({
          staffName: paymentData.sendedBy,
        });
        if (!existingStaffAccount) {
          return res.status(400).json({ error: "Staff account not found" });
        }

        if (
          existingStaffAccount.staffRoles &&
          existingStaffAccount.staffRoles.includes(roles.fullAccessOnAccounts)
        ) {
          existingStaffAccount.balance -= newAccountHistoryItem.returnAmount;
          existingStaffAccount.totalSentAmount +=
            newAccountHistoryItem.returnAmount || 0;
          existingStaffAccount.accountHistory.push({
            amount: newAccountHistoryItem.returnAmount,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paySlip,
            approved: true,
          });

          await existingStaffAccount.save();
          customerAccount.cosPaymentStatus =
            newReturnAmount === customerAccount.receivedAmount
              ? "Fully Paid"
              : "Partially Paid";
          customerAccount.returnAmount = newReturnAmount;
          customerAccount.accountHistory.push(newAccountHistoryItem);

          await customerAccount.save();
          return res
            .status(200)
            .json({ message: "Transaction processed successfully" });
        } else {
          const pendingTransaction = {
            amount: newAccountHistoryItem.returnAmount,
            paymentMethod: paymentData.selectedBank
              ? `${paymentData.paymentMethod} (${paymentData.selectedBank})`
              : paymentData.paymentMethod,
            sendedTo: customerAccount.customerName,
            type: "Sent",
            proof: paySlip,
            sendedFrom: paymentData.sendedBy,
            requestedBy: paymentData.staffAccount,
            approved: false,
          };

          existingStaffAccount.pendingApprovals.push(pendingTransaction);
          await existingStaffAccount.save();

          const newAccountHistoryForApprovalItem = {
            returnAmount:
              paymentData.amountReturnToCustomer && updatedReturnAmount,
            sendedBy:
              paymentData.amountReturnToCustomer && paymentData.selectedBank
                ? `${paymentData.sendedBy} (${paymentData.selectedBank})`
                : paymentData.sendedBy,
            paymentMethod: paymentData.paymentMethod,
            paymentProof: paySlip,
            staffAccount: paymentData.staffAccount,
            date: Date.now(),
            approved: false,
            pendingStaffId:
              existingStaffAccount.pendingApprovals[
                existingStaffAccount.pendingApprovals.length - 1
              ]._id,
          };
          customerAccount.accountHistory.push(newAccountHistoryForApprovalItem);

          await customerAccount.save();
          return res
            .status(200)
            .json({ message: "Transaction sent for approval" });
        }
      }

      res.status(200).json({ message: "Payment updated successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllAccounts = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    let query = {};

    if (searchTerm) {
      query = {
        $or: [
          { profileCode: { $regex: searchTerm, $options: "i" } },
          { customerName: { $regex: searchTerm, $options: "i" } },
          { uniqueCode: { $regex: searchTerm, $options: "i" } },
        ],
      };
    }

    const allAccounts = await CustomerAccount.find(query);
    res.status(200).json(allAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllAccountsV2 = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    let query = {};

    if (searchTerm) {
      query = {
        $or: [
          { uniqueCode: { $regex: searchTerm, $options: "i" } },
          { customerName: { $regex: searchTerm, $options: "i" } },
          { phoneNo: { $regex: searchTerm, $options: "i" } },
        ],
      };
    }

    const allAccounts = await CustomerAccountV2.find(query)
      .populate({
        path: "maid",
        select: "name code _id",
      })
      .populate({
        path: "staff",
        select: "staffName staffCode _id",
      })
      .populate({
        path: "accountHistory.receivedBy",
        select: "staffName staffCode _id",
      })
      .populate({
        path: "accountHistory.sendedBy",
        select: "staffName staffCode _id",
      })
      .populate({
        path: "accountHistory.staffAccount",
        select: "staffName staffCode _id",
      })
      .populate({
        path: "accountHistory.transaction",
        select: "status",
      });

    res.status(200).json(allAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getMyCustomerAccounts = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const { searchTerm } = req.query;

    let query = { staffId };

    if (searchTerm) {
      query.$or = [
        { profileCode: { $regex: searchTerm, $options: "i" } },
        { customerName: { $regex: searchTerm, $options: "i" } },
        { uniqueCode: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const myAccounts = await CustomerAccount.find(query);

    if (myAccounts.length === 0) {
      return res.status(404).json({ error: "Accounts information not found" });
    }

    res.status(200).json(myAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAccountByMaidId = async (req, res) => {
  try {
    const maidId = req.params.maidId;

    const accountOfMaidId = await CustomerAccount.findOne({
      profileId: maidId,
    });

    if (!accountOfMaidId) {
      return res.status(404).json({ error: "Account not found for Maid ID" });
    }

    res.status(200).json(accountOfMaidId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};
