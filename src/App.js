import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [page, setPage] = useState('home');
  const [roomTitle, setRoomTitle] = useState('');
  const [members, setMembers] = useState(['']);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_URL = 'https://lightsplit-backend-2.onrender.com';

  // Unicode解码函数
  const decodeUnicode = (str) => {
    return str.replace(/\\u[\dA-Fa-f]{4}/g, 
      match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
    );
  };

  // 自动恢复房间
  useEffect(() => {
    const savedRoomId = localStorage.getItem('roomId');
    if (savedRoomId) {
      setCurrentRoomId(savedRoomId);
      setPage('room');
      fetchResult(savedRoomId);
    }
  }, []);

  // 保存房间ID
  useEffect(() => {
    if (currentRoomId) {
      localStorage.setItem('roomId', currentRoomId);
    }
  }, [currentRoomId]);

  // 获取房间数据
  const fetchResult = async (roomId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/result/${roomId}`);
      const data = await response.json();
      
      // 解码Unicode中文
      const decodedData = {
        ...data,
        members: data.members.map(name => decodeUnicode(name)),
        payments: Object.fromEntries(
          Object.entries(data.payments).map(([k, v]) => [decodeUnicode(k), v]))
      };
      
      setResult(decodedData);
      setMembers(decodedData.members);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 创建房间
  const createRoom = async () => {
    const filteredMembers = members.filter(m => m.trim() !== '');
    const response = await fetch(`${API_URL}/create_room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: roomTitle, 
        members: filteredMembers 
      })
    });
    const data = await response.json();
    setCurrentRoomId(data.room_id);
    setPage('room');
  };

  // 提交付款
  const submitPayment = async () => {
    await fetch(`${API_URL}/submit_payment/${currentRoomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: paymentName, 
        amount: parseFloat(paymentAmount) 
      })
    });
    fetchResult(currentRoomId);
  };

  return (
    <div className="App">
      {page === 'room' && result && (
        <div className="container">
          <h1>{result.title}</h1>
          
          {/* 付款表单 */}
          <div className="form-group">
            <select
              value={paymentName}
              onChange={(e) => setPaymentName(e.target.value)}
            >
              <option value="">选择成员</option>
              {members.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="金额"
            />
            <button onClick={submitPayment}>提交</button>
          </div>

          {/* 分账结果 */}
          <div className="result-section">
            <h3>分账结果</h3>
            <ul>
              {Object.entries(result.balances || {}).map(([name, balance]) => (
                <li key={name}>
                  {name}: {balance > 0 ? `应收 ${balance}` : `应付 ${-balance}`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
