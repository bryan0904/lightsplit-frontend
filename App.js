import React, { useState } from 'react';
import './App.css';

function App() {
  // 状态管理
  const [page, setPage] = useState('home'); // 页面状态：home, createRoom, joinRoom, room
  const [roomTitle, setRoomTitle] = useState('');
  const [members, setMembers] = useState(['']); // 初始一个空成员
  const [memberInput, setMemberInput] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [result, setResult] = useState(null);

  // API基础URL
  const API_URL = 'https://lightsplit-backend-2.onrender.com';

  // 添加成员
  const addMember = () => {
    if (memberInput.trim() !== '') {
      setMembers([...members, memberInput]);
      setMemberInput('');
    }
  };

  // 移除成员
  const removeMember = (index) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  // 创建房间
  const createRoom = async () => {
    try {
      const filteredMembers = members.filter(member => member.trim() !== '');
      if (roomTitle.trim() === '' || filteredMembers.length < 2) {
        alert('请输入房间标题并至少添加两个成员！');
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

      const data = await response.json();
      setCurrentRoomId(data.room_id);
      setPage('room');
    } catch (error) {
      console.error('创建房间出错:', error);
      alert('创建房间失败，请检查后端服务是否运行。');
    }
  };

  // 加入房间
  const joinRoom = async () => {
    try {
      if (joinRoomId.trim() === '') {
        alert('请输入有效的房间ID！');
        return;
      }

      // 先尝试获取结果，验证房间是否存在
      const response = await fetch(`${API_URL}/result/${joinRoomId}`);
      if (!response.ok) {
        alert('房间不存在，请检查ID是否正确。');
        return;
      }

      setCurrentRoomId(joinRoomId);
      setPage('room');
      fetchResult();
    } catch (error) {
      console.error('加入房间出错:', error);
      alert('加入房间失败，请检查后端服务是否运行。');
    }
  };

  // 提交付款
  const submitPayment = async () => {
    try {
      if (paymentName.trim() === '' || !paymentAmount) {
        alert('请输入姓名和付款金额！');
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

      if (response.ok) {
        alert('付款提交成功！');
        setPaymentName('');
        setPaymentAmount('');
        fetchResult();
      } else {
        alert('付款提交失败，请重试。');
      }
    } catch (error) {
      console.error('提交付款出错:', error);
      alert('提交付款失败，请检查后端服务是否运行。');
    }
  };

  // 获取结算结果
  const fetchResult = async () => {
    try {
      const response = await fetch(`${API_URL}/result/${currentRoomId}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('获取结果出错:', error);
    }
  };

  // 返回首页
  const goHome = () => {
    setPage('home');
    setRoomTitle('');
    setMembers(['']);
    setCurrentRoomId('');
    setResult(null);
  };

  // 复制房间ID到剪贴板
  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoomId);
    alert('房间ID已复制到剪贴板！');
  };

  // 渲染首页
  const renderHome = () => (
    <div className="container">
      <h1>轻松分账</h1>
      <div className="button-group">
        <button onClick={() => setPage('createRoom')}>创建新房间</button>
        <button onClick={() => setPage('joinRoom')}>加入已有房间</button>
      </div>
    </div>
  );

  // 渲染创建房间页面
  const renderCreateRoom = () => (
    <div className="container">
      <h1>创建分账房间</h1>
      <div className="form-group">
        <label>房间标题</label>
        <input
          type="text"
          value={roomTitle}
          onChange={(e) => setRoomTitle(e.target.value)}
          placeholder="例如：周末聚餐"
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
          />
          <button onClick={addMember}>添加</button>
        </div>
      </div>

      <div className="members-list">
        <h3>成员列表</h3>
        <ul>
          {members.map((member, index) => (
            member.trim() && (
              <li key={index}>
                {member}
                <button onClick={() => removeMember(index)}>删除</button>
              </li>
            )
          ))}
        </ul>
      </div>

      <div className="button-group">
        <button onClick={createRoom}>创建房间</button>
        <button onClick={goHome}>返回</button>
      </div>
    </div>
  );

  // 渲染加入房间页面
  const renderJoinRoom = () => (
    <div className="container">
      <h1>加入分账房间</h1>
      <div className="form-group">
        <label>房间ID</label>
        <input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          placeholder="输入房间ID"
        />
      </div>
      <div className="button-group">
        <button onClick={joinRoom}>加入房间</button>
        <button onClick={goHome}>返回</button>
      </div>
    </div>
  );

  // 渲染房间页面
  const renderRoom = () => (
    <div className="container">
      <h1>{result?.title || '加载中...'}</h1>
      <div className="room-id-container">
        <p className="room-id">房间ID: {currentRoomId}</p>
        <button onClick={copyRoomId} className="copy-button">复制ID</button>
      </div>

      <div className="form-group">
        <h3>提交付款</h3>
        <div>
          <label>姓名</label>
          <input
            type="text"
            value={paymentName}
            onChange={(e) => setPaymentName(e.target.value)}
            placeholder="您的姓名"
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
          />
        </div>
        <button onClick={submitPayment}>提交付款</button>
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
              <li key={name} className={balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'}>
                {name}: {balance > 0 ? `应收 ${balance.toFixed(2)}` : balance < 0 ? `应付 ${Math.abs(balance).toFixed(2)}` : '无需支付'}
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

      <button onClick={goHome} className="home-button">返回首页</button>
    </div>
  );

  // 根据页面状态渲染不同的内容
  const renderPage = () => {
    switch (page) {
      case 'createRoom':
        return renderCreateRoom();
      case 'joinRoom':
        return renderJoinRoom();
      case 'room':
        return renderRoom();
      default:
        return renderHome();
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;