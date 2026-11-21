"use client";

/**
 * Premium Billing Receipt (Compact Standard Billing Size)
 * Replaces the old A4-sized billing receipt format.
 */
export {
  BillingReceipt as A4PaymentReceipt,
  BillingReceipt,
  BillingReceiptModal,
  DEFAULT_REFERENCE_RECEIPT,
  SAMPLE2_RECEIPT,
  LONG_TEST_RECEIPT,
} from "./BillingReceipt";

export type {
  BillingReceiptProps as A4PaymentReceiptProps,
  BillingReceiptProps,
  PaymentReceiptData,
  ReceiptItem,
} from "./BillingReceipt";

import { BillingReceipt } from "./BillingReceipt";
export default BillingReceipt;
