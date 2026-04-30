import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tin: { type: String, required: true, unique: true, trim: true, index: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessType: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
export default Company;
