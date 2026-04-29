// @ts-nocheck
import mongoose from 'mongoose'; // No change needed

// Schema for SME entity details in Rwanda
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  tin: { type: String, required: true, unique: true },
}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);
export default Company;