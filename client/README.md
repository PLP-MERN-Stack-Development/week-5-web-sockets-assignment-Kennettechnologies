# Real-Time Chat Application with Socket.io

## Overview
This is a real-time chat application built with React, Express, and Socket.io. It supports global and private messaging, multiple chat rooms, file/image sharing, message reactions, read receipts, and real-time notifications.

## Features
- Real-time messaging (Socket.io)
- Username-based authentication
- Multiple chat rooms (default and custom)
- Private messaging between users
- Typing indicators
- Online/offline user status
- Read receipts for messages
- File/image sharing (uploads)
- Message reactions (like, love, etc.)
- Real-time notifications (sound, browser, unread count)
- Responsive design

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Install Server Dependencies
```sh
cd server
npm install
```

### 2. Install Client Dependencies
```sh
cd ../client
npm install
```

### 3. Start the Server
```sh
cd ../server
node server.js
```

### 4. Start the Client (React App)
```sh
cd ../client
npm run dev
```

### 5. Open the App
Visit [http://localhost:5173](http://localhost:5173) in your browser.

### 6. (Optional) Add Notification Sound
Place a `notification.mp3` file in the `client/public/` directory for sound notifications.

## Usage
- Enter a username to join the chat.
- Select or create a chat room, or start a private chat by clicking a user.
- Send messages, upload files/images, and react to messages.
- See who is online, who is typing, and who has read your messages.
- Receive notifications for new messages when the app is not focused.

## Screenshots
(Add screenshots or GIFs of your working app here)

## Deployment
(Optional: Add deployment instructions and URLs here)

## Credits
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/) 