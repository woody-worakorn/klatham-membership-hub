import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Download } from 'lucide-react';

interface PaymentData {
  amount: number;
  membershipType: 'yearly' | 'lifetime';
  paymentMethod: 'cash' | 'promptpay';
  membershipData: any;
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);

  const paymentData: PaymentData = location.state?.paymentData;

  useEffect(() => {
    if (!paymentData) {
      navigate('/');
      return;
    }

    // Only create payment for PromptPay, not for cash
    if (paymentData.paymentMethod === 'promptpay') {
      createPayment();
    } else {
      // For cash payment, show different content
      setPaymentStatus('success');
    }
  }, [paymentData, navigate]);

  const createPayment = async () => {
    try {
      setPaymentStatus('processing');

      // Create charge using API endpoint
      const response = await fetch('http://localhost:3001/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentData.amount * 100, // Convert to satang (smallest unit)
          currency: 'THB',
          description: `Kla Tham Party Membership - ${paymentData.membershipType === 'yearly' ? 'Yearly' : 'Lifetime'}`,
          source: {
            type: 'promptpay',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      const charge = await response.json();
      setChargeId(charge.id);
      
      // Get QR code URL from the source
      if (charge.source && charge.source.scannable_code) {
        setQrCodeUrl(charge.source.scannable_code.image.download_uri);
        
        // Start polling for payment status
        pollPaymentStatus(charge.id);
      } else {
        throw new Error('QR code not generated');
      }

    } catch (error) {
      console.error('Payment creation failed:', error);
      setPaymentStatus('failed');
    }
  };

  const pollPaymentStatus = async (chargeId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/check-payment/${chargeId}`);
        if (!response.ok) throw new Error('Failed to check payment status');
        
        const charge = await response.json();
        
        if (charge.status === 'successful') {
          setPaymentStatus('success');
          clearInterval(pollInterval);
          
          // Save membership data to Firebase after successful payment
          saveMembershipData();
        } else if (charge.status === 'failed' || charge.status === 'expired') {
          setPaymentStatus('failed');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'processing') {
        setPaymentStatus('failed');
      }
    }, 600000);
  };

  const saveMembershipData = async () => {
    try {
      // Save the membership data to Firebase after successful payment
      const { ref, push } = await import('firebase/database');
      const { database } = await import('@/lib/firebase');
      
      const membersRef = ref(database, 'members');
      await push(membersRef, {
        ...paymentData.membershipData,
        paymentStatus: 'completed',
        chargeId: chargeId
      });
      
      console.log('Membership data saved successfully');
    } catch (error) {
      console.error('Error saving membership data:', error);
    }
  };

  const handleRetry = () => {
    setPaymentStatus('pending');
    setQrCodeUrl(null);
    setChargeId(null);
    createPayment();
  };

  const handleBackToForm = () => {
    navigate('/', { state: { membershipData: paymentData.membershipData } });
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleDownloadQR = async () => {
    if (!qrCodeUrl) return;
    
    try {
      // First, try to get the displayed QR image
      const qrImage = document.querySelector('img[alt="QR Code for Payment"]') as HTMLImageElement;
      
      if (qrImage && qrImage.complete) {
        // Wait a bit to ensure image is fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create canvas for conversion
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set high resolution
        canvas.width = 512;
        canvas.height = 512;
        
        if (ctx) {
          // White background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the QR code
          ctx.drawImage(qrImage, 0, 0, canvas.width, canvas.height);
          
          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `qr-payment-${chargeId || Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
          }, 'image/png', 1.0);
          
          return; // Success, exit function
        }
      }
      
      // Fallback: Try to fetch from our proxy
      try {
        const response = await fetch(`http://localhost:3001/api/download-qr?url=${encodeURIComponent(qrCodeUrl)}`);
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.includes('svg')) {
            // Handle SVG conversion
            const svgText = await response.text();
            await convertSvgToPng(svgText);
          } else {
            // Handle other image types
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qr-payment-${chargeId || Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
          return;
        }
      } catch (proxyError) {
        console.log('Proxy method failed:', proxyError);
      }
      
      // Final fallback: open in new window
      window.open(qrCodeUrl, '_blank');
      
    } catch (error) {
      console.error('Error downloading QR code:', error);
      window.open(qrCodeUrl, '_blank');
    }
  };

  const convertSvgToPng = async (svgText: string) => {
    return new Promise<void>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 512;
      canvas.height = 512;
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to PNG
        canvas.toBlob((blob) => {
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qr-payment-${chargeId || Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            resolve();
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png', 1.0);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load SVG'));
      };
      
      // Create data URL from SVG
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    });
  };

  if (!paymentData) {
    return null;
  }

  const membershipTypeText = paymentData.membershipType === 'yearly' ? 'รายปี' : 'ตลอดชีพ';

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-secondary mb-2">ชำระเงินค่าสมาชิก</h1>
          <p className="text-gray-600">พรรคกล้าธรรม</p>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">ประเภทสมาชิก:</span>
            <span className="font-semibold">สมัครแบบ{membershipTypeText}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">จำนวนเงิน:</span>
            <span className="text-2xl font-bold text-primary">{paymentData.amount} บาท</span>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'processing' && paymentData.paymentMethod === 'promptpay' && qrCodeUrl && (
          <div className="text-center">
            <div className="mb-6">
              <img 
                src={qrCodeUrl} 
                alt="QR Code for Payment" 
                className="mx-auto w-80 h-80 border-2 border-gray-200 rounded-lg shadow-lg"
              />
            </div>
            
            <div className="mb-4">
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="mb-2"
              >
                <Download className="w-4 h-4 mr-2" />
                ดาวน์โหลด QR Code
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                *หากไม่สามารถดาวน์โหลดได้ QR Code จะเปิดในแท็บใหม่
              </p>
            </div>
            
            <p className="text-gray-600 mb-2 font-medium">สแกน QR Code เพื่อชำระเงิน</p>
            <p className="text-sm text-gray-500 mb-4">กรุณารอสักครู่หลังจากชำระเงิน...</p>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm text-gray-600">กำลังรอการชำระเงิน...</span>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center">
            <CheckCircle className="mx-auto w-16 h-16 text-green-500 mb-4" />
            {paymentData.paymentMethod === 'cash' ? (
              <>
                <h2 className="text-xl font-bold text-green-600 mb-2">สมัครสมาชิกสำเร็จ!</h2>
                <p className="text-gray-600 mb-4">ข้อมูลการสมัครสมาชิกได้ถูกบันทึกแล้ว</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-amber-800 mb-2">📍 ชำระเงินสดที่:</h3>
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">สำนักงานพรรคกล้าธรรม</p>
                    <p>123 ถนนประชาธิปัตย์ แขวงดุสิต เขตดุสิต กรุงเทพฯ 10300</p>
                    <p className="mt-2">🕒 เวลาทำการ: จันทร์-ศุกร์ 9:00-17:00 น.</p>
                    <p className="mt-2 font-medium">💰 จำนวนเงิน: {paymentData.amount} บาท</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-green-600 mb-2">ชำระเงินสำเร็จ!</h2>
                <p className="text-gray-600 mb-6">การสมัครสมาชิกของคุณเสร็จสมบูรณ์แล้ว</p>
              </>
            )}
            <Button 
              onClick={handleBackToHome}
              className="w-full bg-primary hover:bg-primary/90"
            >
              กลับหน้าหลัก
            </Button>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center">
            <XCircle className="mx-auto w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">การชำระเงินไม่สำเร็จ</h2>
            <p className="text-gray-600 mb-6">กรุณาลองใหม่อีกครั้ง</p>
            <div className="space-y-3">
              <Button 
                onClick={handleRetry}
                className="w-full bg-primary hover:bg-primary/90"
              >
                ลองชำระเงินใหม่
              </Button>
              <Button 
                onClick={handleBackToForm}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับไปแก้ไขข้อมูล
              </Button>
            </div>
          </div>
        )}

        {paymentStatus === 'pending' && paymentData.paymentMethod === 'promptpay' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังเตรียมการชำระเงิน...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;