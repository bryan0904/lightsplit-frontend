import React, { useState, useEffect, useRef } from 'react';
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
  const [paymentDescription, setPaymentDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [swipedRowId, setSwipedRowId] = useState(null);
  
  // 新增状态 - 编辑模态框
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [involvedMembers, setInvolvedMembers] = useState([]);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);

  // API endpoint
  const API_URL = 'https://lightsplit-backend.onrender.com';

  // 检查URL中是否包含房间ID
  useEffect(() => {
    const checkUrlForRoomId = () => {
      const pathSegments = window.location.pathname.split('/');
      if (pathSegments.length > 1 && pathSegments[1].length > 0) {
        const roomIdFromUrl = pathSegments[1];
        setJoinRoomId(roomIdFromUrl);
        joinRoomWithId(roomIdFromUrl);
      }
    };

    checkUrlForRoomId();
  }, []);

  // 触摸事件处理
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const minSwipeDistance = 80;

  const handleTouchStart = (e, paymentId) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e, paymentId) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e, paymentId) => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    
    if (distance > minSwipeDistance) {
      // 向左滑动，显示操作按钮
      setSwipedRowId(paymentId === swipedRowId ? null : paymentId);
    } else if (distance < -minSwipeDistance) {
      // 向右滑动，隐藏操作按钮
      setSwipedRowId(null);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 更新URL
  const updateUrlWithRoomId = (roomId) => {
    if (roomId) {
      window.history.pushState({}, '', `/${roomId}`);
    } else {
      window.history.pushState({}, '', '/');
    }
  };

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
        average_per_person: 0,
        payment_records: []
      };
      
      setResult(initialResult);
      setPayments([]);
      setPage('room');
      updateUrlWithRoomId(roomId); // 更新URL
    } catch (err) {
      setError(err.message);
      console.error('创建房间出错:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join room with ID function (用于URL直接访问)
  const joinRoomWithId = async (roomId) => {
    try {
      setLoading(true);
      setError('');
      
      if (!roomId.trim()) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/result/${roomId}`);
      
      if (!response.ok) {
        throw new Error('房间不存在');
      }

      const data = await response.json();
      setCurrentRoomId(roomId);
      setResult(data);
      // 从后端获取支付记录
      if (data.payment_records) {
        setPayments(data.payment_records);
      } else {
        setPayments([]);
      }
      setPage('room');
      updateUrlWithRoomId(roomId); // 更新URL
    } catch (err) {
      setError(`加入房间失败: ${err.message}`);
      console.error('加入房间出错:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join room function (用于表单输入)
  const joinRoom = async () => {
    await joinRoomWithId(joinRoomId);
  };

  // 多选框处理相关的函数
  const toggleMembersDropdown = () => {
    setShowMembersDropdown(!showMembersDropdown);
  };

  const handleMemberCheckboxChange = (member) => {
    if (involvedMembers.includes(member)) {
      setInvolvedMembers(involvedMembers.filter(m => m !== member));
    } else {
      setInvolvedMembers([...involvedMembers, member]);
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

      const amount = parseFloat(paymentAmount);
      
      // 提交到后端，包括描述信息和涉及成员
      const response = await fetch(`${API_URL}/submit_payment/${currentRoomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: paymentName,
          amount: amount,
          description: paymentDescription || '未填写描述',
          involved_members: involvedMembers.length > 0 ? involvedMembers : result.members // 如果没有选择特定成员，则使用所有成员
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
      setPaymentDescription('');
      setInvolvedMembers([]);
    } catch (err) {
      setError(err.message);
      console.error('提交付款出错:', err);
    } finally {
      setLoading(false);
    }
  };

  // 编辑支付
  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setShowEditModal(true);
    // 设置表单初始值
    setPaymentName(payment.name);
    setPaymentAmount(payment.amount.toString());
    setPaymentDescription(payment.description || '');
    // 设置涉及成员
    setInvolvedMembers(payment.involved_members || result.members);
  };

  // 删除支付
  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('确定要删除这条支付记录吗？')) {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_URL}/delete_payment/${currentRoomId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: paymentId
          }),
        });

        if (!response.ok) {
          throw new Error('删除支付记录失败');
        }

        // 清除滑动状态
        setSwipedRowId(null);
        
        // 刷新数据
        await fetchResult();
      } catch (err) {
        setError(err.message);
        console.error('删除支付记录出错:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 提交编辑
  const submitEditPayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (paymentName.trim() === '' || !paymentAmount || parseFloat(paymentAmount) <= 0) {
        setError('请选择成员并输入有效的付款金额！');
        setLoading(false);
        return;
      }

      const amount = parseFloat(paymentAmount);
      
      const response = await fetch(`${API_URL}/edit_payment/${currentRoomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPayment.id,
          name: paymentName,
          amount: amount,
          description: paymentDescription || '未填写描述',
          involved_members: involvedMembers.length > 0 ? involvedMembers : result.members
        }),
      });

      if (!response.ok) {
        throw new Error('编辑支付记录失败');
      }

      // 关闭模态框并重置表单
      setShowEditModal(false);
      setEditingPayment(null);
      setPaymentName('');
      setPaymentAmount('');
      setPaymentDescription('');
      setInvolvedMembers([]);
      
      // 清除滑动状态
      setSwipedRowId(null);
      
      // 刷新数据
      await fetchResult();
    } catch (err) {
      setError(err.message);
      console.error('编辑支付记录出错:', err);
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
        data.members = result?.members || [];
      }
      
      setResult(data);
      
      // 从后端获取支付记录
      if (data.payment_records) {
        setPayments(data.payment_records);
      }
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
    setPayments([]);
    setError('');
    updateUrlWithRoomId(''); // 清除URL中的房间ID
  };

  // Copy room ID function
  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoomId);
    alert('房间ID已复制到剪贴板！');
  };

  // 复制分享链接
  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/${currentRoomId}`;
    navigator.clipboard.writeText(shareLink);
    alert('分享链接已复制到剪贴板！');
  };

  // 每次成员列表更新时，更新涉及成员列表
  useEffect(() => {
    if (result && result.members) {
      // 只在初始渲染时设置全选
      if (involvedMembers.length === 0) {
        setInvolvedMembers([...result.members]);
      }
    }
  }, [result?.members]);

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

  // 渲染编辑模态框
  const renderEditModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>编辑支付记录</h3>
          <button className="close-button" onClick={() => {
            setShowEditModal(false);
            setPaymentName('');
            setPaymentAmount('');
            setPaymentDescription('');
            setInvolvedMembers([]);
          }}>&times;</button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
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
        <div className="form-group">
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
        <div className="form-group">
          <label>花费项目</label>
          <input
            type="text"
            value={paymentDescription}
            onChange={(e) => setPaymentDescription(e.target.value)}
            placeholder="如：晚餐、电影票、打车费"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>涉及成员</label>
          <div className="checkbox-dropdown" onClick={toggleMembersDropdown}>
            {involvedMembers.length > 0 ? (
              <div className="selected-options">
                {involvedMembers.map(member => (
                  <span key={member} className="selected-option">{member}</span>
                ))}
              </div>
            ) : (
              <span className="dropdown-placeholder">选择涉及成员</span>
            )}
          </div>
          {showMembersDropdown && (
            <div className="checkbox-dropdown-list">
              {result && result.members && result.members.map((member) => (
                <div key={member} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`member-${member}`}
                    checked={involvedMembers.includes(member)}
                    onChange={() => handleMemberCheckboxChange(member)}
                  />
                  <label htmlFor={`member-${member}`}>{member}</label>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="button-group">
          <button 
            onClick={submitEditPayment} 
            disabled={loading || !paymentName.trim() || !paymentAmount || parseFloat(paymentAmount) <= 0}
          >
            {loading ? '保存中...' : '保存修改'}
          </button>
        </div>
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
        <button onClick={copyShareLink} className="copy-button" disabled={loading}>
          复制分享链接
        </button>
      </div>
      
      {/* 支付表单 */}
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
        <div>
          <label>花费项目</label>
          <input
            type="text"
            value={paymentDescription}
            onChange={(e) => setPaymentDescription(e.target.value)}
            placeholder="如：晚餐、电影票、打车费"
            disabled={loading}
          />
        </div>
        <div>
          <label>涉及成员</label>
          <div className="checkbox-dropdown" onClick={toggleMembersDropdown}>
            {involvedMembers.length > 0 ? (
              <div className="selected-options">
                {involvedMembers.map(member => (
                  <span key={member} className="selected-option">{member}</span>
                ))}
              </div>
            ) : (
              <span className="dropdown-placeholder">选择涉及成员</span>
            )}
          </div>
          {showMembersDropdown && (
            <div className="checkbox-dropdown-list">
              {result && result.members && result.members.map((member) => (
                <div key={member} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`member-${member}`}
                    checked={involvedMembers.includes(member)}
                    onChange={() => handleMemberCheckboxChange(member)}
                  />
                  <label htmlFor={`member-${member}`}>{member}</label>
                </div>
              ))}
            </div>
          )}
        </div>
        <button 
          onClick={submitPayment} 
          disabled={loading || !paymentName.trim() || !paymentAmount || parseFloat(paymentAmount) <= 0}
        >
          {loading ? '提交中...' : '提交付款'}
        </button>
      </div>
      
      {/* 支付记录列表 */}
      {payments.length > 0 && (
        <div className="payment-records">
          <h3>支付记录</h3>
          <p className="small-text">（提示：左滑可以编辑或删除记录）</p>
          <table className="payment-table">
            <thead>
              <tr>
                <th>支付人</th>
                <th>金额</th>
                <th>花费项目</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr 
                  key={payment.id} 
                  className={`payment-row ${swipedRowId === payment.id ? 'swiped' : ''}`}
                  onTouchStart={(e) => handleTouchStart(e, payment.id)}
                  onTouchMove={(e) => handleTouchMove(e, payment.id)}
                  onTouchEnd={(e) => handleTouchEnd(e, payment.id)}
                >
                  <td>{payment.name}</td>
                  <td>¥{typeof payment.amount === 'number' ? payment.amount.toFixed(2) : payment.amount}</td>
                  <td>{payment.description}</td>
                  <td>{payment.date}</td>
                  <div className="action-buttons">
                    <button className="edit-button" onClick={() => handleEditPayment(payment)}>
                      编辑
                    </button>
                    <button className="delete-button" onClick={() => handleDeletePayment(payment.id)}>
                      删除
                    </button>
                  </div>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* 结果部分 */}
      {result && (
        <div className="result-section">
          <h3>分账结果</h3>
          
          <div className="summary-info">
            <p>总支出: <strong>¥{result.total_spent?.toFixed(2)}</strong></p>
            <p>人均支出: <strong>¥{result.average_per_person?.toFixed(2)}</strong></p>
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
                {name}: {balance > 0 ? `应收 ¥${balance.toFixed(2)}` : 
                          balance < 0 ? `应付 ¥${Math.abs(balance).toFixed(2)}` : '无需支付'}
              </li>
            ))}
          </ul>
          <h4>转账明细</h4>
          {result.transactions && result.transactions.length > 0 ? (
            <ul className="transaction-list">
              {result.transactions.map((transaction, index) => (
                <li key={index} className="transaction-item">
                  {transaction.from} 需要支付 <span className="amount">¥{transaction.amount.toFixed(2)}</span> 给 {transaction.to}
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
      
      {/* 编辑模态框 */}
      {showEditModal && renderEditModal()}
    </div>
  );
}

export default App;
