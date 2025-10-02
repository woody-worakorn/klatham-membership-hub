import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  FileText,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { MembershipData } from '@/types/member';
import { MembershipForm } from '@/components/MembershipForm';
import { database } from '@/lib/firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

interface MemberWithId extends MembershipData {
  id: string;
}

export const AdminPanel: React.FC = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberWithId[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<MemberWithId | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Load members from Firebase
  useEffect(() => {
    const membersRef = ref(database, 'members');
    const unsubscribe = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const membersArray: MemberWithId[] = Object.entries(data).map(([id, member]) => ({
          id,
          ...(member as MembershipData)
        }));
        setMembers(membersArray);
      } else {
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter members based on search and status
  useEffect(() => {
    let filtered = members;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.idCard.includes(searchTerm) ||
        member.phone.includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, statusFilter]);

  const updateMemberStatus = async (memberId: string, status: 'approved' | 'rejected') => {
    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { 
        status,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: 'อัปเดตสถานะสำเร็จ',
        description: `สถานะสมาชิกได้ถูกเปลี่ยนเป็น ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} แล้ว`
      });
    } catch (error) {
      console.error('Error updating member status:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
    }
  };

  const deleteMember = async (memberId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลสมาชิกนี้?')) {
      try {
        const memberRef = ref(database, `members/${memberId}`);
        await remove(memberRef);
        
        toast({
          title: 'ลบสำเร็จ',
          description: 'ข้อมูลสมาชิกได้ถูกลบแล้ว'
        });
      } catch (error) {
        console.error('Error deleting member:', error);
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          variant: 'destructive'
        });
      }
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ชื่อ-นามสกุล',
      'เลขบัตรประชาชน',
      'เบอร์โทรศัพท์',
      'อีเมล',
      'ที่อยู่',
      'ประเภทสมาชิก',
      'สถานะ',
      'วันที่สมัคร'
    ];

    const csvData = filteredMembers.map(member => [
      `${!['นาย', 'นาง', 'นางสาว'].includes(member.title) ? ((member as any).titleOther || member.title) : member.title}${member.firstName} ${member.lastName}`,
      member.idCard,
      member.phone,
      member.email || '',
      `${member.houseNumber} ${member.subDistrict} ${member.district} ${member.province}`,
      member.membershipType === 'yearly' ? 'รายปี' : 'ตลอดชีพ',
      member.status === 'pending' ? 'รอดำเนินการ' : member.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ',
      format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: th })
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `members_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-primary text-primary-foreground"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติ</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />รอดำเนินการ</Badge>;
    }
  };

  // ฟังก์ชั่นตรวจสอบสถานะการชำระเงิน
  const checkPaymentStatus = async (chargeId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/check-payment/${chargeId}`);
      const charge = await response.json();
      
      toast({
        title: 'สถานะการชำระเงิน',
        description: `สถานะ: ${charge.status === 'successful' ? 'ชำระเงินสำเร็จ' : 
                      charge.status === 'pending' ? 'รอการชำระเงิน' : 
                      charge.status === 'failed' ? 'การชำระเงินล้มเหลว' : 
                      'ไม่ทราบสถานะ'}`
      });
      
      // อัปเดตสถานะในฐานข้อมูลหากจำเป็น
      if (charge.status === 'successful' && selectedMember?.id) {
        const memberRef = ref(database, `members/${selectedMember.id}`);
        await update(memberRef, { paymentStatus: 'completed' });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถตรวจสอบสถานะการชำระเงินได้',
        variant: 'destructive'
      });
    }
  };

  // ฟังก์ชั่นดาวน์โหลดใบเสร็จ
  const downloadPaymentReceipt = async (chargeId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/check-payment/${chargeId}`);
      const charge = await response.json();
      
      if (charge.status === 'successful') {
        // สร้างใบเสร็จ PDF หรือ HTML
        generateReceipt(charge, selectedMember);
      } else {
        toast({
          title: 'ไม่สามารถดาวน์โหลดใบเสร็จได้',
          description: 'การชำระเงินยังไม่สำเร็จ',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดาวน์โหลดใบเสร็จได้',
        variant: 'destructive'
      });
    }
  };

  // ฟังก์ชันสร้าง PDF ใบสมัครสมาชิกแบบฟอร์ม
  const generateMemberPDF = (member: MemberWithId) => {
    const formHtml = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบสมัครสมาชิกพรรคกล้าธรรม - ${member.firstName} ${member.lastName}</title>
        <style>
          @font-face {
            font-family: 'JenjrusChan';
            src: url('/JenjrusChan.otf') format('opentype');
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            @page { size: A4; margin: 15mm; }
          }
          body { 
            font-family: 'Sarabun', 'TH SarabunPSK', 'Arial', sans-serif; 
            margin: 0;
            padding: 10px;
            font-size: 12px;
            line-height: 1.2;
            color: #000;
          }
          .signature-name {
            font-family: 'JenjrusChan', 'Sarabun', 'TH SarabunPSK', 'Arial', sans-serif;
            font-size: 28px;
            margin: 0 40px;
            font-weight: bold;
            color: #2D3748;
            letter-spacing: 1px;
          }
          .container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 10px;
          }
          .header {
            text-align: center;
            border: 3px solid #17365D;
            padding: 8px 8px 15px 8px;
            
            border-radius: 6px;
            position: relative;
          }
          .logo-section {
            display: flex;
            align-items: center;
            justify-content: space-between;

          }
          .logo {
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 15px;
          }
          .address-box {
            text-align: left;
            font-size: 11px;
            flex: 1;
            margin-left: 15px;
          }
          .photo-box {
            width: 80px;
            height: 100px;
            border: 2px solid #17365D;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            text-align: center;
            background: #f5f5f5;
            overflow: hidden;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            color: #17365D;
            margin: 5px 0;
          }
          .section-title {
            background: #17365D;
            color: white;
            padding: 4px 10px;
            font-weight: bold;
            margin: 10px 0 6px 0;
            border-radius: 3px;
            font-size: 13px;
          }
          .form-row {
            display: flex;
            margin-bottom: 6px;
            align-items: center;
          }
          .form-field {
            margin-right: 15px;
            display: flex;
            align-items: center;
          }
          .form-field label {
            margin-right: 6px;
            white-space: nowrap;
            font-weight: bold;
            font-size: 11px;
          }
          .form-field .value {
            border-bottom: 1px dotted #17365D;
            min-width: 150px;
            padding: 0 5px;
          }
          .form-field.last-in-row {
            flex: 1;
          }
          .form-field.last-in-row .value {
            flex: 1;
            min-width: auto;
          }
          .checkbox {
            width: 16px;
            height: 16px;
            border: 2px solid #17365D;
            display: inline-block;
            margin: 0 5px;
            vertical-align: middle;
            position: relative;
          }
          .checkbox.checked::after {
            content: '✓';
            position: absolute;
            top: -4px;
            left: 2px;
            font-size: 18px;
            font-weight: bold;
          }
          .id-boxes {
            display: flex;
            gap: 8px;
          }
          .id-box {
            width: 25px;
            height: 30px;
            border: 2px solid #17365D;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
          }
          .divider {
            width: 10px;
            height: 2px;
            background: #17365D;
            margin: 0 5px;
            align-self: center;
          }
          .signature-section {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signature-box {
            text-align: center;
            flex: 1;
            margin: 0 15px;
          }
          .id-card-box {
            width: 320px;
            height: 180px;
            border: 2px solid #17365D;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            overflow: hidden;
            margin-right: 15px;
          }
          .id-card-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .signature-line {
            border-bottom: 1px dotted #000;
            width: 200px;
            margin: 40px auto 5px auto;
          }
          .declaration {
            margin: 10px 0;
            line-height: 1.4;
            text-align: justify;
            font-size: 11px;
          }
          .approval-section {
            margin-top: 15px;
            border: 2px solid #17365D;
            padding: 8px;
            border-radius: 3px;
            background: #f8fafc;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header Section -->
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                <img 
                  src="/KLATHAM-LOGO.png" 
                  alt="โลโก้พรรคกล้าธรรม" 
                  style="width: 100px; height: 100px; object-fit: contain;"
                />
              </div>
              
              <div class="address-box">
                <div class="title">ใบสมัครสมาชิกพรรคกล้าธรรม</div>
                <strong>สำนักงานใหญ่พรรคกล้าธรรม</strong><br>
                เลขที่ 130/1 ซอยรัชดาภิเษก 54 ถนนรัชดาภิเษก<br>
                แขวงลาดยาว เขตจตุจักร<br>
                กรุงเทพมหานคร รหัสไปรษณีย์ 10900
              </div>
              
              <div class="photo-box">
                ${member.selfieWithDocumentUrl ? 
                  `<img src="${member.selfieWithDocumentUrl}" alt="รูปถ่ายตนเองพร้อมเอกสาร" />` : 
                  'รูปถ่ายผู้สมัคร<br>ขนาด 1 นิ้ว<br>มีต่อด้านหลัง'
                }
              </div>
            </div>
            
            
          </div>

          <!-- Personal Information Section -->
          <div class="section-title">ข้อมูลทั่วไปของผู้สมัครสมาชิก</div>
          
          <div class="form-row">
            <div class="form-field">
              <label>ชื่อ</label>
              <span class="value" style="min-width: 250px;">${!['นาย', 'นาง', 'นางสาว'].includes(member.title) ? ((member as any).titleOther || member.title) : member.title}${member.firstName}</span>
            </div>
            <div class="form-field last-in-row">
              <label>นามสกุล</label>
              <span class="value">${member.lastName}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>ศาสนา</label>
              <span class="value">${member.religion || '-'}</span>
            </div>
            <div class="form-field last-in-row">
              <span class="checkbox checked"></span>
              <label>สัญชาติไทยโดยการเกิด</label>
              <span class="checkbox"></span>
              <label>สัญชาติไทยโดยการแปลงสัญชาติซึ่งได้สัญชาติมาแล้วไม่น้อยกว่าห้าปี</label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>เลขประจำตัวประชาชน</label>
              <div class="id-boxes">
                ${member.idCard.split('').map((digit, idx) => 
                  (idx === 1 || idx === 5 || idx === 10 || idx === 12) 
                    ? `<div class="divider"></div><div class="id-box">${digit}</div>` 
                    : `<div class="id-box">${digit}</div>`
                ).join('')}
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>วันออกบัตร</label>
              <span class="value">${member.cardExpiryDate ? format(new Date(new Date(member.cardExpiryDate).getTime() - (10 * 365 * 24 * 60 * 60 * 1000)), 'dd/MM/yyyy') : '_______________'}</span>
            </div>
            <div class="form-field last-in-row">
              <label>วันหมดอายุ</label>
              <span class="value">${member.cardExpiryDate ? format(new Date(member.cardExpiryDate), 'dd/MM/yyyy') : '_______________'}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>เกิดวันที่</label>
              <span class="value">${member.birthDate ? format(new Date(member.birthDate), 'dd', { locale: th }) : '____'}</span>
            </div>
            <div class="form-field">
              <label>เดือน</label>
              <span class="value">${member.birthDate ? format(new Date(member.birthDate), 'MMMM', { locale: th }) : '_______________'}</span>
            </div>
            <div class="form-field">
              <label>พ.ศ.</label>
              <span class="value">${member.birthDate ? (new Date(member.birthDate).getFullYear() + 543) : '______'}</span>
            </div>
            <div class="form-field last-in-row">
              <label>อายุ</label>
              <span class="value">${member.birthDate ? (new Date().getFullYear() - new Date(member.birthDate).getFullYear()) : '____'}</span>
              <label>ปี</label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>ที่อยู่ตามทะเบียนบ้าน บ้านเลขที่</label>
              <span class="value" style="min-width: 100px;">${member.houseNumber || '-'}</span>
            </div>
            <div class="form-field">
              <label>หมู่บ้าน</label>
              <span class="value" style="min-width: 150px;">${member.village || '-'}</span>
            </div>
            <div class="form-field last-in-row">
              <label>ซอย</label>
              <span class="value">${member.soi || '-'}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>ถนน</label>
              <span class="value" style="min-width: 120px;">${member.road || '-'}</span>
            </div>
            <div class="form-field">
              <label>หมู่ที่</label>
              <span class="value" style="min-width: 60px;">${member.moo || '-'}</span>
            </div>
            <div class="form-field last-in-row">
              <label>แขวง/ตำบล</label>
              <span class="value">${member.subDistrict}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>เขต/อำเภอ</label>
              <span class="value" style="min-width: 150px;">${member.district}</span>
            </div>
            <div class="form-field">
              <label>จังหวัด</label>
              <span class="value" style="min-width: 150px;">${member.province}</span>
            </div>
            <div class="form-field last-in-row">
              <label>รหัสไปรษณีย์</label>
              <span class="value">${member.postalCode}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>เบอร์โทรศัพท์</label>
              <span class="value" style="min-width: 150px;">${member.phone}</span>
            </div>
            <div class="form-field">
              <label>Email</label>
              <span class="value" style="min-width: 180px;">${member.email || '-'}</span>
            </div>
            <div class="form-field last-in-row">
              <label>ID Line</label>
              <span class="value">${member.lineId || '-'}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field last-in-row" style="width: 100%;">
              <label>ความคิดเห็นทางการเมืองของผู้สมัคร (ถ้ามี)</label>
            </div>
          </div>
          <div style="border-bottom: 1px dotted #17365D; min-height: 60px; padding: 5px;">
            ${member.politicalOpinion || '-'}
          </div>

          <!-- Declaration Section -->
          <div class="declaration">
            ข้าพเจ้าขอรับรองว่า เงินค่าบำรุงพรรคเป็นเงินของข้าพเจ้าจริง และข้าพเจ้าได้ตรวจสอบคุณสมบัติและลักษณะต้องห้ามตามที่ระบุไว้ด้านหลังใบสมัครนี้
            โดยครบถ้วนถูกต้องทุกประการแล้ว ขอยืนยันว่าข้าพเจ้าเป็นบุคคลซึ่งมีคุณสมบัติและไม่มีลักษณะต้องห้ามการเป็นสมาชิกพรรคการเมืองตามมาตรา 24 แห่งพระราชบัญญัติ
            ประกอบรัฐธรรมนูญว่าด้วยพรรคการเมือง (ฉบับที่ 2) พ.ศ. 2566
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>ข้าพเจ้าได้ชำระค่าบำรุงพรรค</label>
              <span class="checkbox ${member.membershipType === 'yearly' ? 'checked' : ''}"></span>
              <label>รายปี 20 บาท</label>
              <span class="checkbox ${member.membershipType === 'lifetime' ? 'checked' : ''}"></span>
              <label>ตลอดชีพ 200 บาท</label>
              <label>มาพร้อมกันนี้แล้ว</label>
            </div>
          </div>

          <div class="signature-section">
            <div class="id-card-box">
              ${member.idCardImageUrl ? 
                `<img src="${member.idCardImageUrl}" alt="รูปบัตรประจำตัวประชาชน" />` : 
                '<div style="text-align: center; font-size: 16px; font-weight: bold;">รูปบัตรประจำตัว<br>ประชาชน</div>'
              }
            </div>
            <div class="signature-box">
              <div>ลงนาม <span class="signature-name">${member.firstName} ${member.lastName}</span> ผู้สมัคร</div>
              <div style="margin-top: 10px;">( ${!['นาย', 'นาง', 'นางสาว'].includes(member.title) ? ((member as any).titleOther || member.title) : member.title}${member.firstName} ${member.lastName} )</div>
              <div style="margin-top: 10px;">วันที่ ${format(new Date(member.createdAt), 'dd', { locale: th })} เดือน ${format(new Date(member.createdAt), 'MMMM', { locale: th })} พ.ศ. ${new Date(member.createdAt).getFullYear() + 543}</div>
            </div>
          </div>

          <!-- Approval Section -->
          <div class="approval-section">
            <div class="section-title" style="margin-top: 0;">สำหรับพรรคการเมือง</div>
            
            <div class="declaration">
              ข้าพเจ้านายทะเบียนสมาชิกพรรคกล้าธรรมได้พิจารณาและตรวจสอบคุณสมบัติแล้วเห็นว่ามีคุณสมบัติและไม่มีลักษณะต้องห้ามตาม
              มาตรา 24 แห่งพระราชบัญญัติประกอบรัฐธรรมนูญว่าด้วยพรรคการเมือง (ฉบับที่ 2) พ.ศ. 2566 ตามที่ผู้สมัครรับรอง
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div>ลงนาม _________________________________</div>
                <div style="margin-top: 10px;">( _________________________________ )</div>
                <div style="margin-top: 10px;">นายทะเบียนสมาชิกพรรคกล้าธรรม</div>
              </div>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;
    
    // เปิดหน้าต่างใหม่และพิมพ์
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(formHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // ฟังก์ชันสร้าง PDF รายชื่อสมาชิกทั้งหมด (เก็บไว้สำหรับการพิมพ์รายงาน)
  const generateBulkMemberPDF = (members: MemberWithId[]) => {
    const bulkHtml = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>รายชื่อสมาชิกพรรคกล้าธรรม</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
          body { 
            font-family: 'Sarabun', 'Arial', sans-serif; 
            margin: 20px; 
            line-height: 1.4;
            color: #333;
            font-size: 12px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 15px;
            border-bottom: 3px solid #63D777;
          }
          .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #63D777; 
            margin-bottom: 8px;
          }
          .title { 
            font-size: 20px; 
            margin: 8px 0; 
            color: #2D3748;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
          }
          .summary {
            background: #F7FAFC;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #63D777;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            text-align: center;
          }
          .summary-item {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #E2E8F0;
          }
          .summary-number {
            font-size: 18px;
            font-weight: bold;
            color: #2D3748;
          }
          .summary-label {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 11px;
          }
          th, td { 
            border: 1px solid #E2E8F0; 
            padding: 8px 6px; 
            text-align: left;
          }
          th { 
            background: #63D777; 
            color: white; 
            font-weight: bold;
            text-align: center;
          }
          tr:nth-child(even) { 
            background: #F7FAFC; 
          }
          tr:hover { 
            background: #E6FFFA; 
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-approved { background: #C6F6D5; color: #22543D; }
          .status-pending { background: #FEFCBF; color: #744210; }
          .status-rejected { background: #FED7D7; color: #742A2A; }
          .membership-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            background: #E2E8F0;
            color: #4A5568;
          }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 10px; 
            color: #666;
            border-top: 1px solid #E2E8F0;
            padding-top: 15px;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">พรรคกล้าธรรม</div>
          <div class="title">รายชื่อสมาชิกพรรคการเมือง</div>
          <div class="subtitle">ระบบจัดการสมาชิกออนไลน์</div>
        </div>
        
        <div class="summary">
          <h3 style="margin: 0 0 15px 0; color: #2D3748;">สรุปข้อมูลสมาชิก</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-number">${members.length}</div>
              <div class="summary-label">สมาชิกทั้งหมด</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${members.filter(m => m.status === 'approved').length}</div>
              <div class="summary-label">อนุมัติแล้ว</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${members.filter(m => m.status === 'pending').length}</div>
              <div class="summary-label">รอดำเนินการ</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${members.filter(m => m.membershipType === 'yearly').length}</div>
              <div class="summary-label">สมาชิกรายปี</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="5%">ลำดับ</th>
              <th width="25%">ชื่อ-นามสกุล</th>
              <th width="15%">เลขบัตรประชาชน</th>
              <th width="12%">เบอร์โทรศัพท์</th>
              <th width="20%">ที่อยู่</th>
              <th width="10%">ประเภท</th>
              <th width="8%">สถานะ</th>
              <th width="10%">วันที่สมัคร</th>
            </tr>
          </thead>
          <tbody>
            ${members.map((member, index) => `
              <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${!['นาย', 'นาง', 'นางสาว'].includes(member.title) ? ((member as any).titleOther || member.title) : member.title} ${member.firstName} ${member.lastName}</td>
                <td style="font-family: monospace;">${member.idCard}</td>
                <td>${member.phone}</td>
                <td style="font-size: 10px;">
                  ${member.subDistrict}, ${member.district}<br>
                  ${member.province} ${member.postalCode}
                </td>
                <td style="text-align: center;">
                  <span class="membership-badge">
                    ${member.membershipType === 'yearly' ? 'รายปี' : 'ตลอดชีพ'}
                  </span>
                </td>
                <td style="text-align: center;">
                  <span class="status-badge status-${member.status === 'approved' ? 'approved' : member.status === 'pending' ? 'pending' : 'rejected'}">
                    ${member.status === 'approved' ? 'อนุมัติ' : member.status === 'pending' ? 'รอ' : 'ปฏิเสธ'}
                  </span>
                </td>
                <td style="text-align: center;">
                  ${format(new Date(member.createdAt), 'dd/MM/yy', { locale: th })}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p><strong>พรรคกล้าธรรม</strong> - ระบบจัดการสมาชิกออนไลน์</p>
          <p>พิมพ์เมื่อ: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: th })} น.</p>
          <p style="margin-top: 8px; font-size: 9px;">
            เอกสารนี้สร้างขึ้นโดยอัตโนมัติจากระบบจัดการสมาชิกพรรคกล้าธรรม<br>
            สำหรับการใช้งานภายในองค์กรเท่านั้น | จำนวนสมาชิกในรายงาน: ${members.length} คน
          </p>
        </div>
      </body>
      </html>
    `;
    
    // เปิดหน้าต่างใหม่และพิมพ์
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(bulkHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // ฟังก์ชั่นสร้างใบเสร็จ
  const generateReceipt = (charge: any, member: MemberWithId | null) => {
    if (!member) return;
    
    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบเสร็จรับเงิน - พรรคกล้าธรรม</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #63D777; }
          .receipt-title { font-size: 20px; margin: 10px 0; }
          .content { line-height: 1.6; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          .amount { font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">พรรคกล้าธรรม</div>
          <div class="receipt-title">ใบเสร็จรับเงินค่าสมาชิก</div>
        </div>
        
        <div class="content">
          <div class="row">
            <span>ชื่อ-นามสกุล:</span>
            <span>${!['นาย', 'นาง', 'นางสาว'].includes(member.title) ? ((member as any).titleOther || member.title) : member.title}${member.firstName} ${member.lastName}</span>
          </div>
          <div class="row">
            <span>เลขประจำตัวประชาชน:</span>
            <span>${member.idCard}</span>
          </div>
          <div class="row">
            <span>ประเภทสมาชิก:</span>
            <span>${member.membershipType === 'yearly' ? 'สมาชิกรายปี' : 'สมาชิกตลอดชีพ'}</span>
          </div>
          <div class="row">
            <span>รหัสการชำระเงิน:</span>
            <span>${chargeId}</span>
          </div>
          <div class="row">
            <span>วันที่ชำระเงิน:</span>
            <span>${format(new Date(), 'dd MMMM yyyy', { locale: th })}</span>
          </div>
          
          <div class="amount">
            <div class="row">
              <span>จำนวนเงิน:</span>
              <span>${member.membershipType === 'yearly' ? '20' : '200'} บาท</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>พรรคกล้าธรรม - ระบบสมัครสมาชิกออนไลน์</p>
          <p>ออกใบเสร็จเมื่อ: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: th })}</p>
        </div>
      </body>
      </html>
    `;
    
    // เปิดหน้าต่างใหม่และพิมพ์
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const MemberDetailDialog = ({ member, isOpen, onClose }: { member: MemberWithId | null, isOpen: boolean, onClose: () => void }) => {
    if (!member) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ข้อมูลสมาชิก</DialogTitle>
            <DialogDescription>
              รายละเอียดข้อมูลสมาชิกพรรคกล้าธรรม
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {/* ข้อมูลส่วนตัว */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลส่วนตัว</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ชื่อ-นามสกุล</label>
                    <p>{member.title}{member.titleOther ? member.titleOther : ''}{member.firstName} {member.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ศาสนา</label>
                    <p>{member.religion}{member.religionOther ? ` (${member.religionOther})` : ''}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">สัญชาติ</label>
                    <p>{member.nationality}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">เลขประจำตัวประชาชน</label>
                    <p>{member.idCard}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">วันเกิด</label>
                    <p>{format(new Date(member.birthDate), 'dd MMMM yyyy', { locale: th })}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">วันหมดอายุบัตร</label>
                    <p>{format(new Date(member.cardExpiryDate), 'dd MMMM yyyy', { locale: th })}</p>
                  </div>
                </CardContent>
              </Card>

              {/* ที่อยู่ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ที่อยู่</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    {member.houseNumber} 
                    {member.village && ` หมู่บ้าน${member.village}`}
                    {member.soi && ` ซอย${member.soi}`}
                    {member.road && ` ถนน${member.road}`}
                    {member.moo && ` หมู่${member.moo}`}
                    <br />
                    ตำบล{member.subDistrict} อำเภอ{member.district} จังหวัด{member.province} {member.postalCode}
                  </p>
                </CardContent>
              </Card>

              {/* ข้อมูลติดต่อ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลติดต่อ</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">เบอร์โทรศัพท์</label>
                    <p>{member.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">อีเมล</label>
                    <p>{member.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID Line</label>
                    <p>{member.lineId || '-'}</p>
                  </div>
                  {member.politicalOpinion && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">ความเห็นทางการเมือง</label>
                      <p>{member.politicalOpinion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ประเภทสมาชิก */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ประเภทสมาชิก</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{member.membershipType === 'yearly' ? 'สมัครแบบรายปี 20 บาท/ปี' : 'สมัครแบบตลอดชีพ 200 บาท'}</p>
                </CardContent>
              </Card>

              {/* รูปภาพ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">เอกสารประกอบ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {member.selfieWithDocumentUrl && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">รูปถ่ายตนเองพร้อมเอกสาร</label>
                      <div className="mt-2">
                        <img 
                          src={member.selfieWithDocumentUrl} 
                          alt="รูปถ่ายตนเองพร้อมเอกสาร" 
                          className="max-w-md rounded-lg border"
                        />
                      </div>
                    </div>
                  )}
                  {member.idCardImageUrl && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">รูปบัตรประจำตัวประชาชน</label>
                      <div className="mt-2">
                        <img 
                          src={member.idCardImageUrl} 
                          alt="รูปบัตรประจำตัวประชาชน" 
                          className="max-w-md rounded-lg border"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* หลักฐานการชำระเงิน */}
              {((member as any).chargeId || (member as any).paymentStatus) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">หลักฐานการชำระเงิน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">สถานะการชำระเงิน</label>
                        <div className="mt-1">
                          {(member as any).paymentStatus === 'completed' ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              ชำระเงินแล้ว
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              รอการชำระเงิน
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(member as any).chargeId && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">รหัสการชำระเงิน</label>
                          <p className="font-mono text-sm">{(member as any).chargeId}</p>
                        </div>
                      )}
                    </div>
                    
                    {(member as any).chargeId && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">ตรวจสอบสถานะการชำระเงิน</label>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => checkPaymentStatus((member as any).chargeId)}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            ตรวจสอบสถานะ
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadPaymentReceipt((member as any).chargeId)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            ดาวน์โหลดใบเสร็จ
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <p>จำนวนเงิน: {member.membershipType === 'yearly' ? '20 บาท' : '200 บาท'}</p>
                      <p>ช่องทางการชำระ: PromptPay QR Code</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* สถานะและวันที่ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลระบบ</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
                    <div className="mt-1">
                      {getStatusBadge(member.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">วันที่สมัคร</label>
                    <p>{format(new Date(member.createdAt), 'dd MMMM yyyy HH:mm', { locale: th })}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">อัปเดตล่าสุด</label>
                    <p>{format(new Date(member.updatedAt), 'dd MMMM yyyy HH:mm', { locale: th })}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-hero bg-clip-text text-transparent">
            ระบบบริหารจัดการสมาชิก
          </h1>
          <p className="text-muted-foreground mt-1">
            จัดการข้อมูลสมาชิกพรรคกล้าธรรม
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            ส่งออกข้อมูล CSV
          </Button>
          <Button 
            type="button"
            onClick={() => generateBulkMemberPDF(filteredMembers)} 
            variant="outline" 
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายชื่อสมาชิก PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">สมาชิกทั้งหมด</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">อนุมัติแล้ว</p>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-accent" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">รอดำเนินการ</p>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">ปฏิเสธ</p>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาด้วยชื่อ, เลขบัตรประชาชน, เบอร์โทรศัพท์"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ปฏิเสธ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>เลขบัตรประชาชน</TableHead>
                <TableHead>เบอร์โทรศัพท์</TableHead>
                <TableHead>ประเภทสมาชิก</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่สมัคร</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {!['นาย', 'นาง', 'นางสาว'].includes(member.title) ? ((member as any).titleOther || member.title) : member.title}{member.firstName} {member.lastName}
                  </TableCell>
                  <TableCell>{member.idCard}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {member.membershipType === 'yearly' ? 'รายปี' : 'ตลอดชีพ'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>
                    {format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: th })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsViewDialogOpen(true);
                        }}
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateMemberPDF(member)}
                        title="พิมพ์ PDF ใบสมัครสมาชิก"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsEditDialogOpen(true);
                        }}
                        title="แก้ไขข้อมูล"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {member.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateMemberStatus(member.id, 'approved')}
                            className="text-primary hover:text-primary"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateMemberStatus(member.id, 'rejected')}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ไม่พบข้อมูลสมาชิก</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Member Dialog */}
      <MemberDetailDialog 
        member={selectedMember}
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedMember(null);
        }}
      />

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลสมาชิก</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลสมาชิกพรรคกล้าธรรม
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[600px] pr-4">
            {selectedMember && (
              <MembershipForm
                initialData={selectedMember}
                memberId={selectedMember.id}
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  setSelectedMember(null);
                }}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};