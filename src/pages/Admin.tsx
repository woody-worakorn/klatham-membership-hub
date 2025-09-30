import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPanel } from '@/components/AdminPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'ออกจากระบบสำเร็จ',
        description: 'ขอบคุณที่ใช้งานระบบ',
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถออกจากระบบได้',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary-foreground/5 to-primary/10">
      {/* Header */}
      <header className="gradient-hero text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                  <Shield className="w-8 h-8" />
                  ระบบผู้ดูแล
                </h1>
                <p className="text-lg opacity-90 mt-1">
                  จัดการข้อมูลสมาชิกพรรคกล้าธรรม
                </p>
              </div>
            </div>
            
            {/* User Info and Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-white/90">
                  <User className="w-4 h-4" />
                  <span className="text-sm">
                    {currentUser?.email}
                  </span>
                </div>
                <p className="text-xs text-white/70">ผู้ดูแลระบบ</p>
              </div>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-red-500/20 hover:text-red-100"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AdminPanel />
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © 2024 พรรคกล้าธรรม - ระบบบริหารจัดการสมาชิก
          </p>
          <p className="text-xs opacity-60 mt-2">
            พัฒนาด้วย Firebase Realtime Database
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
