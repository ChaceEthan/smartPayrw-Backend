import Company from "../models/Company.js";

export const createCompany = async (req, res) => {
  try {
    const { name, tin } = req.body;

    if (!name || !tin) {
      return res.status(400).json({ message: "Company name and TIN are required" });
    }

    const company = await Company.create({ name, tin });
    return res.status(201).json(company);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    const companies = await Company.find({}).sort({ createdAt: -1 });
    return res.status(200).json(companies);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
