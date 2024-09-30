const mongoose = require("mongoose");
const { isValidObjectId } = mongoose;
const Maid = require("../Models/Maid");
const CustomerAccountV2 = require("../Models/Customer-Account-v2");
const StaffAccount = require("../Models/staffAccounts");
const roles = require("../config/roles");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const Transaction = require("../Models/Transaction");
const { generateInvoice } = require("../services/invoiceService");
const fs = require("fs").promises;

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

exports.createHiringOrTrial = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const maidId = req.params.id;
    const {
      fullName,
      totalAmount,
      advanceAmount,
      cosPhone,
      visaChangeAmount,
      uniformAmount,
      paymentMethod,
      receivedBy,
      hiringDate,
      staffAccount,
      isMonthlyHiring,
      monthlyHiringDuration,
      isTrial,
      trialDuration,
      trialAction,
    } = req.body;
    const selectedBank = req.body.selectedBank;

    if (!isValidObjectId(maidId))
      return res.status(400).json({ error: "Invalid maid ID" });
    if (
      !fullName ||
      typeof fullName !== "string" ||
      fullName.trim().length === 0
    )
      return res.status(400).json({ error: "Valid full name is required" });
    if (
      !totalAmount ||
      isNaN(parseFloat(totalAmount)) ||
      parseFloat(totalAmount) <= 0
    )
      return res.status(400).json({ error: "Valid total amount is required" });
    if (
      !advanceAmount ||
      isNaN(parseFloat(advanceAmount)) ||
      parseFloat(advanceAmount) < 0
    )
      return res
        .status(400)
        .json({ error: "Valid advance amount is required" });
    if (parseFloat(advanceAmount) > parseFloat(totalAmount))
      return res
        .status(400)
        .json({ error: "Advance amount cannot be greater than total amount" });
    if (!cosPhone)
      return res.status(400).json({ error: "Phone number is required" });
    if (
      !paymentMethod ||
      typeof paymentMethod !== "string" ||
      paymentMethod.trim().length === 0
    )
      return res
        .status(400)
        .json({ error: "Valid payment method is required" });
    if (
      !receivedBy ||
      typeof receivedBy !== "string" ||
      receivedBy.trim().length === 0
    )
      return res
        .status(400)
        .json({ error: "Valid received by information is required" });
    if (!hiringDate || isNaN(Date.parse(hiringDate)))
      return res.status(400).json({ error: "Valid hiring date is required" });
    if (
      !staffAccount ||
      typeof staffAccount !== "string" ||
      staffAccount.trim().length === 0
    )
      return res.status(400).json({ error: "Valid staff account is required" });

    const existingMaid = await Maid.findById(maidId).session(session);
    if (!existingMaid) return res.status(404).json({ error: "Maid not found" });
    if (
      existingMaid.isHired ||
      existingMaid.isMonthlyHired ||
      existingMaid.isOnTrial
    )
      return res.status(400).json({ error: "Maid already hired or on trial" });

    if (
      req.staffRoles &&
      !req.staffRoles.includes(roles.fullAccessOnAccounts)
    ) {
      if (!req.file)
        return res
          .status(400)
          .json({ error: "Cannot proceed without payment proof" });
    }

    const existingStaffAccount = await StaffAccount.findById(
      receivedBy
    ).session(session);
    if (!existingStaffAccount)
      return res
        .status(404)
        .json({ error: "Received Staff account not found" });
    const actionStaffAccount = await StaffAccount.findById(
      staffAccount
    ).session(session);
    if (!actionStaffAccount)
      return res.status(404).json({ error: "Your account not found" });

    let hiringSlip;
    if (req.file) {
      const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;
      await sharp(req.file.path)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);
      hiringSlip = compressedImagePath;
    }

    let uniqueCode;
    do {
      uniqueCode = generateUniqueCode();
    } while (await CustomerAccountV2.findOne({ uniqueCode }).session(session));

    const paymentMethodWithBank = selectedBank
      ? `${paymentMethod} (${selectedBank})`
      : paymentMethod;

    let trialStartDate, trialEndDate, trialStatus;
    let monthlyHireStartDate, monthlyHireEndDate;

    if (isTrial) {
      trialStartDate = new Date(hiringDate);
      const trialDurationMilliseconds = trialDuration * 24 * 60 * 60 * 1000;
      trialEndDate = new Date(
        trialStartDate.getTime() + trialDurationMilliseconds
      );
      trialStatus = "Active";
    } else if (isMonthlyHiring) {
      monthlyHireStartDate = new Date(hiringDate);
      const daysPerMonth = 30;
      const totalDays = parseFloat(monthlyHiringDuration) * daysPerMonth;
      const monthlyDurationMilliseconds = totalDays * 24 * 60 * 60 * 1000;
      monthlyHireEndDate = new Date(
        monthlyHireStartDate.getTime() + monthlyDurationMilliseconds
      );
    }

    const newCustomerAccount = new CustomerAccountV2({
      customerName: fullName,
      phoneNo: cosPhone,
      maid: existingMaid._id,
      staff: staffAccount,
      totalAmount: parseFloat(totalAmount),
      uniqueCode,
      visaChangeAmount,
      uniformAmount,
      profileHiringStatus: isTrial
        ? "On Trial"
        : isMonthlyHiring
        ? "Monthly Hired"
        : "Hired",
      cosPaymentStatus:
        parseFloat(advanceAmount) >= parseFloat(totalAmount)
          ? "Fully Paid"
          : "Partially Paid",
      isMonthlyHiring,
      monthlyHiringDuration: isMonthlyHiring
        ? parseFloat(monthlyHiringDuration)
        : undefined,
      monthlyHireStartDate: isMonthlyHiring ? monthlyHireStartDate : undefined,
      monthlyHireEndDate: isMonthlyHiring ? monthlyHireEndDate : undefined,
      trialStartDate: isTrial ? trialStartDate : undefined,
      trialEndDate: isTrial ? trialEndDate : undefined,
      trialStatus: isTrial ? trialStatus : undefined,
      trialAction: isTrial ? trialAction : undefined,
      transactions: [],
    });
    existingMaid.hiringDate = new Date(hiringDate);
    if (isTrial) {
      existingMaid.isOnTrial = true;
      existingMaid.trialEndDate = trialEndDate;
    } else if (isMonthlyHiring) {
      existingMaid.isMonthlyHired = true;
      existingMaid.monthlyHireEndDate = monthlyHireEndDate;
    } else {
      existingMaid.isHired = true;
    }

    let hiringType;
    if (isMonthlyHiring) {
      hiringType = "Monthly";
    } else if (isTrial) {
      hiringType = "Trial";
    } else {
      hiringType = "Hired";
    }

    const transaction = new Transaction({
      customer: newCustomerAccount._id,
      amount: parseFloat(advanceAmount),
      paymentMethod: paymentMethodWithBank,
      actionBy: staffAccount,
      date: new Date(hiringDate),
      receivedBy: receivedBy,
      proof: hiringSlip || undefined,
      type: "Received",
      status:
        req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
          ? "Approved"
          : "Pending",
      description: isMonthlyHiring
        ? `Monthly hiring for ${monthlyHiringDuration} months`
        : "Initial hiring payment",
    });

    await transaction.save({ session });

    const invoiceData = await generateInvoice(
      hiringType,
      existingMaid,
      newCustomerAccount,
      transaction,
      actionStaffAccount,
      existingStaffAccount
    );
    transaction.invoice.number = invoiceData.invoiceNumber;
    transaction.invoice.path = invoiceData.pdfFilePath;
    await transaction.save({ session });
    newCustomerAccount.transactions.push(transaction._id);
    existingStaffAccount.transactions.push(transaction._id);

    if (req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)) {
      existingStaffAccount.balance += parseFloat(advanceAmount);
      existingStaffAccount.totalReceivedAmount += parseFloat(advanceAmount);
      newCustomerAccount.receivedAmount += parseFloat(advanceAmount);
    } else {
      newCustomerAccount.pendingReceivedAmount += parseFloat(advanceAmount);
      existingStaffAccount.pendingReceivedAmount += parseFloat(advanceAmount);
    }

    await Promise.all([
      existingMaid.save({ session }),
      newCustomerAccount.save({ session }),
      existingStaffAccount.save({ session }),
    ]);
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message:
        req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
          ? "Transaction processed successfully"
          : "Transaction sent for approval",
      savedCustomerAccount: newCustomerAccount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);

    const errorMessage =
      error.message || "An error occurred while processing the request";

    res.status(500).json({
      error: errorMessage,
    });
  }
};

exports.returnMaid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      maidId,
      returnAmount,
      officeCharges,
      paymentMethod,
      sendedBy,
      staffAccount,
      returnReason,
      returnDate,
    } = req.body;
    const selectedBank = req.body.selectedBank;

    if (!isValidObjectId(maidId)) {
      return res.status(400).json({ error: "Invalid maid ID" });
    }
    if (isNaN(parseFloat(returnAmount)) || parseFloat(returnAmount) < 0) {
      return res.status(400).json({ error: "Invalid return amount minimum 0" });
    }
    if (isNaN(parseFloat(officeCharges)) || parseFloat(officeCharges) < 0) {
      return res
        .status(400)
        .json({ error: "Invalid office charges minimum 0" });
    }
    if (parseFloat(returnAmount) > 0) {
      if (!paymentMethod || typeof paymentMethod !== "string") {
        return res.status(400).json({ error: "Invalid payment method" });
      }
      if (!sendedBy || typeof sendedBy !== "string") {
        return res.status(400).json({ error: "Invalid sender information" });
      }
      if (!isValidObjectId(sendedBy)) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Invalid sendedBy ID" });
      }
    }
    if (!staffAccount || typeof staffAccount !== "string") {
      return res.status(400).json({ error: "Invalid staff account" });
    }
    if (!returnReason || typeof returnReason !== "string") {
      return res.status(400).json({ error: "Invalid return reason" });
    }
    if (!returnDate || isNaN(Date.parse(returnDate))) {
      return res.status(400).json({ error: "Valid return date is required" });
    }

    if (!isValidObjectId(staffAccount)) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Invalid staffAccount ID" });
    }

    const actionStaff = await StaffAccount.findById(staffAccount).session(
      session
    );
    if (!actionStaff) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Action staff not found" });
    }

    let returnSlip;
    if (req.file) {
      const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;
      await sharp(req.file.path)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);
      returnSlip = compressedImagePath;
    }

    const maid = await Maid.findById(maidId).session(session);
    if (!maid) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Maid not found" });
    }
    if (!maid.isHired && !maid.isMonthlyHired && !maid.isOnTrial) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Maid is not currently hired" });
    }

    const customerAccount = await CustomerAccountV2.findOne({
      maid: maidId,
      profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
    })
      .sort({ _id: -1 })
      .session(session);

    if (!customerAccount) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "Active customer account not found for this maid" });
    }

    const totalReturnAmount =
      parseFloat(returnAmount) + parseFloat(officeCharges);
    if (
      totalReturnAmount >
      customerAccount.receivedAmount + customerAccount.pendingReceivedAmount
    ) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Total return amount exceeds received amount" });
    }

    // Update maid status
    maid.isOnTrial = false;
    maid.isHired = false;
    maid.isMonthlyHired = false;
    maid.hiringDate = null;
    maid.monthlyHireEndDate = null;
    maid.trialEndDate = null;

    if (parseFloat(officeCharges) > 0) {
      customerAccount.receivedAmount -= parseFloat(officeCharges);
      customerAccount.officeCharges += parseFloat(officeCharges);
    }

    let transaction;
    if (parseFloat(returnAmount) > 0) {
      const senderStaff = await StaffAccount.findById(sendedBy).session(
        session
      );
      if (!senderStaff) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Sender staff not found" });
      }

      transaction = new Transaction({
        customer: customerAccount._id,
        amount: parseFloat(returnAmount),
        paymentMethod: selectedBank
          ? `${paymentMethod} (${selectedBank})`
          : paymentMethod,
        actionBy: actionStaff._id,
        date: new Date(returnDate),
        sendedBy: senderStaff._id,
        proof: returnSlip,
        type: "Sent",
        status:
          req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
            ? "Approved"
            : "Pending",
        description: `Maid return: ${returnReason || "No reason provided"}`,
      });

      await transaction.save({ session });

      const invoiceData = await generateInvoice(
        "Return",
        maid,
        customerAccount,
        transaction,
        actionStaff,
        senderStaff
      );

      transaction.invoice.number = invoiceData.invoiceNumber;
      transaction.invoice.path = invoiceData.pdfFilePath;
      await transaction.save({ session });

      customerAccount.transactions.push(transaction._id);

      if (
        req.staffRoles &&
        req.staffRoles.includes(roles.fullAccessOnAccounts)
      ) {
        senderStaff.balance -= parseFloat(returnAmount);
        senderStaff.totalSentAmount += parseFloat(returnAmount);
        customerAccount.returnAmount += parseFloat(returnAmount);
        customerAccount.receivedAmount -= parseFloat(returnAmount);
      } else {
        senderStaff.pendingSentAmount += parseFloat(returnAmount);
        customerAccount.pendingReturnAmount += parseFloat(returnAmount);
        customerAccount.pendingReceivedAmount -= parseFloat(returnAmount);
      }

      senderStaff.transactions.push(transaction._id);
      await senderStaff.save({ session });
    }

    if (
      customerAccount.receivedAmount + customerAccount.pendingReceivedAmount <=
      0
    ) {
      customerAccount.cosPaymentStatus = "Refunded";
    } else if (
      customerAccount.receivedAmount + customerAccount.pendingReceivedAmount >
      0
    ) {
      customerAccount.cosPaymentStatus = "Partially Refunded";
    } else {
      customerAccount.cosPaymentStatus = "Partially Paid";
    }

    customerAccount.profileHiringStatus = "Return";
    await Promise.all([
      maid.save({ session }),
      customerAccount.save({ session }),
    ]);

    await session.commitTransaction();
    res
      .status(200)
      .json({ message: "Maid return processed successfully", transaction });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the return" });
  } finally {
    session.endSession();
  }
};

exports.replaceMaid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      oldMaidId,
      newMaidId,
      newMaidPrice,
      officeCharges,
      paymentMethod,
      receivedBy,
      sendedBy,
      staffAccount,
      replaceReason,
      replaceDate,
      paymentAmount,
    } = req.body;
    const selectedBank = req.body.selectedBank;

    // Input validation
    if (!isValidObjectId(oldMaidId) || !isValidObjectId(newMaidId)) {
      return res.status(400).json({ error: "Invalid maid ID" });
    }
    if (!replaceDate || isNaN(Date.parse(replaceDate))) {
      return res.status(400).json({ error: "Valid replace date is required" });
    }
    if (!isValidObjectId(staffAccount)) {
      return res.status(400).json({ error: "Invalid staffAccount ID" });
    }
    if (isNaN(newMaidPrice) || newMaidPrice <= 0) {
      return res.status(400).json({ error: "Invalid new maid price" });
    }
    if (
      paymentAmount === undefined ||
      isNaN(paymentAmount) ||
      paymentAmount < 0
    ) {
      return res.status(400).json({
        error:
          "Payment amount is required and must be a number greater than or equal to 0",
      });
    }

    // Find and validate staff members, maids, and customer account
    const [oldMaid, newMaid, customerAccount, actionStaff] = await Promise.all([
      Maid.findById(oldMaidId).session(session),
      Maid.findById(newMaidId).session(session),
      CustomerAccountV2.findOne({
        maid: oldMaidId,
        profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
      })
        .sort({ _id: -1 })
        .session(session),
      StaffAccount.findById(staffAccount).session(session),
    ]);

    if (
      !oldMaid ||
      (!oldMaid.isHired && !oldMaid.isMonthlyHired && !oldMaid.isOnTrial)
    ) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "Old maid not found or not currently hired" });
    }
    if (
      !newMaid ||
      newMaid.isHired ||
      newMaid.isMonthlyHired ||
      newMaid.isOnTrial
    ) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "New maid not found or already hired" });
    }
    if (!customerAccount) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "Active customer account not found for the old maid" });
    }
    if (!actionStaff) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Action staff member not found" });
    }

    // Calculate amounts
    const totalReceivedAmount =
      customerAccount.receivedAmount + customerAccount.pendingReceivedAmount;
    const amountAfterCharges = totalReceivedAmount - parseFloat(officeCharges);
    const priceDifference = newMaidPrice - amountAfterCharges;
    let transactionType,
      transactionAmount,
      transactionDescription,
      transactionStaff;

    if (priceDifference > 0) {
      transactionType = "Received";
      transactionAmount = priceDifference;
      transactionDescription = `Maid replacement: ${
        replaceReason || "No reason provided"
      }. Additional payment required.`;
      transactionStaff = await StaffAccount.findById(receivedBy).session(
        session
      );
    } else {
      transactionType = "Sent";
      transactionAmount = Math.abs(priceDifference);
      transactionDescription = `Maid replacement: ${
        replaceReason || "No reason provided"
      }. Refund due to price difference.`;
      transactionStaff = await StaffAccount.findById(sendedBy).session(session);
    }

    if (transactionAmount > 0 && paymentAmount > 0 && !transactionStaff) {
      await session.abortTransaction();
      return res.status(404).json({
        error: `${
          transactionType === "Received" ? "Receiver" : "Sender"
        } staff not found`,
      });
    }

    // Handle payment amount
    if (paymentAmount !== undefined) {
      if (paymentAmount > transactionAmount) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ error: "Payment amount exceeds the required amount" });
      }
      transactionAmount = paymentAmount;
    }

    // Update maid statuses
    oldMaid.isOnTrial = oldMaid.isHired = oldMaid.isMonthlyHired = false;
    oldMaid.hiringDate =
      oldMaid.monthlyHireEndDate =
      oldMaid.trialEndDate =
        null;

    newMaid.isHired = customerAccount.profileHiringStatus === "Hired";
    newMaid.isMonthlyHired =
      customerAccount.profileHiringStatus === "Monthly Hired";
    newMaid.isOnTrial = customerAccount.profileHiringStatus === "On Trial";
    newMaid.hiringDate = new Date(replaceDate);

    let transaction;
    if (transactionAmount > 0) {
      transaction = new Transaction({
        customer: customerAccount._id,
        amount: parseFloat(transactionAmount.toFixed(2)),
        paymentMethod: selectedBank
          ? `${paymentMethod} (${selectedBank})`
          : paymentMethod,
        actionBy: actionStaff._id,
        date: new Date(replaceDate),
        [transactionType === "Received" ? "receivedBy" : "sendedBy"]:
          transactionStaff._id,
        type: transactionType,
        status:
          req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
            ? "Approved"
            : "Pending",
        description: transactionDescription,
      });
      await transaction.save({ session });
      // Generate invoice
      const invoiceData = await generateInvoice(
        "Replace",
        newMaid,
        customerAccount,
        transaction,
        actionStaff,
        transactionStaff
      );
      transaction.invoice = {
        number: invoiceData.invoiceNumber,
        path: invoiceData.pdfFilePath,
      };
      await transaction.save({ session });
      customerAccount.transactions.push(transaction._id);
      transactionStaff.transactions.push(transaction._id);

      // Handle transaction based on staff roles
      if (
        req.staffRoles &&
        req.staffRoles.includes(roles.fullAccessOnAccounts)
      ) {
        if (transactionType === "Received") {
          customerAccount.receivedAmount += transactionAmount;
          transactionStaff.balance += transactionAmount;
          transactionStaff.totalReceivedAmount += transactionAmount;
        } else {
          customerAccount.receivedAmount -= transactionAmount;
          customerAccount.returnAmount += transactionAmount;
          transactionStaff.balance -= transactionAmount;
          transactionStaff.totalSentAmount += transactionAmount;
        }
      } else {
        if (transactionType === "Received") {
          customerAccount.pendingReceivedAmount += transactionAmount;
          transactionStaff.pendingReceivedAmount += transactionAmount;
        } else {
          customerAccount.pendingReturnAmount += transactionAmount;
          transactionStaff.pendingSentAmount += transactionAmount;
          customerAccount.pendingReceivedAmount -= transactionAmount;
        }
      }
    }
    // Update customer account
    customerAccount.maid = newMaidId;
    customerAccount.totalAmount = newMaidPrice;
    if (officeCharges > 0) {
      customerAccount.officeCharges += parseFloat(officeCharges);
    }
    if (transactionType === "Received") {
      if (
        customerAccount.receivedAmount +
          customerAccount.pendingReceivedAmount >=
        newMaidPrice
      ) {
        customerAccount.cosPaymentStatus = "Fully Paid";
      } else {
        customerAccount.cosPaymentStatus = "Partially Paid";
      }
    } else {
      if (
        customerAccount.receivedAmount +
          customerAccount.pendingReceivedAmount ===
        newMaidPrice
      ) {
        customerAccount.cosPaymentStatus = "Refunded";
      } else {
        customerAccount.cosPaymentStatus = "Partially Refunded";
      }
    }
    await Promise.all([
      oldMaid.save({ session }),
      newMaid.save({ session }),
      customerAccount.save({ session }),
      transaction ? transaction.save({ session }) : Promise.resolve(),
      transactionStaff ? transactionStaff.save({ session }) : Promise.resolve(),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      message:
        req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
          ? "Maid replaced and transaction processed successfully"
          : "Maid replacement request sent for approval",
      transaction,
      customerAccount,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in replaceMaid:", error);
    res
      .status(500)
      .json({ error: "An error occurred while replacing the maid" });
  } finally {
    session.endSession();
  }
};

exports.updateCustomerPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customerId,
      paymentAmount,
      paymentMethod,
      staffAccount,
      receiverOrSenderId,
      paymentDate,
      paymentType, // 'receive' or 'refund'
    } = req.body;
    const selectedBank = req.body.selectedBank;

    // Input validation
    if (!isValidObjectId(customerId)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    if (isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }
    if (!paymentMethod || typeof paymentMethod !== "string") {
      return res.status(400).json({ error: "Invalid payment method" });
    }
    if (
      !isValidObjectId(staffAccount) ||
      !isValidObjectId(receiverOrSenderId)
    ) {
      return res.status(400).json({ error: "Invalid staff account ID" });
    }
    if (!paymentDate || isNaN(Date.parse(paymentDate))) {
      return res.status(400).json({ error: "Valid payment date is required" });
    }
    if (!["receive", "refund"].includes(paymentType)) {
      return res.status(400).json({ error: "Invalid payment type" });
    }
    // Check for payment proof if user doesn't have full access
    if (
      req.staffRoles &&
      !req.staffRoles.includes(roles.fullAccessOnAccounts) &&
      !req.file
    ) {
      return res
        .status(400)
        .json({ error: "Payment proof is required for this transaction" });
    }

    // Find and validate customer account and staff members
    const [customerAccount, actionStaff, receiverOrSenderStaff] =
      await Promise.all([
        CustomerAccountV2.findById(customerId).session(session),
        StaffAccount.findById(staffAccount).session(session),
        StaffAccount.findById(receiverOrSenderId).session(session),
      ]);

    if (!customerAccount) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Customer account not found" });
    }
    if (!actionStaff || !receiverOrSenderStaff) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Staff account not found" });
    }

    // Process payment proof if provided
    let paymentProof;
    if (req.file) {
      const uniqueImageName = `${uuidv4()}_${req.file.filename}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;
      await sharp(req.file.path)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);
      paymentProof = compressedImagePath;
    }

    // Create transaction
    const transaction = new Transaction({
      customer: customerAccount._id,
      amount: parseFloat(paymentAmount),
      paymentMethod: selectedBank
        ? `${paymentMethod} (${selectedBank})`
        : paymentMethod,
      actionBy: actionStaff._id,
      date: new Date(paymentDate),
      [paymentType === "receive" ? "receivedBy" : "sendedBy"]:
        receiverOrSenderStaff._id,
      proof: paymentProof,
      type: paymentType === "receive" ? "Received" : "Sent",
      status:
        req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
          ? "Approved"
          : "Pending",
      description: paymentReason || "No Description provided",
    });

    await transaction.save({ session });

    // Generate invoice
    const maid = await Maid.findById(customerAccount.maid).session(session);
    const invoiceData = await generateInvoice(
      paymentType === "receive" ? "Additional Payment" : "Refund",
      maid,
      customerAccount,
      transaction,
      actionStaff,
      receiverOrSenderStaff
    );
    transaction.invoice = {
      number: invoiceData.invoiceNumber,
      path: invoiceData.pdfFilePath,
    };
    await transaction.save({ session });

    // Update customer account and staff balances
    customerAccount.transactions.push(transaction._id);
    receiverOrSenderStaff.transactions.push(transaction._id);

    if (req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)) {
      if (paymentType === "receive") {
        customerAccount.receivedAmount += parseFloat(paymentAmount);
        receiverOrSenderStaff.balance += parseFloat(paymentAmount);
        receiverOrSenderStaff.totalReceivedAmount += parseFloat(paymentAmount);
      } else {
        customerAccount.returnAmount += parseFloat(paymentAmount);
        customerAccount.receivedAmount -= parseFloat(paymentAmount);
        receiverOrSenderStaff.balance -= parseFloat(paymentAmount);
        receiverOrSenderStaff.totalSentAmount += parseFloat(paymentAmount);
      }
    } else {
      if (paymentType === "receive") {
        customerAccount.pendingReceivedAmount += parseFloat(paymentAmount);
        receiverOrSenderStaff.pendingReceivedAmount +=
          parseFloat(paymentAmount);
      } else {
        customerAccount.pendingReturnAmount += parseFloat(paymentAmount);
        receiverOrSenderStaff.pendingSentAmount += parseFloat(paymentAmount);
        customerAccount.pendingReceivedAmount -= parseFloat(paymentAmount);
      }
    }

    // Check if the customer has fully paid (only for 'receive' type)
    if (paymentType === "receive") {
      const totalPaid =
        customerAccount.receivedAmount + customerAccount.pendingReceivedAmount;
      if (totalPaid >= customerAccount.totalAmount) {
        customerAccount.cosPaymentStatus = "Fully Paid";
      } else {
        customerAccount.cosPaymentStatus = "Partially Paid";
      }
    } else if (paymentType === "refund") {
      if (
        customerAccount.receivedAmount +
          customerAccount.pendingReceivedAmount ===
        0
      ) {
        customerAccount.cosPaymentStatus = "Fully Refunded";
      } else {
        customerAccount.cosPaymentStatus = "Partially Refunded";
      }
    }

    await Promise.all([
      customerAccount.save({ session }),
      receiverOrSenderStaff.save({ session }),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      message:
        req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)
          ? `Payment ${
              paymentType === "receive" ? "received" : "refunded"
            } successfully`
          : `Payment ${
              paymentType === "receive" ? "receive" : "refund"
            } request sent for approval`,
      transaction,
      customerAccount,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in updateCustomerPayment:", error);
    res.status(500).json({
      error: "An error occurred while processing the payment update",
    });
  } finally {
    session.endSession();
  }
};

exports.handlePendingTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId, action, reason } = req.body;

    // Input validation
    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }
    if (!["approve", "decline"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    if (action === "decline" && (!reason || typeof reason !== "string")) {
      return res.status(400).json({
        error: "Valid Reason is required for declining a transaction",
      });
    }

    // Check if the user has the necessary permissions
    if (
      !req.staffRoles ||
      !req.staffRoles.includes(roles.fullAccessOnAccounts)
    ) {
      return res
        .status(403)
        .json({ error: "You don't have permission to perform this action" });
    }

    // Find the transaction
    const transaction = await Transaction.findById(transactionId).session(
      session
    );
    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if the transaction is pending
    if (transaction.status !== "Pending") {
      await session.abortTransaction();
      return res.status(400).json({ error: "This transaction is not pending" });
    }

    // Find related documents
    const [customerAccount, staffAccount] = await Promise.all([
      CustomerAccountV2.findById(transaction.customer).session(session),
      StaffAccount.findById(
        transaction.type === "Received"
          ? transaction.receivedBy
          : transaction.sendedBy
      ).session(session),
    ]);

    if (!customerAccount || !staffAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Related accounts not found" });
    }

    if (action === "approve") {
      transaction.status = "Approved";
      if (transaction.type === "Received") {
        customerAccount.receivedAmount += transaction.amount;
        customerAccount.pendingReceivedAmount -= transaction.amount;
        staffAccount.balance += transaction.amount;
        staffAccount.totalReceivedAmount += transaction.amount;
        staffAccount.pendingReceivedAmount -= transaction.amount;
      } else {
        // "Sent"
        customerAccount.returnAmount += transaction.amount;
        customerAccount.receivedAmount -= transaction.amount;
        customerAccount.pendingReturnAmount -= transaction.amount;
        customerAccount.pendingReceivedAmount += transaction.amount;
        staffAccount.balance -= transaction.amount;
        staffAccount.totalSentAmount += transaction.amount;
        staffAccount.pendingSentAmount -= transaction.amount;
      }
    } else {
      // Decline the transaction
      transaction.status = "Declined";
      transaction.declineReason = reason;

      // Remove pending amounts
      if (transaction.type === "Received") {
        customerAccount.pendingReceivedAmount -= transaction.amount;
        staffAccount.pendingReceivedAmount -= transaction.amount;
      } else {
        // "Sent"
        customerAccount.pendingReturnAmount -= transaction.amount;
        customerAccount.pendingReceivedAmount += transaction.amount;
        staffAccount.pendingSentAmount -= transaction.amount;
      }

      if (transaction.type === "Received") {
        if (
          customerAccount.receivedAmount +
            customerAccount.pendingReceivedAmount ===
          customerAccount.totalAmount
        ) {
          customerAccount.cosPaymentStatus = "Fully Paid";
        } else {
          customerAccount.cosPaymentStatus = "Partially Paid";
        }
      } else {
        if (
          customerAccount.receivedAmount +
            customerAccount.pendingReceivedAmount ===
          0
        ) {
          customerAccount.cosPaymentStatus = "Fully Refunded";
        } else {
          customerAccount.cosPaymentStatus = "Partially Refunded";
        }
      }
    }

    // Save all changes
    await Promise.all([
      transaction.save({ session }),
      customerAccount.save({ session }),
      staffAccount.save({ session }),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      message: `Transaction ${
        action === "approve" ? "approved" : "declined"
      } successfully`,
      transaction,
      customerAccount,
      staffAccount,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in handlePendingTransaction:", error);
    res.status(500).json({
      error: "An error occurred while processing the transaction",
    });
  } finally {
    session.endSession();
  }
};

exports.editTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId, ...updateFields } = req.body;

    // Check if the user has the necessary permissions
    if (
      !req.staffRoles ||
      !req.staffRoles.includes(roles.fullAccessOnAccounts)
    ) {
      return res
        .status(403)
        .json({ error: "You don't have permission to edit transactions" });
    }

    // Input validation
    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }

    // Find the transaction
    const transaction = await Transaction.findById(transactionId).session(
      session
    );
    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if the transaction is declined
    if (transaction.status === "Declined") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Declined transactions cannot be edited" });
    }

    // Find related documents
    const [customerAccount, staffAccount] = await Promise.all([
      CustomerAccountV2.findById(transaction.customer).session(session),
      StaffAccount.findById(
        transaction.type === "Received"
          ? transaction.receivedBy
          : transaction.sendedBy
      ).session(session),
    ]);

    if (!customerAccount || !staffAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Related accounts not found" });
    }

    if (req.file) {
      if (transaction.proof) {
        try {
          await fs.unlink(transaction.proof);
        } catch (unlinkError) {
          console.error("Error deleting old proof image:", unlinkError);
        }
      }
      const uniqueImageName = `${uuidv4()}_${req.file.originalname}.webp`;
      const compressedImagePath = `uploads/images/${uniqueImageName}`;

      await sharp(req.file.buffer)
        .resize({ width: 800 })
        .webp({ quality: 70 })
        .toFile(compressedImagePath);

      transaction.proof = compressedImagePath;
    }
    // Update transaction details
    const validFields = [
      "amount",
      "paymentMethod",
      "date",
      "description",
      "receivedBy",
      "sendedBy",
    ];
    validFields.forEach((field) => {
      if (updateFields[field] !== undefined) {
        transaction[field] = updateFields[field];
      }
    });

    // Calculate the difference in amount if amount is provided
    let amountDifference = 0;
    if (updateFields.amount !== undefined) {
      amountDifference = parseFloat(updateFields.amount) - transaction.amount;
      transaction.amount = parseFloat(updateFields.amount);
    }

    // Handle approved transactions
    if (transaction.status === "Approved") {
      if (transaction.type === "Received") {
        customerAccount.receivedAmount += amountDifference;
        staffAccount.balance += amountDifference;
        staffAccount.totalReceivedAmount += amountDifference;
      } else {
        // "Sent"
        customerAccount.returnAmount += amountDifference;
        staffAccount.balance -= amountDifference;
        staffAccount.totalSentAmount += amountDifference;
      }
    }
    // Handle pending transactions
    else if (transaction.status === "Pending") {
      if (transaction.type === "Received") {
        customerAccount.pendingReceivedAmount += amountDifference;
        staffAccount.pendingReceivedAmount += amountDifference;
      } else {
        // "Sent"
        customerAccount.pendingReturnAmount += amountDifference;
        staffAccount.pendingSentAmount += amountDifference;
      }
    }

    // Update customer payment status
    if (transaction.type === "Received") {
      if (
        customerAccount.receivedAmount +
          customerAccount.pendingReceivedAmount >=
        customerAccount.totalAmount
      ) {
        customerAccount.cosPaymentStatus = "Fully Paid";
      } else {
        customerAccount.cosPaymentStatus = "Partially Paid";
      }
    } else {
      if (
        customerAccount.receivedAmount +
          customerAccount.pendingReceivedAmount ===
        0
      ) {
        customerAccount.cosPaymentStatus = "Fully Refunded";
      } else {
        customerAccount.cosPaymentStatus = "Partially Refunded";
      }
    }

    // Regenerate invoice
    const maid = await Maid.findById(customerAccount.maid).session(session);
    const actionStaff = await StaffAccount.findById(
      transaction.actionBy
    ).session(session);
    const invoiceData = await generateInvoice(
      transaction.type === "Received" ? "Edit Payment" : "Edit Refund",
      maid,
      customerAccount,
      transaction,
      actionStaff,
      staffAccount
    );
    transaction.invoice = {
      number: invoiceData.invoiceNumber,
      path: invoiceData.pdfFilePath,
    };

    // Save all changes
    await Promise.all([
      transaction.save({ session }),
      customerAccount.save({ session }),
      staffAccount.save({ session }),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      message: "Transaction edited successfully",
      transaction,
      customerAccount,
      staffAccount,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in editTransaction:", error);
    res.status(500).json({
      error: "An error occurred while editing the transaction",
    });
  } finally {
    session.endSession();
  }
};
