import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Main App Component
function App() {
  // State Variables
  const [page, setPage] = useState('home'); // 'home', 'createRoom', 'joinRoom', 'room'
  const [roomTitle, setRoomTitle] = useState('');
  const [members, setMembers] = useState(['', '']); // Start with 2 member inputs
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(''); // For the join room input
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [result, setResult] = useState(null); // Stores the entire result object from backend
  const [payments, setPayments] = useState([]); // Stores payment records derived from result
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null); // ID of payment being edited
  const [involvedMembers, setInvolvedMembers] = useState({}); // Tracks checked members for a payment { memberName: true/false }

  // API Base URL - Use environment variable or default
  const API_URL = process.env.REACT_APP_API_URL || 'https://lightsplit-backend.onrender.com';

  // --- Helper Functions ---

  // Update browser URL without full page reload
  const updateUrlWithRoomId = (roomId) => {
    const path = roomId ? `/${roomId}` : '/';
    // Only push state if the path actually changes
    if (window.location.pathname !== path) {
      window.history.pushState({ roomId: roomId }, '', path);
    }
  };

  // Navigate back to the home page
  const goHome = () => {
    setPage('home');
    setRoomTitle('');
    setMembers(['', '']);
    setCurrentRoomId('');
    setJoinRoomId('');
    setResult(null);
    setPayments([]);
    setError('');
    setPaymentName('');
    setPaymentAmount('');
    setPaymentDescription('');
    setEditingPaymentId(null); // Reset editing state
    setInvolvedMembers({}); // Reset involved members
    updateUrlWithRoomId(''); // Clear room ID from URL
  };

  // Fetch room data and calculation results from backend
  const fetchResult = useCallback(async (roomIdToFetch) => {
    if (!roomIdToFetch) return; // Don't fetch if no ID
    setLoading(true);
    setError(''); // Clear previous errors before fetching
    try {
      const response = await fetch(`${API_URL}/result/${roomIdToFetch}`);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(response.statusText || `获取房间数据失败 (${response.status})`);
        }
        throw new Error(errorData.error || `获取房间数据失败 (${response.status})`);
      }
      const data = await response.json();
      setResult(data); // Store the entire result object
      setPayments(data.payment_records || []); // Update payment records list
      setError(''); // Clear error on success

      // Reset involved members checkboxes to all selected when fetching/refreshing room data
      if (data.members) {
        const initialInvolved = {};
        data.members.forEach(m => initialInvolved[m] = true);
        setInvolvedMembers(initialInvolved);
      }

    } catch (err) {
      console.error('获取结果出错:', err);
      setError(`获取房间信息失败: ${err.message}. 请检查房间 ID 是否正确或稍后再试。`);
      // Don't automatically go home, let the user see the error
      // Optionally clear result state if fetch failed completely
      // setResult(null);
      // setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]); // Dependency: API_URL

  // Attempt to join a room using a specific ID (used by Join button and initial URL check)
  const joinRoomWithId = useCallback(async (roomId) => {
     setLoading(true);
     setError(''); // Clear previous errors
     if (!roomId || !roomId.trim()) {
       setError('请输入有效的房间 ID。');
       setLoading(false);
       return;
     }
     // Clear previous results before fetching new room
     setResult(null);
     setPayments([]);

     // Fetch data - fetchResult handles setting state and errors
     await fetchResult(roomId);

     // Check if fetchResult set an error
     // Need to read the error state *after* await fetchResult completes
     // This requires error state to be reliable or using a temporary variable.
     // Let's rely on fetchResult to set the error state. We'll check result state instead.
     // Small delay to ensure state updates are processed before checking
     setTimeout(() => {
         setError(prevError => {
            const currentResult = result; // Capture current result state
             if (!prevError && currentResult && currentResult.members) { // Check if result loaded successfully
               setCurrentRoomId(roomId);
               setPage('room');
               updateUrlWithRoomId(roomId);
             } else {
               // Error occurred during fetch, error state should already be set by fetchResult
               // Clear invalid room ID from input and URL if needed
               setJoinRoomId(''); // Clear input
               updateUrlWithRoomId(''); // Clear URL if join failed
             }
             setLoading(false); // Ensure loading is set to false
             return prevError; // Keep the error state set by fetchResult
         });
     }, 100); // 100ms delay - adjust if needed, or find a more robust state check method

  }, [fetchResult, result]); // Depends on fetchResult and result state


  // --- Event Handlers ---

  // Handle adding a new member input field
  const addMember = () => {
    setMembers([...members, '']);
  };

  // Handle removing a member input field
  const removeMember = (index) => {
    if (members.length > 2) { // Keep at least 2 members
      const newMembers = members.filter((_, i) => i !== index);
      setMembers(newMembers);
    }
  };

  // Handle changes in member name inputs
  const handleMemberChange = (index, event) => {
    const newMembers = members.map((member, i) =>
      i === index ? event.target.value : member
    );
    setMembers(newMembers);
  };

   // Handle changes in involved member checkboxes
   const handleInvolvedMemberChange = (memberName) => {
     setInvolvedMembers(prev => ({
       ...prev,
       [memberName]: !prev[memberName]
     }));
   };


  // Create a new room
  const createRoom = async () => {
    setLoading(true);
    setError('');
    const uniqueMembers = [...new Set(members.map(m => m.trim()).filter(Boolean))]; // Trim, filter empty, get unique

    if (uniqueMembers.length < 2) {
      setError('至少需要输入两个不同的成员名称！');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/create_room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: roomTitle.trim() || '未命名房间', members: uniqueMembers }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '创建房间失败');
      }
      // Successfully created, now fetch the initial state of the new room
      setCurrentRoomId(data.room_id); // Set the current room ID
      await fetchResult(data.room_id); // Fetch the full room data
      setPage('room'); // Navigate to the room page
      updateUrlWithRoomId(data.room_id); // Update URL

    } catch (err) {
      console.error('创建房间出错:', err);
      setError(`创建房间失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Join room using the ID from the input field
  const joinRoom = () => {
      joinRoomWithId(joinRoomId.trim());
  };


  // Submit a new payment or update an existing one
  const handlePaymentSubmit = async () => {
    setLoading(true);
    setError('');

    const amount = parseFloat(paymentAmount);
    if (!paymentName.trim()) {
      setError('请选择有效的付款人！');
      setLoading(false);
      return;
    }
     if (isNaN(amount) || amount <= 0) {
      setError('请输入有效的正数付款金额！');
      setLoading(false);
      return;
    }


    // Get the list of currently checked involved members
    const currentInvolvedMembers = Object.keys(involvedMembers).filter(member => involvedMembers[member]);

    if (currentInvolvedMembers.length === 0) {
       setError('请至少选择一个参与分摊的成员！');
       setLoading(false);
       return;
    }


    const paymentData = {
      name: paymentName,
      amount: amount,
      description: paymentDescription.trim() || '', // Send empty string if no description
      involved_members: currentInvolvedMembers,
    };

    try {
      let response;
      let url = `${API_URL}/submit_payment/${currentRoomId}`;
      let method = 'POST';

      // If editingPaymentId is set, switch to PUT request for update
      if (editingPaymentId) {
        url = `${API_URL}/payment/${currentRoomId}/${editingPaymentId}`;
        method = 'PUT';
      }

      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `请求失败 (${response.status})` }));
        throw new Error(errorData.error || `${editingPaymentId ? '更新' : '提交'}失败 (${response.status})`);
      }

      // Successfully submitted/updated, now refresh the results
      await fetchResult(currentRoomId);

      // Reset form fields and editing state after successful operation
      setPaymentName('');
      setPaymentAmount('');
      setPaymentDescription('');
      setEditingPaymentId(null); // Exit editing mode
      // Reset involved members (fetchResult should handle this, but double-check)
       if (result?.members) {
         const initialInvolved = {};
         result.members.forEach(m => initialInvolved[m] = true);
         setInvolvedMembers(initialInvolved);
       }


    } catch (err) {
      console.error('提交/更新付款出错:', err);
      setError(`${editingPaymentId ? '更新' : '提交'}付款失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a payment record
  const handleDeletePayment = async (paymentId) => {
    // Confirmation dialog
    if (!window.confirm('确定要删除这条支付记录吗？此操作无法撤销。')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/payment/${currentRoomId}/${paymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ error: `请求失败 (${response.status})` }));
         throw new Error(errorData.error || `删除失败 (${response.status})`);
      }

      // Deletion successful, refresh the results
      await fetchResult(currentRoomId);

    } catch (err) {
      console.error('删除付款出错:', err);
      setError(`删除失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Prepare form for editing a payment record
  const handleEditPayment = (payment) => {
    setEditingPaymentId(payment.id);
    setPaymentName(payment.name);
    setPaymentAmount(payment.amount.toString()); // Amount to string for input field
    setPaymentDescription(payment.description);

    // Set the involved members checkboxes based on the payment record
    const involvedMap = {};
     if(result?.members) { // Ensure members list is available
        result.members.forEach(member => {
            // Check if the member is in the payment's involved_members list
            involvedMap[member] = payment.involved_members?.includes(member) ?? false;
        });
     }
    setInvolvedMembers(involvedMap);

    setError(''); // Clear previous errors when starting edit

    // Scroll the payment form into view for convenience
    const formElement = document.querySelector('.payment-form');
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

   // Cancel the editing process
   const cancelEdit = () => {
       setEditingPaymentId(null);
       setPaymentName('');
       setPaymentAmount('');
       setPaymentDescription('');
       // Reset involved members to all checked
       if (result?.members) {
          const initialInvolved = {};
          result.members.forEach(m => initialInvolved[m] = true);
          setInvolvedMembers(initialInvolved);
       }
       setError(''); // Clear any potential errors shown during edit attempt
   };


  // Copy Room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoomId)
      .then(() => alert('房间ID已复制到剪贴板！'))
      .catch(err => console.error('复制房间ID失败:', err));
  };

  // Copy shareable link to clipboard
  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/${currentRoomId}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => alert('分享链接已复制到剪贴板！'))
      .catch(err => console.error('复制分享链接失败:', err));
  };


  // --- Effects ---

   // Effect to check URL for room ID on initial load
   useEffect(() => {
     const pathSegments = window.location.pathname.split('/').filter(Boolean);
     if (pathSegments.length === 1) {
       const roomIdFromUrl = pathSegments[0];
       // Validate if it looks like a room ID (e.g., 4 digits) - adjust if needed
       if (/^\d{4,}$/.test(roomIdFromUrl)) {
           console.log("Found Room ID in URL:", roomIdFromUrl);
           setJoinRoomId(roomIdFromUrl); // Pre-fill join input
           joinRoomWithId(roomIdFromUrl); // Attempt to join the room
       } else {
           console.log("Path segment doesn't look like a room ID:", roomIdFromUrl);
           // Optional: Redirect to home or show an error if the path is invalid
           goHome(); // Go to home if path is not a valid room structure
       }
     } else if (pathSegments.length === 0) {
        // Root path, ensure we are on the home page
        setPage('home');
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Run only once on initial mount


   // Effect to handle browser back/forward navigation
   useEffect(() => {
       const handlePopState = (event) => {
           const roomIdFromState = event.state?.roomId;
           console.log("Popstate detected. Room ID from state:", roomIdFromState);
           if (roomIdFromState) {
               // Re-join the room based on the history state
               // Need to ensure result state is cleared before re-joining
               setResult(null);
               setPayments([]);
               joinRoomWithId(roomIdFromState);
           } else {
               // If no roomId in state, likely means navigating back to the root/home
               goHome();
           }
       };

       window.addEventListener('popstate', handlePopState);

       // Cleanup listener on component unmount
       return () => {
           window.removeEventListener('popstate', handlePopState);
       };
   }, [joinRoomWithId]); // Depend on joinRoomWithId (which depends on fetchResult)


   // Effect to fetch results when the current room ID changes and we are on the room page
   useEffect(() => {
     if (page === 'room' && currentRoomId) {
       fetchResult(currentRoomId);
     }
     // Cleanup: If we navigate away from the room page, clear the results
     // Note: goHome already handles clearing state
     // if (page !== 'room') {
     //     setResult(null);
     //     setPayments([]);
     // }
   }, [page, currentRoomId, fetchResult]); // Dependencies: page, currentRoomId, fetchResult


  // --- Render Functions ---

  // Render the Home page
  const renderHome = () => (
    <div className="container home-container">
      <h1>欢迎使用 LightSplit!</h1>
      <p>轻松创建分账房间，与朋友们公平分摊费用。</p>
      <div className="button-group">
        <button onClick={() => setPage('createRoom')} disabled={loading}>创建新房间</button>
        <button onClick={() => setPage('joinRoom')} disabled={loading}>加入房间</button>
      </div>
      {loading && <p>加载中...</p>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );

  // Render the Create Room page
  const renderCreateRoom = () => (
    <div className="container">
      <h1>创建新房间</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
         <label>房间名称 (可选)</label>
        <input
          type="text"
          value={roomTitle}
          onChange={(e) => setRoomTitle(e.target.value)}
          placeholder="例如：毕业旅行、周末聚餐"
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label>成员名称 (至少两个)</label>
        {members.map((member, index) => (
          <div key={index} className="member-input-group">
            <input
              type="text"
              value={member}
              onChange={(e) => handleMemberChange(index, e)}
              placeholder={`成员 ${index + 1}`}
              disabled={loading}
            />
            {members.length > 2 && ( // Show remove button only if more than 2 members
              <button onClick={() => removeMember(index)} disabled={loading} className="remove-member-button">
                -
              </button>
            )}
          </div>
        ))}
        <button onClick={addMember} disabled={loading} className="add-member-button">
          + 添加成员
        </button>
      </div>
      <div className="button-group">
          <button onClick={createRoom} disabled={loading || members.filter(m => m.trim()).length < 2}>
              {loading ? '创建中...' : '创建房间'}
          </button>
          <button onClick={goHome} disabled={loading} className="cancel-button">返回首页</button>
      </div>
    </div>
  );

  // Render the Join Room page
  const renderJoinRoom = () => (
    <div className="container">
      <h1>加入房间</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label>输入房间 ID</label>
        <input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          placeholder="输入4位数字房间ID"
          disabled={loading}
          pattern="\d{4,}" // Basic pattern for 4+ digits
        />
      </div>
       <div className="button-group">
            <button onClick={joinRoom} disabled={loading || !joinRoomId.trim()}>
                {loading ? '加入中...' : '加入房间'}
            </button>
            <button onClick={goHome} disabled={loading} className="cancel-button">返回首页</button>
       </div>
    </div>
  );

  // Render the main Room page (Calculation and Payment)
  const renderRoom = () => (
    <div className="container">
      <h1>{result?.title || '分账房间'}</h1>

      {/* Loading and Error Display */}
      {loading && <p>加载中...</p>}
      {error && <div className="error-message">{error}</div>}

      {/* Only render room details if not loading and result is available */}
      {currentRoomId && !loading && result && result.members && (
        <>
          <div className="room-id-container">
            <p className="room-id">房间ID: <strong>{currentRoomId}</strong></p>
            <button onClick={copyRoomId} className="copy-button" disabled={loading}>
              复制ID
            </button>
            <button onClick={copyShareLink} className="copy-button" disabled={loading}>
              复制分享链接
            </button>
          </div>

          {/* Payment Form Section */}
          <div className="form-group payment-form">
             <h3>{editingPaymentId ? '编辑支付记录' : '提交新付款'}</h3>
            <div>
              <label>付款人 *</label>
              <select
                value={paymentName}
                onChange={(e) => setPaymentName(e.target.value)}
                disabled={loading}
                className="select-input"
                required
              >
                <option value="">--选择付款人--</option>
                {result.members?.map((member) => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
            </div>
            <div>
              <label>金额 *</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="付款金额"
                step="0.01"
                min="0.01"
                disabled={loading}
                required
                className="input-field"
              />
            </div>
            <div>
              <label>花费项目 (可选)</label>
              <input
                type="text"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="例如：晚餐、电影票"
                disabled={loading}
                className="input-field"
              />
            </div>

            {/* Involved Members Selector */}
            <div className="involved-members-selector">
                <label>参与分摊的成员 *</label>
                <div className="checkbox-group">
                    {result.members?.map(member => (
                        <div key={member} className="checkbox-item">
                            <input
                                type="checkbox"
                                id={`involved-${member}`}
                                checked={involvedMembers[member] || false}
                                onChange={() => handleInvolvedMemberChange(member)}
                                disabled={loading}
                            />
                            <label htmlFor={`involved-${member}`}>{member}</label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Buttons */}
            <div className="button-group">
                <button
                  onClick={handlePaymentSubmit}
                  disabled={
                      loading ||
                      !paymentName.trim() || // Payer must be selected
                      !paymentAmount || parseFloat(paymentAmount) <= 0 || // Amount must be positive
                      Object.values(involvedMembers).filter(Boolean).length === 0 // At least one member must be involved
                  }
                >
                  {loading ? '处理中...' : (editingPaymentId ? '更新记录' : '提交付款')}
                </button>
                {/* Show Cancel Edit button only when editing */}
                {editingPaymentId && (
                    <button onClick={cancelEdit} disabled={loading} className="cancel-button">
                        取消编辑
                    </button>
                )}
            </div>
          </div> {/* End of payment-form */}


          {/* Payment Records Table */}
          {payments.length > 0 && (
            <div className="payment-records">
              <h3>支付记录</h3>
              <div className="table-responsive"> {/* Wrapper for horizontal scroll on small screens */}
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>支付人</th>
                        <th>金额</th>
                        <th>花费项目</th>
                        <th>参与者</th>
                        <th>时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sort payments by date descending (newest first) before mapping */}
                      {[...payments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => (
                        <tr key={payment.id}>
                          <td>{payment.name}</td>
                          <td>¥{typeof payment.amount === 'number' ? payment.amount.toFixed(2) : payment.amount}</td>
                          <td>{payment.description || '-'}</td>
                          <td title={payment.involved_members?.join(', ')}> {/* Tooltip shows full list */}
                            {payment.involved_members?.length === result.members?.length
                              ? '全部'
                              : payment.involved_members?.length > 3 ? `${payment.involved_members.slice(0,3).join(', ')}...` : payment.involved_members?.join(', ') || 'N/A'}
                           </td>
                          <td>{new Date(payment.date).toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</td> {/* Format date */}
                          <td>
                            <button
                                onClick={() => handleEditPayment(payment)}
                                // Disable other edit buttons while one is being edited or loading
                                disabled={loading || (editingPaymentId && editingPaymentId !== payment.id)}
                                className="edit-button"
                                title="编辑"
                            >
                              编辑
                            </button>
                            <button
                                onClick={() => handleDeletePayment(payment.id)}
                                disabled={loading || editingPaymentId === payment.id} // Disable delete while editing this item
                                className="delete-button"
                                title="删除"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div> {/* End of table-responsive */}
            </div>
          )}

          {/* Calculation Results Section */}
          {result.balances && ( // Check if balances data is available
            <div className="result-section">
              <h3>分账结果</h3>
              <div className="summary-info">
                <p>总支出: <strong>¥{result.total_spent != null ? result.total_spent.toFixed(2) : '0.00'}</strong></p>
                {/* Optional: Display average per person if needed */}
                {/* <p>名义人均支出: ¥{result.average_per_person != null ? result.average_per_person.toFixed(2) : '0.00'}</p> */}
              </div>
              <h4>每人余额 (正数=应收, 负数=应付)</h4>
              <ul className="balance-list">
                 {/* Sort members alphabetically for consistent display */}
                 {result.members?.sort().map(member => {
                     // Get balance, default to 0 if member not in balances (shouldn't happen with current backend)
                     const balance = result.balances[member] ?? 0;
                     const balanceClass = balance > 0.001 ? 'positive' : balance < -0.001 ? 'negative' : 'neutral';
                     const balanceText = balance > 0.001 ? `应收 ¥${balance.toFixed(2)}` :
                                        balance < -0.001 ? `应付 ¥${Math.abs(balance).toFixed(2)}` : '结清';
                     return (
                         <li key={member} className={balanceClass}>
                             <span className="member-name">{member}:</span> <span className="balance-amount">{balanceText}</span>
                         </li>
                     );
                 })}
              </ul>
              <h4>转账建议</h4>
              {result.transactions && result.transactions.length > 0 ? (
                <ul className="transaction-list">
                  {result.transactions.map((transaction, index) => (
                    <li key={index} className="transaction-item">
                      <span className="debtor">{transaction.from}</span> 需要支付 <span className="amount">¥{transaction.amount.toFixed(2)}</span> 给 <span className="creditor">{transaction.to}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="all-clear">太棒了，账目已结清，无需转账！</p>
              )}
            </div>
          )}
        </>
      )} {/* End of conditional rendering for room details */}

       {/* Back to Home button always visible when in a room */}
       <button onClick={goHome} className="home-button" disabled={loading}>
           返回首页
       </button>
    </div>
  );

  // Determine which page component to render
  return (
    <div className="App">
      <header className="App-header">
          LightSplit - 轻松分账
      </header>
      <main className="App-main">
          {page === 'createRoom' ? renderCreateRoom() :
           page === 'joinRoom' ? renderJoinRoom() :
           page === 'room' ? renderRoom() : renderHome()}
       </main>
       <footer className="App-footer">
           {/* You can add footer content here */}
       </footer>
    </div>
  );
}

export default App;
