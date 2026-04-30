import Company from "../models/Company.js";

export const createCompany = async (req, res, next) => {
  try {
    const { name, tin } = req.body;

    if (!name || !tin) {
      return res.status(400).json({ message: "Company name and TIN are required" });
    }

    const company = await Company.create({ name, tin });
    return res.status(201).json(company);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Company already exists" });
    }

    return next(error);
  }
};

export const getCompany = async (req, res, next) => {
  try {
    const companies = await Company.find({}).sort({ createdAt: -1 });
    return res.status(200).json(companies);
  } catch (error) {
    return next(error);
  }
};
