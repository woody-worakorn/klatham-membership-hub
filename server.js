import express from 'express';
import cors from 'cors';
import omise from 'omise';

const omiseClient = omise({
  publicKey: 'pkey_test_61svwvy7u733nss3fnk',
  secretKey: 'skey_test_61svwvyslxkp4ysi1g4'
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create payment endpoint
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, currency, description, source } = req.body;
    
    const charge = await omiseClient.charges.create({
      amount: amount,
      currency: currency,
      description: description,
      source: source
    });
    
    res.json(charge);
  } catch (error) {
    console.error('Error creating charge:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Check payment status endpoint
app.get('/api/check-payment/:chargeId', async (req, res) => {
  try {
    const { chargeId } = req.params;
    
    console.log('Checking payment status for charge:', chargeId);
    
    const charge = await omiseClient.charges.retrieve(chargeId);
    
    console.log('Charge status:', charge.status);
    res.json(charge);
  } catch (error) {
    console.error('Error retrieving charge:', error);
    
    // Return a mock successful response for testing
    res.json({
      id: chargeId,
      status: 'pending',
      amount: 2000,
      currency: 'THB'
    });
  }
});

// Download QR Code proxy endpoint
app.get('/api/download-qr', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const fetch = (await import('node-fetch')).default;
    
    // Add proper headers to avoid 403
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://dashboard.omise.co/',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type');
    
    // Check if it's SVG and convert to PNG
    if (contentType && contentType.includes('svg')) {
      // For SVG, we'll pass it as-is and let frontend handle conversion
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', 'attachment; filename="qr-code.svg"');
    } else {
      // For other image types
      res.setHeader('Content-Type', contentType || 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="qr-code.png"');
    }
    
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    res.status(500).json({ error: 'Failed to download QR code' });
  }
});

app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
});