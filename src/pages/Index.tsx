import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import { MembershipForm } from '@/components/MembershipForm';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary-foreground/5 to-primary/10">
      {/* Header */}


      {/* Logo Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <img 
            src="/KLATHAM-LOGO.png" 
            alt="พรรคกล้าธรรม" 
            className="h-60 md:h-32 w-auto object-contain"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <MembershipForm initialData={location.state?.membershipData} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © {new Date().getFullYear()} พรรคกล้าธรรม - ระบบสมัครสมาชิกพรรคกล้าธรรมออนไลน์
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
