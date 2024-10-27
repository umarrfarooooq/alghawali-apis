const CustomerAccount = require("../Models/Cos.Accounts");
const CustomerAccountV2 = require("../Models/Customer-Account-v2");
const Staff = require("../Models/Staff");
const Transaction = require("../Models/Transaction");
const StaffAccount = require("../Models/staffAccounts");
const roles = require("../config/roles");
const moment = require("moment");
const mongoose = require("mongoose");

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

exports.addStaffAccount = async (req, res) => {
  try {
    const { staffName } = req.body;

    const staffCode = generateUniqueCode();

    const existingStaffAccount = await StaffAccount.findOne({
      staffName: staffName,
    });

    if (existingStaffAccount)
      return res.status(400).json({ error: "Staff account already exists" });

    const newStaffAccount = new StaffAccount({ staffName, staffCode });
    const savedStaffAccount = await newStaffAccount.save();

    res.status(201).json(savedStaffAccount);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the staff account" });
  }
};

exports.createStaffAccount = async (req, res) => {
  try {
    const { staffId } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    if (
      !staff.roles.includes(roles.canAccessOnAccounts) &&
      !staff.roles.includes(roles.fullAccessOnAccounts)
    ) {
      return res.status(403).json({
        error: "Staff does not have the required role to access accounts",
      });
    }

    const existingAccount = await StaffAccount.findOne({
      staffId: staff.staffId,
    });
    if (existingAccount) {
      if (!staff.staffAccountId) {
        staff.staffAccountId = existingAccount._id;
        await staff.save();
        return res.status(200).json({
          message: "Staff account ID updated successfully",
          staffAccount: existingAccount,
        });
      }
      return res.status(400).json({
        error: "A staff account already exists for this staff member",
      });
    }

    const newStaffAccount = new StaffAccount({
      staff: staffId,
      staffName: staff.fullName,
      staffCode: staff.staffCode,
      staffRoles: staff.roles,
      staffId: staff.staffId,
    });

    await newStaffAccount.save();

    staff.staffAccountId = newStaffAccount._id;
    await staff.save();

    res.status(201).json({
      message: "Staff account created successfully",
      staffAccount: newStaffAccount,
    });
  } catch (error) {
    console.error("Error in createStaffAccount:", error);
    res.status(400).json({
      error:
        error.message || "An error occurred while creating the staff account",
    });
  }
};

exports.getAllAccounts = async (req, res) => {
  try {
    const allAccounts = await StaffAccount.find();
    res.status(200).json(allAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.getAllAccountNames = async (req, res) => {
  try {
    const allAccounts = await StaffAccount.find({}, "staffName");
    const staffNames = allAccounts.map((account) => account.staffName);
    res.status(200).json(staffNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.getAllAccountNamesAndId = async (req, res) => {
  try {
    const allAccounts = await StaffAccount.find({}, "staffName _id");
    const staffData = allAccounts.map((account) => ({
      id: account._id.toString(),
      name: account.staffName,
    }));
    res.status(200).json(staffData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllValidStaffForAccount = async (req, res) => {
  try {
    const validStaff = await Staff.find(
      {
        $or: [
          { roles: roles.canAccessOnAccounts },
          { roles: roles.fullAccessOnAccounts },
        ],
        staffAccountId: { $exists: false },
      },
      "fullName _id"
    );

    const staffData = validStaff.map((staff) => ({
      id: staff._id.toString(),
      staffName: staff.fullName,
    }));

    res.status(200).json(staffData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllPendingApprovals = async (req, res) => {
  try {
    const staffAccounts = await StaffAccount.find({
      pendingApprovals: { $exists: true, $not: { $size: 0 } },
    });

    const pendingApprovals = staffAccounts.reduce((approvals, account) => {
      return approvals.concat(account.pendingApprovals);
    }, []);

    res.status(200).json(pendingApprovals);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching pending approvals" });
  }
};

exports.getAccountById = async (req, res) => {
  try {
    const staffId = req.params.staffId;

    const accountOfStaffId = await StaffAccount.findOne({ staffId });

    if (!accountOfStaffId) {
      return res.status(404).json({ error: "Account not found for Staff ID" });
    }

    res.status(200).json(accountOfStaffId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAccountDetailsById = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const { period, startDate, endDate } = req.query;

    const accountOfStaffId = await StaffAccount.findOne({ staffId });
    if (!accountOfStaffId) {
      return res.status(404).json({ error: "Account not found for Staff ID" });
    }

    const {
      balance,
      totalReceivedAmount,
      pendingReceivedAmount,
      totalSentAmount,
      pendingSentAmount,
      accountHistory,
    } = accountOfStaffId;

    let filteredHistory = accountHistory;
    let start, end;

    if (period || (startDate && endDate)) {
      if (startDate && endDate) {
        start = moment(startDate);
        end = moment(endDate);
      } else {
        switch (period.toLowerCase()) {
          case "daily":
            start = moment().startOf("day");
            end = moment().endOf("day");
            break;
          case "weekly":
            start = moment().startOf("week");
            end = moment().endOf("week");
            break;
          case "monthly":
            start = moment().startOf("month");
            end = moment().endOf("month");
            break;
          case "yearly":
            start = moment().startOf("year");
            end = moment().endOf("year");
            break;
          default:
            start = moment().startOf("day");
            end = moment().endOf("day");
        }
      }

      filteredHistory = accountHistory.filter((entry) => {
        const entryDate = moment(entry.timestamp);
        return entryDate.isBetween(start, end, null, "[]");
      });
    }

    res.status(200).json({
      balance,
      totalReceivedAmount,
      totalSentAmount,
      pendingReceivedAmount,
      pendingSentAmount,
      accountHistory: filteredHistory,
      filterParams: {
        period: period || "all",
        startDate: start ? start.format("YYYY-MM-DD") : null,
        endDate: end ? end.format("YYYY-MM-DD") : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

// exports.transferAmount = async (req, res) => {
//   try {
//     const { senderId, receiverId, amount, paymentMethod } = req.body;
//     const selectedBank = req.body.selectedBank;
//     let paySlip;
//     const senderAccount = await StaffAccount.findOne({ staffId: senderId });
//     if (!senderAccount) {
//       return res.status(404).json({ error: "Sender account not found" });
//     }

//     const receiverAccount = await StaffAccount.findOne({
//       staffCode: receiverId,
//     });
//     if (!receiverAccount) {
//       return res.status(404).json({ error: "Receiver account not found" });
//     }

//     if (senderAccount.balance < amount) {
//       return res.status(400).json({ error: "Insufficient Balance" });
//     }

//     if (req.file) {
//       paySlip = req.file.path;
//     }

//     if (!paySlip) {
//       return res
//         .status(400)
//         .json({ error: "Cannot proceed without payment proof" });
//     }

//     senderAccount.balance -= parseFloat(amount);
//     senderAccount.totalSentAmount += parseFloat(amount);

//     receiverAccount.balance += parseFloat(amount);
//     receiverAccount.totalReceivedAmount += parseFloat(amount);

//     const senderTransaction = {
//       amount: parseFloat(amount),
//       paymentMethod: selectedBank
//         ? `${paymentMethod} (${selectedBank})`
//         : paymentMethod,
//       transferTo: receiverAccount.staffName,
//       type: "Sent",
//       proof: paySlip,
//     };

//     const receiverTransaction = {
//       amount: parseFloat(amount),
//       paymentMethod: selectedBank
//         ? `${paymentMethod} (${selectedBank})`
//         : paymentMethod,
//       receivedFrom: senderAccount.staffName,
//       type: "Received",
//       proof: paySlip,
//     };

//     senderAccount.transferHistory.push(senderTransaction);
//     receiverAccount.transferHistory.push(receiverTransaction);

//     await senderAccount.save();
//     await receiverAccount.save();

//     res.status(200).json({ message: "Amount transferred successfully" });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ error: "An error occurred while transferring amount" });
//   }
// };

exports.transferAmount = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const {
        receiverId,
        amount,
        date,
        paymentMethod,
        selectedBank,
        description,
      } = req.body;
      const senderId = req.staffAccountId;
      let paySlip;

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount");
      }

      if (!paymentMethod) {
        throw new Error("Payment method is required");
      }
      if (!date) {
        throw new Error("Date is required");
      }

      if (paymentMethod.toLowerCase() === "bank transfer" && !selectedBank) {
        throw new Error("Selected bank is required for bank transfers");
      }

      if (senderId === receiverId) {
        throw new Error("You cannot transfer to yourself");
      }

      const senderAccount = await StaffAccount.findById(senderId).session(
        session
      );
      if (!senderAccount) {
        throw new Error("Sender account not found");
      }

      const receiverAccount = await StaffAccount.findById(receiverId).session(
        session
      );
      if (!receiverAccount) {
        throw new Error("Receiver account not found");
      }

      const senderReceivedAmount =
        senderAccount.receivedAmount + senderAccount.pendingReceivedAmount;
      const senderSentAmount =
        senderAccount.sentAmount + senderAccount.pendingSentAmount;

      if (senderReceivedAmount - senderSentAmount < amount) {
        throw new Error("Insufficient Balance");
      }

      if (
        req.staffRoles &&
        !req.staffRoles.includes(roles.fullAccessOnAccounts) &&
        !req.file
      ) {
        throw new Error("Cannot proceed without payment proof");
      }

      if (req.file) {
        paySlip = req.file.path;
      }

      const parsedAmount = parseFloat(amount);
      const needsApproval = !req.staffRoles.includes(
        roles.fullAccessOnAccounts
      );
      const transferId = new mongoose.Types.ObjectId();
      const transactionData = {
        customer: null,
        amount: parsedAmount,
        paymentMethod: selectedBank
          ? `${paymentMethod} (${selectedBank})`
          : paymentMethod,
        date: date,
        actionBy: senderId,
        receivedBy: receiverAccount._id,
        sendedBy: senderAccount._id,
        proof: paySlip,
        staffTransfer: true,
        status: needsApproval ? "Pending" : "Approved",
        transferId: transferId,
        description:
          description ||
          `Transfer between ${senderAccount.staffName} and ${receiverAccount.staffName}`,
      };

      const senderTransaction = new Transaction({
        ...transactionData,
        type: "Sent",
      });

      const receiverTransaction = new Transaction({
        ...transactionData,
        type: "Received",
      });

      await senderTransaction.save({ session });
      await receiverTransaction.save({ session });

      if (!needsApproval) {
        senderAccount.balance -= parsedAmount;
        senderAccount.totalSentAmount += parsedAmount;
        receiverAccount.balance += parsedAmount;
        receiverAccount.totalReceivedAmount += parsedAmount;
      } else {
        senderAccount.pendingSentAmount += parsedAmount;
        receiverAccount.pendingReceivedAmount += parsedAmount;
      }

      senderAccount.transactions.push(senderTransaction._id);
      receiverAccount.transactions.push(receiverTransaction._id);

      await senderAccount.save({ session });
      await receiverAccount.save({ session });

      return {
        senderTransactionId: senderTransaction._id,
        receiverTransactionId: receiverTransaction._id,
        needsApproval,
      };
    });

    if (result) {
      const message = result.needsApproval
        ? "Transfer request submitted for approval"
        : "Amount transferred successfully";
      res.status(200).json({
        message,
        senderTransactionId: result.senderTransactionId,
        receiverTransactionId: result.receiverTransactionId,
        needsApproval: result.needsApproval,
      });
    } else {
      res.status(500).json({ error: "Transaction failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({
      error: error.message || "An error occurred while transferring amount",
    });
  } finally {
    session.endSession();
  }
};

exports.debitAmount = async (req, res) => {
  try {
    const { staffId, debitAmount, paymentMethod, sendedTo } = req.body;
    const staffAccount = await StaffAccount.findOne({ staffId });
    const selectedBank = req.body.selectedBank;
    let paySlip;
    if (!staffAccount) {
      return res.status(404).json({ error: "Staff account not found" });
    }

    if (staffAccount.balance < parseFloat(debitAmount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    if (req.file) {
      paySlip = req.file.path;
    }

    if (!paySlip) {
      return res
        .status(400)
        .json({ error: "Cannot proceed without payment proof" });
    }

    const debitTransaction = {
      amount: debitAmount,
      paymentMethod: selectedBank
        ? `${paymentMethod} (${selectedBank})`
        : paymentMethod,
      type: "Sent",
      proof: paySlip,
      sendedTo,
      approved: false,
    };

    if (req.staffRoles && req.staffRoles.includes(roles.fullAccessOnAccounts)) {
      staffAccount.balance -= parseFloat(debitAmount);
      staffAccount.totalSentAmount += parseFloat(debitAmount);
      debitTransaction.approved = true;
    }

    if (debitTransaction.approved) {
      staffAccount.accountHistory.push(debitTransaction);
    } else {
      staffAccount.pendingApprovals.push(debitTransaction);
    }
    await staffAccount.save();

    if (debitTransaction.approved) {
      return res
        .status(200)
        .json({ message: "Debit amount updated successfully" });
    } else {
      return res
        .status(200)
        .json({ message: "Debit request sent for approval" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while debiting amount" });
  }
};

exports.processPaymentRequest = async (req, res) => {
  try {
    const { requestId, approved } = req.body;

    const staffAccount = await StaffAccount.findOne({
      "pendingApprovals._id": requestId,
    });
    const customerAccount = await CustomerAccount.findOne({
      "accountHistory.pendingStaffId": requestId,
    });

    if (!staffAccount) {
      return res.status(404).json({ error: "Pending approval not found" });
    }

    const pendingApproval = staffAccount.pendingApprovals.id(requestId);
    if (!pendingApproval) {
      return res.status(404).json({ error: "Pending approval not found" });
    }
    const { amount, paymentMethod, receivedFrom, type, proof, sendedTo } =
      pendingApproval;
    if (approved) {
      if (type === "Received") {
        staffAccount.balance += amount;
        staffAccount.totalReceivedAmount += amount;
        staffAccount.accountHistory.push({
          amount,
          paymentMethod,
          receivedFrom,
          type,
          proof,
          approved,
          timestamp: Date.now(),
        });
      } else if (type === "Sent") {
        staffAccount.balance -= amount;
        staffAccount.totalSentAmount += amount;
        staffAccount.accountHistory.push({
          amount,
          paymentMethod,
          sendedTo: sendedTo,
          type,
          proof,
          approved,
          timestamp: Date.now(),
        });
      }
    }

    staffAccount.pendingApprovals.remove(pendingApproval);
    await staffAccount.save();
    if (customerAccount) {
      const historyToUpdate = customerAccount.accountHistory.find(
        (history) => history.pendingStaffId === requestId
      );
      if (historyToUpdate) {
        historyToUpdate.approved = true;
        if (type === "Received") {
          if (approved) {
            customerAccount.receivedAmount += amount;
            if (
              customerAccount.receivedAmount >= customerAccount.returnAmount
            ) {
              customerAccount.cosPaymentStatus = "Fully Paid";
            }
          }
        } else if (type === "Sent") {
          if (approved) {
            customerAccount.returnAmount += amount;
            if (
              customerAccount.receivedAmount >= customerAccount.returnAmount
            ) {
              customerAccount.cosPaymentStatus = "Fully Paid";
            }
          }
        }
        await customerAccount.save();
      } else {
        return res
          .status(404)
          .json({ error: "History not found in customer account" });
      }
    }

    res.status(200).json({ message: "Payment request processed successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing payment request" });
  }
};

exports.declinePaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    const staffAccount = await StaffAccount.findOne({
      "pendingApprovals._id": requestId,
    });
    const customerAccount = await CustomerAccount.findOne({
      "accountHistory.pendingStaffId": requestId,
    });

    if (!staffAccount) {
      return res.status(404).json({ error: "Pending approval not found" });
    }

    const pendingApproval = staffAccount.pendingApprovals.id(requestId);
    if (!pendingApproval) {
      return res.status(404).json({ error: "Pending approval not found" });
    }

    staffAccount.pendingApprovals.remove(pendingApproval);
    await staffAccount.save();

    if (customerAccount) {
      const historyToUpdate = customerAccount.accountHistory.find(
        (history) => history.pendingStaffId === requestId
      );
      if (historyToUpdate) {
        historyToUpdate.approved = false;
        await customerAccount.save();
      } else {
        return res
          .status(404)
          .json({ error: "History not found in customer account" });
      }
    }

    res.status(200).json({ message: "Payment request declined successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while declining payment request" });
  }
};

exports.editPendingPayment = async (req, res) => {
  try {
    const { pendingApprovalId } = req.body;

    const staffAccount = await StaffAccount.findOne({
      "pendingApprovals._id": pendingApprovalId,
    });

    if (!staffAccount) {
      return res.status(404).json({ error: "Pending approval not found" });
    }

    const pendingApproval = staffAccount.pendingApprovals.id(pendingApprovalId);

    if (!pendingApproval) {
      return res.status(404).json({ error: "Pending approval not found" });
    }

    let updatedDetails = req.body.updatedDetails || {};

    if (req.file) {
      updatedDetails.proof = req.file.path;
    }

    const editableFields = [
      "amount",
      "receivedBy",
      "paymentMethod",
      "sendedBy",
      "proof",
    ];

    editableFields.forEach((field) => {
      if (field in req.body) {
        pendingApproval[field] = req.body[field];
      } else if (field in updatedDetails) {
        pendingApproval[field] = updatedDetails[field];
      }
    });

    pendingApproval.timestamp = Date.now();

    const customerAccount = await CustomerAccount.findOne({
      "accountHistory.pendingStaffId": pendingApprovalId,
    });

    let historyToUpdate;
    if (customerAccount) {
      historyToUpdate = customerAccount.accountHistory.find(
        (history) => history.pendingStaffId === pendingApprovalId
      );
      if (historyToUpdate) {
        if ("amount" in req.body || "amount" in updatedDetails) {
          if (historyToUpdate.receivedAmount !== undefined) {
            historyToUpdate.receivedAmount =
              req.body.amount || updatedDetails.amount;
          } else if (historyToUpdate.returnAmount !== undefined) {
            historyToUpdate.returnAmount =
              req.body.amount || updatedDetails.amount;
          }
        }
        if ("receivedBy" in req.body || "receivedBy" in updatedDetails) {
          historyToUpdate.receivedBy =
            req.body.receivedBy || updatedDetails.receivedBy;
        }
        if ("sendedBy" in req.body || "sendedBy" in updatedDetails) {
          historyToUpdate.sendedBy =
            req.body.sendedBy || updatedDetails.sendedBy;
        }
        if ("paymentMethod" in req.body || "paymentMethod" in updatedDetails) {
          historyToUpdate.paymentMethod =
            req.body.paymentMethod || updatedDetails.paymentMethod;
        }
        if ("date" in req.body || "date" in updatedDetails) {
          historyToUpdate.date = req.body.date || updatedDetails.date;
        }
        if ("proof" in req.body || "proof" in updatedDetails) {
          historyToUpdate.paymentProof = req.body.proof || updatedDetails.proof;
        }

        historyToUpdate.timestamp = Date.now();
      }
      await customerAccount.save();
    }

    await staffAccount.save();

    res.status(200).json({
      message: "Pending payment updated successfully",
      updatedPendingApproval: pendingApproval,
      updatedCustomerHistory: customerAccount ? historyToUpdate : null,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while editing the pending payment" });
  }
};

exports.getAllAccountsSummary = async (req, res) => {
  try {
    const allAccounts = await StaffAccount.find();

    const accountSummaries = allAccounts.map((account) => {
      const totalReceivedAmount = account.totalReceivedAmount || 0;
      const totalSentAmount = account.totalSentAmount || 0;
      const balance = account.balance || 0;

      const paymentBreakdown = account.accountHistory.reduce((acc, history) => {
        let paymentMethod = history.paymentMethod || "Unknown";

        // Consolidate bank transfers under a single category
        if (paymentMethod.includes("Bank Transfer")) {
          paymentMethod = "Bank Transfer";
        }

        if (!acc[paymentMethod]) {
          acc[paymentMethod] = 0;
        }

        acc[paymentMethod] += history.amount || 0;

        return acc;
      }, {});

      const bankDetails = account.accountHistory.reduce((acc, history) => {
        const paymentMethod = history.paymentMethod || "Unknown";

        if (paymentMethod.includes("Bank Transfer")) {
          const bankName = paymentMethod.split("(")[1].replace(")", "").trim();

          if (!acc[bankName]) {
            acc[bankName] = 0;
          }

          acc[bankName] += history.amount || 0;
        }

        return acc;
      }, {});

      // Remove 'Bank Transfer' key from paymentBreakdown if no bank transfer occurred
      if (!Object.keys(bankDetails).length) {
        delete paymentBreakdown["Bank Transfer"];
      }

      const transferDetails = account.transferHistory.reduce((acc, history) => {
        const sender = history.receivedFrom || "Unknown Sender";

        if (!acc[sender]) {
          acc[sender] = 0;
        }

        acc[sender] += history.amount || 0;

        return acc;
      }, {});

      return {
        accountId: account._id,
        totalReceivedAmount,
        totalSentAmount,
        balance,
        paymentBreakdown,
        bankDetails,
        transferDetails,
      };
    });

    res.status(200).json(accountSummaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAccountSummary = async (req, res) => {
  try {
    const staffId = req.params.staffId;

    const staffAccount = await StaffAccount.findOne({ staffId });

    if (!staffAccount) {
      return res.status(404).json({ error: "Account not found for Staff ID" });
    }

    const received = {
      Cash: 0,
      Cheque: 0,
      Bank: {
        totalAmount: 0,
        details: {},
      },
    };
    const sent = {
      Cash: 0,
      Cheque: 0,
      Bank: {
        totalAmount: 0,
        details: {},
      },
    };

    staffAccount.accountHistory.forEach((transaction) => {
      if (transaction.type === "Received") {
        if (transaction.paymentMethod === "Cash") {
          received.Cash += transaction.amount;
        } else if (transaction.paymentMethod.includes("Cheque")) {
          received.Cheque += transaction.amount;
        } else if (transaction.paymentMethod.includes("Bank Transfer")) {
          const bankName = transaction.paymentMethod
            .split("(")[1]
            .split(")")[0];
          received.Bank.totalAmount += transaction.amount;
          if (!received.Bank.details[bankName]) {
            received.Bank.details[bankName] = 0;
          }
          received.Bank.details[bankName] += transaction.amount;
        }
      } else if (transaction.type === "Sent") {
        if (transaction.paymentMethod.includes("Cash")) {
          sent.Cash += transaction.amount;
        } else if (transaction.paymentMethod.includes("Cheque")) {
          sent.Cheque += transaction.amount;
        } else if (transaction.paymentMethod.includes("Bank Transfer")) {
          const bankName = transaction.paymentMethod
            .split("(")[1]
            .split(")")[0];
          sent.Bank.totalAmount += transaction.amount;
          if (!sent.Bank.details[bankName]) {
            sent.Bank.details[bankName] = 0;
          }
          sent.Bank.details[bankName] += transaction.amount;

          if (!received.Bank.details[bankName]) {
            received.Bank.details[bankName] = 0;
          }
        }
      }
    });

    staffAccount.transferHistory.forEach((transaction) => {
      if (transaction.type === "Received") {
        if (transaction.paymentMethod === "Cash") {
          received.Cash += transaction.amount;
        } else if (transaction.paymentMethod.includes("Cheque")) {
          received.Cheque += transaction.amount;
        } else if (transaction.paymentMethod.includes("Bank Transfer")) {
          const bankName = transaction.paymentMethod
            .split("(")[1]
            .split(")")[0];
          received.Bank.totalAmount += transaction.amount;
          if (!received.Bank.details[bankName]) {
            received.Bank.details[bankName] = 0;
          }
          received.Bank.details[bankName] += transaction.amount;
        }
      } else if (transaction.type === "Sent") {
        if (transaction.paymentMethod.includes("Cash")) {
          sent.Cash += transaction.amount;
        } else if (transaction.paymentMethod.includes("Cheque")) {
          sent.Cheque += transaction.amount;
        } else if (transaction.paymentMethod.includes("Bank Transfer")) {
          const bankName = transaction.paymentMethod
            .split("(")[1]
            .split(")")[0];
          sent.Bank.totalAmount += transaction.amount;
          if (!sent.Bank.details[bankName]) {
            sent.Bank.details[bankName] = 0;
          }
          sent.Bank.details[bankName] += transaction.amount;

          if (!received.Bank.details[bankName]) {
            received.Bank.details[bankName] = 0;
          }
        }
      }
    });

    const remainingBankDetails = {};
    Object.keys(received.Bank.details).forEach((bankName) => {
      const receivedAmount = received.Bank.details[bankName] || 0;
      const sentAmount = sent.Bank.details[bankName] || 0;
      remainingBankDetails[bankName] = receivedAmount - sentAmount;
    });

    const remaining = {
      Cash: received.Cash - sent.Cash,
      Cheque: received.Cheque - sent.Cheque,
      Bank: {
        totalAmount: received.Bank.totalAmount - sent.Bank.totalAmount,
        details: remainingBankDetails,
      },
    };

    const totalBalance = staffAccount.balance;

    const summary = {
      staffId: staffAccount.staffId,
      staffName: staffAccount.staffName,
      received,
      sent,
      remaining,
      totalBalance,
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAccountsSummaryByStaffId = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const staffAccount = await StaffAccount.findOne({ staffId });

    if (!staffAccount) {
      return res.status(404).json({ error: "Staff account not found" });
    }

    let accountSummary = {
      staffName: staffAccount.staffName,
      staffCode: staffAccount.staffCode,
      balance: staffAccount.balance || 0,
      totalReceivedAmount: 0,
      totalSentAmount: 0,
      transferAmount: 0,
      transferHistory: [],
      accountHistorySummary: {
        received: {
          total: 0,
          cash: 0,
          cheque: 0,
          bankTransfer: 0,
          bankDetails: {},
        },
        sent: {
          total: 0,
          cash: 0,
          cheque: 0,
          bankTransfer: 0,
          bankDetails: {},
        },
      },
    };

    staffAccount.accountHistory.forEach((history) => {
      if (history.type === "Received") {
        accountSummary.totalReceivedAmount += history.amount || 0;
        accountSummary.accountHistorySummary.received.total +=
          history.amount || 0;

        if (history.paymentMethod === "Cash") {
          accountSummary.accountHistorySummary.received.cash +=
            history.amount || 0;
        } else if (history.paymentMethod === "Cheque") {
          accountSummary.accountHistorySummary.received.cheque +=
            history.amount || 0;
        } else if (
          typeof history.paymentMethod === "string" &&
          history.paymentMethod.includes("Bank Transfer")
        ) {
          const bankNameMatch = history.paymentMethod.match(/\(([^)]+)\)/);
          const bankName = bankNameMatch ? bankNameMatch[1] : "Unknown Bank";
          accountSummary.accountHistorySummary.received.bankTransfer +=
            history.amount || 0;
          accountSummary.accountHistorySummary.received.bankDetails[bankName] =
            (accountSummary.accountHistorySummary.received.bankDetails[
              bankName
            ] || 0) + (history.amount || 0);
        }
      } else if (history.type === "Sent") {
        accountSummary.totalSentAmount += history.amount || 0;
        accountSummary.accountHistorySummary.sent.total += history.amount || 0;

        if (history.paymentMethod === "Cash") {
          accountSummary.accountHistorySummary.sent.cash += history.amount || 0;
        } else if (history.paymentMethod === "Cheque") {
          accountSummary.accountHistorySummary.sent.cheque +=
            history.amount || 0;
        } else if (
          typeof history.paymentMethod === "string" &&
          history.paymentMethod.includes("Bank Transfer")
        ) {
          const bankNameMatch = history.paymentMethod.match(/\(([^)]+)\)/);
          const bankName = bankNameMatch ? bankNameMatch[1] : "Unknown Bank";
          accountSummary.accountHistorySummary.sent.bankTransfer +=
            history.amount || 0;
          accountSummary.accountHistorySummary.sent.bankDetails[bankName] =
            (accountSummary.accountHistorySummary.sent.bankDetails[bankName] ||
              0) + (history.amount || 0);
        }
      }
    });

    res.status(200).json(accountSummary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllAccountSummary = async (req, res) => {
  try {
    const allStaffAccounts = await StaffAccount.find();

    let totalReceived = 0;
    let totalSent = 0;
    let totalBalance = 0;

    allStaffAccounts.forEach((account) => {
      totalReceived += account.totalReceivedAmount;
      totalSent += account.totalSentAmount;
      totalBalance += account.balance;
    });

    const summary = {
      totalReceived,
      totalSent,
      totalBalance,
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllAccountSummaryWithFilters = async (req, res) => {
  try {
    const period = (req.query.period || "").toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let dateFilter = {};

    if (startDate && endDate) {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          error: "Invalid date format. Please use YYYY-MM-DD format.",
        });
      }

      dateFilter = {
        date: {
          $gte: parsedStartDate,
          $lte: parsedEndDate,
        },
      };
    } else if (period) {
      const now = new Date();
      let periodStartDate;
      switch (period) {
        case "weekly":
          periodStartDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "monthly":
          periodStartDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "yearly":
          periodStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          return res.status(400).json({
            error: "Invalid period. Use 'weekly', 'monthly', or 'yearly'.",
          });
      }
      dateFilter = { $gte: periodStartDate };
    }

    const allStaffAccounts = await StaffAccount.find();

    let totalReceived = 0;
    let totalSent = 0;
    let totalBalance = 0;
    let totalTillNowReceived = 0;
    let totalTillNowSent = 0;
    let totalPendingReceived = 0;
    let totalPendingSent = 0;
    let totalPendingReceivedTillNow = 0;
    let totalPendingSentTillNow = 0;

    allStaffAccounts.forEach((account) => {
      const allTransactions = [
        ...account.accountHistory,
        ...account.pendingApprovals,
      ];

      allTransactions.forEach((transaction) => {
        const isWithinFilter =
          !dateFilter.$gte ||
          (transaction.date >= dateFilter.$gte &&
            (!dateFilter.$lte || transaction.date <= dateFilter.$lte));

        if (transaction.type === "Received") {
          if (transaction.approved) {
            totalTillNowReceived += transaction.amount;
            if (isWithinFilter) totalReceived += transaction.amount;
          } else {
            totalPendingReceivedTillNow += transaction.amount;
            if (isWithinFilter) totalPendingReceived += transaction.amount;
          }
        } else if (transaction.type === "Sent") {
          if (transaction.approved) {
            totalTillNowSent += transaction.amount;
            if (isWithinFilter) totalSent += transaction.amount;
          } else {
            totalPendingSentTillNow += transaction.amount;
            if (isWithinFilter) totalPendingSent += transaction.amount;
          }
        }
      });
    });

    totalBalance = totalReceived - totalSent;

    const allCustomerAccounts = await CustomerAccountV2.find();
    let totalVisaChangeAmount = 0;
    let totalUniformAmount = 0;
    let totalVisaChangeAmountTillNow = 0;
    let totalUniformAmountTillNow = 0;

    allCustomerAccounts.forEach((customer) => {
      totalVisaChangeAmountTillNow += customer.visaChangeAmount;
      totalUniformAmountTillNow += customer.uniformAmount;

      if (
        !dateFilter.$gte ||
        (customer.timestamp >= dateFilter.$gte &&
          (!dateFilter.$lte || customer.timestamp <= dateFilter.$lte))
      ) {
        totalVisaChangeAmount += customer.visaChangeAmount;
        totalUniformAmount += customer.uniformAmount;
      }
    });

    const summary = {
      totalReceived,
      totalSent,
      totalBalance,
      totalVisaChangeAmount,
      totalUniformAmount,
      totalTillNowReceived,
      totalTillNowSent,
      totalVisaChangeAmountTillNow,
      totalUniformAmountTillNow,
      totalPendingReceived,
      totalPendingSent,
      totalPendingReceivedTillNow,
      totalPendingSentTillNow,
      period: period || "custom",
      startDate:
        startDate || (dateFilter.$gte ? dateFilter.$gte.toISOString() : null),
      endDate: endDate || new Date().toISOString(),
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllAccountsTransactionHistory = async (req, res) => {
  try {
    const period = (req.query.period || "").toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let dateFilter = {};
    let customerDateFilter = {};

    if (startDate && endDate) {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          error: "Invalid date format. Please use YYYY-MM-DD format.",
        });
      }

      dateFilter = {
        date: {
          $gte: parsedStartDate,
          $lte: parsedEndDate,
        },
      };
      customerDateFilter = {
        hiringDate: {
          $gte: parsedStartDate,
          $lte: parsedEndDate,
        },
      };
    } else if (period) {
      const now = new Date();
      let periodStartDate;
      switch (period) {
        case "weekly":
          periodStartDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "monthly":
          periodStartDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "yearly":
          periodStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          return res.status(400).json({
            error: "Invalid period. Use 'weekly', 'monthly', or 'yearly'.",
          });
      }
      dateFilter = { date: { $gte: periodStartDate } };
      customerDateFilter = { hiringDate: { $gte: periodStartDate } };
    }

    // Fetch all transactions for total till now calculations
    const allTransactions = await Transaction.find();

    // Fetch transactions within the date filter
    const filteredTransactions = await Transaction.find(dateFilter)
      .populate("customer")
      .populate("actionBy")
      .populate("receivedBy")
      .populate("sendedBy");

    const allCustomerAccounts = await CustomerAccountV2.find();

    const filteredCustomerAccounts = await CustomerAccountV2.find(
      customerDateFilter
    );

    let totalReceived = 0;
    let totalSent = 0;
    let totalBalance = 0;
    let totalPendingReceived = 0;
    let totalPendingSent = 0;
    let totalTillNowReceived = 0;
    let totalTillNowSent = 0;
    let totalPendingReceivedTillNow = 0;
    let totalPendingSentTillNow = 0;

    let serviceTotals = {
      a2aFullPackage: 0,
      medical: 0,
      a2aTicket: 0,
      visaChange: 0,
      uniform: 0,
      other: 0,
    };

    let serviceTotalsAllTime = { ...serviceTotals };

    filteredCustomerAccounts.forEach((account) => {
      Object.keys(serviceTotals).forEach((service) => {
        if (service === "other") {
          serviceTotals.other += account.services.other.reduce(
            (sum, item) => sum + item.amount,
            0
          );
        } else {
          serviceTotals[service] += account.services[service] || 0;
        }
      });
    });

    allCustomerAccounts.forEach((account) => {
      Object.keys(serviceTotalsAllTime).forEach((service) => {
        if (service === "other") {
          serviceTotalsAllTime.other += account.services.other.reduce(
            (sum, item) => sum + item.amount,
            0
          );
        } else {
          serviceTotalsAllTime[service] += account.services[service] || 0;
        }
      });
    });

    // Calculate totals for all transactions (till now)
    allTransactions.forEach((transaction) => {
      if (transaction.type === "Received") {
        if (transaction.status === "Approved") {
          totalTillNowReceived += transaction.amount;
        } else if (transaction.status === "Pending") {
          totalPendingReceivedTillNow += transaction.amount;
        }
      } else if (transaction.type === "Sent") {
        if (transaction.status === "Approved") {
          totalTillNowSent += transaction.amount;
        } else if (transaction.status === "Pending") {
          totalPendingSentTillNow += transaction.amount;
        }
      }
    });

    // Calculate totals for filtered transactions
    filteredTransactions.forEach((transaction) => {
      if (transaction.type === "Received") {
        if (transaction.status === "Approved") {
          totalReceived += transaction.amount;
        } else if (transaction.status === "Pending") {
          totalPendingReceived += transaction.amount;
        }
      } else if (transaction.type === "Sent") {
        if (transaction.status === "Approved") {
          totalSent += transaction.amount;
        } else if (transaction.status === "Pending") {
          totalPendingSent += transaction.amount;
        }
      }
    });

    totalBalance = totalReceived - totalSent;

    const summary = {
      totalReceived,
      totalSent,
      totalBalance,
      totalPendingReceived,
      totalPendingSent,
      totalTillNowReceived,
      totalTillNowSent,
      totalPendingReceivedTillNow,
      totalPendingSentTillNow,
      serviceTotals,
      serviceTotalsAllTime,
      period: period || "custom",
      startDate:
        startDate ||
        (dateFilter.date?.$gte ? dateFilter.date.$gte.toISOString() : null),
      endDate: endDate || new Date().toISOString(),
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
};
exports.resetAmounts = async (req, res) => {
  try {
    await StaffAccount.updateMany(
      {},
      {
        $set: {
          balance: 0,
          totalReceivedAmount: 0,
          totalSentAmount: 0,
          transferHistory: [],
          accountHistory: [],
          pendingApprovals: [],
        },
      }
    );

    res.status(200).json({ message: "Amounts reset successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while resetting amounts" });
  }
};
exports.removeAllPendingRequests = async (req, res) => {
  try {
    await StaffAccount.updateMany({}, { $set: { pendingApprovals: [] } });

    res.status(200).json({ message: "Pending requests removed successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while removing pending requests" });
  }
};
