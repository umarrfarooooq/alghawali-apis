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

exports.getCustomerAccountForMaid = async (req, res) => {
  try {
    const { maidId } = req.params;
    const customerAccount = await CustomerAccountV2.findOne({
      maid: maidId,
      profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
    }).sort({ createdAt: -1 });

    if (!customerAccount) {
      return res
        .status(404)
        .json({ error: "No active customer account found for this maid" });
    }

    res.status(200).json({
      receivedAmount: customerAccount.receivedAmount,
      pendingReceivedAmount: customerAccount.pendingReceivedAmount,
    });
  } catch (error) {
    console.error("Error fetching customer account:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};

exports.getCustomerAccountForCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customerAccount = await CustomerAccountV2.findById(customerId)
      .populate("maid", "name code")
      .populate("staff", "staffName staffCode");

    if (!customerAccount) {
      return res.status(404).json({ error: "Customer account not found" });
    }

    const responseData = {
      totalAmount: customerAccount.totalAmount,
      receivedAmount: customerAccount.receivedAmount,
      pendingReceivedAmount: customerAccount.pendingReceivedAmount,
      returnAmount: customerAccount.returnAmount,
      pendingReturnAmount: customerAccount.pendingReturnAmount,
      cosPaymentStatus: customerAccount.cosPaymentStatus,
      profileHiringStatus: customerAccount.profileHiringStatus,
      maid: customerAccount.maid,
      staff: customerAccount.staff,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching customer account:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the customer account" });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customerAccount = await CustomerAccountV2.findById(
      customerId
    ).populate(populateCustomerAccount());

    if (!customerAccount) {
      return res.status(404).json({ error: "Customer account not found" });
    }

    res.status(200).json(customerAccount);
  } catch (error) {
    console.error("Error fetching customer account:", error);
    res.status(500).json({
      error: "An error occurred while fetching the customer account",
      details: error.message,
    });
  }
};

exports.getAllActiveCustomers = async (req, res) => {
  try {
    const { searchTerm, page = 1, perPage = 15 } = req.query;

    let query = {
      cosPaymentStatus: { $nin: ["Fully Paid", "Refunded"] },
      profileHiringStatus: {
        $in: ["Hired", "Monthly Hired", "On Trial", "Return"],
      },
    };

    if (searchTerm) {
      query.$or = [
        { uniqueCode: { $regex: searchTerm, $options: "i" } },
        { customerName: { $regex: searchTerm, $options: "i" } },
        { phoneNo: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const totalCustomers = await CustomerAccountV2.countDocuments(query);
    const totalPages = Math.ceil(totalCustomers / perPage);
    const skip = (page - 1) * perPage;

    const activeCustomers = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(perPage));

    res.status(200).json({
      customers: activeCustomers,
      currentPage: Number(page),
      totalPages,
      totalCustomers,
    });
  } catch (error) {
    console.error("Error fetching active customers:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching active customers" });
  }
};

exports.getAllActiveCustomersForUser = async (req, res) => {
  try {
    const { searchTerm, page = 1, perPage = 15 } = req.query;
    const userId = req.staffAccountId;

    let query = {
      staff: userId,
      cosPaymentStatus: { $nin: ["Fully Paid", "Refunded"] },
      profileHiringStatus: {
        $in: ["Hired", "Monthly Hired", "On Trial", "Return"],
      },
    };

    if (searchTerm) {
      query.$and = [
        { staff: userId },
        {
          $or: [
            { uniqueCode: { $regex: searchTerm, $options: "i" } },
            { customerName: { $regex: searchTerm, $options: "i" } },
            { phoneNo: { $regex: searchTerm, $options: "i" } },
          ],
        },
      ];
    }

    const totalCustomers = await CustomerAccountV2.countDocuments(query);
    const totalPages = Math.ceil(totalCustomers / perPage);
    const skip = (page - 1) * perPage;

    const activeCustomers = await CustomerAccountV2.find(query)
      .populate(populateCustomerAccount())
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(perPage));

    res.status(200).json({
      customers: activeCustomers,
      currentPage: Number(page),
      totalPages,
      totalCustomers,
    });
  } catch (error) {
    console.error("Error fetching active customers for user:", error);
    res.status(500).json({
      error: "An error occurred while fetching active customers for user",
    });
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
      profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
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
      profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
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
          profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
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
          profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
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
          profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
          cosPaymentStatus: "Fully Paid",
        },
        {
          profileHiringStatus: "Return",
          cosPaymentStatus: "Refunded",
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
          profileHiringStatus: { $in: ["Hired", "Monthly Hired", "On Trial"] },
          cosPaymentStatus: "Fully Paid",
        },
        {
          profileHiringStatus: "Return",
          cosPaymentStatus: "Refunded",
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
