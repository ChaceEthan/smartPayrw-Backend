// @ts-nocheck
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";

const serializeEmployee = (employee) => ({
  id: employee._id?.toString?.() || employee.id,
  name: employee.name,
  salary: employee.salary,
  companyId: employee.companyId?.toString?.() || employee.companyId,
  firstName: employee.firstName,
  lastName: employee.lastName,
  hasRSSBNumber: Boolean(employee.rssbNumber),
  createdAt: employee.createdAt,
});

export const addEmployee = async (req, res, next) => {
  try {
    const {
      name,
      firstName,
      lastName,
      salary,
      companyId,
      bankName,
      bankAccountNumber,
      rssbNumber,
    } = req.body;
    const company = await Company.findOne({
      _id: companyId,
      owner: req.user._id,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found for this user",
      });
    }

    const employee = await Employee.create({
      name,
      firstName,
      lastName,
      salary,
      companyId,
      owner: req.user._id,
      bankName,
      bankAccountNumber,
      rssbNumber,
    });

    return res.status(201).json({
      success: true,
      message: "Employee added to company payroll",
      data: serializeEmployee(employee),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Employee already exists" });
    }

    return next(error);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const { page, limit, companyId } = req.query;
    const query = { owner: req.user._id };

    if (companyId) {
      const company = await Company.findOne({
        _id: companyId,
        owner: req.user._id,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found for this user",
        });
      }

      query.companyId = companyId;
    }

    if (page || limit) {
      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const [employees, total] = await Promise.all([
        Employee.find(query)
          .select("name firstName lastName salary companyId rssbNumber createdAt")
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Employee.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: employees.map(serializeEmployee),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      });
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: employees.map(serializeEmployee),
    });
  } catch (error) {
    return next(error);
  }
};
