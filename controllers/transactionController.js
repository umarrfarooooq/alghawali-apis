const Transaction = require("../Models/Transaction");

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
        { receivedBy: req.staffAccountId, status: "Pending" },
        { sendedBy: req.staffAccountId, status: "Pending" },
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
        { receivedBy: req.staffAccountId },
        { sendedBy: req.staffAccountId },
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
