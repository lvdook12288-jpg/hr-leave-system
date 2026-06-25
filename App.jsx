import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckSquare, XCircle, CheckCircle, Home, Plus, FileText, Users, Settings, Loader2, LogOut, Search, User
} from 'lucide-react';

// หมายเหตุ: ต้องใส่ LIFF ID ที่ถูกต้องจากหน้า LINE Developers
const liffId = 'ใส่_LIFF_ID_ของคุณตรงนี้'; 

const leaveTypes = [
  { id: 'L1', name: 'ลาป่วย', color: 'bg-red-100 text-red-800', barColor: 'bg-red-500', defaultQuota: 30 },
  { id: 'L2', name: 'ลากิจ', color: 'bg-yellow-100 text-yellow-800', barColor: 'bg-yellow-500', defaultQuota: 3 },
  { id: 'L3', name: 'ลาพักร้อน', color: 'bg-green-100 text-green-800', barColor: 'bg-green-500', defaultQuota: 6 },
  { id: 'L4', name: 'ลาคลอด', color: 'bg-pink-100 text-pink-800', barColor: 'bg-pink-500', defaultQuota: 120 },
  { id: 'L5', name: 'ลาบวช', color: 'bg-orange-100 text-orange-800', barColor: 'bg-orange-500', defaultQuota: 15 },
  { id: 'L6', name: 'ลาชดเชย', color: 'bg-indigo-100 text-indigo-800', barColor: 'bg-indigo-500', defaultQuota: 13 },
];

export default function App() {
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUserId, setLoginUserId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [liffUser, setLiffUser] = useState(null);
  const [toastMsg, setToastMsg] = useState({ text: '', type: 'info' });

  const sheetApiUrl = 'https://script.google.com/macros/s/AKfycbyUjzZu8D3HHQN0W0zMKYY08T8_fYb8oAwlk9hk2u2FSpPp-6ric1tNSFYu_7Iv2DYz/exec';

  const showToast = (text, type = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: 'info' }), 3000);
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
    fetch(sheetApiUrl)
      .then(res => res.json())
      .then(result => {
        if (result.status === 'success') {
          setUsers(result.data.users);
          setLeaves(result.data.leaves);
          if (liffUser) {
            const matched = result.data.users.find(u => u.lineUserId === liffUser.userId);
            if (matched) {
              setCurrentUser(matched);
              setIsLoggedIn(true);
            }
          }
        }
      })
      .catch(err => console.error("Data fetch error", err))
      .finally(() => setIsAppLoading(false));
  }, [liffUser]);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.id === loginUserId);
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
    } else {
      showToast('ไม่พบรหัสพนักงานนี้', 'error');
    }
  };

  if (isAppLoading) return <div className="p-10 text-center">กำลังโหลดระบบ...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {toastMsg.text && <div className="fixed top-4 right-4 bg-black text-white p-3 rounded">{toastMsg.text}</div>}
      
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">เข้าสู่ระบบ</h2>
          <form onSubmit={handleLogin}>
            <input 
              className="w-full border p-2 mb-4" 
              placeholder="กรอกรหัสพนักงาน" 
              value={loginUserId} 
              onChange={(e) => setLoginUserId(e.target.value)} 
            />
            <button className="w-full bg-green-600 text-white p-2 rounded">เข้าสู่ระบบ</button>
          </form>
          {liffUser && (
            <div className="mt-4 p-3 bg-blue-50 text-sm">
              <p>LINE ID ของคุณ:</p>
              <code className="block bg-white p-1 mt-1 border">{liffUser.userId}</code>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold">สวัสดีคุณ {currentUser.name}</h2>
          <button onClick={() => setIsLoggedIn(false)} className="text-red-500 mt-4 underline">ออกจากระบบ</button>
        </div>
      )}
    </div>
  );
}
