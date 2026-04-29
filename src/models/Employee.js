// @ts-nocheck
import mongoose from 'mongoose'; // No change needed

// Schema for individual employees and their base salary details
const employeeSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  salary: { type: Number, required: true },
  bankName: { type: String, required: true },
  bankAccountNumber: { type: String, required: true, unique: true },
  rssbNumber: { type: String, required: true, unique: true },
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;