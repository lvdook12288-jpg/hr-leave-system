import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle, CheckSquare, XCircle, CheckCircle, Calendar, Home, Plus, FileText, Users, Settings, Loader2
} from 'lucide-react';

const leaveTypes = [
  { id: 'L1', name: 'ลาป่วย', color: 'bg-red-100 text-red-800', barColor: 'bg-red-500', defaultQuota: 30 },
  { id: 'L2', name: 'ลากิจ', color: 'bg-yellow-100 text-yellow-800', barColor: 'bg-yellow-500', defaultQuota: 3 },
  { id: 'L3', name: 'ลาพักร้อน', color: 'bg-green-100 text-green-800', barColor: 'bg-green-500', defaultQuota: 6 },
  { id: 'L4', name: 'ลาคลอด', color: 'bg-pink-100 text-pink-800', barColor: 'bg-pink-500', defaultQuota: 120 },
  { id: 'L5', name: 'ลาบวช', color: 'bg-orange-100 text-orange-800', barColor: 'bg-orange-500', defaultQuota: 15 },
  { id: 'L6', name: 'ลาชดเชย', color: 'bg-indigo-100 text-indigo-800', barColor: 'bg-indigo-500', defaultQuota: 13 },
];

const initialUsers = [{ 
  id: 'LOADING', name: 'กำลังโหลดข้อมูล...', dept: '...', role: 'employee', status: 'active', tenure: 0,
  balances: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 }, quotas: { L1: 30, L2: 3, L3: 6, L4: 120, L5: 15, L6: 13 }
}];

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
  const [users, setUsers] = useState(initialUsers);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('LOADING'); 
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [toastMsg, setToastMsg] = useState({ text: '', type: 'info' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [newLeaveForm, setNewLeaveForm] = useState({ typeId: 'L1', startDate: '', endDate: '', reason: '' });

  const currentUser = useMemo(() => {
    const foundUser = users.find(u => u.id === currentUserId);
    return foundUser ? foundUser : users[0];
  }, [currentUserId, users]);

  const showToast = (msg, type = 'info') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg({ text: '', type: 'info' }), 4000);
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) return 0;
    return Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  };

  const sheetApiUrl = 'https://script.google.com/macros/s/AKfycbyUjzZu8D3HHQN0W0zMKYY08T8_fYb8oAwlk9hk2u2FSpPp-6ric1tNSFYu_7Iv2DYz/exec';

  useEffect(() => {
    const fetchUsersFromSheet = async () => {
      try {
        const response = await fetch(sheetApiUrl);
        const textResponse = await response.text(); 
        let result;
        try { 
          result = JSON.parse(textResponse); 
        } catch (e) { 
          throw new Error("API Format Error"); 
        }
        
        if (result.error) throw new Error(result.error);

        if (result.status === 'success' && result.data && result.data.users) {
          const fetchedUsers = result.data.users.map((row, index) => {
            const rowData = row ? row : {};
            const safeStr = (val) => val ? val.toString() : '';
            const safeFloat = (val) => parseFloat(val) || 0;
            
            return {
              id: rowData['รหัส'] ? rowData['รหัส'].toString() : `EMP${index+1}`,
              name: `${safeStr(rowData['ชื่อ'])} ${safeStr(rowData['นามสกุล'])}`.trim() || 'ไม่ระบุชื่อ',
              dept: safeStr(rowData['ชื่อแผนก']) || 'General',
              role: (safeStr(rowData['ชื่อแผนก']) === 'สำนักงาน') ? 'admin' : 'employee',
              status: safeStr(rowData['สถานะ']).toLowerCase() === 'active' ? 'active' : 'inactive',
              tenure: safeFloat(rowData['อายุงาน(ปี)']),
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
          setCurrentUserId(fetchedUsers[0].id); 
          showToast('เชื่อมต่อฐานข้อมูลสำเร็จ!', 'success');
        } else {
          throw new Error('ไม่พบข้อมูลใน Sheet');
        }
      } catch (error) {
        showToast(`ทำงานในโหมดจำลอง: ${error.message}`, 'error'); 
        setUsers([{ id: '20191101', name: 'พนักงาน (จำลอง)', dept: 'IT', role: 'employee', status: 'active', tenure: 3, balances: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 }, quotas: { L1: 30, L2: 3, L3: 6, L4: 120, L5: 15, L6: 13 } }]);
        setCurrentUserId('20191101');
      }
    };
    fetchUsersFromSheet();
  }, []); 

  const submitLeaveRequestToDB = async (newRequest) => {
    setIsProcessing(true);
    try {
      const response = await fetch(sheetApiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'createLeave', data: newRequest })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeaves([newRequest, ...leaves]); 
        showToast('บันทึกใบลาลงฐานข้อมูลสำเร็จ!', 'success');
      } else {
        throw new Error(result.error ? result.error : "บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (บันทึกชั่วคราว)', 'error');
      setLeaves([newRequest, ...leaves]); 
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveReject = async (leaveId, newStatus) => {
    setIsProcessing(true);
    try {
      const response = await fetch(sheetApiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateLeaveStatus', data: { id: leaveId, status: newStatus } })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: newStatus } : l));
        showToast(`ทำรายการ ${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} เรียบร้อย`, newStatus === 'approved' ? 'success' : 'error');
      } else {
        throw new Error(result.error ? result.error : "บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const days = calculateDays(newLeaveForm.startDate, newLeaveForm.endDate);
    if (days <= 0) return showToast('วันที่ไม่ถูกต้อง', 'error');

    const newRequest = {
      id: `REQ${Date.now()}`,
      userId: currentUser.id,
      typeId: newLeaveForm.typeId,
      startDate: newLeaveForm.startDate,
      endDate: newLeaveForm.endDate,
      days: days,
      status: 'pending',
      reason: newLeaveForm.reason,
      createdAt: new Date().toISOString().split('T')[0]
    };

    submitLeaveRequestToDB(newRequest);
    setIsLeaveModalOpen(false);
    setNewLeaveForm({ typeId: 'L1', startDate: '', endDate: '', reason: '' });
  };

  const handleAddHoliday = (e) => {
    e.preventDefault();
    const date = e.target.date.value;
    const name = e.target.name.value;
    if (date && name) {
      setHolidays([...holidays, { date, name }]);
      showToast('เพิ่มวันหยุดเรียบร้อย', 'success');
      e.target.reset();
    }
  };

  const handleDeleteHoliday = (date) => {
    setHolidays(holidays.filter(h => h.date !== date));
    showToast('ลบวันหยุดเรียบร้อย', 'success');
  };

  const renderEmployeeView = () => {
    const myLeaves = currentUser ? leaves.filter(l => l.userId === currentUser.id) : [];
    
    return (
      <div className="max-w-md mx-auto bg-white min-h-[calc(100vh-64px)] shadow-lg pb-20 relative">
        <div className="bg-green-600 text-white p-4 text-center rounded-b-3xl shadow-md">
          <h2 className="text-xl font-bold">ยื่นใบลา (LINE LIFF)</h2>
          <p className="text-sm opacity-80 mt-1">{currentUser ? currentUser.name : ''} | แผนก {currentUser ? currentUser.dept : ''}</p>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center"><PieChartIcon /> สิทธิ์การลาคงเหลือ</h3>
            <div className="grid gap-3">
              {leaveTypes.map(type => {
                const staticUsed = (currentUser && currentUser.balances && currentUser.balances[type.id]) ? currentUser.balances[type.id] : 0;
                const dynamicallyApprovedLeaves = myLeaves.filter(l => l.typeId === type.id && l.status === 'approved');
                const dynamicUsed = dynamicallyApprovedLeaves.reduce((sum, l) => sum + l.days, 0);
                const totalUsed = staticUsed + dynamicUsed;

                const quota = (currentUser && currentUser.quotas && currentUser.quotas[type.id] !== undefined) ? currentUser.quotas[type.id] : type.defaultQuota;
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

          <button 
            disabled={isProcessing}
            onClick={() => setIsLeaveModalOpen(true)} 
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-green-600 transition flex justify-center items-center gap-2 disabled:bg-gray-400"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} สร้างใบลาใหม่
          </button>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center"><HistoryIcon /> ประวัติการลา</h3>
            <div className="space-y-3">
              {myLeaves.length > 0 ? myLeaves.map(leave => {
                const type = leaveTypes.find(t => t.id === leave.typeId);
                return (
                  <div key={leave.id} className="border p-3 rounded-lg flex justify-between items-center shadow-sm bg-white">
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${type ? type.color : 'bg-gray-100'}`}>{type ? type.name : 'ไม่ระบุ'}</span>
                      <p className="text-sm font-medium mt-2">{leave.startDate} ถึง {leave.endDate}</p>
                      <p className="text-xs text-gray-500">จำนวน {leave.days} วัน | เหตุผล: {leave.reason}</p>
                    </div>
                    <div className="text-right">
                      {leave.status === 'pending' && <span className="text-yellow-600 text-sm font-medium">⏳ รออนุมัติ</span>}
                      {leave.status === 'approved' && <span className="text-green-600 text-sm font-medium">✅ อนุมัติ</span>}
                      {leave.status === 'rejected' && <span className="text-red-600 text-sm font-medium">❌ ไม่อนุมัติ</span>}
                    </div>
                  </div>
                );
              }) : <p className="text-center text-gray-400 text-sm py-4">ไม่มีประวัติการลา</p>}
            </div>
          </div>
        </div>

        {isLeaveModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-end sm:items-center">
            <div className="bg-white w-full max-w-md p-6 rounded-t-2xl sm:rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">📝 กรอกแบบฟอร์มการลา</h3>
                <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
              </div>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทการลา</label>
                  <select required value={newLeaveForm.typeId} onChange={(e) => setNewLeaveForm({...newLeaveForm, typeId: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-green-500 bg-white">
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                    <input type="date" required value={newLeaveForm.startDate} onChange={(e) => setNewLeaveForm({...newLeaveForm, startDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                    <input type="date" required value={newLeaveForm.endDate} onChange={(e) => setNewLeaveForm({...newLeaveForm, endDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-green-500" />
                  </div>
                </div>
                {newLeaveForm.startDate && newLeaveForm.endDate && calculateDays(newLeaveForm.startDate, newLeaveForm.endDate) > 0 && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded text-center font-medium">
                    ระยะเวลาที่ลารวม: {calculateDays(newLeaveForm.startDate, newLeaveForm.endDate)} วัน
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลการลา</label>
                  <textarea required rows="2" value={newLeaveForm.reason} onChange={(e) => setNewLeaveForm({...newLeaveForm, reason: e.target.value})} placeholder="ระบุเหตุผลให้ชัดเจน..." className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-green-500"></textarea>
                </div>
                <button disabled={isProcessing} type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition mt-2 disabled:bg-gray-400 flex justify-center items-center gap-2">
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin"/>} ยืนยันการยื่นใบลา
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAdminView = () => {
    const pendingLeaves = leaves.filter(l => l.status === 'pending');
    
    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
        <div className="w-full md:w-64 bg-white border-r p-4 overflow-y-auto hidden md:block">
          <ul className="space-y-2">
            {[
              { id: 'dashboard', icon: <Home className="w-5 h-5"/>, label: 'ภาพรวม (Dashboard)' },
              { id: 'employees', icon: <Users className="w-5 h-5"/>, label: 'พนักงานทั้งหมด' },
              { id: 'holidays', icon: <Calendar className="w-5 h-5"/>, label: 'วันหยุดบริษัท' },
              { id: 'reports', icon: <FileText className="w-5 h-5"/>, label: 'รายงานสรุป' }
            ].map(menu => (
              <li key={menu.id}>
                <button onClick={() => setActiveTab(menu.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === menu.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {menu.icon} {menu.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 bg-gray-50 p-4 md:p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">แดชบอร์ด (Dashboard)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard title="พนักงานทั้งหมด" value={users.filter(u=>u.status==='active').length} color="blue" />
                <StatCard title="รายการลาทั้งหมด" value={leaves.length} color="red" />
                <StatCard title="รอดำเนินการ" value={pendingLeaves.length} color="yellow" />
                <StatCard title="วันหยุดบริษัท" value={holidays.length} color="green" />
              </div>
              
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4">รายการรอดำเนินการ (รออนุมัติ)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="py-3 px-4 rounded-tl-lg">พนักงาน</th>
                        <th className="py-3 px-4">ประเภท</th>
                        <th className="py-3 px-4">วันที่ลา</th>
                        <th className="py-3 px-4">เหตุผล</th>
                        <th className="py-3 px-4 rounded-tr-lg">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeaves.map(leave => {
                        const user = users.find(u => u.id === leave.userId);
                        const type = leaveTypes.find(t => t.id === leave.typeId);
                        return (
                          <tr key={leave.id} className="border-b">
                            <td className="py-3 px-4 font-medium">{user ? user.name : leave.userId}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${type ? type.color : 'bg-gray-100'}`}>{type ? type.name : '-'}</span></td>
                            <td className="py-3 px-4">{leave.startDate} ({leave.days} วัน)</td>
                            <td className="py-3 px-4 text-gray-500">{leave.reason}</td>
                            <td className="py-3 px-4 flex gap-2">
                              <button disabled={isProcessing} onClick={() => handleApproveReject(leave.id, 'approved')} className="text-green-600 hover:bg-green-50 px-2 py-1 rounded border border-green-200 disabled:opacity-50">✔️ อนุมัติ</button>
                              <button disabled={isProcessing} onClick={() => handleApproveReject(leave.id, 'rejected')} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded border border-red-200 disabled:opacity-50">❌ ปฏิเสธ</button>
                            </td>
                          </tr>
                        );
                      })}
                      {pendingLeaves.length === 0 && (
                        <tr><td colSpan="5" className="text-center py-6 text-gray-500">เยี่ยมมาก! ไม่มีรายการรอดำเนินการ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">รายชื่อพนักงานในระบบ</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr><th className="py-3 px-4">รหัส</th><th className="py-3 px-4">ชื่อ</th><th className="py-3 px-4">แผนก</th><th className="py-3 px-4">สิทธิ์</th><th className="py-3 px-4">สถานะ</th></tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className={`border-b hover:bg-gray-50 ${user.status !== 'active' ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-4">{user.id}</td>
                        <td className="py-3 px-4 font-medium">{user.name}</td>
                        <td className="py-3 px-4">{user.dept}</td>
                        <td className="py-3 px-4">{user.role}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span>
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
              <h2 className="text-2xl font-bold mb-6">รายงานสรุปวันลาพนักงานทั้งหมด</h2>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-gray-800 text-white">
                     <tr>
                       <th className="py-3 px-4 rounded-tl-lg">ชื่อพนักงาน</th>
                       {leaveTypes.map(t => <th key={t.id} className="py-3 px-4">{t.name} <br/><span className="text-xs font-normal opacity-70">ใช้แล้ว/โควตา</span></th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {users.filter(u=>u.status==='active').map((user, index) => (
                       <tr key={user.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                         <td className="py-3 px-4 font-medium">{user.name}</td>
                         {leaveTypes.map(t => {
                           const staticUsed = (user.balances && user.balances[t.id]) ? user.balances[t.id] : 0;
                           const dynamicallyApprovedLeaves = leaves.filter(l => l.userId === user.id && l.typeId === t.id && l.status === 'approved');
                           const dynamicUsed = dynamicallyApprovedLeaves.reduce((sum, l) => sum + l.days, 0);
                           const totalUsed = staticUsed + dynamicUsed;
                           const quota = (user.quotas && user.quotas[t.id] !== undefined) ? user.quotas[t.id] : t.defaultQuota;
                           return (
                             <td key={t.id} className="py-3 px-4 text-center">
                               <span className={`font-medium ${totalUsed > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{totalUsed}</span> / <span className="text-gray-500 text-xs">{quota}</span>
                             </td>
                           )
                         })}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'holidays' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center justify-between">
                จัดการวันหยุดประจำปี (Holidays)
              </h2>
              
              <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input type="date" name="date" required className="border border-gray-300 p-2 rounded-lg flex-1 outline-none focus:border-green-500" />
                <input type="text" name="name" placeholder="ชื่อวันหยุด (เช่น วันสงกรานต์)" required className="border border-gray-300 p-2 rounded-lg flex-[2] outline-none focus:border-green-500" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition">
                  <Plus className="w-4 h-4"/> เพิ่ม
                </button>
              </form>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4">วันที่</th>
                      <th className="py-3 px-4">ชื่อวันหยุด</th>
                      <th className="py-3 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.length > 0 ? [...holidays].sort((a,b) => new Date(a.date) - new Date(b.date)).map((h, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{h.date}</td>
                        <td className="py-3 px-4 text-gray-700">{h.name}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => handleDeleteHoliday(h.date)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition">ลบ</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-500">
                          ยังไม่มีข้อมูลวันหยุดบริษัท สามารถเพิ่มได้จากช่องด้านบน
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (currentUserId === 'LOADING') return <div className="p-10 flex flex-col justify-center items-center min-h-screen text-gray-500"><Loader2 className="w-8 h-8 animate-spin mb-4"/> กำลังเชื่อมต่อฐานข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      {toastMsg.text && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white font-medium z-50 flex items-center gap-2 ${toastMsg.type === 'success' ? 'bg-green-600' : toastMsg.type === 'error' ? 'bg-red-500' : 'bg-blue-600'}`}>
          {toastMsg.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          {toastMsg.text}
        </div>
      )}

      <nav className="bg-gray-900 text-white px-4 md:px-6 py-3 flex flex-col md:flex-row justify-between items-center sticky top-0 z-40 gap-3 md:gap-0 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 text-white p-1 rounded-lg"><CheckSquare className="w-6 h-6" /></div>
          <span className="font-bold text-lg">LINELeave System</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">ทดสอบในมุมมองของ:</span>
          <select value={currentUserId} onChange={(e) => { setCurrentUserId(e.target.value); setActiveTab('dashboard'); }} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 max-w-[200px] truncate cursor-pointer">
            {users.filter(u=>u.status==='active').map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
      </nav>

      {currentUser && currentUser.role === 'employee' ? renderEmployeeView() : renderAdminView()}
    </div>
  );
}
