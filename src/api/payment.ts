import { createCharge, getCharge, CreateChargeRequest, ChargeResponse } from '@/lib/omise';

export const createPayment = async (paymentData: CreateChargeRequest): Promise<ChargeResponse> => {
  try {
    const charge = await createCharge(paymentData);
    return charge;
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw new Error('Failed to create payment');
  }
};

export const checkPaymentStatus = async (chargeId: string): Promise<ChargeResponse> => {
  try {
    const charge = await getCharge(chargeId);
    return charge;
  } catch (error) {
    console.error('Payment status check failed:', error);
    throw new Error('Failed to check payment status');
  }
};