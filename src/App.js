import React, { useState } from 'react';
import './App.css';

function App() {
  // State variables
  const [page, setPage] = useState('home');
  const [roomTitle, setRoomTitle] = useState('');
  const [members, setMembers] = useState(['', '']);
  const [memberInput, setMemberInput] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // API endpoint
  const API_URL = 'https://lightsplit-backend.onrender.com';

  // Add member function
  const addMember = () => {
    if (memberInput.trim() !== '') {
      setMembers([...members, memberInput]);
      setMemberInput('');
    }
  };

  // Remove member function
  const removeMember = (index) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  // Create room function
  const createRoom = async () => {
    try {
      setLoading(true);
      setError('');
      const filteredMembers = members.filter(member => member.trim() !== '');
      
      if (roomTitle.trim() === '' || filteredMembers.length < 2) {
        setError('请输入房间标题并至少添加两个成员！');
        setLoading(false);
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
        throw new Error('创建房间失败');
      }

      const data = await response.json();
      const roomId = data.room_id;
      setCurrentRoomId(roomId);
      
      // 创建房间后，直接设置初始结果数据，包括成员列表
      const initialResult = {
        title: roomTitle,
        members: filteredMembers,
        balances: {},
        transactions: [],
        total_spent: 0,
        average_per_person: 0
      };
      
      setResult(initialResult);
      setPage('room');
    } catch (err) {
      setError(err.message);
      console.error('创建房间出错:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join room function
  const joinRoom = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (joinRoomId.trim() === '') {
        setError('请输入有效的房间ID！');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/result/${joinRoomId}`);
      
      if (!response.ok) {
        throw new Error('房间不存在');
      }

      const data = await response.json();
      setCurrentRoomId(joinRoomId);
      setResult(data);
      setPage('room');
    } catch (err) {
      setError(err.message);
      console.error('加入房间出错:', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit payment function
  const submitPayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (paymentName.trim() === '' || !paymentAmount || parseFloat(paymentAmount) <= 0) {
        setError('请选择成员并输入有效的付款金额！');
        setLoading(false);
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
        }),
      });

      if (!response.ok) {
        throw new Error('付款提交失败');
      }

      // Fetch updated results
      await fetchResult();
      
      // Reset payment inputs
      setPaymentName('');
      setPaymentAmount('');
    } catch (err) {
      setError(err.message);
      console.error('提交付款出错:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch result function
  const fetchResult = async () => {
    try {
      const response = await fetch(`${API_URL}/result/${currentRoomId}`);
      
      if (!response.ok) {
        throw new Error('获取结果失败');
      }

      const data = await response.json();
      
      // 确保结果中包含成员列表
      if (!data.members || data.members.length === 0) {
        // 如果结果中没有成员列表，使用当前的结果中的成员列表
        data.members = result?.members || [];
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message);
      console.error('获取结果出错:', err);
    }
  };

  // Reset function
  const goHome = () => {
    setPage('home');
    setRoomTitle('');
    setMembers(['', '']);
    setCurrentRoomId('');
    setJoinRoomId('');
    setResult(null);
    setError('');
  };

  // Copy room ID function
  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoomId);
    alert('房间ID已复制到剪贴板！');
  };

  // Render home page
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

  // Render create room page
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
        <label>成员列表</label>
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
              placeholder="成员姓名"
              disabled={loading}
            />
            <button onClick={() => removeMember(index)} disabled={loading || members.length <= 2}>删除</button>
          </div>
        ))}
        <div className="input-group">
          <input
            type="text"
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            placeholder="添加更多成员"
            onKeyPress={(e) => e.key === 'Enter' && addMember()}
            disabled={loading}
          />
          <button onClick={addMember} disabled={loading || !memberInput.trim()}>添加</button>
        </div>
      </div>
      <div className="button-group">
        <button onClick={createRoom} disabled={loading || roomTitle.trim() === '' || members.filter(m => m.trim()).length < 2}>
          {loading ? '创建中...' : '创建房间'}
        </button>
        <button onClick={goHome} disabled={loading}>返回</button>
      </div>
    </div>
  );

  // Render join room page
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
        <button onClick={joinRoom} disabled={loading || !joinRoomId.trim()}>
          {loading ? '加入中...' : '加入房间'}
        </button>
        <button onClick={goHome} disabled={loading}>返回</button>
      </div>
    </div>
  );

  // Render room page
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
            className="select-input"
          >
            <option value="">选择成员</option>
            {result && result.members && result.members.map((member) => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>
        <div>
          <label>金额</label>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="付款金额"
            step="0.01"
            min="0"
            disabled={loading}
          />
        </div>
        <button onClick={submitPayment} disabled={loading || !paymentName.trim() || !paymentAmount || parseFloat(paymentAmount) <= 0}>
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
        </div>
      )}
      <button onClick={goHome} className="home-button" disabled={loading}>
        返回首页
      </button>
    </div>
  );

  // Render based on current page
  return (
    <div className="App">
      {page === 'createRoom' ? renderCreateRoom() :
       page === 'joinRoom' ? renderJoinRoom() :
       page === 'room' ? renderRoom() : renderHome()}
    </div>
  );
}

export default App;
