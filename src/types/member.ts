export interface ThaiAddress {
  province: string;
  district: string;
  subDistrict: string;
  postalCode: string;
}

export interface Province {
  id: number;
  name_th: string;
  name_en: string;
}

export interface District {
  id: number;
  name_th: string;
  name_en: string;
  province_id: number;
}

export interface SubDistrict {
  id: number;
  name_th: string;
  name_en: string;
  district_id: number;
  province_id: number;
  zip_code: number;
}

export interface MembershipData {
  // ข้อมูลส่วนตัว
  title: string;
  titleOther?: string;
  firstName: string;
  lastName: string;
  religion: string;
  religionOther?: string;
  nationality: string;
  
  // ข้อมูลบัตรประชาชน
  idCard: string;
  cardIssueDate: string;
  cardExpiryDate: string;
  birthDate: string;
  
  // ที่อยู่
  houseNumber: string;
  village?: string;
  soi?: string;
  road?: string;
  moo?: string;
  province: string;
  district: string;
  subDistrict: string;
  postalCode: string;
  
  // ข้อมูลติดต่อ
  phone: string;
  email?: string;
  lineId?: string;
  politicalOpinion?: string;
  
  // การต่ออายุ
  membershipType: 'yearly' | 'lifetime';
  
  // รูปแบบการชำระเงิน
  paymentMethod: 'cash' | 'promptpay';
  
  // รูปภาพ
  selfieWithDocumentUrl?: string;
  idCardImageUrl?: string;
  
  // ข้อมูลระบบ
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const TITLES = [
  'นาย',
  'นาง', 
  'นางสาว',
  'อื่นๆ'
];

export const RELIGIONS = [
  'พุทธ',
  'อิสลาม',
  'คริสต์',
  'อื่นๆ'
];

export const NATIONALITIES = [
  'สัญชาติไทยโดยกำเนิด',
  'สัญชาติไทยโดยการแปลงสัญชาติซึ่งได้สัญชาติมาแล้วไม่น้อยกว่า 5 ปี'
];

export const MEMBERSHIP_TYPES = [
  { value: 'lifetime', label: 'สมัครแบบตลอดชีพ 200 บาท' },
  { value: 'yearly', label: 'สมัครแบบรายปี 20 บาท/ปี' }
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'ชำระเป็นเงินสด' },
  { value: 'promptpay', label: 'พร้อมเพย์ (QR Code)' }
];