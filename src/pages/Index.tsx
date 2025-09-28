import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, UserPlus, Shield } from 'lucide-react';

import { MembershipForm } from '@/components/MembershipForm';
import { AdminPanel } from '@/components/AdminPanel';

const Index = () => {
  const [activeTab, setActiveTab] = useState<string>('register');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary-foreground/5 to-primary/10">
      {/* Header */}
      <header className="gradient-hero text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            พรรคกล้าธรรม
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            ระบบสมัครสมาชิกออนไลน์
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setActiveTab('register')}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              สมัครสมาชิก
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setActiveTab('admin')}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <Shield className="w-5 h-5 mr-2" />
              ระบบผู้ดูแล
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="register" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              สมัครสมาชิก
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              ระบบผู้ดูแล
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-6">
            <div className="text-center mb-8">
              <Card className="inline-block shadow-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Users className="w-6 h-6" />
                    สมัครสมาชิกพรรคกล้าธรรม
                  </CardTitle>
                  <CardDescription>
                    เข้าร่วมกับเราเพื่อการเมืองที่สะอาดและโปร่งใส
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            <MembershipForm />
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <AdminPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © 2024 พรรคกล้าธรรม - ระบบสมัครสมาชิกออนไลน์
          </p>
          <p className="text-xs opacity-60 mt-2">
            พัฒนาด้วย Firebase Realtime Database
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
