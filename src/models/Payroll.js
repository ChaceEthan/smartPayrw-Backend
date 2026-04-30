import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    grossSalary: { type: Number, required: true, min: 0 },
    taxableIncome: { type: Number, required: true, min: 0 },
    paye: { type: Number, required: true, min: 0 },
    employeeRSSB: { type: Number, required: true, min: 0 },
    employerRSSB: { type: Number, required: true, min: 0 },
    totalRSSB: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["processed", "draft"],
      default: "processed",
      index: true,
    },
    source: {
      type: String,
      enum: ["calculator", "monthly_run"],
      default: "calculator",
    },
  },
  { timestamps: true }
);

payrollSchema.index({ owner: 1, companyId: 1, month: -1 });
payrollSchema.index({ owner: 1, employee: 1, month: -1 });

const Payroll = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);

export default Payroll;

