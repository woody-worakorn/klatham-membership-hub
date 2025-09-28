import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label,
  description,
  required = false,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024* 1024) {
      alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onChange(result);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

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

      {preview ? (
        <Card className="relative overflow-hidden">
          <div className="aspect-video w-full relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(preview, '_blank')}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Eye className="w-4 h-4" />
                ดูรูป
              </Button>
              <Button
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
        </Card>
      ) : (
        <Card 
          className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              อัปโหลดรูปภาพ
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
            </p>
            <p className="text-xs text-muted-foreground">
              รองรับไฟล์: JPG, PNG, WEBP (ขนาดไม่เกิน 5MB)
            </p>
          </div>
        </Card>
      )}

      {isUploading && (
        <div className="text-sm text-muted-foreground">กำลังอัปโหลด...</div>
      )}
    </div>
  );
};