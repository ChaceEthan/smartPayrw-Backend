export const validateEmployee = (req, res, next) => {
  const { firstName, lastName, salary, bankName, bankAccountNumber, rssbNumber } = req.body;

  if (!firstName || !lastName || salary === undefined || !bankName || !bankAccountNumber || !rssbNumber) {
    return res.status(400).json({
      message:
        "All fields are required: firstName, lastName, salary, bankName, bankAccountNumber, and rssbNumber",
    });
  }

  const numericSalary = Number(salary);

  if (!Number.isFinite(numericSalary) || numericSalary <= 0) {
    return res.status(400).json({ message: "Salary must be a positive number" });
  }

  req.body.salary = numericSalary;
  next();
};
