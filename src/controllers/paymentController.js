// @ts-nocheck
import {
  initiatePayment,
  listTransactions,
  updatePaymentStatus,
} from "../services/paymentService.js";

const handlePaymentError = (error, res, next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      transaction: error.transaction,
    });
  }

  return next(error);
};

const requestPayment = (provider) => async (req, res, next) => {
  try {
    const { amount, phoneNumber, externalReference } = req.body || {};
    const result = await initiatePayment({
      provider,
      amount,
      phoneNumber,
      externalReference,
      userId: req.user?._id,
    });

    return res.status(202).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handlePaymentError(error, res, next);
  }
};

export const requestMTNPayment = requestPayment("mtn");
export const requestAirtelPayment = requestPayment("airtel");

export const paymentCallback = async (req, res, next) => {
  try {
    const transaction = await updatePaymentStatus({
      transactionId: req.body?.transactionId,
      reference: req.body?.reference,
      providerTransactionId: req.body?.providerTransactionId,
      status: req.body?.status,
      failureReason: req.body?.failureReason,
      payload: req.body,
    });

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    return handlePaymentError(error, res, next);
  }
};

export const paymentWebhook = paymentCallback;

export const getTransactions = async (req, res, next) => {
  try {
    const result = await listTransactions({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      provider: req.query.provider,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};
