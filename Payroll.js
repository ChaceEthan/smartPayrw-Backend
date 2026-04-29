// @ts-nocheck
import mongoose from 'mongoose'; // No change needed

// Schema for monthly payroll execution results
const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true },
  netPay: { type: Number, required: true },
}, { timestamps: true });

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;