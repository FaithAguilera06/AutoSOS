import { PaymentMethod, PaymentStatus } from '../models';

/**
 * Validates if a payment method is valid
 * @param method - The payment method to validate
 * @returns true if valid, false otherwise
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return method === 'cash' || method === 'facial_recognition';
}

/**
 * Validates if a payment status is valid
 * @param status - The payment status to validate
 * @returns true if valid, false otherwise
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ['pending', 'paid', 'failed', 'refunded'].includes(status);
}

/**
 * Gets the display name for a payment method
 * @param method - The payment method
 * @returns Human-readable display name
 */
export function getPaymentMethodDisplayName(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'Cash Payment';
    case 'facial_recognition':
      return 'Facial Recognition';
    default:
      return 'Unknown Payment Method';
  }
}

/**
 * Gets the display name for a payment status
 * @param status - The payment status
 * @returns Human-readable display name
 */
export function getPaymentStatusDisplayName(status: PaymentStatus): string {
  switch (status) {
    case 'pending':
      return 'Payment Pending';
    case 'paid':
      return 'Payment Completed';
    case 'failed':
      return 'Payment Failed';
    case 'refunded':
      return 'Payment Refunded';
    default:
      return 'Unknown Status';
  }
}

/**
 * Checks if a payment method requires immediate processing
 * @param method - The payment method
 * @returns true if requires immediate processing, false otherwise
 */
export function requiresImmediateProcessing(method: PaymentMethod): boolean {
  return method === 'facial_recognition';
}

/**
 * Gets the default payment method
 * @returns The default payment method
 */
export function getDefaultPaymentMethod(): PaymentMethod {
  return 'cash';
}
