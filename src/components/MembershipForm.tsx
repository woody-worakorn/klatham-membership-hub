import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { differenceInYears, isAfter, isBefore, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUpload } from '@/components/ui/image-upload';
import { ThaiIdCardUpload } from '@/components/ui/thai-id-card-upload';
import { Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from 'antd';
import th from 'antd/es/date-picker/locale/th_TH';
import dayTh from 'dayjs/locale/th';
import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import { th as dateFnsTh } from 'date-fns/locale';

import { useThaiAddress } from '@/hooks/useThaiAddress';
import { MembershipData, TITLES, RELIGIONS, NATIONALITIES, MEMBERSHIP_TYPES, PAYMENT_METHODS } from '@/types/member';
import { database } from '@/lib/firebase';
import { ref, push, set, update, remove, get } from 'firebase/database';

// Setup dayjs with Buddhist Era
dayjs.extend(buddhistEra);
dayjs.locale(dayTh);

// Create Buddhist locale for Ant Design DatePicker
const buddhistLocale: typeof th = {
  ...th,
  lang: {
    ...th.lang,
    fieldDateFormat: "DD/MM/BBBB",
    fieldDateTimeFormat: "DD/MM/BBBB HH:mm:ss",
    yearFormat: "BBBB",
    cellYearFormat: "BBBB",
  },
};

// Create validation schema function that accepts memberId for duplicate checking
const createMembershipSchema = (currentMemberId?: string) => z.object({
  title: z.string().min(1, 'กรุณาเลือกคำนำหน้าชื่อ'),
  titleOther: z.string().optional(),
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().optional(),
  religion: z.string().min(1, 'กรุณาเลือกศาสนา'),
  religionOther: z.string().optional(),
  nationality: z.string().min(1, 'กรุณาเลือกสัญชาติ'),
  idCard: z.string()
    .regex(/^\d{1}-\d{4}-\d{5}-\d{2}-\d{1}$/, 'เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก')
    .refine(async (idCard) => {
      // Check for duplicate ID card numbers in Firebase
      const cleanIdCard = idCard.replace(/[^\d]/g, '');
      const membersRef = ref(database, 'members');
      const snapshot = await get(membersRef);
      
      if (snapshot.exists()) {
        const members = snapshot.val();
        for (const memberId in members) {
          // Skip checking against the current member being edited
          if (currentMemberId && memberId === currentMemberId) {
            continue;
          }
          
          const member = members[memberId];
          if (member.idCard === cleanIdCard) {
            return false; // Duplicate found
          }
        }
      }
      return true; // No duplicate found
    }, {
      message: 'เลขประจำตัวประชาชนนี้ได้ถูกใช้สมัครสมาชิกแล้ว'
    }),
  cardIssueDate: z.date({ required_error: 'กรุณาเลือกวันที่ออกบัตร' }),
  cardExpiryDate: z.date({ required_error: 'กรุณาเลือกวันหมดอายุ' }),
  birthDate: z.date({ required_error: 'กรุณาเลือกวันเกิด' }),
  houseNumber: z.string()
    .min(1, 'กรุณากรอกเลขที่')
    .regex(/^[\d\/]+$/, 'เลขที่สามารถใส่ได้เฉพาะตัวเลขและสัญลักษณ์ /'),
  village: z.string().optional(),
  soi: z.string().optional(),
  road: z.string().optional(),
  moo: z.string()
    .optional()
    .refine((val) => !val || /^\d{1,2}$/.test(val), {
      message: 'หมู่ที่สามารถใส่ได้เฉพาะตัวเลขไม่เกิน 2 ตัว'
    }),
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกเขต/อำเภอ'),
  subDistrict: z.string().min(1, 'กรุณาเลือกแขวง/ตำบล'),
  postalCode: z.string().min(1, 'รหัสไปรษณีย์จะถูกกรอกอัตโนมัติ'),
  phone: z.string().regex(/^(\+66|0)[0-9]{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง'),
  email: z.string().email('กรุณากรอกอีเมลที่ถูกต้อง').optional().or(z.literal('')),
  politicalOpinion: z.string().optional(),
  membershipType: z.enum(['yearly', 'lifetime']),
  paymentMethod: z.enum(['cash', 'promptpay']),
  selfieWithDocumentUrl: z.string().min(1, 'กรุณาอัปโหลดรูปถ่ายตนเองพร้อมเอกสาร'),
  idCardImageUrl: z.string().min(1, 'กรุณาอัปโหลดรูปบัตรประชาชน'),
  
  // Checkboxes สำหรับการยอมรับเงื่อนไข
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'กรุณายอมรับเงื่อนไขการสมัครสมาชิก'
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: 'กรุณายอมรับการใช้ข้อมูลส่วนบุคคล'
  })
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
  // วันหมดอายุต้องเป็นวันพรุ่งนี้เป็นต้นไป
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return isAfter(data.cardExpiryDate, tomorrow) || data.cardExpiryDate.getTime() === tomorrow.getTime();
}, {
  message: 'วันหมดอายุต้องเป็นวันพรุ่งนี้เป็นต้นไป',
  path: ['cardExpiryDate']
}).refine((data) => {
  // วันเกิดต้องเป็นวันในอดีต
  const today = new Date();
  today.setHours(23, 59, 59, 999); // ตั้งเวลาเป็น 23:59:59
  return isBefore(data.birthDate, today);
}, {
  message: 'วันเกิดต้องเป็นวันในอดีต',
  path: ['birthDate']
}).refine((data) => {
  const age = differenceInYears(new Date(), data.birthDate);
  return age >= 18;
}, {
  message: 'อายุต้องไม่ต่ำกว่า 18 ปีบริบูรณ์',
  path: ['birthDate']
});

type MembershipFormData = z.infer<ReturnType<typeof createMembershipSchema>>;

// ฟังก์ชันจัด format เลขบัตรประชาชน
const formatIdCard = (idCard: string): string => {
  const numbers = idCard.replace(/[^\d]/g, '');
  if (numbers.length === 13) {
    return `${numbers.slice(0, 1)}-${numbers.slice(1, 5)}-${numbers.slice(5, 10)}-${numbers.slice(10, 12)}-${numbers.slice(12)}`;
  }
  return idCard;
};

// Custom Buddhist DatePicker component using Ant Design
interface BuddhistDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  maxDate?: Date;
  minDate?: Date;
  placeholder?: string;
  error?: string;
}

const BuddhistDatePicker = ({ value, onChange, maxDate, minDate, placeholder, error }: BuddhistDatePickerProps) => {
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    // Convert dayjs to Date object or null
    onChange(date ? date.toDate() : null);
  };

  // Convert Date to dayjs for Ant Design
  const dayjsValue = value ? dayjs(value) : null;
  const dayjsMaxDate = maxDate ? dayjs(maxDate) : undefined;
  const dayjsMinDate = minDate ? dayjs(minDate) : undefined;

  return (
    <div className="w-full">
      <DatePicker
        value={dayjsValue}
        onChange={handleDateChange}
        maxDate={dayjsMaxDate}
        minDate={dayjsMinDate}
        placeholder={placeholder || 'เลือกวันที่'}
        locale={buddhistLocale}
        format="DD/MM/BBBB"
        style={{ 
          width: '100%', 
          height: '40px',
        }}
        styles={{
          input: (token) => ({
            height: '40px',
            borderRadius: '6px',
            borderColor: error ? '#ef4444' : '#e2e8f0',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            color: '#061C73',
            '&:hover': {
              borderColor: error ? '#ef4444' : '#63D777',
            },
            '&:focus': {
              borderColor: '#63D777',
              boxShadow: '0 0 0 2px rgba(99, 215, 119, 0.2)',
              outline: 'none',
            },
            '&::placeholder': {
              color: '#64748b',
            },
          }),
        }}
        popupStyle={{
          borderRadius: '8px',
          boxShadow: '0 10px 30px -10px rgba(99, 215, 119, 0.3)',
        }}
        className="kla-tham-datepicker"
        status={error ? 'error' : undefined}
      />
      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  );
};


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
    resolver: zodResolver(createMembershipSchema(memberId)),
    defaultValues: {
      title: initialData?.title || '',
      titleOther: initialData?.titleOther || '',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      religion: initialData?.religion || '',
      religionOther: initialData?.religionOther || '',
      nationality: initialData?.nationality || NATIONALITIES[0],
      idCard: initialData?.idCard ? formatIdCard(initialData.idCard) : '',
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
      membershipType: (initialData?.membershipType as 'yearly' | 'lifetime') || 'lifetime',
      paymentMethod: (initialData as any)?.paymentMethod || 'cash',
      selfieWithDocumentUrl: initialData?.selfieWithDocumentUrl || '',
      idCardImageUrl: initialData?.idCardImageUrl || '',
      acceptTerms: false,
      acceptPrivacy: false
    }
  });

  // Watch form values for conditional rendering
  const watchTitle = form.watch('title');
  const watchReligion = form.watch('religion');
  
  // Watch all form values to check if form is valid
  const watchedValues = form.watch();
  
  // Check if all required fields are filled
  const isFormValid = React.useMemo(() => {
    const requiredFields = {
      title: watchedValues.title,
      firstName: watchedValues.firstName,
      religion: watchedValues.religion,
      nationality: watchedValues.nationality,
      idCard: watchedValues.idCard,
      cardIssueDate: watchedValues.cardIssueDate,
      cardExpiryDate: watchedValues.cardExpiryDate,
      birthDate: watchedValues.birthDate,
      houseNumber: watchedValues.houseNumber,
      province: watchedValues.province,
      district: watchedValues.district,
      subDistrict: watchedValues.subDistrict,
      postalCode: watchedValues.postalCode,
      phone: watchedValues.phone,
      membershipType: watchedValues.membershipType,
      paymentMethod: watchedValues.paymentMethod,
      selfieWithDocumentUrl: watchedValues.selfieWithDocumentUrl,
      idCardImageUrl: watchedValues.idCardImageUrl,
      acceptTerms: watchedValues.acceptTerms,
      acceptPrivacy: watchedValues.acceptPrivacy
    };

    // Check if all required fields have values
    const allFieldsFilled = Object.entries(requiredFields).every(([key, value]) => {
      // สำหรับ checkboxes ต้องเป็น true
      if (key === 'acceptTerms' || key === 'acceptPrivacy') {
        return value === true;
      }
      // สำหรับ fields อื่น ๆ ต้องไม่เป็นค่าว่าง
      if (value === null || value === undefined || value === '') {
        return false;
      }
      return true;
    });

    // Additional checks for conditional fields
    const titleOtherValid = watchedValues.title !== 'อื่นๆ' || (watchedValues.titleOther && watchedValues.titleOther.trim() !== '');
    const religionOtherValid = watchedValues.religion !== 'อื่นๆ' || (watchedValues.religionOther && watchedValues.religionOther.trim() !== '');

    return allFieldsFilled && titleOtherValid && religionOtherValid && !form.formState.isSubmitting && Object.keys(form.formState.errors).length === 0;
  }, [watchedValues, form.formState.isSubmitting, form.formState.errors]);

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

  // Handle house number input - only allow numbers and /
  const handleHouseNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^\d\/]/g, '');
    e.target.value = filteredValue;
  };

  // Handle village number input - only allow numbers with max 2 digits
  const handleVillageNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^\d]/g, '').slice(0, 2);
    e.target.value = filteredValue;
  };

  const navigate = useNavigate();

  // Fill demo data function
  const fillDemoData = () => {
    // Get first available options for dropdowns
    const firstProvince = provinces[0];
    const firstDistrict = districts.length > 0 ? districts[0] : null;
    const firstSubDistrict = subDistricts.length > 0 ? subDistricts[0] : null;

    // Set dropdown states
    if (firstProvince) {
      setSelectedProvinceId(firstProvince.id);
      handleProvinceChange(firstProvince.id.toString());
    }

    // Create demo birth date (25 years old)
    const demoDate = new Date();
    demoDate.setFullYear(demoDate.getFullYear() - 25);

    // Create demo card issue date (2 years ago)
    const issueDate = new Date();
    issueDate.setFullYear(issueDate.getFullYear() - 2);

    // Create demo card expiry date (8 years from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 8);

    // Fill form with demo data
    form.setValue('title', 'นาย');
    form.setValue('firstName', 'สมชาย');
    form.setValue('lastName', 'ใจดี');
    form.setValue('religion', 'พุทธ');
    form.setValue('nationality', 'สัญชาติไทยโดยกำเนิด');
    // Generate a unique demo ID card number based on current timestamp
    const timestamp = Date.now().toString();
    const demoIdCard = '1' + timestamp.slice(-12);
    form.setValue('idCard', formatIdCard(demoIdCard));
    form.setValue('cardIssueDate', issueDate);
    form.setValue('cardExpiryDate', expiryDate);
    form.setValue('birthDate', demoDate);
    form.setValue('houseNumber', '123/45');
    form.setValue('village', 'หมู่บ้านสุขสันต์');
    form.setValue('soi', 'สุขุมวิท 21');
    form.setValue('road', 'สุขุมวิท');
    form.setValue('moo', '7');
    form.setValue('phone', '0812345678');
    form.setValue('email', 'demo@example.com');
    form.setValue('politicalOpinion', 'สนับสนุนการพัฒนาประเทศแบบยั่งยืน');
    form.setValue('membershipType', 'lifetime');
    form.setValue('paymentMethod', 'cash');
    
    if (firstProvince) {
      form.setValue('province', firstProvince.name_th);
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
        idCard: data.idCard.replace(/[^\d]/g, ''), // ลบขีดคั่นออกก่อนบันทึก
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
        paymentMethod: data.paymentMethod,
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
        // Check payment method
        if (data.paymentMethod === 'cash') {
          // For cash payment, save directly to Firebase and show success message
          const membersRef = ref(database, 'members');
          await push(membersRef, {
            ...membershipData,
            paymentStatus: 'cash_pending'
          });
          
          // Navigate to success page for cash payment
          navigate('/payment', {
            state: {
              paymentData: {
                amount: data.membershipType === 'yearly' ? 20 : 200,
                membershipType: data.membershipType,
                paymentMethod: data.paymentMethod,
                membershipData
              }
            }
          });
        } else {
          // For PromptPay, redirect to payment page
          const amount = data.membershipType === 'yearly' ? 20 : 200;
          
          navigate('/payment', {
            state: {
              paymentData: {
                amount,
                membershipType: data.membershipType,
                paymentMethod: data.paymentMethod,
                membershipData
              }
            }
          });
        }
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
                        placeholder="กรอกเลขประจำตัวประชาชน 13 หลัก (เช่น 1-2345-67890-12-3)" 
                        maxLength={17}
                        value={field.value}
                        onChange={(e) => {
                          // อนุญาตเฉพาะตัวเลข
                          const value = e.target.value.replace(/[^\d]/g, '');
                          
                          // จำกัดความยาวไม่เกิน 13 หลัก
                          if (value.length <= 13) {
                            // จัด format เป็น X-XXXX-XXXXX-XX-X
                            let formatted = value;
                            if (value.length > 1) {
                              formatted = value.slice(0, 1) + '-' + value.slice(1);
                            }
                            if (value.length > 5) {
                              formatted = value.slice(0, 1) + '-' + value.slice(1, 5) + '-' + value.slice(5);
                            }
                            if (value.length > 10) {
                              formatted = value.slice(0, 1) + '-' + value.slice(1, 5) + '-' + value.slice(5, 10) + '-' + value.slice(10);
                            }
                            if (value.length > 12) {
                              formatted = value.slice(0, 1) + '-' + value.slice(1, 5) + '-' + value.slice(5, 10) + '-' + value.slice(10, 12) + '-' + value.slice(12);
                            }
                            field.onChange(formatted);
                          }
                        }}
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
                    <FormItem>
                      <FormLabel>วันที่ออกบัตร *</FormLabel>
                          <FormControl>
                        <BuddhistDatePicker
                          value={field.value}
                          onChange={(date) => field.onChange(date)}
                          maxDate={new Date()}
                          placeholder="เลือกวันที่ออกบัตร"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันหมดอายุ *</FormLabel>
                          <FormControl>
                        <BuddhistDatePicker
                          value={field.value}
                          onChange={(date) => field.onChange(date)}
                          minDate={(() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            return tomorrow;
                          })()}
                          placeholder="เลือกวันหมดอายุ"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => {
                    const eighteenYearsAgo = new Date();
                    eighteenYearsAgo.setFullYear(new Date().getFullYear() - 18);
                    
                    // คำนวณอายุจากวันเกิด
                    const calculateAge = (birthDate: Date | null) => {
                      if (!birthDate) return null;
                      
                      const today = new Date();
                      const birth = new Date(birthDate);
                      
                      let age = today.getFullYear() - birth.getFullYear();
                      const monthDiff = today.getMonth() - birth.getMonth();
                      
                      // ถ้ายังไม่ถึงวันเกิดในปีนี้ ให้ลบอายุ 1 ปี
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                        age--;
                      }
                      
                      return age;
                    };

                    const currentAge = calculateAge(field.value);
                    
                    return (
                      <FormItem>
                        <FormLabel>วันเกิด *</FormLabel>
                        <FormControl>
                          <BuddhistDatePicker
                            value={field.value}
                            onChange={(date) => field.onChange(date)}
                            maxDate={eighteenYearsAgo}
                            placeholder="เลือกวันเกิด"
                          />
                        </FormControl>
                        {currentAge !== null && (
                          <div className="text-sm text-muted-foreground mt-1 px-1">
                            อายุปัจจุบัน: <span className="font-medium text-primary">{currentAge} ปี</span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                        <Input 
                          placeholder="เลขที่ (เฉพาะตัวเลขและ /)" 
                          {...field}
                          onChange={(e) => {
                            handleHouseNumberChange(e);
                            field.onChange(e.target.value);
                          }}
                        />
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
                        <Input 
                          placeholder="หมู่ที่ (เฉพาะตัวเลข 1-2 ตัว)" 
                          {...field}
                          onChange={(e) => {
                            handleVillageNumberChange(e);
                            field.onChange(e.target.value);
                          }}
                          maxLength={2}
                        />
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

          {/* รูปแบบการชำระเงิน */}
          <Card className="shadow-accent">
            <CardHeader>
              <CardTitle>รูปแบบการชำระเงิน</CardTitle>
              <CardDescription>เลือกวิธีการชำระเงินค่าสมาชิก</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <div key={method.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={method.value} id={method.value} />
                            <label 
                              htmlFor={method.value}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {method.label}
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
                    
                    {/* รูปตัวอย่าง */}
                    <div className="mt-4">
                      <div className="text-sm font-medium text-muted-foreground mb-4 text-center">
                        ตัวอย่างรูปที่ถูกต้อง:
                      </div>
                      <div className="w-full">
                        <div 
                          className="relative w-full cursor-pointer group"
                          onClick={() => {
                            // สร้าง modal แสดงรูปขยาย
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                            modal.onclick = () => modal.remove();
                            
                            const modalImg = document.createElement('img');
                            modalImg.src = '/ExampleImage.png';
                            modalImg.className = 'max-w-full max-h-full object-contain rounded-lg';
                            modalImg.onclick = (e) => e.stopPropagation();
                            
                            const closeBtn = document.createElement('button');
                            closeBtn.innerHTML = '✕';
                            closeBtn.className = 'absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all';
                            closeBtn.onclick = () => modal.remove();
                            
                            modal.appendChild(modalImg);
                            modal.appendChild(closeBtn);
                            document.body.appendChild(modal);
                          }}
                        >
                          <img 
                            src="/ExampleImage.png" 
                            alt="ตัวอย่างรูปถ่ายตนเองพร้อมเอกสารยืนยันการสมัคร" 
                            className="w-full h-auto rounded-lg border-2 border-dashed border-gray-300 shadow-md group-hover:shadow-xl transition-all duration-200 group-hover:scale-105"
                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                          />
                          {/* Overlay สำหรับแสดง hint */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="bg-white bg-opacity-0 group-hover:bg-opacity-90 text-transparent group-hover:text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200">
                              คลิกเพื่อดูขยาย
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-muted-foreground mt-3">
                          ตัวอย่าง: รูปถ่ายตนเองพร้อมกระดาษเขียนข้อความยืนยันการสมัคร
                          <br />
                          <span className="text-primary">คลิกที่รูปเพื่อดูขยาย</span>
                        </div>
                      </div>
                    </div>
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idCardImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <ThaiIdCardUpload
                      value={field.value}
                      onChange={field.onChange}
                      label="รูปบัตรประจำตัวประชาชน"
                      description="กรุณาถ่ายรูปบัตรประจำตัวประชาชนให้ชัดเจน อ่านได้ทุกตัวอักษร ระบบจะครอบภาพโดยอัตโนมัติ"
                      required
                    />
                    
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* การยอมรับเงื่อนไข */}
          <Card className="shadow-accent">
            <CardHeader>
              <CardTitle>การยอมรับเงื่อนไข</CardTitle>
              <CardDescription>กรุณาอ่านและยอมรับเงื่อนไขต่อไปนี้</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 mt-1 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal leading-relaxed">
                        การสมัครสมาชิกพรรคในครั้งนี้ ข้าพเจ้ากระทำโดยความสมัครใจของข้าพเจ้าเองและเงิน ค่าบำรุงพรรคเป็นของข้าพเจ้า รวมทั้งข้าพเจ้าเป็นผู้มีคุณสมบัติและไม่มี
                        <button
                          type="button"
                          onClick={() => {
                            // สร้าง modal แสดงมาตรา 24
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                            modal.onclick = () => modal.remove();
                            
                            const modalContent = document.createElement('div');
                            modalContent.className = 'bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden';
                            modalContent.onclick = (e) => e.stopPropagation();
                            
                            modalContent.innerHTML = `
                              <div class="flex items-center justify-between p-6 border-b">
                                <h2 class="text-xl font-bold text-gray-900">คุณสมบัติและลักษณะต้องห้ามตามมาตรา 24</h2>
                                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                              </div>
                              <div class="p-6 overflow-y-auto max-h-[70vh]">
                                <h3 class="text-lg font-bold text-primary mb-4">คุณสมบัติและลักษณะต้องห้ามตามมาตรา 24 แห่ง พรป. ว่าด้วยพรรคการเมือง พ.ศ. 2560</h3>
                                
                                <div class="mb-6">
                                  <h4 class="text-md font-bold text-secondary mb-3">คุณสมบัติ</h4>
                                  <ol class="list-decimal list-inside space-y-2 text-sm">
                                    <li>มีสัญชาติไทยโดยการเกิดหรือโดยการแปลงสัญชาติซึ่งได้สัญชาติไทยมาแล้วไม่น้อยกว่าห้าปี</li>
                                    <li>มีอายุไม่ต่ำกว่าสิบแปดปีบริบูรณ์ในวันที่ยื่นใบสมัครเป็นสมาชิก</li>
                                  </ol>
                                </div>
                                
                                <div>
                                  <h4 class="text-md font-bold text-secondary mb-3">ลักษณะต้องห้าม</h4>
                                  <div class="space-y-2 text-sm">
                                    <div>3. ติดยาเสพติดให้โทษ</div>
                                    <div>4. เป็นบุคคลล้มละลายหรือเคยเป็นบุคคลล้มละลายทุจริต</div>
                                    <div>5. เป็นภิกษุ สามเณร นักพรต หรือนักบวช</div>
                                    <div>6. อยู่ในระหว่างเพิกถอนสิทธิเลือกตั้งไม่ว่าคดีจะถึงที่สุดแล้วหรือไม่</div>
                                    <div>7. วิกลจริต หรือจิตฟั่นเฟือนไม่สมประกอบ</div>
                                    <div>8. อยู่ระหว่างการระงับการใช้สิทธิสมัครรับเลือกตั้งเป็นการชั่วคราวหรือถูกเพิกถอนสิทธิสมัครรับเลือกตั้ง</div>
                                    <div>9. ต้องคําพิพากษาให้จําคุกและถูกคุมขังอยู่โดยหมายของศาล</div>
                                    <div>10. เคยได้รับโทษจําคุกโดยได้พ้นโทษมายังไม่ถึง 10 ปีถึงวันสมัครเป็นสมาชิก เว้นแต่ความผิดโดยประมาทหรือความผิดลหุโทษ</div>
                                    <div>11. เคยถูกสั่งให้พ้นจากหน่วยงานราชการ หน่วยงานของรัฐ หรือรัฐวิสาหกิจ เพราะทุจริตต่อหน้าที่หรือถือว่ากระทําการทุจริตหรือ ประพฤติมิชอบในวงราชการ</div>
                                    <div>12. เคยต้องคําพิพากษาหรือคําสั่งของศาลอันถึงที่สุดให้ทรัพย์สินตกเป็นของแผ่นดินเพราะร่ำรวยผิดปกติ หรือเคยต้องคําพิพากษา อันถึงที่สุดให้จําคุกเพราะกระทําความผิดตามกฎหมายว่าด้วยการป้องกันและปราบปรามการทุจริต</div>
                                    <div>13. เคยต้องคําพิพากษาถึงที่สุดว่ากระทําความผิดต่อตําแหน่งหน้าที่ราชการหรือตําแหน่งหน้าที่ในการยุติธรรม หรือกระทําความผิดตามกฎหมายว่าด้วย ความผิดของพนักงานในองค์กรหรือหน่วยงานของรัฐ หรือความผิดเกี่ยวกับทรัพย์ที่กระทํา โดยทุจริตตามประมวลกฎหมายอาญา ความผิดตามกฎหมายว่าด้วยการกู้ยืมที่เป็นการฉ้อโกงประชาชน กฎหมายว่าด้วยยาเสพติด ในความผิดฐานเป็นผู้ผลิต นําเข้า ส่งออก หรือผู้ค้า กฎหมายว่าด้วยการพนันในความผิดฐานเป็นเจ้ามือหรือเจ้าสํานัก กฎหมาย ว่าด้วยการป้องกันและ ปราบปรามการค้ามนุษย์หรือกฎหมายว่าด้วยการป้องกันและปราบปรามการฟอกเงินในความผิด ฐานฟอกเงิน</div>
                                    <div>14. เคยต้องคําพิพากษาอันถึงที่สุดว่ากระทําการอันเป็นทุจริตในการเลือกตั้ง</div>
                                    <div>15. เป็นสมาชิกวุฒิสภาหรือเคยเป็นสมาชิกวุฒิสภาและสมาชิกภาพสิ้นสุดยังไม่เกิน 2 ปี</div>
                                    <div>16. เป็นตุลาการศาลรัฐธรรมนูญ หรือเป็นผู้ดํารงตําแหน่งในองค์กรอิสระ</div>
                                    <div>17. อยู่ในระหว่างต้องห้ามมิให้ดํารงตําแหน่งทางการเมือง</div>
                                    <div>18. เคยพ้นจากตําแหน่งเพราะศาลรัฐธรรมนูญวินิจฉัยว่า มีการเสนอการแปรญัตติหรือการกระทําด้วยประการใดๆที่มีผลให้ส.ส. ส.ว. หรือกรรมาธิการมีส่วนไม่ว่าโดยทางตรงหรือทางอ้อมในการใช้งบประมาณรายจ่าย</div>
                                    <div>19. เคยพ้นจากตําแหน่งเพราะศาลฎีกาหรือศาลฎีกาแผนกคดีอาญาของผู้ดํารงตําแหน่งทางการเมืองมีคําพิพากษาว่าเป็นผู้มี พฤติการณ์ร่ำรวยผิดปกติหรือกระทําความผิดฐานทุจริตต่อหน้าที่หรือจงใจปฏิบัติหน้าที่หรือใช้อํานาจขัดต่อบทบัญญัติแห่ง รัฐธรรมนูญหรือกฎหมาย หรือฝ่าฝืน หรือไม่ปฏิบัติตามมาตรฐานทางจริยธรรมอย่างร้ายแรง</div>
                                    <div>20. อยู่ในระหว่างถูกสั่งห้ามดํารงตําแหน่งใดในพรรคการเมืองตาม พรป. ว่าด้วยพรรคการเมือง</div>
                                    <div>21. ไม่เป็นสมาชิกพรรคการเมืองพรรคอื่นหรือผู้ยื่นคําขอจดทะเบียนจัดตั้งพรรคการเมือง หรือผู้แจ้งการเตรียมการจัดตั้งพรรคการเมืองอื่นในวันที่ยื่นสมัครเป็นสมาชิกพรรค</div>
                                  </div>
                                </div>
                              </div>
                              <div class="px-6 py-4 border-t bg-gray-50">
                                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                                  ปิด
                                </button>
                              </div>
                            `;
                            
                            modal.appendChild(modalContent);
                            document.body.appendChild(modal);
                          }}
                          className="text-primary underline hover:text-primary/80 transition-colors mx-1"
                        >
                          ลักษณะต้องห้ามตามมาตรา 24 แห่ง พรป.ว่าด้วยพรรคการเมือง พ.ศ. 2560
                        </button>
                        และหากพรรคตรวจสอบแล้วพบว่า ข้อมูล ดังกล่าวไม่เป็นความจริง พรรคอาจปฏิเสธการสมัครเป็นสมาชิกพรรค ของข้าพเจ้าได้
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptPrivacy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 mt-1 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal leading-relaxed">
                        ข้าพเจ้าตกลงยินยอมให้พรรคกล้าธรรมสามารถเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลสำหรับ ข้อมูลภาพถ่ายบัตรประจำตัวประชาชนของข้าพเจ้าที่ทำการถ่ายภาพและข้อมูลต่าง ๆ ในภาพดังกล่าว ได้แก่ เลขบัตรประจำตัวประชาชน ชื่อ นามสกุล วันเดือนปีเกิด ที่อยู่ วันที่ออกบัตร วันบัตรหมดอายุ และรูปถ่ายของข้าพเจ้าในบัตรประจำตัวประชาชน และรูปถ่ายใบหน้าของข้าพเจ้า ทั้งนี้เพื่อเป็นการตรวจสอบ และยืนยันตัวตนในการสมัครและเป็นหลักฐานในการสมัครสมาชิกพรรค
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ปุ่มบันทึก */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              type="button"
              variant="outline"
              size="lg"
              onClick={fillDemoData}
              className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            >
              Demo Data
            </Button>
            <Button 
              type="submit" 
              size="lg" 
              className="gradient-primary text-white font-medium px-8"
              disabled={!isFormValid || form.formState.isSubmitting}
            >
              <Save className="w-5 h-5 mr-2" />
              {form.formState.isSubmitting ? 'กำลังบันทึก...' : 
               !isFormValid ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'บันทึกข้อมูล'}
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