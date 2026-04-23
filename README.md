# CodeJam

![CodeJam Screenshot](frontend/public/codejam-screenshot.png)

## Overview
CodeJam is a real-time collaborative coding platform that allows multiple users to join a room and code together. It features live code editing, chat, voice communication, and room management, making it ideal for collaborative programming, interviews, and coding sessions.

## Features
- **Real-time collaborative code editor** using Monaco Editor
- **Room-based collaboration**: Create or join rooms with unique IDs
- **Live chat**: Text chat with all room members
- **Voice chat**: Enable voice communication using WebRTC
- **User authentication**: Sign up, log in, and manage sessions
- **Room management**: View members, room info, and manage participation
- **File sharing**: Upload and share files within rooms

## Tech Stack
- **Frontend**: React, Vite, Socket.IO-client, Monaco Editor
- **Backend**: Node.js, Express, Socket.IO, MongoDB

## Folder Structure
```
backend/
  Actions.js
  package.json
  server.js
  src/
    controllers/
    db/
    middlewares/
    models/
    routes/
frontend/
  public/
  src/
    components/
    constants/
    context/
    pages/
    services/
  package.json
  vite.config.js
```

## How It Works
1. **Authentication**: Users sign up or log in to access the platform.
2. **Room Creation/Join**: Users can create a new room or join an existing one using a Room ID.
3. **Collaboration**: Inside a room, users can collaboratively edit code, chat, and use voice features.
4. **File Sharing**: Users can upload and share files with other room members.

## Getting Started
### Prerequisites
- Node.js (v16+ recommended)
- MongoDB

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Accessing the App
- Open your browser and go to `http://localhost:5173` (or the port shown in your terminal)

## Screenshots
Add a screenshot named `codejam-screenshot.png` in the `frontend/public/` directory to display it above.

## License
MIT License

---
*Happy Coding with CodeJam!*
