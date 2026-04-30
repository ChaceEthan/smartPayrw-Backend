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
    const employees = await Employee.find({});
    return res.status(200).json(employees);
  } catch (error) {
    return next(error);
  }
};
