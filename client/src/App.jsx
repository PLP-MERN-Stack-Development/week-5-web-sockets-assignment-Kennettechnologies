import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './socket/socket';

const DEFAULT_ROOMS = ['General', 'Tech', 'Random'];
const REACTIONS = ['👍', '❤️', '😂', '😮', '🎉'];
const NOTIFICATION_SOUND = '/notification.mp3'; // Place a notification.mp3 in public/

function App() {
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(DEFAULT_ROOMS[0]);
  const [customRoom, setCustomRoom] = useState('');
  const [privateRecipient, setPrivateRecipient] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [windowFocused, setWindowFocused] = useState(true);
  const audioRef = useRef(null);
  const {
    isConnected,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    joinRoom,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    readMessage,
    sendFileMessage,
    reactMessage,
  } = useSocket();

  const messagesEndRef = useRef(null);

  // Filter messages for current room or private chat
  const filteredMessages = privateRecipient
    ? messages.filter(
        (msg) =>
          msg.isPrivate &&
          ((msg.sender === username && msg.senderId !== privateRecipient.id) ||
            (msg.senderId === privateRecipient.id && msg.sender !== username))
      )
    : messages.filter((msg) => msg.room === selectedRoom && !msg.isPrivate);

  // Join room when selectedRoom changes (and not in private chat)
  useEffect(() => {
    if (!privateRecipient && selectedRoom) {
      joinRoom(selectedRoom);
    }
  }, [selectedRoom, privateRecipient, joinRoom]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages]);

  // Mark messages as read when displayed
  useEffect(() => {
    filteredMessages.forEach((msg) => {
      if (
        msg.readBy &&
        !msg.readBy.includes(username) &&
        ((privateRecipient && msg.isPrivate) || (!privateRecipient && !msg.isPrivate))
      ) {
        readMessage(msg.id);
      }
    });
  }, [filteredMessages, username, privateRecipient, readMessage]);

  // Play sound and show browser notification for new messages
  useEffect(() => {
    if (!windowFocused && filteredMessages.length > 0) {
      const lastMsg = filteredMessages[filteredMessages.length - 1];
      if (!lastMsg.system && lastMsg.sender !== username) {
        setUnreadCount((c) => c + 1);
        // Play sound
        if (audioRef.current) {
          audioRef.current.play();
        }
        // Browser notification
        if (window.Notification && Notification.permission === 'granted') {
          new Notification(`New message from ${lastMsg.sender}`, {
            body: lastMsg.message,
            icon: '/favicon.ico',
          });
        }
      }
    }
  }, [filteredMessages, windowFocused, username]);

  // Track window focus/blur
  useEffect(() => {
    const onFocus = () => {
      setWindowFocused(true);
      setUnreadCount(0);
    };
    const onBlur = () => setWindowFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      connect(username);
      setLoggedIn(true);
    }
  };

  // Handle message send
  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      if (privateRecipient) {
        sendPrivateMessage(privateRecipient.id, input);
      } else {
        sendMessage({ message: input, room: selectedRoom });
      }
      setInput('');
      setTyping(false);
    }
  };

  // Typing indicator logic
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      setTyping(true);
    }
    if (e.target.value === '') {
      setIsTyping(false);
      setTyping(false);
    }
  };

  // Stop typing when input loses focus
  const handleBlur = () => {
    setIsTyping(false);
    setTyping(false);
  };

  // Room selection
  const handleRoomChange = (room) => {
    setSelectedRoom(room);
    setPrivateRecipient(null);
  };

  // Custom room creation
  const handleCustomRoom = (e) => {
    e.preventDefault();
    if (customRoom.trim() && !DEFAULT_ROOMS.includes(customRoom)) {
      setSelectedRoom(customRoom);
      setCustomRoom('');
      setPrivateRecipient(null);
    }
  };

  // Private chat selection
  const handlePrivateChat = (user) => {
    setPrivateRecipient(user);
  };

  // Back to room chat
  const handleBackToRoom = () => {
    setPrivateRecipient(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.url) {
      sendFileMessage({
        message: file.type.startsWith('image') ? '[Image]' : '[File]',
        fileUrl: data.url,
        fileName: file.name,
        fileType: file.type,
        room: !privateRecipient ? selectedRoom : undefined,
        isPrivate: !!privateRecipient,
        to: privateRecipient ? privateRecipient.id : undefined,
      });
    }
  };

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center' }}>
        <h2>Enter your username</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            style={{ padding: 8, width: '80%' }}
          />
          <br />
          <button type="submit" style={{ marginTop: 16, padding: '8px 24px' }}>
            Join Chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', border: '1px solid #ccc', borderRadius: 8, padding: 24 }}>
      <audio ref={audioRef} src={NOTIFICATION_SOUND} preload="auto" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{privateRecipient ? `Private Chat with ${privateRecipient.username}` : `${selectedRoom} Room`}</h2>
        <div>
          <span style={{ color: isConnected ? 'green' : 'red' }}>
            ● {isConnected ? 'Online' : 'Offline'}
          </span>
          {unreadCount > 0 && (
            <span style={{ marginLeft: 12, color: 'red', fontWeight: 'bold' }}>
              {unreadCount} unread
            </span>
          )}
          <button onClick={disconnect} style={{ marginLeft: 16 }}>Logout</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Chat messages */}
        <div style={{ flex: 2, minHeight: 300, maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', padding: 12, borderRadius: 4 }}>
          {filteredMessages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 8 }}>
              {msg.system ? (
                <em style={{ color: '#888' }}>{msg.message}</em>
              ) : (
                <>
                  <strong>{msg.sender || 'Anonymous'}</strong> <span style={{ color: '#aaa', fontSize: 12 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  <div>
                    {msg.fileUrl ? (
                      msg.fileType && msg.fileType.startsWith('image') ? (
                        <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: 200, maxHeight: 120, display: 'block', margin: '8px 0' }} />
                      ) : (
                        <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer">{msg.fileName || 'Download file'}</a>
                      )
                    ) : (
                      msg.message
                    )}
                  </div>
                  {/* Read receipts */}
                  {msg.readBy && (
                    <div style={{ fontSize: 10, color: '#0a0' }}>
                      Read by: {msg.readBy.join(', ')}
                    </div>
                  )}
                  {/* Reactions */}
                  <div style={{ fontSize: 18, marginTop: 4 }}>
                    {REACTIONS.map((r) => (
                      <button
                        key={r}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 4 }}
                        onClick={() => reactMessage(msg.id, r, username)}
                        title={`React with ${r}`}
                      >
                        {r} {msg.reactions && msg.reactions[r] ? msg.reactions[r].length : ''}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Online users and room/channel list */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <h4>Rooms</h4>
          <ul>
            {DEFAULT_ROOMS.map((room) => (
              <li key={room}>
                <button
                  style={{ fontWeight: selectedRoom === room ? 'bold' : 'normal', width: '100%' }}
                  onClick={() => handleRoomChange(room)}
                  disabled={privateRecipient}
                >
                  {room}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleCustomRoom} style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={customRoom}
              onChange={(e) => setCustomRoom(e.target.value)}
              placeholder="New room name"
              style={{ width: '80%', padding: 4 }}
              disabled={privateRecipient}
            />
            <button type="submit" disabled={privateRecipient || !customRoom.trim()}>Add</button>
          </form>
          <h4>Online Users</h4>
          <ul>
            {users
              .filter((user) => user.username !== username)
              .map((user) => (
                <li key={user.id}>
                  <button
                    style={{ width: '100%' }}
                    onClick={() => handlePrivateChat(user)}
                    disabled={privateRecipient && privateRecipient.id === user.id}
                  >
                    {user.username}
                  </button>
                </li>
              ))}
          </ul>
          {privateRecipient && (
            <button onClick={handleBackToRoom} style={{ marginTop: 8, width: '100%' }}>
              Back to Room
            </button>
          )}
        </div>
      </div>
      {/* Typing indicator */}
      <div style={{ minHeight: 24, margin: '8px 0', color: '#888' }}>
        {typingUsers.length > 0 && (
          <span>
            {typingUsers.filter((u) => u !== username).join(', ')}
            {typingUsers.length === 1 ? ' is typing...' : ' are typing...'}
          </span>
        )}
      </div>
      {/* File upload */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={privateRecipient ? `Message ${privateRecipient.username}...` : `Message #${selectedRoom}...`}
          style={{ flex: 1, padding: 8 }}
        />
        <input type="file" onChange={handleFileChange} style={{ flex: 1 }} />
        <button type="submit" style={{ padding: '8px 24px' }}>Send</button>
      </form>
    </div>
  );
}

export default App; 