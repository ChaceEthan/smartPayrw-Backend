// @ts-nocheck
import mongoose from "mongoose";

import BusinessTransaction from "../models/BusinessTransaction.js";
import Company from "../models/Company.js";

const serializeBusinessTransaction = (transaction) => {
  const data = transaction?.toObject ? transaction.toObject() : transaction;

  return {
    id: data._id?.toString?.() || data.id,
    productOrService: data.productOrService,
    amount: data.amount,
    quantity: data.quantity,
    date: data.transactionDate,
    companyId: data.companyId?.toString?.() || data.companyId,
    owner: data.owner?.toString?.() || data.owner,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const toPositiveNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const parseTransactionDate = (value) => {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getProductOrService = (body = {}) =>
  String(body.productOrService || body.product || body.service || "").trim();

const resolveCompany = async ({ companyId, userId }) => {
  if (companyId) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error("Invalid companyId");
      error.statusCode = 400;
      throw error;
    }

    const company = await Company.findOne({ _id: companyId, owner: userId });

    if (!company) {
      const error = new Error("Company not found for this user");
      error.statusCode = 404;
      throw error;
    }

    return company;
  }

  const company = await Company.findOne({ owner: userId }).sort({ createdAt: -1 });

  if (!company) {
    const error = new Error("Register a company before recording transactions");
    error.statusCode = 400;
    throw error;
  }

  return company;
};

const buildTransactionMatch = ({ userId, companyId, dateFrom, dateTo }) => {
  const match = { owner: userId };

  if (companyId) {
    match.companyId = companyId;
  }

  if (dateFrom || dateTo) {
    match.transactionDate = {};

    if (dateFrom) {
      const from = new Date(dateFrom);

      if (!Number.isNaN(from.getTime())) {
        match.transactionDate.$gte = from;
      }
    }

    if (dateTo) {
      const to = new Date(dateTo);

      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        match.transactionDate.$lte = to;
      }
    }

    if (Object.keys(match.transactionDate).length === 0) {
      delete match.transactionDate;
    }
  }

  return match;
};

const buildBusinessSummary = async (match) => {
  const [dailySales, stockSummary] = await Promise.all([
    BusinessTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$transactionDate",
            },
          },
          totalSales: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
          quantitySold: { $sum: "$quantity" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 31 },
    ]),
    BusinessTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$productOrService",
          totalSales: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
          quantitySold: { $sum: "$quantity" },
          lastSaleDate: { $max: "$transactionDate" },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 20 },
    ]),
  ]);

  return {
    dailySales: dailySales.map((item) => ({
      date: item._id,
      totalSales: item.totalSales,
      transactionCount: item.transactionCount,
      quantitySold: item.quantitySold,
    })),
    stockSummary: stockSummary.map((item) => ({
      productOrService: item._id,
      quantitySold: item.quantitySold,
      transactionCount: item.transactionCount,
      totalSales: item.totalSales,
      lastSaleDate: item.lastSaleDate,
      note: "Basic EBM-lite summary from recorded sales; remaining stock requires opening stock and purchase records.",
    })),
  };
};

export const createBusinessTransaction = async (req, res, next) => {
  try {
    const productOrService = getProductOrService(req.body);
    const amount = toPositiveNumber(req.body?.amount);
    const quantity = toPositiveNumber(req.body?.quantity, 1);
    const transactionDate = parseTransactionDate(req.body?.date || req.body?.transactionDate);

    if (!productOrService || !amount || !transactionDate) {
      return res.status(400).json({
        message: "productOrService, positive amount, and valid date are required",
      });
    }

    const company = await resolveCompany({
      companyId: req.body?.companyId,
      userId: req.user._id,
    });

    const transaction = await BusinessTransaction.create({
      productOrService,
      amount: Math.round(amount),
      quantity: Math.round(quantity),
      transactionDate,
      companyId: company._id,
      owner: req.user._id,
    });

    return res.status(201).json({
      transaction: serializeBusinessTransaction(transaction),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
};

export const getBusinessTransactions = async (req, res, next) => {
  try {
    const safePage = Math.max(Number(req.query.page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    let company = null;

    if (req.query.companyId) {
      company = await resolveCompany({
        companyId: req.query.companyId,
        userId: req.user._id,
      });
    }

    const match = buildTransactionMatch({
      userId: req.user._id,
      companyId: company?._id,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });

    const [transactions, total, summary] = await Promise.all([
      BusinessTransaction.find(match)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      BusinessTransaction.countDocuments(match),
      buildBusinessSummary(match),
    ]);

    return res.status(200).json({
      transactions: transactions.map(serializeBusinessTransaction),
      ...summary,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
};

