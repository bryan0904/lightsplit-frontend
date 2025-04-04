import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [page, setPage] = useState(() => {
    const savedRoomId = localStorage.getItem('currentRoomId');
    return savedRoomId ? 'room' : 'home';
  });
  const [roomTitle, setRoomTitle] = useState('');
  const [members, setMembers] = useState(['']);
  const [memberInput, setMemberInput] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState(() => {
    return localStorage.getItem('currentRoomId') || '';
  });
  const [joinRoomId, setJoinRoomId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = 'https://lightsplit-backend-2.onrender.com';

  useEffect(() => {
    if (currentRoomId) {
      localStorage.setItem('currentRoomId', currentRoomId);
    } else {
      localStorage.removeItem('currentRoomId');
    }
  }, [currentRoomId]);

  useEffect(() => {
    const savedRoomId = localStorage.getItem('currentRoomId');
    if (savedRoomId && page === 'room') {
      setJoinRoomId(savedRoomId);
      fetchResult(savedRoomId);
    }
  }, []);

  const addMember = () => {
    if (memberInput.trim() !== '') {
      setMembers([...members, memberInput]);
      setMemberInput('');
    }
  };

  const removeMember = (index) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const createRoom = async () => {
    try {
      setLoading(true);
      setError('');
      const filteredMembers = members.filter(member => member.trim() !== '');
      
      if (roomTitle.trim() === '' || filteredMembers.length < 2) {
        setError('请输入房间标题并至少添加两个成员！');
        return;
      }
      
      const response = await fetch(`${API_URL}/create_room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: roomTitle,
          members: filteredMembers,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建房间失败');
      }
      
      const data = await response.json();
      setCurrentRoomId(data.room_id);
      setRoomTitle(data.title);
      setMembers(data.members);
      setPage('room');
    } catch (err) {
      setError(err.message);
      console.error('创建房间出错:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResult = async (roomId = currentRoomId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/result/${roomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取结果失败');
      }
      const data = await response.json();
      setResult(data);
      setRoomTitle(data.title);
      setMembers(data.members || Object.keys(data.balances || {}));
    } catch (err) {
      setError(err.message);
      console.error('获取结果出错:', err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (joinRoomId.trim() === '') {
        setError('请输入有效的房间ID！');
        return;
      }
      
      await fetchResult(joinRoomId);
      setCurrentRoomId(joinRoomId);
      setPage('room');
    } catch (err) {
      setError(err.message);
      console.error('加入房间出错:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (paymentName.trim() === '' || !paymentAmount) {
        setError('请输入姓名和付款金额！');
        return;
      }
      
      const response = await fetch(`${API_URL}/submit_payment/${currentRoomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: paymentName,
          amount: parseFloat(paymentAmount),
          description: paymentDescription || '未指定'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '付款提交失败');
      }
      
      alert('付款提交成功！');
      setPaymentName('');
      setPaymentAmount('');
      setPaymentDescription('');
      await fetchResult();
    } catch (err) {
      setError(err.message);
      console.error('提交付款出错:', err);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    setPage('home');
    setRoomTitle('');
    setMembers(['']);
    setCurrentRoomId('');
    setResult(null);
    setError('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoomId);
    alert('房间ID已复制到剪贴板！');
  };

  const renderHome = () => (
    <div className="container">
      <h1>轻松分账</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="button-group">
        <button onClick={() => setPage('createRoom')} disabled={loading}>
          {loading ? '处理中...' : '创建新房间'}
        </button>
        <button onClick={() => setPage('joinRoom')} disabled={loading}>
          {loading ? '处理中...' : '加入已有房间'}
        </button>
      </div>
    </div>
  );

  const renderCreateRoom = () => (
    <div className="container">
      <h1>创建分账房间</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label>房间标题</label>
        <input
          type="text"
          value={roomTitle}
          onChange={(e) => setRoomTitle(e.target.value)}
          placeholder="例如：周末聚餐"
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label>添加成员</label>
        <div className="input-group">
          <input
            type="text"
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            placeholder="输入成员姓名"
            onKeyPress={(e) => e.key === 'Enter' && addMember()}
            disabled={loading}
          />
          <button onClick={addMember} disabled={loading}>添加</button>
        </div>
      </div>
      <div className="members-list">
        <h3>成员列表</h3>
        <ul>
          {members.map((member, index) => (
            member.trim() && (
              <li key={index}>
                {member}
                <button onClick={() => removeMember(index)} disabled={loading}>删除</button>
              </li>
            )
          ))}
        </ul>
      </div>
      <div className="button-group">
        <button onClick={createRoom} disabled={loading}>
          {loading ? '创建中...' : '创建房间'}
        </button>
        <button onClick={goHome} disabled={loading}>返回</button>
      </div>
    </div>
  );

  const renderJoinRoom = () => (
    <div className="container">
      <h1>加入分账房间</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label>房间ID</label>
        <input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          placeholder="输入房间ID"
          disabled={loading}
        />
      </div>
      <div className="button-group">
        <button onClick={joinRoom} disabled={loading}>
          {loading ? '加入中...' : '加入房间'}
        </button>
        <button onClick={goHome} disabled={loading}>返回</button>
      </div>
    </div>
  );

  const renderRoom = () => (
    <div className="container">
      <h1>{result?.title || '分账房间'}</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="room-id-container">
        <p className="room-id">房间ID: {currentRoomId}</p>
        <button onClick={copyRoomId} className="copy-button" disabled={loading}>
          复制ID
        </button>
      </div>
      <div className="form-group">
        <h3>提交付款</h3>
        <div>
          <label>姓名</label>
          <select
            value={paymentName}
            onChange={(e) => setPaymentName(e.target.value)}
            disabled={loading}
            className="dropdown-select"
          >
            <option value="">请选择姓名</option>
            {(result?.members || []).map((name, index) => (
              <option key={index} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>花费项目</label>
          <input
            type="text"
            value={paymentDescription}
            onChange={(e) => setPaymentDescription(e.target.value)}
            placeholder="例如：晚餐、出租车"
            disabled={loading}
          />
        </div>
        <div>
          <label>金额</label>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="付款金额"
            step="0.01"
            disabled={loading}
          />
        </div>
        <button onClick={submitPayment} disabled={loading}>
          {loading ? '提交中...' : '提交付款'}
        </button>
      </div>
      {result && (
        <div className="result-section">
          <h3>分账结果</h3>
          <div className="summary-info">
            <p>总支出: <strong>{result.total_spent?.toFixed(2)}</strong></p>
            <p>人均支出: <strong>{result.average_per_person?.toFixed(2)}</strong></p>
          </div>
          <h4>每人余额</h4>
          <ul className="balance-list">
            {Object.entries(result.balances || {}).map(([name, balance]) => (
              <li 
                key={name} 
                className={
                  balance > 0 ? 'positive' : 
                  balance < 0 ? 'negative' : 'neutral'
                }
              >
                {name}: {balance > 0 ? `应收 ${balance.toFixed(2)}` : 
                          balance < 0 ? `应付 ${Math.abs(balance).toFixed(2)}` : '无需支付'}
              </li>
            ))}
          </ul>
          <h4>转账明细</h4>
          {result.transactions && result.transactions.length > 0 ? (
            <ul className="transaction-list">
              {result.transactions.map((transaction, index) => (
                <li key={index} className="transaction-item">
                  {transaction.from} 需要支付 <span className="amount">{transaction.amount.toFixed(2)}</span> 给 {transaction.to}
                </li>
              ))}
            </ul>
          ) : (
            <p>没有需要转账的款项</p>
          )}
          {result.payments && Object.keys(result.payments).length > 0 && (
            <div className="payment-history">
              <h4>付款记录</h4>
              <ul className="payment-list">
                {Object.entries(result.payments || {}).map(([name, amount], index) => (
                  <li key={index}>
                    {name}: {parseFloat(amount).toFixed(2)}
                    {result.payment_descriptions && result.payment_descriptions[name] && 
                      ` (${result.payment_descriptions[name]})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <button onClick={goHome} className="home-button" disabled={loading}>
        返回首页
      </button>
    </div>
  );

  return (
    <div className="App">
      {page === 'createRoom' ? renderCreateRoom() :
       page === 'joinRoom' ? renderJoinRoom() :
       page === 'room' ? renderRoom() : renderHome()}
    </div>
  );
}

export default App;
