const omise = require('omise')({
  publicKey: 'pkey_test_61svwvy7u733nss3fnk',
  secretKey: 'skey_test_61svwvyslxkp4ysi1g4'
});

export interface CreateChargeRequest {
  amount: number; // Amount in satang (smallest unit)
  currency: string;
  description: string;
  source: {
    type: string;
  };
}

export interface ChargeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  source: {
    type: string;
    scannable_code?: {
      image: {
        download_uri: string;
      };
    };
  };
}

export const createCharge = async (chargeData: CreateChargeRequest): Promise<ChargeResponse> => {
  try {
    const charge = await omise.charges.create(chargeData);
    return charge;
  } catch (error) {
    console.error('Error creating charge:', error);
    throw error;
  }
};

export const getCharge = async (chargeId: string): Promise<ChargeResponse> => {
  try {
    const charge = await omise.charges.retrieve(chargeId);
    return charge;
  } catch (error) {
    console.error('Error retrieving charge:', error);
    throw error;
  }
};

export default omise;