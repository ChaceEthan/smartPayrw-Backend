// @ts-nocheck
import Employee from "../models/Employee.js";

export const addEmployee = async (req, res, next) => {
  try {
    const { firstName, lastName, salary, bankName, bankAccountNumber, rssbNumber } = req.body;

    const employee = await Employee.create({
      firstName,
      lastName,
      salary,
      bankName,
      bankAccountNumber,
      rssbNumber,
    });

    return res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Employee already exists" });
    }

    return next(error);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    if (page || limit) {
      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const [employees, total] = await Promise.all([
        Employee.find({})
          .select("firstName lastName salary rssbNumber createdAt")
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Employee.countDocuments({}),
      ]);

      return res.status(200).json({
        success: true,
        data: employees,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      });
    }

    const employees = await Employee.find({});
    return res.status(200).json(employees);
  } catch (error) {
    return next(error);
  }
};
