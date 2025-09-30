สร้างเว็บแอพพลิเคชั่น สมัครสมาชิกพรรคกล้าธรรม โดยใช้ Firebase Realtime Database

โดยให้มี feature ของแอพดังต่อไปนี้

แอพ จะมี 2 ส่วนคือ
1. ส่วนประชาชนทั่วไปสมัครสมาชิกพรรคกล้าธรรม
2. ส่วนผู้ดูแลระบบ

ส่วนประชาชนทั่วไปสมัครสมาชิกพรรคกล้าธรรม
    สามารถ เพิ่ม ลบ แก้ไข ผู้สำรวจได้ โดยมีฟิวด์ ดังนี้
    คำนำหน้าชื่อ (ภาษาไทย) * (Dropdown List มีให้เลือก ดังนี้ นาย, นาง, นางสาว, อื่นๆ กรณีเลือกอื่นๆ ให้ระบุชื่ออื่นๆ ที่ฟิวด์นี้)
    ชื่อ (ภาษาไทย) *
    นามสกุล (ภาษาไทย)
    ศาสนา * (Dropdown List มีให้เลือก ดังนี้ พุทธ, อิสลาม, คริสต์, อื่นๆ กรณีเลือกอื่นๆ ให้ระบุศาสนาอื่นๆ ที่ฟิวด์นี้)
    สัญชาติ * (Dropdown List มีให้เลือก ดังนี้ สัญชาติไทยโดยกำเนิด (Default), สัญชาติไทยโดยการแปลงสัญชาติซึ่งได้สัญชาติมาแล้วไม่น้อยกว่า 5 ปี)
    เลขประจําตัวประชาชน *
    วันที่ออกบัตร * (Date Picker)
    วันหมดอายุ * (Date Picker)(ให้ตรวจสอบวันหมดอายุต้องมากกว่าวันที่ออกบัตร และต้องน้อยกว่าวันปัจจุบัน)
    วันเกิด * (Date Picker)(ให้ตรวจสอบอายุจากวันเกิด ต้องมีอายุไม่ต่ำกว่า 18 ปีบริบูรณ์ในวันที่สมัครสมาชิก)
    ที่อยู่ตามทะเบียนบ้าน เลขที่ *
    หมู่บ้าน
    ซอย
    ถนน
    หมู่ที่
    จังหวัด * (Dropdown List https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json)
    เขต/อําเภอ * (Dropdown List https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/district.json)
    แขวง/ตำบล * (Dropdown List https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/sub_district.json)
    รหัสไปรษณีย์ (Auto จาก แขวง/ตำบล)*

    เบอร์โทรศัพท์ (มือถือ) *
    อีเมล
    ความเห็นทางการเมือง (ถ้ามี) (Textarea)
    รูปแบบการต่ออายุ (Radio Button มีให้เลือก ดังนี้ สมัครแบบรายปี 20 บาท/ปี, สมัครแบบตลอดชีพ 200 บาท)
    รูปถ่ายตนเองพร้อมเอกสารยืนยันการสมัครที่เขียนข้อความ ข้าพเจ้า (ชื่อ - นามสกุลผู้สมัคร) มีความประสงค์สมัครสมาชิกพรรคกล้าธรรม* (Image Upload พร้อม Preview)
    รูปบัตรประชาชน * (Image Upload พร้อม Preview)

    เพิ่มปุ่มบันทึกข้อมูล

เพิ่มปุ่มลบข้อมูล


ส่วนผู้ดูแลระบบ
    เป็นส่วนหลังบ้านที่ใช้สำหรับผู้ดูแลระบบ เพื่อบริหารจัดการข้อมูลผู้สมัครสมาชิกพรรคกล้าธรรม


สามารถ sync ข้อมูลแบบ realtime กับ firebase

แล้วให้ทำการเชื่อมต่อกับ Firebase Database ด้วย config ดังต่อไปนี้

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQThI0MpZzJPr258yFMKXNSZmQRBXLsGI",
  authDomain: "ktmember-6989e.firebaseapp.com",
  databaseURL: "https://ktmember-6989e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ktmember-6989e",
  storageBucket: "ktmember-6989e.firebasestorage.app",
  messagingSenderId: "326700889353",
  appId: "1:326700889353:web:ed653792db9ea924430fd8",
  measurementId: "G-WZPB7MSCSZ"
};


ให้ใช้ Firebase JavaScript SDK v11+ with import via CDN (no npm)
ให้ code HTML มีการ setup Firebase และ Javascript ใน file เดียว

สีหลัก #63D777
สีรอง #061C73
สีไฮไลต์ #D7A43B