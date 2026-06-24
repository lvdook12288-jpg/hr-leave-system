// กำหนด ID ของ Google Sheets อัตโนมัติ (ไม่ต้องแก้)
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// 1. ฟังก์ชันสำหรับการ "ดึงข้อมูล" (GET) ไปแสดงบนเว็บ
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // ดึงข้อมูลพนักงาน (ดึงจาก Sheet แรกสุด หรือ Sheet ชื่อ 'รายชื่อพนักงาน')
    const empSheet = ss.getSheetByName('รายชื่อพนักงาน') || ss.getSheets()[0];
    const empData = empSheet.getDataRange().getDisplayValues();
    const headers = empData[0];
    const users = [];
    
    for (let i = 1; i < empData.length; i++) {
      let row = empData[i];
      let user = {};
      for (let j = 0; j < headers.length; j++) {
        user[headers[j]] = row[j];
      }
      users.push(user);
    }

    // ดึงข้อมูลประวัติการลา
    const leaveSheet = ss.getSheetByName('ประวัติการลา');
    let leaves = [];
    if (leaveSheet) {
      const leaveData = leaveSheet.getDataRange().getDisplayValues();
      if (leaveData.length > 1) {
        const lHeaders = leaveData[0];
        for (let i = 1; i < leaveData.length; i++) {
          let row = leaveData[i];
          let leave = {};
          for (let j = 0; j < lHeaders.length; j++) {
            // แปลงค่ากลับเป็นตัวเลข/รูปแบบที่ถูกต้อง
            leave[lHeaders[j]] = lHeaders[j] === 'days' ? parseFloat(row[j]) : row[j];
          }
          leaves.push(leave);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: { users: users, leaves: leaves }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. ฟังก์ชันสำหรับการ "รับข้อมูลและบันทึก" (POST) จากเว็บ
function doPost(e) {
  try {
    // อ่านข้อมูลที่ส่งมาจากเว็บ
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data;
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ตรวจสอบว่ามี Sheet "ประวัติการลา" หรือยัง ถ้ายังไม่มีให้สร้างใหม่
    let leaveSheet = ss.getSheetByName('ประวัติการลา');
    if (!leaveSheet) {
      leaveSheet = ss.insertSheet('ประวัติการลา');
      // สร้างหัวคอลัมน์
      leaveSheet.appendRow(['id', 'userId', 'typeId', 'startDate', 'endDate', 'days', 'status', 'reason', 'createdAt']);
      leaveSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#d9ead3");
    }

    // กรณีสร้างใบลาใหม่
    if (action === 'createLeave') {
      leaveSheet.appendRow([
        data.id, 
        data.userId, 
        data.typeId, 
        data.startDate, 
        data.endDate,
        data.days, 
        data.status, 
        data.reason, 
        data.createdAt
      ]);
    }
    // กรณี แอดมิน กดอนุมัติ/ปฏิเสธ
    else if (action === 'updateLeaveStatus') {
      const leaveData = leaveSheet.getDataRange().getValues();
      const idIndex = 0;     // คอลัมน์ A (รหัสใบลา)
      const statusIndex = 6; // คอลัมน์ G (สถานะ)
      
      for (let i = 1; i < leaveData.length; i++) {
        if (leaveData[i][idIndex] === data.id) {
          // อัปเดตสถานะใน Google Sheets
          leaveSheet.getRange(i + 1, statusIndex + 1).setValue(data.status);
          break;
        }
      }
    }

    // ส่งข้อความกลับไปบอกเว็บว่าบันทึกสำเร็จ
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
