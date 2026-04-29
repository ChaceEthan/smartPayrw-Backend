// @ts-nocheck
// Middleware to validate employee input data before processing
export const validateEmployee = (req, res, next) => {
  const { firstName, lastName, salary, bankName, bankAccountNumber, rssbNumber } = req.body;

  if (!firstName || !lastName || !salary || !bankName || !bankAccountNumber || !rssbNumber) {
    return res.status(400).json({ message: 'All fields are required: firstName, lastName, salary, bankName, bankAccountNumber, and rssbNumber' });
  }

  if (typeof salary !== 'number' || salary <= 0) {
    return res.status(400).json({ message: 'Salary must be a positive number' });
  }

  next();
};