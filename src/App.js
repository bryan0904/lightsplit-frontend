import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [page, setPage] = useState('home');
  const [roomTitle, setRoomTitle] = useState('');
  const [members, setMembers] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [result, setResult] = useState(null);
  const API_URL = 'https://lightsplit-backend-2.onrender.com';

  // 1. 自动恢复房间（刷新后仍然保持）
  useEffect(() => {
    const savedRoomId = localStorage.getItem('roomId');
    if (savedRoomId) {
      setCurrentRoomId(savedRoomId);
      setPage('room');
      fetchResult(savedRoomId);
    }
  }, []);

  // 2. 保存房间ID到浏览器
  useEffect(() => {
    if (currentRoomId) localStorage.setItem('roomId', currentRoomId);
  }, [currentRoomId]);

  // 3. 获取房间数据（自动处理Unicode转义）
  const fetchResult = async (roomId) => {
    const response = await fetch(`${API_URL}/result/${roomId}`);
    const data = await response.json();
    setResult(data);
    setMembers(data.members); // 直接使用中文成员列表
  };

  // 4. 创建房间
  const createRoom = async () => {
    const response = await fetch(`${API_URL}/create_room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: roomTitle, members: members.filter(m => m) })
    });
    const data = await response.json();
    setCurrentRoomId(data.room_id);
    setPage('room');
  };

  // 5. 提交付款
  const submitPayment = async () => {
    await fetch(`${API_URL}/submit_payment/${currentRoomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: paymentName, 
        amount: parseFloat(paymentAmount),
        description: paymentDescription || '未指定'
      })
    });
    fetchResult(currentRoomId); // 刷新数据
  };

  // 6. 渲染成员下拉菜单（显示中文）
  const renderMemberDropdown = () => (
    <select 
      value={paymentName} 
      onChange={(e) => setPaymentName(e.target.value)}
    >
      <option value="">选择成员</option>
      {members.map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );

  return (
    <div className="App">
      {page === 'room' && (
        <div className="container">
          <h1>{result?.title || '分账房间'}</h1>
          <div className="form-group">
            <h3>提交付款</h3>
            {renderMemberDropdown()} {/* 显示正确的中文成员 */}
            <input 
              type="number" 
              placeholder="金额" 
              onChange={(e) => setPaymentAmount(e.target.value)} 
            />
            <button onClick={submitPayment}>提交</button>
          </div>
          {/* 显示分账结果 */}
          {result && (
            <div className="result-section">
              <h4>每人余额</h4>
              <ul>
                {Object.entries(result.balances).map(([name, balance]) => (
                  <li key={name}>
                    {name}: {balance > 0 ? `应收 ${balance}` : `应付 ${-balance}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
