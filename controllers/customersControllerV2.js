const CustomerAccountV2 = require("../Models/Customer-Account-v2");

const populateCustomerAccount = () => [
  {
    path: "maid",
    select: "name code _id",
  },
  {
    path: "staff",
    select: "staffName staffCode _id",
  },
  {
    path: "transactions",
    select:
      "customer amount paymentMethod actionBy date receivedBy sendedBy proof type status description invoice",
    populate: [
      {
        path: "actionBy",
        select: "staffName staffCode _id",
      },
      {
        path: "receivedBy",
        select: "staffName staffCode _id",
      },
      {
        path: "sendedBy",
        select: "staffName staffCode _id",
      },
    ],
  },
];

exports.getAllAccounts = async (req, res) => {
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

    const allAccounts = await CustomerAccountV2.find(query).populate(
      populateCustomerAccount()
    );

    res.status(200).json(allAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllAccountsForUser = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const userId = req.staffAccountId;
    let query = { staff: userId };

    if (searchTerm) {
      query = {
        $and: [
          { staff: userId },
          {
            $or: [
              { uniqueCode: { $regex: searchTerm, $options: "i" } },
              { customerName: { $regex: searchTerm, $options: "i" } },
              { phoneNo: { $regex: searchTerm, $options: "i" } },
            ],
          },
        ],
      };
    }

    const allAccounts = await CustomerAccountV2.find(query).populate(
      populateCustomerAccount()
    );

    res.status(200).json(allAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getAllExpiredTrialAccounts = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    let query = {
      profileHiringStatus: "On Trial",
      trialStatus: "Expired",
    };

    if (searchTerm) {
      query.$or = [
        { uniqueCode: { $regex: searchTerm, $options: "i" } },
        { customerName: { $regex: searchTerm, $options: "i" } },
        { phoneNo: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const expiredTrialAccounts = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ trialEndDate: -1 });

    res.status(200).json(expiredTrialAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getExpiredTrialAccountsForUser = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const userId = req.staffAccountId;
    let query = {
      staff: userId,
      profileHiringStatus: "On Trial",
      trialStatus: "Expired",
    };

    if (searchTerm) {
      query.$or = [
        { uniqueCode: { $regex: searchTerm, $options: "i" } },
        { customerName: { $regex: searchTerm, $options: "i" } },
        { phoneNo: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const expiredTrialAccounts = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ trialEndDate: -1 });

    res.status(200).json(expiredTrialAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getPendingDuesToReceive = async (req, res) => {
  try {
    let query = {
      profileHiringStatus: { $in: ["Hired", "Monthly Hired"] },
      $or: [{ cosPaymentStatus: "Partially Paid" }],
    };

    const pendingDuesAccounts = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ "transactions.date": 1 });

    res.status(200).json(pendingDuesAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching pending dues accounts",
    });
  }
};

exports.getPendingDuesToReceiveForUser = async (req, res) => {
  try {
    const userId = req.staffAccountId;
    let query = {
      staff: userId,
      profileHiringStatus: { $in: ["Hired", "Monthly Hired"] },
      cosPaymentStatus: "Partially Paid",
    };

    const pendingDuesAccounts = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ "transactions.date": 1 });

    res.status(200).json(pendingDuesAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching pending dues accounts",
    });
  }
};

exports.getPendingDuesToSend = async (req, res) => {
  try {
    let query = {
      $or: [
        {
          profileHiringStatus: "Return",
          $expr: {
            $lt: [
              "$returnAmount",
              { $add: ["$receivedAmount", "$pendingReceivedAmount"] },
            ],
          },
        },
        {
          profileHiringStatus: { $in: ["Hired", "Monthly Hired"] },
          $expr: {
            $gt: [
              { $add: ["$receivedAmount", "$pendingReceivedAmount"] },
              "$totalAmount",
            ],
          },
        },
      ],
    };

    const pendingDuesToSendAccounts = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ "transactions.date": 1 });

    res.status(200).json(pendingDuesToSendAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching pending dues to send",
    });
  }
};

exports.getPendingDuesToSendForUser = async (req, res) => {
  try {
    const userId = req.staffAccountId;
    let query = {
      staff: userId,
      $or: [
        {
          profileHiringStatus: "Return",
          $expr: {
            $lt: [
              "$returnAmount",
              { $add: ["$receivedAmount", "$pendingReceivedAmount"] },
            ],
          },
        },
        {
          profileHiringStatus: { $in: ["Hired", "Monthly Hired"] },
          $expr: {
            $gt: [
              { $add: ["$receivedAmount", "$pendingReceivedAmount"] },
              "$totalAmount",
            ],
          },
        },
      ],
    };

    const pendingDuesToSendAccounts = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ "transactions.date": 1 });

    res.status(200).json(pendingDuesToSendAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching pending dues to send",
    });
  }
};

exports.getClearedPaymentsCustomers = async (req, res) => {
  try {
    let query = {
      $or: [
        {
          profileHiringStatus: "Hired",
          cosPaymentStatus: "Fully Paid",
        },
        {
          profileHiringStatus: "Monthly Hired",
          cosPaymentStatus: "Fully Paid",
        },
      ],
    };

    const clearedPaymentsAccounts = await CustomerAccountV2.find(
      query
    ).populate(populateCustomerAccount());

    res.status(200).json(clearedPaymentsAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching cleared payments customers",
    });
  }
};

exports.getClearedPaymentsCustomersForUser = async (req, res) => {
  try {
    const userId = req.staffAccountId;
    let query = {
      staff: userId,
      $or: [
        {
          profileHiringStatus: "Hired",
          cosPaymentStatus: "Fully Paid",
        },
        {
          profileHiringStatus: "Monthly Hired",
          cosPaymentStatus: "Fully Paid",
        },
      ],
    };

    const clearedPaymentsAccounts = await CustomerAccountV2.find(
      query
    ).populate(populateCustomerAccount());

    res.status(200).json(clearedPaymentsAccounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching cleared payments customers",
    });
  }
};
