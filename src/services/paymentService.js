// @ts-nocheck
import crypto from "crypto";

import Transaction from "../models/Transaction.js";

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const PROVIDERS = {
  mtn: {
    envKey: "MTN_API_KEY",
    prefixes: ["25078", "25079"],
  },
  airtel: {
    envKey: "AIRTEL_API_KEY",
    prefixes: ["25072", "25073"],
  },
};

const toPositiveAmount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  return Math.round(numericAmount);
};

const normalizePhoneNumber = (phoneNumber) => {
  const digits = String(phoneNumber || "").replace(/\D/g, "");

  if (digits.startsWith("250") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `250${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("7")) {
    return `250${digits}`;
  }

  return digits;
};

const buildReference = (provider) => {
  return `${provider.toUpperCase()}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

const serializeTransaction = (transaction) => {
  const data = transaction?.toObject ? transaction.toObject() : transaction;

  return {
    id: data._id?.toString?.() || data.id,
    provider: data.provider,
    amount: data.amount,
    currency: data.currency,
    phoneNumber: data.phoneNumber,
    reference: data.reference,
    externalReference: data.externalReference,
    providerTransactionId: data.providerTransactionId,
    status: data.status,
    simulated: data.simulated,
    failureReason: data.failureReason,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const validateProvider = (provider) => {
  const normalizedProvider = String(provider || "").toLowerCase().trim();
  return PROVIDERS[normalizedProvider] ? normalizedProvider : null;
};

const validatePaymentInput = ({ provider, amount, phoneNumber }) => {
  const normalizedProvider = validateProvider(provider);
  const normalizedAmount = toPositiveAmount(amount);
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!normalizedProvider) {
    return { error: "Unsupported payment provider" };
  }

  if (!normalizedAmount) {
    return { error: "Amount must be a positive number" };
  }

  if (!/^2507\d{8}$/.test(normalizedPhoneNumber)) {
    return { error: "Phone number must be a valid Rwanda mobile number" };
  }

  const providerConfig = PROVIDERS[normalizedProvider];
  const matchesProvider = providerConfig.prefixes.some((prefix) =>
    normalizedPhoneNumber.startsWith(prefix)
  );

  if (!matchesProvider) {
    return {
      error: `Phone number does not match ${normalizedProvider.toUpperCase()} prefixes`,
    };
  }

  return {
    provider: normalizedProvider,
    amount: normalizedAmount,
    phoneNumber: normalizedPhoneNumber,
  };
};

const normalizePaymentStatus = (status) => {
  const normalizedStatus = String(status || "").toLowerCase().trim();
  const statusMap = {
    completed: "success",
    paid: "success",
    successful: "success",
    success: "success",
    failed: "failed",
    failure: "failed",
    cancelled: "failed",
    canceled: "failed",
    rejected: "failed",
    pending: "pending",
    processing: "pending",
  };

  return statusMap[normalizedStatus] || normalizedStatus;
};

const findDuplicateTransaction = async ({
  provider,
  amount,
  phoneNumber,
  externalReference,
}) => {
  if (externalReference) {
    const existingReference = await Transaction.findOne({
      provider,
      externalReference,
      status: { $in: ["pending", "success"] },
    });

    if (existingReference) {
      return existingReference;
    }
  }

  return Transaction.findOne({
    provider,
    amount,
    phoneNumber,
    status: "pending",
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  });
};

export const initiatePayment = async ({
  provider,
  amount,
  phoneNumber,
  externalReference,
  userId,
}) => {
  const validated = validatePaymentInput({ provider, amount, phoneNumber });

  if (validated.error) {
    const error = new Error(validated.error);
    error.statusCode = 400;
    throw error;
  }

  const duplicate = await findDuplicateTransaction({
    provider: validated.provider,
    amount: validated.amount,
    phoneNumber: validated.phoneNumber,
    externalReference,
  });

  if (duplicate) {
    const error = new Error("Duplicate payment request detected");
    error.statusCode = 409;
    error.transaction = serializeTransaction(duplicate);
    throw error;
  }

  const providerConfig = PROVIDERS[validated.provider];
  const hasApiKey = Boolean(process.env[providerConfig.envKey]?.trim());
  const reference = buildReference(validated.provider);
  const providerTransactionId = `${validated.provider}-safe-${crypto
    .randomBytes(6)
    .toString("hex")}`;

  const transaction = await Transaction.create({
    provider: validated.provider,
    amount: validated.amount,
    phoneNumber: validated.phoneNumber,
    reference,
    externalReference: externalReference || reference,
    providerTransactionId,
    requestedBy: userId,
    status: "pending",
    simulated: !hasApiKey,
  });

  return {
    transaction: serializeTransaction(transaction),
    providerMode: hasApiKey ? "configured_safe_mode" : "simulated",
    message: hasApiKey
      ? "Payment request accepted in safe mode"
      : "Payment request simulated because provider API key is unavailable",
  };
};

export const updatePaymentStatus = async ({
  transactionId,
  reference,
  providerTransactionId,
  status,
  failureReason,
  payload,
}) => {
  const normalizedStatus = normalizePaymentStatus(status);

  if (!["pending", "success", "failed"].includes(normalizedStatus)) {
    const error = new Error("Payment status must be pending, success, or failed");
    error.statusCode = 400;
    throw error;
  }

  const query = transactionId
    ? { _id: transactionId }
    : reference
      ? { reference }
      : providerTransactionId
        ? { providerTransactionId }
        : null;

  if (!query) {
    const error = new Error("Transaction identifier is required");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await Transaction.findOneAndUpdate(
    query,
    {
      status: normalizedStatus,
      failureReason: normalizedStatus === "failed" ? failureReason : undefined,
      callbackPayload: payload,
    },
    { new: true }
  );

  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }

  return serializeTransaction(transaction);
};

export const listTransactions = async ({
  page = 1,
  limit = 20,
  status,
  provider,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const query = {};

  if (status) {
    const normalizedStatus = normalizePaymentStatus(status);

    if (["pending", "success", "failed"].includes(normalizedStatus)) {
      query.status = normalizedStatus;
    }
  }

  if (provider && PROVIDERS[String(provider).toLowerCase()]) {
    query.provider = String(provider).toLowerCase();
  }

  const [items, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Transaction.countDocuments(query),
  ]);

  return {
    data: items.map(serializeTransaction),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

export { serializeTransaction };
