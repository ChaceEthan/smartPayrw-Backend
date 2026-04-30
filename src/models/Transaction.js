import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["mtn", "airtel"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "RWF",
      trim: true,
      uppercase: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    externalReference: {
      type: String,
      trim: true,
      index: true,
    },
    providerTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    simulated: {
      type: Boolean,
      default: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    callbackPayload: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ provider: 1, phoneNumber: 1, amount: 1, status: 1 });
transactionSchema.index({ provider: 1, externalReference: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
