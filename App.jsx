import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckSquare, XCircle, CheckCircle, Calendar, Home, Plus, FileText, Users, Settings, Loader2, LogOut, Search, User
} from 'lucide-react';

// ⚠️⚠️⚠️ สำคัญ: ใส่ LIFF ID ของคุณตรงนี้ ⚠️⚠️⚠️
const liffId = '2010503968-1BUOroTe'; 

const leaveTypes = [
  { id: 'L1', name: 'ลาป่วย', color: 'bg-red-100 text-red-800', barColor: 'bg-red-500', defaultQuota: 30 },
  { id: 'L2', name: 'ลากิจ', color: 'bg-yellow-100 text-yellow-800', barColor: 'bg-yellow-500', defaultQuota: 3 },
  { id: 'L3', name: 'ลาพักร้อน', color: 'bg-green-100 text-green-800', barColor: 'bg-green-500', defaultQuota: 6 },
  { id: 'L4', name: 'ลาคลอด', color: 'bg-pink-100 text-pink-800', barColor: 'bg-pink-500', defaultQuota: 120 },
  { id: 'L5', name: 'ลาบวช', color: 'bg-orange-100 text-orange-800', barColor: 'bg-orange-500', defaultQuota: 15 },
  { id: 'L6', name: 'ลาชดเชย', color: 'bg-indigo-100 text-indigo-800', barColor: 'bg-indigo-500', defaultQuota: 13 },
];

const StatCard = ({ title, value, color }) => {
  const colors = { 
    blue: 'bg-blue-50 text-blue-700 border-blue-200', 
    red: 'bg-red-50 text-red-700 border-red-200', 
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
    green: 'bg-green-50 text-green-700 border-green-200' 
  };
  return (
    <div className={`p-4 md:p-5 rounded-xl border ${colors[color]} shadow-sm`}>
      <p className="text-xs md:text-sm font-medium opacity-80 mb-1">{title}</p>
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
    </div>
  );
};

const PieChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

export default function App() {
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  
  // Login State
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginDept, setLoginDept] = useState('');
  const [loginUserId, setLoginUserId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Admin/Manager State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [viewEmployeeHistory, setViewEmployeeHistory] = useState(null);

  // LIFF & Line User State
  const [liffUser, setLiffUser] = useState(null);

  // System States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [newLeaveForm, setNewLeaveForm] = useState({ typeId: 'L1', startDate: '', endDate: '', reason: '' });
  const [toastMsg, setToastMsg] = useState({ text: '', type: 'info' });

  // ลิงก์ API
  const sheetApiUrl = 'https://script.google.com/macros/s/AKfycbyUjzZu8D3HHQN0W0zMKYY08T8_fYb8oAwlk9hk2u2FSpPp-6ric1tNSFYu_7Iv2DYz/exec';

  const showToast = (text, type = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: 'info' }), 3000);
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  useEffect(() => {
    const initLiff = async () => {
      try {
        if (window.liff) {
          await window.liff.init({ liffId: liffId });
          if (window.liff.isLoggedIn()) {
            const profile = await window.liff.getProfile();
            setLiffUser(profile);
          }
        }
      } catch (err) {
        console.warn('LIFF init skipped or failed:', err.message);
      }
    };
    
    if (!window.liff) {
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.onload = initLiff;
      document.body.appendChild(script);
    } else {
      initLiff();
    }
  }, []);

  useEffect(() => {
    const fetchUsersFromSheet = async () => {
      try {
        const response = await fetch(sheetApiUrl);
        const textResponse = await response.text(); 
        let result;
        try { result = JSON.parse(textResponse); } catch (e) { throw new Error("API Format Error"); }
        if (result.error) throw new Error(result.error);

        if (result.status === 'success' && result.data && result.data.users) {
          const fetchedUsers = result.data.users.map((row, index) => {
            const rowData = row ? row : {};
            const safeStr = (val) => val ? val.toString() : '';
            const safeFloat = (val) => parseFloat(val) || 0;
            
            let userRole = 'employee';
            // ค้นหาสิทธิ์จากคอลัมน์ ระดับสิทธิ์, สิทธิ์การใช้งาน หรือ Role
            const explicitRole = safeStr(rowData['ระดับสิทธิ์'] || rowData['สิทธิ์การใช้งาน'] || rowData['Role'] || '').toLowerCase();
            if (explicitRole.includes('แอดมิน') || explicitRole.includes('admin')) {
              userRole = 'admin';
            } else if (explicitRole.includes('หัวหน้า') || explicitRole.includes('manager')) {
              userRole = 'manager';
            }

            return {
              id: rowData['รหัส'] ? rowData['รหัส'].toString() : `EMP${index+1}`,
              name: `${safeStr(rowData['ชื่อ'])} ${safeStr(rowData['นามสกุล'])}`.trim() || 'ไม่ระบุชื่อ',
              dept: safeStr(rowData['แผนก']),
              role: userRole, // ใช้สิทธิ์จาก Google Sheets โดยตรง ไม่บังคับให้แผนกสำนักงานเป็น admin อีกต่อไป
              status: safeStr(rowData['สถานะ']).toLowerCase() === 'active' ? 'active' : 'inactive',
              tenure: safeFloat(rowData['อายุงาน(ปี)']),
              lineUserId: safeStr(rowData['lineUserId']), // รหัส LINE ID จาก Sheet
              balances: { 
                L1: safeFloat(rowData['ลาป่วย_ใช้แล้ว']), L2: safeFloat(rowData['ลากิจ_ใช้แล้ว']), 
                L3: safeFloat(rowData['ลาพักร้อน_ใช้แล้ว']), L4: safeFloat(rowData['ลาคลอด_ใช้แล้ว']), 
                L5: safeFloat(rowData['ลาบวช_ใช้แล้ว']), L6: safeFloat(rowData['ลาชดเชย_ใช้แล้ว'])
              },
              quotas: {
                L1: safeFloat(rowData['ลาป่วย_โควตา']) || leaveTypes.find(t=>t.id==='L1').defaultQuota,
                L2: safeFloat(rowData['ลากิจ_โควตา']) || leaveTypes.find(t=>t.id==='L2').defaultQuota,
                L3: safeFloat(rowData['ลาพักร้อน_โควตา']) || leaveTypes.find(t=>t.id==='L3').defaultQuota,
                L4: safeFloat(rowData['ลาคลอด_โควตา']) || leaveTypes.find(t=>t.id==='L4').defaultQuota,
                L5: safeFloat(rowData['ลาบวช_โควตา']) || leaveTypes.find(t=>t.id==='L5').defaultQuota,
                L6: safeFloat(rowData['ลาชดเชย_โควตา']) || leaveTypes.find(t=>t.id==='L6').defaultQuota,
              }
            };
          });
          setUsers(fetchedUsers);
          setLeaves(result.data.leaves ? result.data.leaves : []);
          
          // ทำ Auto-Login ถ้ามีข้อมูล LINE ID ตรงกัน
          if (liffUser) {
             const matchedUser = fetchedUsers.find(u => u.lineUserId === liffUser.userId);
             if (matchedUser && matchedUser.status === 'active') {
                setCurrentUser(matchedUser);
                setIsLoggedIn(true);
                setActiveTab('dashboard');
                showToast(`เข้าสู่ระบบอัตโนมัติสำเร็จ`, 'success');
             }
          }
        }
      } catch (error) {
        showToast(`ไม่สามารถเชื่อมต่อ Database ได้: ${error.message}`, 'error'); 
      } finally {
        setIsAppLoading(false);
      }
    };
    
    // หน่วงเวลาเล็กน้อยเพื่อให้ LIFF โหลดเสร็จก่อน
    const timeoutId = setTimeout(() => {
        fetchUsersFromSheet();
    }, 1000);
    
    if (liffUser) {
        clearTimeout(timeoutId);
        fetchUsersFromSheet();
    }
    
    return () => clearTimeout(timeoutId);
  }, [liffUser]); 

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginUserId) return showToast('กรุณาเลือกชื่อพนักงาน', 'error');
    const user = users.find(u => u.id === loginUserId);
    if (user) {
      if(user.status !== 'active') return showToast('พนักงานท่านนี้พ้นสภาพการเป็นพนักงานแล้ว', 'error');
      setCurrentUser(user);
      setIsLoggedIn(true);
      setActiveTab('dashboard'); 
      showToast(`ยินดีต้อนรับ ${user.name}`, 'success');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginDept('');
    setLoginUserId('');
  };

  const submitLeaveRequestToDB = async (newRequest) => {
    setIsProcessing(true);
    try {
      const response = await fetch(sheetApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createLeave', data: newRequest })
      });
      const textResponse = await response.text();
      let result;
      try { result = JSON.parse(textResponse); } catch(e) { throw new Error("Apps Script ยังไม่อัปเดต"); }
      if (result.status === 'success') {
        setLeaves([newRequest, ...leaves]); 
        showToast('บันทึกใบลาสำเร็จ!', 'success');
      } else throw new Error(result.error ? result.error : "บันทึกไม่สำเร็จ");
    } catch (e) { showToast(`ผิดพลาด: ${e.message}`, 'error'); } 
    finally { setIsProcessing(false); }
  };

  const handleApproveReject = async (leaveId, newStatus) => {
    setIsProcessing(true);
    try {
      const response = await fetch(sheetApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateLeaveStatus', data: { id: leaveId, status: newStatus } })
      });
      const textResponse = await response.text();
      let result;
      try { result = JSON.parse(textResponse); } catch(e) { throw new Error("Apps Script ยังไม่อัปเดต"); }
      if (result.status === 'success') {
        setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: newStatus } : l));
        showToast(`ทำรายการ ${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} เรียบร้อย`, newStatus === 'approved' ? 'success' : 'error');
      } else throw new Error(result.error ? result.error : "บันทึกไม่สำเร็จ");
    } catch (e) { showToast(`ผิดพลาด: ${e.message}`, 'error'); } 
    finally { setIsProcessing(false); }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const days = calculateDays(newLeaveForm.startDate, newLeaveForm.endDate);
    if (days <= 0) return showToast('วันที่ไม่ถูกต้อง', 'error');
    const newRequest = {
      id: `REQ${Date.now()}`, userId: currentUser.id, typeId: newLeaveForm.typeId,
      startDate: newLeaveForm.startDate, endDate: newLeaveForm.endDate,
      days: days, status: 'pending', reason: newLeaveForm.reason,
      createdAt: new Date().toISOString().split('T')[0]
    };
    submitLeaveRequestToDB(newRequest);
    setIsLeaveModalOpen(false);
    setNewLeaveForm({ typeId: 'L1', startDate: '', endDate: '', reason: '' });
  };

  const renderLoginView = () => {
    const departments = [...new Set(users.filter(u => u.status === 'active' && u.dept).map(u => u.dept))];
    const availableUsers = users.filter(u => u.status === 'active' && u.dept === loginDept);

    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h2>
            <p className="text-gray-500 text-sm mt-1">LINE Leave System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">1. เลือกแผนกของคุณ</label>
              <select required value={loginDept} onChange={(e) => { setLoginDept(e.target.value); setLoginUserId(''); }} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 bg-white">
                <option value="">-- กรุณาเลือกแผนก --</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {loginDept && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. เลือกชื่อพนักงาน</label>
                <select required value={loginUserId} onChange={(e) => setLoginUserId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 bg-white">
                  <option value="">-- กรุณาเลือกชื่อ --</option>
                  {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <button type="submit" disabled={!loginUserId} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition mt-4 disabled:bg-gray-300">
              เข้าสู่ระบบด้วยรหัส
            </button>
          </form>

          {/* แสดง LINE ID ให้พนักงานก๊อปปี้ง่ายๆ */}
          {liffUser && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-sm font-bold text-blue-800 mb-2">LINE ID ของคุณคือ:</p>
              <code className="block bg-white p-2 rounded border border-blue-100 text-xs text-gray-700 break-all select-all font-mono">
                {liffUser.userId}
              </code>
              <p className="text-xs text-blue-600 mt-2">
                โปรดก๊อปปี้รหัสนี้ให้ฝ่ายบุคคล เพื่อเปิดใช้งานเข้าสู่ระบบอัตโนมัติ
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EmployeeLeaveComponent = ({ user }) => {
    const myLeaves = leaves.filter(l => l.userId === user.id);
    return (
      <div className="max-w-md mx-auto bg-white min-h-[calc(100vh-64px)] md:min-h-0 md:rounded-2xl shadow-lg pb-20 md:pb-6 relative border border-gray-100">
        <div className="bg-green-600 text-white p-4 text-center md:rounded-t-2xl shadow-md">
          <h2 className="text-xl font-bold">ยื่นใบลา</h2>
          <p className="text-sm opacity-90 mt-1">{user.name} | แผนก {user.dept}</p>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><PieChartIcon /> สิทธิ์การลาคงเหลือ</h3>
            <div className="grid gap-3">
              {leaveTypes.map(type => {
                const staticUsed = (user.balances && user.balances[type.id]) ? user.balances[type.id] : 0;
                const dynamicallyApprovedLeaves = myLeaves.filter(l => l.typeId === type.id && l.status === 'approved');
                const dynamicUsed = dynamicallyApprovedLeaves.reduce((sum, l) => sum + l.days, 0);
                const totalUsed = staticUsed + dynamicUsed;
                const quota = (user.quotas && user.quotas[type.id] !== undefined) ? user.quotas[type.id] : type.defaultQuota;
                const remain = quota - totalUsed;
                const percent = Math.min((totalUsed / quota) * 100, 100);
                return (
                  <div key={type.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{type.name}</span>
                      <span className="text-gray-500">เหลือ <b className={`font-bold ${remain <= 0 ? 'text-red-500' : 'text-green-600'}`}>{remain}</b>/{quota} วัน</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${type.barColor} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button disabled={isProcessing} onClick={() => setIsLeaveModalOpen(true)} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-green-600 flex justify-center items-center gap-2">
            <Plus className="w-5 h-5" /> สร้างใบลาใหม่
          </button>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><HistoryIcon /> ประวัติการลา</h3>
            <div className="space-y-3">
              {myLeaves.length > 0 ? myLeaves.map(leave => {
                const type = leaveTypes.find(t => t.id === leave.typeId);
                return (
                  <div key={leave.id} className="border p-3 rounded-lg flex justify-between items-center shadow-sm">
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${type ? type.color : 'bg-gray-100'}`}>{type ? type.name : 'ไม่ระบุ'}</span>
                      <p className="text-sm font-medium mt-2">{leave.startDate} ถึง {leave.endDate}</p>
                      <p className="text-xs text-gray-500">{leave.days} วัน | เหตุผล: {leave.reason}</p>
                    </div>
                    <div className="text-right">
                      {leave.status === 'pending' && <span className="text-yellow-600 text-sm font-medium">รออนุมัติ</span>}
                      {leave.status === 'approved' && <span className="text-green-600 text-sm font-medium">อนุมัติ</span>}
                      {leave.status === 'rejected' && <span className="text-red-600 text-sm font-medium">ไม่อนุมัติ</span>}
                    </div>
                  </div>
                );
              }) : <p className="text-center text-gray-400 text-sm py-4">ไม่มีประวัติการลา</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminView = () => {
    const isManager = currentUser.role === 'manager';
    const visibleUsers = isManager ? users.filter(u => u.dept === currentUser.dept) : users;
    const visibleLeaves = isManager ? leaves.filter(l => {
      const u = users.find(user => user.id === l.userId);
      return u && u.dept === currentUser.dept;
    }) : leaves;

    const pendingLeaves = visibleLeaves.filter(l => l.status === 'pending');
    
    // กรองข้อมูลสำหรับหน้ารายงาน
    const filteredReportLeaves = visibleLeaves.filter(l => {
      if (!reportStartDate && !reportEndDate) return true;
      if (reportStartDate && l.startDate < reportStartDate) return false;
      if (reportEndDate && l.startDate > reportEndDate) return false;
      return l.status === 'approved'; 
    });

    const menus = [
      { id: 'dashboard', icon: <Home className="w-5 h-5"/>, label: 'ภาพรวม' },
      { id: 'myleave', icon: <User className="w-5 h-5"/>, label: 'ยื่นใบลาของฉัน' },
      { id: 'employees', icon: <Users className="w-5 h-5"/>, label: isManager ? 'พนักงานในแผนก' : 'จัดการพนักงาน' },
      { id: 'reports', icon: <FileText className="w-5 h-5"/>, label: 'รายงานวันลา' }
    ];
    
    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
        <div className="w-full md:w-64 bg-white border-r p-4 overflow-y-auto hidden md:block">
          <ul className="space-y-1">
            {menus.map(menu => (
              <li key={menu.id}>
                <button onClick={() => setActiveTab(menu.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === menu.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {menu.icon} {menu.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto relative">
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">{isManager ? `แดชบอร์ด - แผนก ${currentUser.dept}` : 'แดชบอร์ด (ผู้ดูแลระบบ)'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <StatCard title="พนักงานทั้งหมด" value={visibleUsers.filter(u=>u.status==='active').length} color="blue" />
                <StatCard title="รายการลาทั้งหมด" value={visibleLeaves.length} color="red" />
                <StatCard title="รอดำเนินการ" value={pendingLeaves.length} color="yellow" />
              </div>
              
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4 text-gray-800">รายการรออนุมัติ</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr><th className="py-3 px-4">พนักงาน</th><th className="py-3 px-4">ประเภท</th><th className="py-3 px-4">วันที่ลา</th><th className="py-3 px-4">จัดการ</th></tr>
                    </thead>
                    <tbody>
                      {pendingLeaves.map(leave => {
                        const user = users.find(u => u.id === leave.userId);
                        const type = leaveTypes.find(t => t.id === leave.typeId);
                        return (
                          <tr key={leave.id} className="border-b">
                            <td className="py-3 px-4">{user ? user.name : leave.userId}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${type ? type.color : 'bg-gray-100'}`}>{type ? type.name : '-'}</span></td>
                            <td className="py-3 px-4">{leave.startDate} ({leave.days} วัน)</td>
                            <td className="py-3 px-4 flex gap-2">
                              <button disabled={isProcessing} onClick={() => handleApproveReject(leave.id, 'approved')} className="text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-50">อนุมัติ</button>
                              <button disabled={isProcessing} onClick={() => handleApproveReject(leave.id, 'rejected')} className="text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">ปฏิเสธ</button>
                            </td>
                          </tr>
                        );
                      })}
                      {pendingLeaves.length === 0 && (<tr><td colSpan="4" className="text-center py-8 text-gray-400">ไม่มีรายการรอดำเนินการ</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'myleave' && <EmployeeLeaveComponent user={currentUser} />}
          {activeTab === 'employees' && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-2xl font-bold text-gray-800 mb-6">{isManager ? 'พนักงานในแผนก' : 'รายชื่อพนักงานทั้งหมด'}</h2>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-gray-100 text-gray-700">
                     <tr><th className="py-3 px-4">รหัส</th><th className="py-3 px-4">ชื่อ</th><th className="py-3 px-4">แผนก</th><th className="py-3 px-4">ระดับ</th><th className="py-3 px-4">สถานะ</th><th className="py-3 px-4 text-right">จัดการ</th></tr>
                   </thead>
                   <tbody>
                     {visibleUsers.map((user) => (
                       <tr key={user.id} className={`border-b hover:bg-gray-50 ${user.status !== 'active' ? 'opacity-50' : ''}`}>
                         <td className="py-3 px-4">{user.id}</td>
                         <td className="py-3 px-4 font-medium">{user.name}</td>
                         <td className="py-3 px-4">{user.dept}</td>
                         <td className="py-3 px-4">
                            {user.role === 'admin' ? <span className="text-purple-600 font-medium">แอดมิน</span> : user.role === 'manager' ? <span className="text-blue-600 font-medium">หัวหน้า</span> : <span className="text-gray-500">พนักงาน</span>}
                         </td>
                         <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span></td>
                         <td className="py-3 px-4 text-right">
                           <button onClick={() => setViewEmployeeHistory(user)} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200">ดูประวัติ</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}
          {activeTab === 'reports' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">รายงานการลาหยุดของพนักงาน</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่</label>
                  <input type="date" value={reportStartDate} onChange={e=>setReportStartDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded outline-none focus:border-green-500"/>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่</label>
                  <input type="date" value={reportEndDate} onChange={e=>setReportEndDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded outline-none focus:border-green-500"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {setReportStartDate(''); setReportEndDate('');}} className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100">ล้างค่า</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-gray-800 text-white">
                     <tr><th className="py-3 px-4">วันที่เริ่มลา</th><th className="py-3 px-4">ชื่อพนักงาน</th><th className="py-3 px-4">ประเภท</th><th className="py-3 px-4">จำนวนวัน</th><th className="py-3 px-4">เหตุผล</th></tr>
                   </thead>
                   <tbody>
                     {filteredReportLeaves.length > 0 ? filteredReportLeaves.sort((a,b) => new Date(b.startDate) - new Date(a.startDate)).map((leave, index) => {
                       const user = users.find(u => u.id === leave.userId);
                       const type = leaveTypes.find(t => t.id === leave.typeId);
                       return (
                         <tr key={leave.id} className="border-b hover:bg-gray-50">
                           <td className="py-3 px-4 whitespace-nowrap">{leave.startDate}</td>
                           <td className="py-3 px-4 font-medium">{user ? user.name : 'ไม่พบข้อมูล'}</td>
                           <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${type ? type.color : 'bg-gray-100'}`}>{type ? type.name : '-'}</span></td>
                           <td className="py-3 px-4">{leave.days} วัน</td>
                           <td className="py-3 px-4 text-gray-500 truncate max-w-[200px]">{leave.reason}</td>
                         </tr>
                       )
                     }) : (<tr><td colSpan="5" className="py-8 text-center text-gray-500">ไม่พบข้อมูลการลาในช่วงเวลาที่เลือก</td></tr>)}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
        
        {/* แถบเมนูด้านล่างสำหรับมือถือ (เฉพาะ Admin/Manager) */}
        <div className="md:hidden bg-white border-t flex justify-around p-3 fixed bottom-0 left-0 right-0 z-40">
           {menus.map(menu => (
             <button key={menu.id} onClick={() => setActiveTab(menu.id)} className={`flex flex-col items-center gap-1 ${activeTab === menu.id ? 'text-green-600' : 'text-gray-500'}`}>
                {menu.icon} <span className="text-[10px]">{menu.label}</span>
             </button>
           ))}
        </div>

        {/* Modal ดูประวัติพนักงาน */}
        {viewEmployeeHistory && (
           <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
               <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-lg">ประวัติการลา: {viewEmployeeHistory.name}</h3>
                 <button onClick={() => setViewEmployeeHistory(null)} className="text-gray-500 hover:text-black font-bold text-xl">&times;</button>
               </div>
               <div className="p-4 overflow-y-auto flex-1">
                 <div className="space-y-3">
                    {leaves.filter(l => l.userId === viewEmployeeHistory.id).length > 0 ? 
                      leaves.filter(l => l.userId === viewEmployeeHistory.id).map(leave => {
                      const type = leaveTypes.find(t => t.id === leave.typeId);
                      return (
                        <div key={leave.id} className="border p-3 rounded-lg flex justify-between items-center shadow-sm">
                          <div>
                            <span className={`text-xs px-2 py-1 rounded-full ${type ? type.color : 'bg-gray-100'}`}>{type ? type.name : 'ไม่ระบุ'}</span>
                            <p className="text-sm font-medium mt-2">{leave.startDate} ถึง {leave.endDate}</p>
                            <p className="text-xs text-gray-500">จำนวน {leave.days} วัน | เหตุผล: {leave.reason}</p>
                          </div>
                          <div className="text-right">
                            {leave.status === 'pending' && <span className="text-yellow-600 text-sm font-medium">รออนุมัติ</span>}
                            {leave.status === 'approved' && <span className="text-green-600 text-sm font-medium">อนุมัติ</span>}
                            {leave.status === 'rejected' && <span className="text-red-600 text-sm font-medium">ไม่อนุมัติ</span>}
                          </div>
                        </div>
                      );
                    }) : <p className="text-center text-gray-500 py-4">ไม่เคยมีประวัติการลา</p>}
                 </div>
               </div>
             </div>
           </div>
        )}
      </div>
    );
  };

  if (isAppLoading) return <div className="p-10 flex flex-col justify-center items-center min-h-screen text-green-600 bg-gray-50"><Loader2 className="w-10 h-10 animate-spin mb-4"/> <span className="font-medium text-gray-600">กำลังเชื่อมต่อฐานข้อมูล...</span></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col relative pb-16 md:pb-0">
      {/* แจ้งเตือน */}
      {toastMsg.text && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white font-medium z-50 flex items-center gap-2 ${toastMsg.type === 'success' ? 'bg-green-600' : toastMsg.type === 'error' ? 'bg-red-500' : 'bg-blue-600'}`}>
          {toastMsg.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          {toastMsg.text}
        </div>
      )}
      
      {/* แถบเมนูด้านบน */}
      <nav className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 p-1 rounded"><CheckSquare className="w-5 h-5" /></div>
          <span className="font-bold text-sm sm:text-lg">HR System</span>
        </div>
        {isLoggedIn && currentUser && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
              <p className="text-xs text-gray-400">{currentUser.dept}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1 bg-gray-800 hover:bg-red-600 px-2 py-1.5 rounded transition text-sm">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        )}
      </nav>
      
      {/* พื้นที่แสดงผลตรงกลาง */}
      <div className="flex-1">
        {!isLoggedIn ? renderLoginView() : (currentUser.role === 'admin' || currentUser.role === 'manager' ? renderAdminView() : <div className="py-4"><EmployeeLeaveComponent user={currentUser} /></div>)}
      </div>

      {/* หน้าต่าง (Modal) แบบฟอร์มยื่นใบลา */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-end sm:items-center">
          <div className="bg-white w-full max-w-md p-6 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">📝 ยื่นใบลา</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-black font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">ประเภทการลา</label>
                <select required value={newLeaveForm.typeId} onChange={(e) => setNewLeaveForm({...newLeaveForm, typeId: e.target.value})} className="w-full border p-2 rounded focus:border-green-500">
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm mb-1">วันที่เริ่ม</label><input type="date" required value={newLeaveForm.startDate} onChange={(e) => setNewLeaveForm({...newLeaveForm, startDate: e.target.value})} className="w-full border p-2 rounded" /></div>
                <div><label className="block text-sm mb-1">ถึงวันที่</label><input type="date" required value={newLeaveForm.endDate} onChange={(e) => setNewLeaveForm({...newLeaveForm, endDate: e.target.value})} className="w-full border p-2 rounded" /></div>
              </div>
              {newLeaveForm.startDate && newLeaveForm.endDate && calculateDays(newLeaveForm.startDate, newLeaveForm.endDate) > 0 && (
                <div className="bg-blue-50 text-blue-700 p-2 text-center text-sm rounded">รวม {calculateDays(newLeaveForm.startDate, newLeaveForm.endDate)} วัน</div>
              )}
              <div>
                <label className="block text-sm mb-1">เหตุผล</label>
                <textarea required rows="2" value={newLeaveForm.reason} onChange={(e) => setNewLeaveForm({...newLeaveForm, reason: e.target.value})} className="w-full border p-2 rounded"></textarea>
              </div>
              <button disabled={isProcessing} type="submit" className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700">ยืนยัน</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
