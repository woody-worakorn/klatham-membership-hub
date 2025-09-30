# ระบบชำระเงิน Omise QR Payment

## การตั้งค่าและใช้งาน

### 1. เริ่มต้นระบบ

เพื่อให้ระบบชำระเงินทำงานได้ ต้องรัน 2 servers พร้อมกัน:

```bash
# รัน Frontend และ Payment Server พร้อมกัน
npm run dev:full

# หรือรันแยกกัน
npm run dev          # Frontend (port 5173)
npm run dev:payment  # Payment Server (port 3001)
```

### 2. โครงสร้างระบบ

- **Frontend (React)**: หน้าฟอร์มสมัครสมาชิกและหน้าชำระเงิน
- **Payment Server (Express)**: API สำหรับติดต่อกับ Omise
- **Omise Integration**: PromptPay QR Code payment

### 3. การทำงานของระบบ

1. ผู้ใช้กรอกข้อมูลในฟอร์มสมัครสมาชิก
2. เลือกประเภทสมาชิก:
   - รายปี: 20 บาท
   - ตลอดชีพ: 200 บาท
3. กดปุ่ม "สมัครสมาชิก" จะ redirect ไปหน้าชำระเงิน
4. ระบบสร้าง QR Code PromptPay
5. ผู้ใช้สแกนและชำระเงิน
6. ระบบตรวจสอบสถานะการชำระเงินทุก 3 วินาที
7. เมื่อชำระเงินสำเร็จ จะบันทึกข้อมูลลง Firebase

### 4. API Endpoints

#### POST /api/create-payment
สร้าง charge ใหม่สำหรับการชำระเงิน

Request:
```json
{
  "amount": 2000,        // จำนวนเงินใน satang (20 บาท = 2000 satang)
  "currency": "THB",
  "description": "Kla Tham Party Membership - Yearly",
  "source": {
    "type": "promptpay"
  }
}
```

Response:
```json
{
  "id": "chrg_xxx",
  "status": "pending",
  "source": {
    "scannable_code": {
      "image": {
        "download_uri": "https://api.omise.co/charges/chrg_xxx/documents/docu_xxx/downloads/xxx"
      }
    }
  }
}
```

#### GET /api/check-payment/:chargeId
ตรวจสอบสถานะการชำระเงิน

Response:
```json
{
  "id": "chrg_xxx",
  "status": "successful|pending|failed|expired"
}
```

### 5. การจัดการข้อมูลฟอร์ม

เมื่อผู้ใช้กลับจากหน้าชำระเงิน ข้อมูลฟอร์มจะถูกเก็บไว้ผ่าน:
- React Router state
- ส่งข้อมูลกลับเมื่อกดปุ่ม "กลับไปแก้ไขข้อมูล"

### 6. ไฟล์สำคัญ

- `server.js` - Payment API server
- `src/pages/Payment.tsx` - หน้าชำระเงิน
- `src/components/MembershipForm.tsx` - ฟอร์มสมัครสมาชิก (อัปเดต)
- `src/pages/Index.tsx` - หน้าหลัก (อัปเดต)

### 7. Environment Variables

ใน production ควรใช้ environment variables สำหรับ Omise keys:

```bash
OMISE_PUBLIC_KEY=pkey_test_xxx
OMISE_SECRET_KEY=skey_test_xxx
```

### 8. หมายเหตุ

- ใช้ Test keys ของ Omise
- QR Code จะใช้ PromptPay
- ระบบจะ timeout หลัง 10 นาที
- ข้อมูลจะถูกบันทึกใน Firebase เมื่อชำระเงินสำเร็จ