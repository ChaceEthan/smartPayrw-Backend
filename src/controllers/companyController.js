// @ts-nocheck
import Company from "../models/Company.js";

const normalizeTIN = (tin) => String(tin || "").replace(/\D/g, "");

const serializeCompany = (company) => ({
  id: company._id?.toString?.() || company.id,
  name: company.name,
  tin: company.tin,
  businessType: company.businessType,
  owner: company.owner?.toString?.() || company.owner,
  createdAt: company.createdAt,
});

export const registerCompany = async (req, res, next) => {
  try {
    const { name, businessType } = req.body || {};
    const tin = normalizeTIN(req.body?.tin);

    if (!name || !tin || !businessType) {
      return res.status(400).json({
        message: "Company name, TIN, and business type are required",
      });
    }

    if (!/^\d{9}$/.test(tin)) {
      return res.status(400).json({ message: "TIN must be a 9-digit number" });
    }

    const company = await Company.create({
      name,
      tin,
      businessType,
      owner: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Company registered in SmartPay",
      data: serializeCompany(company),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Company TIN is already registered in SmartPay",
      });
    }

    return next(error);
  }
};

export const createCompany = registerCompany;

export const getCompany = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const query = { owner: req.user._id };

    if (page || limit) {
      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const [companies, total] = await Promise.all([
        Company.find(query)
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Company.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: companies.map(serializeCompany),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      });
    }

    const companies = await Company.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: companies.map(serializeCompany),
    });
  } catch (error) {
    return next(error);
  }
};
