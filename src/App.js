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

  // 创建房间
  const createRoom = async () => {
    const filteredMembers = members.filter(m => m.trim() !== '');
    try {
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
    } catch (err) {
      console.error('创建房间失败:', err);
    }
  };

  // 提交付款
  const submitPayment = async () => {
    try {
      await fetch(`${API_URL}/submit_payment/${currentRoomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: paymentName, 
          amount: parseFloat(paymentAmount) 
        })
      });
      fetchResult(currentRoomId);
      setPaymentName('');
      setPaymentAmount('');
    } catch (err) {
      console.error('提交付款失败:', err);
    }
  };

  // 返回主页
  const goToHome = () => {
    setPage('home');
    setCurrentRoomId('');
    localStorage.removeItem('roomId');
  };

  return (
    <div className="App">
      {page === 'home' && (
        <div className="container">
          <h1>轻松分账</h1>
          <div className="form-group">
            <label>房间标题</label>
            <input
              type="text"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="输入房间标题"
            />
          </div>
          <div className="form-group">
            <label>成员</label>
            {members.map((member, index) => (
              <div key={index} className="input-group">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => {
                    const newMembers = [...members];
                    newMembers[index] = e.target.value;
                    setMembers(newMembers);
                  }}
                  placeholder="成员名称"
                />
                {index === members.length - 1 ? (
                  <button onClick={() => setMembers([...members, ''])}>+</button>
                ) : (
                  <button onClick={() => {
                    const newMembers = [...members];
                    newMembers.splice(index, 1);
                    setMembers(newMembers);
                  }}>-</button>
                )}
              </div>
            ))}
          </div>
          <div className="button-group">
            <button 
              onClick={createRoom}
              disabled={!roomTitle || members.filter(m => m.trim()).length < 2}
            >
              创建房间
            </button>
          </div>
        </div>
      )}

      {page === 'room' && result && (
        <div className="container">
          <h1>{result.title}</h1>
          
          <div className="room-id-container">
            <div className="room-id">房间ID: {currentRoomId}</div>
            <button 
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(currentRoomId);
                alert('已复制房间ID到剪贴板');
              }}
            >
              复制
            </button>
          </div>
          
          {/* 付款表单 */}
          <div className="form-group">
            <label>添加付款</label>
            <select
              className="dropdown-select"
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
            <button 
              onClick={submitPayment}
              disabled={!paymentName || !paymentAmount}
            >
              提交
            </button>
          </div>

          {/* 付款历史 */}
          <div className="payment-history">
            <h3>付款历史</h3>
            <ul className="payment-list">
              {Object.entries(result.payments || {}).map(([name, amount], index) => (
                <li key={index}>
                  {name}: {amount} 元
                </li>
              ))}
            </ul>
          </div>

          {/* 分账结果 */}
          <div className="result-section">
            <h3>分账结果</h3>
            <div className="summary-info">
              <p>总支出: {result.total_spent} 元</p>
              <p>每人平均: {result.average_per_person} 元</p>
            </div>
            <h4>余额情况</h4>
            <ul className="balance-list">
              {Object.entries(result.balances || {}).map(([name, balance]) => (
                <li key={name} className={balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'}>
                  {name}: {balance > 0 ? `应收 ${balance} 元` : balance < 0 ? `应付 ${-balance} 元` : '已平账'}
                </li>
              ))}
            </ul>
            
            <h4>转账方案</h4>
            <ul className="transaction-list">
              {(result.transactions || []).map((tx, index) => (
                <li key={index} className="transaction-item">
                  <span>{tx.from} 需支付 </span>
                  <span className="amount">{tx.amount} 元</span>
                  <span> 给 {tx.to}</span>
                </li>
              ))}
            </ul>
          </div>

          <button className="home-button" onClick={goToHome}>返回主页</button>
        </div>
      )}

      {loading && <div className="loading">加载中...</div>}
    </div>
  );
}

export default App;
