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
  Download
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
      `${member.title}${member.firstName} ${member.lastName}`,
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
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">เบอร์โทรศัพท์</label>
                    <p>{member.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">อีเมล</label>
                    <p>{member.email || 'ไม่ระบุ'}</p>
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
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          ส่งออกข้อมูล CSV
        </Button>
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
                    {member.title}{member.firstName} {member.lastName}
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
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsEditDialogOpen(true);
                        }}
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