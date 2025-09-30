import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Camera, Upload, X, Eye, Check, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ThaiIdCardUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export const ThaiIdCardUpload: React.FC<ThaiIdCardUploadProps> = ({
  value,
  onChange,
  label,
  description,
  required = false,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [preview, setPreview] = useState<string | undefined>(value);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Thai ID card dimensions ratio (8.56 cm x 5.4 cm)
  const ID_CARD_RATIO = 8.56 / 5.4;

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        if (permission.state === 'granted') {
          return true;
        } else if (permission.state === 'prompt') {
          return true;
        } else {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.log('Permission API not supported:', error);
      return true;
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      setIsRequestingPermission(true);
      
      if (isMobile()) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          alert('กรุณาอนุญาตการใช้งานกล้องในการตั้งค่าของเบราว์เซอร์');
          setIsRequestingPermission(false);
          return;
        }

        const userConfirmed = confirm(
          '📱 การใช้งานบนมือถือ\n\n' +
          'กรุณาอนุญาตการใช้งานกล้องเมื่อเบราว์เซอร์ขออนุญาต\n\n' +
          '🔧 หากไม่ปรากฏหน้าต่างขออนุญาต:\n' +
          '• คลิกที่ไอคอนกล้อง 📹 ในแถบที่อยู่\n' +
          '• เลือก "อนุญาต" การเข้าถึงกล้อง\n' +
          '• รีเฟรชหน้าเว็บและลองใหม่\n\n' +
          '📸 เคล็ดลับ: ใช้กล้องหลังเพื่อความชัดเจน\n\n' +
          'ต้องการดำเนินการต่อหรือไม่?'
        );
        
        if (!userConfirmed) {
          setIsRequestingPermission(false);
          return;
        }
      }

      let stream: MediaStream;
      
      try {
        const constraints = isMobile() ? {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        } : {
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.warn('Ideal constraints failed, trying basic constraints:', error);
        
        const basicConstraints = {
          video: isMobile() ? 
            { facingMode: 'environment' } : 
            { facingMode: { ideal: 'environment' } }
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        } catch (fallbackError) {
          console.warn('Environment camera failed, trying any camera:', fallbackError);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCameraDialog(true);
      setIsRequestingPermission(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsRequestingPermission(false);
      
      let errorMessage = 'ไม่สามารถเข้าถึงกล้องได้';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '🚫 ไม่ได้รับอนุญาตใช้งานกล้อง\n\n' +
            '🔧 วิธีแก้ไข:\n' +
            '1. คลิกที่ไอคอนกล้อง 📹 ในแถบที่อยู่\n' +
            '2. เลือก "อนุญาต" หรือ "Allow"\n' +
            '3. รีเฟรชหน้าเว็บและลองใหม่\n\n' +
            '📱 สำหรับมือถือ: ไปที่การตั้งค่า > ความเป็นส่วนตัว > กล้อง\n\n' +
            '💡 หรือเลือกรูปภาพจากแกลเลอรี่แทน';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '📷 ไม่พบกล้องในอุปกรณ์นี้\n\nกรุณาเลือกรูปภาพจากแกลเลอรี่แทน';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '⚠️ เบราว์เซอร์ไม่รองรับการใช้งานกล้อง\n\nกรุณาเลือกรูปภาพจากแกลเลอรี่แทน';
        } else if (error.name === 'SecurityError') {
          errorMessage = '🔒 ไม่สามารถเข้าถึงกล้องได้เนื่องจากเหตุผลด้านความปลอดภัย\n\n' +
            'กรุณาตรวจสอบการตั้งค่าเบราว์เซอร์หรือเลือกรูปภาพจากแกลเลอรี่แทน';
        }
      }
      
      alert(errorMessage);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraDialog(false);
  };

  // Capture photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(capturedDataUrl);
    stopCamera();
    openCropDialog(capturedDataUrl);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      openCropDialog(result);
    };
    reader.readAsDataURL(file);
  };

  // Open crop dialog
  const openCropDialog = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setShowCropDialog(true);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  // Handle image load
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;

    // Create crop with Thai ID card aspect ratio
    const centerAspectCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, // Increased from 80% to 90% for larger crop
        },
        ID_CARD_RATIO,
        width,
        height
      ),
      width,
      height
    );

    setCrop(centerAspectCrop);
  }, []);

  // Apply crop
  const applyCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(croppedDataUrl);
    onChange(croppedDataUrl);
    setShowCropDialog(false);
    setCapturedImage(null);
  }, [completedCrop, onChange]);

  // Remove image
  const handleRemove = () => {
    setPreview(undefined);
    onChange(undefined);
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <canvas ref={canvasRef} className="hidden" />

      {preview ? (
        <Card className="relative overflow-hidden">
          <div className="w-full relative" style={{ minHeight: '200px' }}>
            <img 
              src={preview} 
              alt="Thai ID Card Preview" 
              className="w-full h-auto object-contain"
              style={{ maxHeight: '400px' }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const modal = document.createElement('div');
                  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                  modal.onclick = () => modal.remove();
                  
                  const modalImg = document.createElement('img');
                  modalImg.src = preview;
                  modalImg.className = 'max-w-full max-h-full object-contain rounded-lg';
                  modalImg.alt = 'รูปบัตรประจำตัวประชาชนขยาย';
                  
                  modal.appendChild(modalImg);
                  document.body.appendChild(modal);
                }}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Eye className="w-4 h-4" />
                ดูรูป
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <X className="w-4 h-4" />
                ลบ
              </Button>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 border-t border-green-200">
            <p className="text-sm text-green-700 flex items-center">
              <Check className="w-4 h-4 mr-2" />
              บัตรประจำตัวประชาชนถูกครอบและบันทึกแล้ว
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card 
            className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="flex gap-4 mb-6">
                <Button
                  type="button"
                  onClick={startCamera}
                  disabled={isRequestingPermission}
                  className="flex flex-col items-center gap-2 h-auto py-4 px-6 bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {isRequestingPermission ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      <span>ขออนุญาต...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8" />
                      <span>ถ่ายภาพ</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 h-auto py-4 px-6"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span>เลือกรูปภาพ</span>
                </Button>
              </div>
              
              <h3 className="text-lg font-medium text-foreground mb-2">
                ถ่ายหรือเลือกรูปบัตรประจำตัวประชาชน
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                ระบบจะให้คุณครอบภาพด้วยตนเองเพื่อความแม่นยำ
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>รองรับไฟล์: JPG, PNG, WEBP (ขนาดไม่เกิน 5MB)</p>
                <p className="text-blue-600 font-medium">
                  📷 แนะนำ: ใช้กล้องถ่ายภาพใหม่เพื่อความชัดเจน
                </p>
                {isMobile() && (
                  <p className="text-amber-600 font-medium mt-2">
                    📱 มือถือ: ระบบจะขออนุญาตใช้งานกล้องก่อนถ่ายภาพ
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <DialogContent className={`${isMobile() ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl'}`}>
          <DialogHeader>
            <DialogTitle>ถ่ายภาพบัตรประจำตัวประชาชน</DialogTitle>
            <DialogDescription>
              วางบัตรประจำตัวประชาชนให้อยู่ในกรอบ แล้วกดปุ่มถ่ายภาพ
              {isMobile() && <><br />📱 หมุนมือถือแนวนอนเพื่อความสะดวก</>}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto max-h-96 bg-black rounded-lg"
            />
            
            {/* ID Card Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Guide frame */}
                <div 
                  className="border-4 border-white/80 rounded-lg shadow-lg"
                  style={{
                    width: '320px',
                    height: `${320 / ID_CARD_RATIO}px`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {/* Corner indicators */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400"></div>
                </div>
                
                {/* Guide text */}
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                  วางบัตรประจำตัวประชาชนให้อยู่ในกรอบ
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mt-4">
            <Button type="button" variant="outline" onClick={stopCamera}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={capturePhoto} className="bg-primary hover:bg-primary/90">
              <Camera className="w-4 h-4 mr-2" />
              ถ่ายภาพ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className={`${isMobile() ? 'max-w-[98vw] max-h-[98vh] p-2' : 'max-w-6xl max-h-[95vh]'}`}>
          <DialogHeader>
            <DialogTitle className={isMobile() ? 'text-lg' : ''}>ครอบภาพบัตรประจำตัวประชาชน</DialogTitle>
            <DialogDescription className={isMobile() ? 'text-sm' : ''}>
              ลากมุมกรอบเพื่อปรับขนาดและตำแหน่งให้เหมาะสม
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center items-center max-h-[70vh] overflow-auto">
            {capturedImage && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={ID_CARD_RATIO}
                minWidth={100}
                minHeight={100 / ID_CARD_RATIO}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={capturedImage}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxWidth: '800px', maxHeight: '600px' }}
                />
              </ReactCrop>
            )}
          </div>
          
          <div className={`flex justify-center gap-4 mt-4 ${isMobile() ? 'pb-4' : ''}`}>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setShowCropDialog(false)}
              className={isMobile() ? 'px-6 py-3 text-base' : ''}
            >
              ยกเลิก
            </Button>
            <Button 
              type="button"
              onClick={applyCrop} 
              className={`bg-primary hover:bg-primary/90 ${isMobile() ? 'px-6 py-3 text-base' : ''}`}
              disabled={!completedCrop}
            >
              <Check className="w-4 h-4 mr-2" />
              ยืนยันการครอบ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};