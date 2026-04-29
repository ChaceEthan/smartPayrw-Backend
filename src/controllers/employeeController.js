// @ts-nocheck
// Handles employee CRUD operations
import Employee from '../models/Employee.js'; // Corrected path

// Handles employee CRUD operations
export const addEmployee = async (req, res) => {
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

    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};