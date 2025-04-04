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

  const decodeUnicode = (str) => {
    return str.replace(/\\u[\dA-Fa-f]{4}/g,
      match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
    );
  };

  useEffect(() => {
    const savedRoomId = localStorage.getItem('roomId');
    if (savedRoomId) {
      setCurrentRoomId(savedRoomId);
      setPage('room');
      fetchResult(savedRoomId);
    }
  }, []);

  useEffect(() => {
    if (currentRoomId) {
      localStorage.setItem('roomId', currentRoomId);
    }
  }, [currentRoomId]);

  const fetchResult = async (roomId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/result/${roomId}`);
      const data = await response.json();

      const decodedData = {
        ...data,
        members: data.members.map(name => decodeUnicode(name)),
        payments: Object.fromEntries(
          Object.entries(data.payments).map(([k, v]) => [decodeUnicode(k), v])
        )
      };

      setResult(decodedData);
      setMembers(decodedData.members);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

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
    setPaymentAmount('');
  };

  const updateMember = (index, value) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const addMember = () => {
    setMembers([...members, '']);
  };

  return (
    <div className="App">
      {page === 'home' && (
        <div className="container">
          <h1>建立分帳房間</h1>
          <input
            type="text"
            placeholder="房間名稱"
            value={roomTitle}
            onChange={(e) => setRoomTitle(e.target.value)}
          />
          <h3>成員列表</h3>
          {members.map((member, index) => (
            <input
              key={index}
              type="text"
              placeholder={`成員 ${index + 1}`}
              value={member}
              onChange={(e) => updateMember(index, e.target.value)}
            />
          ))}
          <button onClick={addMember}>新增成員</button>
          <button onClick={createRoom}>建立房間</button>
        </div>
      )}

      {page === 'room' && result && (
        <div className="container">
          <h1>{result.title}</h1>

          {/* 付款表單 */}
          <div className="form-group">
            <select
              value={paymentName}
              onChange={(e) => setPaymentName(e.target.value)}
            >
              <option value="">選擇成員</option>
              {members.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="金額"
            />
            <button onClick={submitPayment}>提交付款</button>
          </div>

          {/* 分帳結果 */}
          <div className="result-section">
            <h3>分帳結果</h3>
            {loading ? (
              <p>載入中...</p>
            ) : (
              <ul>
                {Object.entries(result.balances || {}).map(([name, balance]) => (
                  <li key={name}>
                    {name}: {balance > 0 ? `應收 ${balance}` : `應付 ${-balance}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 交易明細 */}
          <div className="result-section">
            <h3>轉帳建議</h3>
            <ul>
              {result.transactions.map((t, index) => (
                <li key={index}>
                  {t.from} → {t.to}: ${t.amount}
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
