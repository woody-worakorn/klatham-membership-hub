import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInYears, isAfter, isBefore } from 'date-fns';
import { th } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ImageUpload } from '@/components/ui/image-upload';
import { CalendarIcon, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { useThaiAddress } from '@/hooks/useThaiAddress';
import { MembershipData, TITLES, RELIGIONS, NATIONALITIES, MEMBERSHIP_TYPES } from '@/types/member';
import { database } from '@/lib/firebase';
import { ref, push, set, update, remove } from 'firebase/database';

// Validation schema
const membershipSchema = z.object({
  title: z.string().min(1, 'กรุณาเลือกคำนำหน้าชื่อ'),
  titleOther: z.string().optional(),
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().optional(),
  religion: z.string().min(1, 'กรุณาเลือกศาสนา'),
  religionOther: z.string().optional(),
  nationality: z.string().min(1, 'กรุณาเลือกสัญชาติ'),
  idCard: z.string().regex(/^\d{13}$/, 'เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก'),
  cardIssueDate: z.date({ required_error: 'กรุณาเลือกวันที่ออกบัตร' }),
  cardExpiryDate: z.date({ required_error: 'กรุณาเลือกวันหมดอายุ' }),
  birthDate: z.date({ required_error: 'กรุณาเลือกวันเกิด' }),
  houseNumber: z.string().min(1, 'กรุณากรอกเลขที่'),
  village: z.string().optional(),
  soi: z.string().optional(),
  road: z.string().optional(),
  moo: z.string().optional(),
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกเขต/อำเภอ'),
  subDistrict: z.string().min(1, 'กรุณาเลือกแขวง/ตำบล'),
  postalCode: z.string().min(1, 'รหัสไปรษณีย์จะถูกกรอกอัตโนมัติ'),
  phone: z.string().regex(/^(\+66|0)[0-9]{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง'),
  email: z.string().email('กรุณากรอกอีเมลที่ถูกต้อง').optional().or(z.literal('')),
  politicalOpinion: z.string().optional(),
  membershipType: z.enum(['yearly', 'lifetime']),
  selfieWithDocumentUrl: z.string().min(1, 'กรุณาอัปโหลดรูปถ่ายตนเองพร้อมเอกสาร'),
  idCardImageUrl: z.string().min(1, 'กรุณาอัปโหลดรูปบัตรประชาชน')
}).refine((data) => {
  if (data.title === 'อื่นๆ' && !data.titleOther) {
    return false;
  }
  return true;
}, {
  message: 'กรุณาระบุคำนำหน้าชื่ออื่นๆ',
  path: ['titleOther']
}).refine((data) => {
  if (data.religion === 'อื่นๆ' && !data.religionOther) {
    return false;
  }
  return true;
}, {
  message: 'กรุณาระบุศาสนาอื่นๆ',
  path: ['religionOther']
}).refine((data) => {
  return isAfter(data.cardExpiryDate, data.cardIssueDate);
}, {
  message: 'วันหมดอายุต้องมากกว่าวันที่ออกบัตร',
  path: ['cardExpiryDate']
}).refine((data) => {
  return isBefore(data.cardExpiryDate, new Date());
}, {
  message: 'วันหมดอายุต้องน้อยกว่าวันปัจจุบัน',
  path: ['cardExpiryDate']
}).refine((data) => {
  const age = differenceInYears(new Date(), data.birthDate);
  return age >= 18;
}, {
  message: 'อายุต้องไม่ต่ำกว่า 18 ปีบริบูรณ์',
  path: ['birthDate']
});

type MembershipFormData = z.infer<typeof membershipSchema>;

interface MembershipFormProps {
  initialData?: Partial<MembershipData>;
  memberId?: string;
  onSuccess?: () => void;
}

export const MembershipForm: React.FC<MembershipFormProps> = ({
  initialData,
  memberId,
  onSuccess
}) => {
  const { toast } = useToast();
  const { provinces, districts, subDistricts, loading, loadDistricts, loadSubDistricts, getPostalCode } = useThaiAddress();
  
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | undefined>();
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>();
  const [selectedSubDistrictId, setSelectedSubDistrictId] = useState<number | undefined>();

  const form = useForm<MembershipFormData>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      title: initialData?.title || '',
      titleOther: initialData?.titleOther || '',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      religion: initialData?.religion || '',
      religionOther: initialData?.religionOther || '',
      nationality: initialData?.nationality || NATIONALITIES[0],
      idCard: initialData?.idCard || '',
      cardIssueDate: initialData?.cardIssueDate ? new Date(initialData.cardIssueDate) : undefined,
      cardExpiryDate: initialData?.cardExpiryDate ? new Date(initialData.cardExpiryDate) : undefined,
      birthDate: initialData?.birthDate ? new Date(initialData.birthDate) : undefined,
      houseNumber: initialData?.houseNumber || '',
      village: initialData?.village || '',
      soi: initialData?.soi || '',
      road: initialData?.road || '',
      moo: initialData?.moo || '',
      province: initialData?.province || '',
      district: initialData?.district || '',
      subDistrict: initialData?.subDistrict || '',
      postalCode: initialData?.postalCode || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      politicalOpinion: initialData?.politicalOpinion || '',
      membershipType: (initialData?.membershipType as 'yearly' | 'lifetime') || 'yearly',
      selfieWithDocumentUrl: initialData?.selfieWithDocumentUrl || '',
      idCardImageUrl: initialData?.idCardImageUrl || ''
    }
  });

  // Watch form values for conditional rendering
  const watchTitle = form.watch('title');
  const watchReligion = form.watch('religion');

  // Handle province change
  const handleProvinceChange = (provinceId: string) => {
    const province = provinces.find(p => p.id.toString() === provinceId);
    if (province) {
      setSelectedProvinceId(province.id);
      form.setValue('province', province.name_th);
      form.setValue('district', '');
      form.setValue('subDistrict', '');
      form.setValue('postalCode', '');
      loadDistricts(province.id);
    }
  };

  // Handle district change
  const handleDistrictChange = (districtId: string) => {
    const district = districts.find(d => d.id.toString() === districtId);
    if (district) {
      setSelectedDistrictId(district.id);
      form.setValue('district', district.name_th);
      form.setValue('subDistrict', '');
      form.setValue('postalCode', '');
      loadSubDistricts(district.id);
    }
  };

  // Handle sub-district change
  const handleSubDistrictChange = (subDistrictId: string) => {
    const subDistrict = subDistricts.find(sd => sd.id.toString() === subDistrictId);
    if (subDistrict) {
      setSelectedSubDistrictId(subDistrict.id);
      form.setValue('subDistrict', subDistrict.name_th);
      const postalCode = getPostalCode(subDistrict.id);
      form.setValue('postalCode', postalCode);
    }
  };

  const onSubmit = async (data: MembershipFormData) => {
    try {
      const membershipData: MembershipData = {
        title: data.title,
        titleOther: data.titleOther,
        firstName: data.firstName,
        lastName: data.lastName,
        religion: data.religion,
        religionOther: data.religionOther,
        nationality: data.nationality,
        idCard: data.idCard,
        cardIssueDate: format(data.cardIssueDate, 'yyyy-MM-dd'),
        cardExpiryDate: format(data.cardExpiryDate, 'yyyy-MM-dd'),
        birthDate: format(data.birthDate, 'yyyy-MM-dd'),
        houseNumber: data.houseNumber,
        village: data.village,
        soi: data.soi,
        road: data.road,
        moo: data.moo,
        province: data.province,
        district: data.district,
        subDistrict: data.subDistrict,
        postalCode: data.postalCode,
        phone: data.phone,
        email: data.email,
        politicalOpinion: data.politicalOpinion,
        membershipType: data.membershipType,
        selfieWithDocumentUrl: data.selfieWithDocumentUrl,
        idCardImageUrl: data.idCardImageUrl,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: initialData?.status || 'pending'
      };

      if (memberId) {
        // Update existing member
        const memberRef = ref(database, `members/${memberId}`);
        await update(memberRef, membershipData);
        toast({
          title: 'บันทึกสำเร็จ',
          description: 'ข้อมูลสมาชิกได้ถูกอัปเดตแล้ว'
        });
      } else {
        // Create new member
        const membersRef = ref(database, 'members');
        await push(membersRef, membershipData);
        toast({
          title: 'สมัครสมาชิกสำเร็จ',
          description: 'ข้อมูลการสมัครสมาชิกได้ถูกบันทึกแล้ว'
        });
        form.reset();
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving membership data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!memberId) return;

    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลสมาชิกนี้?')) {
      try {
        const memberRef = ref(database, `members/${memberId}`);
        await remove(memberRef);
        toast({
          title: 'ลบสำเร็จ',
          description: 'ข้อมูลสมาชิกได้ถูกลบแล้ว'
        });
        onSuccess?.();
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-hero bg-clip-text text-transparent">
          {memberId ? 'แก้ไขข้อมูลสมาชิก' : 'สมัครสมาชิกพรรคกล้าธรรม'}
        </h1>
        <p className="text-muted-foreground mt-2">
          กรุณากรอกข้อมูลให้ครบถ้วนและตรวจสอบความถูกต้อง
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* ข้อมูลส่วนตัว */}
          <Card className="shadow-primary">
            <CardHeader>
              <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              <CardDescription>กรุณากรอกข้อมูลส่วนตัวของท่าน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>คำนำหน้าชื่อ *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกคำนำหน้าชื่อ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TITLES.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchTitle === 'อื่นๆ' && (
                  <FormField
                    control={form.control}
                    name="titleOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ระบุคำนำหน้าชื่ออื่นๆ *</FormLabel>
                        <FormControl>
                          <Input placeholder="ระบุคำนำหน้าชื่อ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อ (ภาษาไทย) *</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกชื่อ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>นามสกุล (ภาษาไทย)</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกนามสกุล" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ศาสนา *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกศาสนา" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RELIGIONS.map((religion) => (
                            <SelectItem key={religion} value={religion}>
                              {religion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchReligion === 'อื่นๆ' && (
                  <FormField
                    control={form.control}
                    name="religionOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ระบุศาสนาอื่นๆ *</FormLabel>
                        <FormControl>
                          <Input placeholder="ระบุศาสนา" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>สัญชาติ *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกสัญชาติ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NATIONALITIES.map((nationality) => (
                          <SelectItem key={nationality} value={nationality}>
                            {nationality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ข้อมูลบัตรประชาชน */}
          <Card className="shadow-secondary">
            <CardHeader>
              <CardTitle>ข้อมูลบัตรประจำตัวประชาชน</CardTitle>
              <CardDescription>กรุณากรอกข้อมูลตามบัตรประจำตัวประชาชน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="idCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขประจำตัวประชาชน *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="กรอกเลขประจำตัวประชาชน 13 หลัก" 
                        maxLength={13}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="cardIssueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>วันที่ออกบัตร *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd MMMM yyyy", { locale: th })
                              ) : (
                                <span>เลือกวันที่</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardExpiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>วันหมดอายุ *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd MMMM yyyy", { locale: th })
                              ) : (
                                <span>เลือกวันที่</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>วันเกิด *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd MMMM yyyy", { locale: th })
                              ) : (
                                <span>เลือกวันที่</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ที่อยู่ */}
          <Card className="shadow-accent">
            <CardHeader>
              <CardTitle>ที่อยู่ตามทะเบียนบ้าน</CardTitle>
              <CardDescription>กรุณากรอกที่อยู่ตามทะเบียนบ้าน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="houseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เลขที่ *</FormLabel>
                      <FormControl>
                        <Input placeholder="เลขที่" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="village"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมู่บ้าน</FormLabel>
                      <FormControl>
                        <Input placeholder="หมู่บ้าน" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="soi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ซอย</FormLabel>
                      <FormControl>
                        <Input placeholder="ซอย" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="road"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ถนน</FormLabel>
                      <FormControl>
                        <Input placeholder="ถนน" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมู่ที่</FormLabel>
                      <FormControl>
                        <Input placeholder="หมู่ที่" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>จังหวัด *</FormLabel>
                      <Select onValueChange={handleProvinceChange} value={selectedProvinceId?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกจังหวัด" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.id.toString()}>
                              {province.name_th}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เขต/อำเภอ *</FormLabel>
                      <Select 
                        onValueChange={handleDistrictChange} 
                        value={selectedDistrictId?.toString()}
                        disabled={!selectedProvinceId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกเขต/อำเภอ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district.id} value={district.id.toString()}>
                              {district.name_th}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subDistrict"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>แขวง/ตำบล *</FormLabel>
                      <Select 
                        onValueChange={handleSubDistrictChange} 
                        value={selectedSubDistrictId?.toString()}
                        disabled={!selectedDistrictId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกแขวง/ตำบล" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subDistricts.map((subDistrict) => (
                            <SelectItem key={subDistrict.id} value={subDistrict.id.toString()}>
                              {subDistrict.name_th}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รหัสไปรษณีย์ *</FormLabel>
                      <FormControl>
                        <Input placeholder="รหัสไปรษณีย์" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลติดต่อ */}
          <Card className="shadow-primary">
            <CardHeader>
              <CardTitle>ข้อมูลการติดต่อ</CardTitle>
              <CardDescription>กรุณากรอกข้อมูลสำหรับการติดต่อ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เบอร์โทรศัพท์ (มือถือ) *</FormLabel>
                      <FormControl>
                        <Input placeholder="08x-xxx-xxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>อีเมล</FormLabel>
                      <FormControl>
                        <Input placeholder="example@email.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="politicalOpinion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ความเห็นทางการเมือง (ถ้ามี)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="แสดงความเห็นหรือข้อเสนอแนะทางการเมือง (ไม่บังคับ)"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* การต่ออายุ */}
          <Card className="shadow-secondary">
            <CardHeader>
              <CardTitle>รูปแบบการต่ออายุ</CardTitle>
              <CardDescription>เลือกรูปแบบการสมัครสมาชิก</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="membershipType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {MEMBERSHIP_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={type.value} id={type.value} />
                            <label 
                              htmlFor={type.value}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {type.label}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* รูปภาพ */}
          <Card className="shadow-accent">
            <CardHeader>
              <CardTitle>เอกสารประกอบการสมัคร</CardTitle>
              <CardDescription>กรุณาอัปโหลดรูปภาพตามที่กำหนด</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="selfieWithDocumentUrl"
                render={({ field }) => (
                  <FormItem>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      label="รูปถ่ายตนเองพร้อมเอกสารยืนยันการสมัคร"
                      description={`กรุณาถ่ายรูปตนเองพร้อมกับกระดาษที่เขียนข้อความ "ข้าพเจ้า ${form.watch('firstName')} ${form.watch('lastName')} มีความประสงค์สมัครสมาชิกพรรคกล้าธรรม"`}
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idCardImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      label="รูปบัตรประจำตัวประชาชน"
                      description="กรุณาถ่ายรูปบัตรประจำตัวประชาชนให้ชัดเจน อ่านได้ทุกตัวอักษร"
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ปุ่มบันทึก */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              type="submit" 
              size="lg" 
              className="gradient-primary text-white font-medium px-8"
              disabled={form.formState.isSubmitting}
            >
              <Save className="w-5 h-5 mr-2" />
              {form.formState.isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>

            {memberId && (
              <Button 
                type="button"
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                className="px-8"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                ลบข้อมูล
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};