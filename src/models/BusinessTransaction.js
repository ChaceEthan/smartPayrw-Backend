import mongoose from "mongoose";

const businessTransactionSchema = new mongoose.Schema(
  {
    productOrService: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
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
  },
  { timestamps: true }
);

businessTransactionSchema.index({ owner: 1, companyId: 1, transactionDate: -1 });
businessTransactionSchema.index({ owner: 1, productOrService: 1 });

const BusinessTransaction =
  mongoose.models.BusinessTransaction ||
  mongoose.model("BusinessTransaction", businessTransactionSchema);

export default BusinessTransaction;

