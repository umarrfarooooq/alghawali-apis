const { default: mongoose } = require("mongoose");
const Transaction = require("../Models/Transaction");
const StaffAccount = require("../Models/staffAccounts");

const populateTransaction = () => [
  {
    path: "customer",
    select: "uniqueCode customerName",
  },
  {
    path: "actionBy",
    select: "staffName staffCode",
  },
  {
    path: "receivedBy",
    select: "staffName staffCode",
  },
  {
    path: "sendedBy",
    select: "staffName staffCode",
  },
];

exports.getAllPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: "Pending" }).populate(
      populateTransaction()
    );

    res.status(200).json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching pending transactions", error });
  }
};

exports.getAllRecentTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .sort({ date: -1 })
      .populate(populateTransaction());

    res.status(200).json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching recent transactions", error });
  }
};

exports.getMyAllPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { receivedBy: req.staffAccountId, status: "Pending", type: "Received" },
        { sendedBy: req.staffAccountId, status: "Pending", type: "Sent" },
      ],
    }).populate(populateTransaction());

    res.status(200).json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching your pending transactions", error });
  }
};

exports.getMyAllRecentTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { receivedBy: req.staffAccountId, type: "Received" },
        { sendedBy: req.staffAccountId, type: "Sent" },
      ],
    })
      .sort({ date: -1 })
      .populate(populateTransaction());

    res.status(200).json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching your recent transactions", error });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      populateTransaction()
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transaction", error });
  }
};

exports.getCustomerTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { sortBy = "date", sortOrder = "desc" } = req.query;

    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const transactions = await Transaction.find({ customer: customerId })
      .sort(sortOptions)
      .populate(populateTransaction());

    res.status(200).json({
      transactions: transactions,
      totalTransactions: transactions.length,
    });
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    res.status(500).json({
      error: "An error occurred while fetching customer transactions",
      details: error.message,
    });
  }
};

exports.getStaffTransactions = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { sortBy = "date", sortOrder = "desc" } = req.query;

    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff ID" });
    }
    const transactions = await Transaction.find({
      $or: [
        { actionBy: staffId },
        { receivedBy: staffId, type: "Received" },
        { sendedBy: staffId, type: "Sent" },
      ],
    })
      .sort(sortOptions)
      .populate([
        { path: "customer", select: "customerName uniqueCode" },
        { path: "actionBy", select: "staffName staffCode" },
        { path: "receivedBy", select: "staffName staffCode" },
        { path: "sendedBy", select: "staffName staffCode" },
      ]);

    if (!transactions) {
      return res.status(404).json({ message: "Transactions not found" });
    }

    let totalReceived = 0;
    let totalSent = 0;
    let totalPendingReceived = 0;
    let totalPendingSent = 0;

    transactions.forEach((transaction) => {
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

    res.status(200).json({
      transactions: transactions,
      totalTransactions: transactions.length,
      totalReceived,
      totalSent,
      totalPendingReceived,
      totalPendingSent,
    });
  } catch (error) {
    console.error("Error fetching staff transactions:", error);
    res.status(500).json({
      error: "An error occurred while fetching staff transactions",
      details: error.message,
    });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const staffId = req.staffAccountId;
    const { sortBy = "date", sortOrder = "desc" } = req.query;
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff ID" });
    }
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const transactions = await Transaction.find({
      $or: [
        { actionBy: staffId },
        { receivedBy: staffId, type: "Received" },
        { sendedBy: staffId, type: "Sent" },
      ],
    })
      .sort(sortOptions)
      .populate([
        { path: "customer", select: "customerName uniqueCode" },
        { path: "actionBy", select: "staffName staffCode" },
        { path: "receivedBy", select: "staffName staffCode" },
        { path: "sendedBy", select: "staffName staffCode" },
      ]);
    if (!transactions) {
      return res.status(404).json({ message: "Transactions not found" });
    }
    let totalReceived = 0;
    let totalSent = 0;
    let totalPendingReceived = 0;
    let totalPendingSent = 0;

    transactions.forEach((transaction) => {
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

    res.status(200).json({
      transactions: transactions,
      totalTransactions: transactions.length,
      totalReceived,
      totalSent,
      totalPendingReceived,
      totalPendingSent,
    });
  } catch (error) {
    console.error("Error fetching staff transactions:", error);
    res.status(500).json({
      error: "An error occurred while fetching staff transactions",
      details: error.message,
    });
  }
};

exports.getStaffTransactionsSummary = async (req, res) => {
  try {
    const staffId = req.params.staffId;

    const staffAccount = await StaffAccount.findById(staffId);

    if (!staffAccount) {
      return res.status(404).json({ error: "Account not found for Staff ID" });
    }

    const transactions = await Transaction.find({
      $or: [
        { receivedBy: staffAccount._id, type: "Received" },
        { sendedBy: staffAccount._id, type: "Sent" },
      ],
    }).populate("customer", "customerName uniqueCode");

    const summary = {
      staffId: staffAccount.staffId,
      staffName: staffAccount.staffName,
      received: {
        Cash: 0,
        Cheque: 0,
        Bank: {
          totalAmount: 0,
          details: {},
        },
      },
      sent: {
        Cash: 0,
        Cheque: 0,
        Bank: {
          totalAmount: 0,
          details: {},
        },
      },
      pending: {
        received: 0,
        sent: 0,
      },
      approved: {
        received: 0,
        sent: 0,
      },
      rejected: {
        received: 0,
        sent: 0,
      },
    };

    transactions.forEach((transaction) => {
      const { type, paymentMethod, amount, status } = transaction;

      if (type === "Received") {
        if (status === "Pending") summary.pending.received += amount;
        else if (status === "Approved") summary.approved.received += amount;
        else if (status === "Rejected") summary.rejected.received += amount;

        if (status === "Approved") {
          if (paymentMethod === "Cash") {
            summary.received.Cash += amount;
          } else if (paymentMethod === "Cheque") {
            summary.received.Cheque += amount;
          } else if (paymentMethod.includes("Bank Transfer")) {
            const bankName = paymentMethod.split("(")[1].split(")")[0];
            summary.received.Bank.totalAmount += amount;
            summary.received.Bank.details[bankName] =
              (summary.received.Bank.details[bankName] || 0) + amount;
          }
        }
      } else if (type === "Sent") {
        if (status === "Pending") summary.pending.sent += amount;
        else if (status === "Approved") summary.approved.sent += amount;
        else if (status === "Rejected") summary.rejected.sent += amount;

        if (status === "Approved") {
          if (paymentMethod === "Cash") {
            summary.sent.Cash += amount;
          } else if (paymentMethod === "Cheque") {
            summary.sent.Cheque += amount;
          } else if (paymentMethod.includes("Bank Transfer")) {
            const bankName = paymentMethod.split("(")[1].split(")")[0];
            summary.sent.Bank.totalAmount += amount;
            summary.sent.Bank.details[bankName] =
              (summary.sent.Bank.details[bankName] || 0) + amount;
          }
        }
      }
    });

    // Calculate remaining balances
    summary.remaining = {
      Cash: summary.received.Cash - summary.sent.Cash,
      Cheque: summary.received.Cheque - summary.sent.Cheque,
      Bank: {
        totalAmount:
          summary.received.Bank.totalAmount - summary.sent.Bank.totalAmount,
        details: {},
      },
    };

    // Combine all bank names from both received and sent
    const allBanks = new Set([
      ...Object.keys(summary.received.Bank.details),
      ...Object.keys(summary.sent.Bank.details),
    ]);

    // Calculate remaining for each bank
    allBanks.forEach((bank) => {
      const receivedAmount = summary.received.Bank.details[bank] || 0;
      const sentAmount = summary.sent.Bank.details[bank] || 0;
      summary.remaining.Bank.details[bank] = receivedAmount - sentAmount;
    });

    summary.totalBalance = staffAccount.balance;

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
};

exports.getMyTransactionsSummary = async (req, res) => {
  try {
    const staffId = req.staffAccountId;

    const staffAccount = await StaffAccount.findById(staffId);

    if (!staffAccount) {
      return res.status(404).json({ error: "Account not found for Staff ID" });
    }

    const transactions = await Transaction.find({
      $or: [
        { receivedBy: staffAccount._id, type: "Received" },
        { sendedBy: staffAccount._id, type: "Sent" },
      ],
    }).populate("customer", "customerName uniqueCode");

    const summary = {
      staffId: staffAccount.staffId,
      staffName: staffAccount.staffName,
      received: {
        Cash: 0,
        Cheque: 0,
        Bank: {
          totalAmount: 0,
          details: {},
        },
      },
      sent: {
        Cash: 0,
        Cheque: 0,
        Bank: {
          totalAmount: 0,
          details: {},
        },
      },
      pending: {
        received: 0,
        sent: 0,
      },
      approved: {
        received: 0,
        sent: 0,
      },
      rejected: {
        received: 0,
        sent: 0,
      },
    };

    transactions.forEach((transaction) => {
      const { type, paymentMethod, amount, status } = transaction;

      if (type === "Received") {
        if (status === "Pending") summary.pending.received += amount;
        else if (status === "Approved") summary.approved.received += amount;
        else if (status === "Rejected") summary.rejected.received += amount;

        if (status === "Approved") {
          if (paymentMethod === "Cash") {
            summary.received.Cash += amount;
          } else if (paymentMethod === "Cheque") {
            summary.received.Cheque += amount;
          } else if (paymentMethod.includes("Bank Transfer")) {
            const bankName = paymentMethod.split("(")[1].split(")")[0];
            summary.received.Bank.totalAmount += amount;
            summary.received.Bank.details[bankName] =
              (summary.received.Bank.details[bankName] || 0) + amount;
          }
        }
      } else if (type === "Sent") {
        if (status === "Pending") summary.pending.sent += amount;
        else if (status === "Approved") summary.approved.sent += amount;
        else if (status === "Rejected") summary.rejected.sent += amount;

        if (status === "Approved") {
          if (paymentMethod === "Cash") {
            summary.sent.Cash += amount;
          } else if (paymentMethod === "Cheque") {
            summary.sent.Cheque += amount;
          } else if (paymentMethod.includes("Bank Transfer")) {
            const bankName = paymentMethod.split("(")[1].split(")")[0];
            summary.sent.Bank.totalAmount += amount;
            summary.sent.Bank.details[bankName] =
              (summary.sent.Bank.details[bankName] || 0) + amount;
          }
        }
      }
    });

    // Calculate remaining balances
    summary.remaining = {
      Cash: summary.received.Cash - summary.sent.Cash,
      Cheque: summary.received.Cheque - summary.sent.Cheque,
      Bank: {
        totalAmount:
          summary.received.Bank.totalAmount - summary.sent.Bank.totalAmount,
        details: {},
      },
    };

    // Combine all bank names from both received and sent
    const allBanks = new Set([
      ...Object.keys(summary.received.Bank.details),
      ...Object.keys(summary.sent.Bank.details),
    ]);

    // Calculate remaining for each bank
    allBanks.forEach((bank) => {
      const receivedAmount = summary.received.Bank.details[bank] || 0;
      const sentAmount = summary.sent.Bank.details[bank] || 0;
      summary.remaining.Bank.details[bank] = receivedAmount - sentAmount;
    });

    summary.totalBalance = staffAccount.balance;

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
};
