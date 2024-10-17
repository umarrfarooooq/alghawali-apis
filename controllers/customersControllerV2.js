const CustomerAccountV2 = require("../Models/Customer-Account-v2");
const mongoose = require("mongoose");
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

const aggregatePendingDues = async (matchStage, populateOptions) => {
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "transactions",
        localField: "transactions",
        foreignField: "_id",
        as: "transactionsData",
      },
    },
    {
      $addFields: {
        oldestTransactionDate: { $min: "$transactionsData.date" },
      },
    },
    { $sort: { oldestTransactionDate: 1 } },
    { $project: { transactionsData: 0 } },
  ];

  const accounts = await CustomerAccountV2.aggregate(pipeline);
  await CustomerAccountV2.populate(accounts, populateOptions);
  return accounts;
};

const pendingToReceiveMatch = {
  profileHiringStatus: {
    $in: ["Hired", "Monthly Hired", "On Trial", "Completed"],
  },
  cosPaymentStatus: "Partially Paid",
};

const pendingToSendMatch = {
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
      profileHiringStatus: {
        $in: ["Hired", "Monthly Hired", "On Trial", "Completed"],
      },
      $expr: {
        $gt: [
          { $add: ["$receivedAmount", "$pendingReceivedAmount"] },
          "$totalAmount",
        ],
      },
    },
  ],
};

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
      profileHiringStatus: {
        $in: ["Hired", "Monthly Hired", "On Trial", "Completed"],
      },
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
        $in: ["Hired", "Monthly Hired", "On Trial", "Completed", "Return"],
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
        $in: ["Hired", "Monthly Hired", "Completed", "On Trial", "Return"],
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
    const pendingDuesAccounts = await aggregatePendingDues(
      pendingToReceiveMatch,
      populateCustomerAccount()
    );
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
    const matchStage = {
      ...pendingToReceiveMatch,
      staff: new mongoose.Types.ObjectId(userId),
    };
    const pendingDuesAccounts = await aggregatePendingDues(
      matchStage,
      populateCustomerAccount()
    );
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
    const pendingDuesToSendAccounts = await aggregatePendingDues(
      pendingToSendMatch,
      populateCustomerAccount()
    );
    res.status(200).json(pendingDuesToSendAccounts);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching pending dues to send" });
  }
};

exports.getPendingDuesToSendForUser = async (req, res) => {
  try {
    const userId = req.staffAccountId;
    const matchStage = {
      ...pendingToSendMatch,
      staff: new mongoose.Types.ObjectId(userId),
    };
    const pendingDuesToSendAccounts = await aggregatePendingDues(
      matchStage,
      populateCustomerAccount()
    );
    res.status(200).json(pendingDuesToSendAccounts);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching pending dues to send" });
  }
};

exports.getClearedPaymentsCustomers = async (req, res) => {
  try {
    let query = {
      $or: [
        {
          profileHiringStatus: {
            $in: ["Hired", "Completed", "Monthly Hired", "On Trial"],
          },
          cosPaymentStatus: "Fully Paid",
        },
        {
          profileHiringStatus: {
            $in: ["Return", "Hired", "Completed", "Monthly Hired", "On Trial"],
          },
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
          profileHiringStatus: {
            $in: ["Hired", "Completed", "Monthly Hired", "On Trial"],
          },
          cosPaymentStatus: "Fully Paid",
        },
        {
          profileHiringStatus: {
            $in: ["Return", "Hired", "Completed", "Monthly Hired", "On Trial"],
          },
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

// sales report

exports.getStaffSalesAnalytics = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        hiringDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const staffAccounts = await CustomerAccountV2.find({
      staff: staffId,
      ...dateFilter,
    }).populate("maid", "name code");

    const analytics = {
      totalCustomers: staffAccounts.length,
      activeCustomers: 0,
      returnedCustomers: 0,
      totalReceivedAmount: 0,
      customerDetails: [],
    };

    for (const account of staffAccounts) {
      const isActive = ["Hired", "Monthly Hired", "On Trial"].includes(
        account.profileHiringStatus
      );
      const isReturned = account.profileHiringStatus === "Return";

      if (isActive) analytics.activeCustomers++;
      if (isReturned) analytics.returnedCustomers++;
      const totalReceivedAmount =
        account.receivedAmount + account.pendingReceivedAmount;
      analytics.totalReceivedAmount += totalReceivedAmount;

      analytics.customerDetails.push({
        customerId: account._id,
        customerName: account.customerName,
        uniqueCode: account.uniqueCode,
        maidName: account.maid ? account.maid.name : "N/A",
        maidCode: account.maid ? account.maid.code : "N/A",
        hiringStatus: account.profileHiringStatus,
        receivedAmount: totalReceivedAmount,
        hiringDate: account.hiringDate,
      });
    }

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error fetching staff sales analytics:", error);
    res.status(500).json({
      error: "An error occurred while fetching staff sales analytics",
    });
  }
};

exports.getAllStaffSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        hiringDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const allStaffAccounts = await CustomerAccountV2.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$staff",
          totalCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$profileHiringStatus",
                    ["Hired", "Monthly Hired", "On Trial"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          returnedCustomers: {
            $sum: {
              $cond: [{ $eq: ["$profileHiringStatus", "Return"] }, 1, 0],
            },
          },
          completedCustomers: {
            $sum: {
              $cond: [{ $eq: ["$profileHiringStatus", "Completed"] }, 1, 0],
            },
          },
          totalReceivedAmount: {
            $sum: { $add: ["$receivedAmount", "$pendingReceivedAmount"] },
          },
        },
      },
      {
        $lookup: {
          from: "staffaccounts",
          localField: "_id",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      { $unwind: "$staffInfo" },
      {
        $project: {
          staffId: "$_id",
          staffName: "$staffInfo.staffName",
          staffCode: "$staffInfo.staffCode",
          totalCustomers: 1,
          activeCustomers: 1,
          returnedCustomers: 1,
          completedCustomers: 1,
          totalReceivedAmount: 1,
        },
      },
      { $sort: { totalCustomers: -1 } },
    ]);

    res.status(200).json(allStaffAccounts);
  } catch (error) {
    console.error("Error fetching all staff sales analytics:", error);
    res.status(500).json({
      error: "An error occurred while fetching all staff sales analytics",
    });
  }
};
