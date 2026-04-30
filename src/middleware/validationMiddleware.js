// @ts-nocheck
export const validateEmployee = (req, res, next) => {
  const { name, firstName, lastName, salary, companyId } = req.body;
  const employeeName = name || [firstName, lastName].filter(Boolean).join(" ").trim();

  if (!employeeName || salary === undefined || !companyId) {
    return res.status(400).json({
      message: "Employee name, salary, and companyId are required",
    });
  }

  const numericSalary = Number(salary);

  if (!Number.isFinite(numericSalary) || numericSalary <= 0) {
    return res.status(400).json({ message: "Salary must be a positive number" });
  }

  req.body.salary = numericSalary;
  req.body.name = employeeName;
  next();
};
