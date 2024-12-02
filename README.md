# WebRTC Video Chat Platform

This is a real-time video chat application built using React, WebRTC, and Socket.IO, featuring a signaling server for WebRTC connections. The platform allows users to connect with each other in a simple, intuitive interface, and utilizes advanced WebRTC technology for video and audio streams, making it ideal for one-on-one video chats.

## Features

- **Real-time Video Chat**: Establish a real-time video connection between two users using WebRTC.
- **Signaling Server**: Utilizes Socket.IO to handle signaling for establishing WebRTC connections.
- **User Pairing**: Automatically pairs users waiting for a chat, similar to "Chatroulette" functionality.
- **Dynamic UI**: Clean and intuitive user interface with responsive design.
- **Media Controls**: Users can toggle video and audio, and disconnect the call with ease.
- **Nickname Setup**: Users are prompted to enter a nickname before starting a chat.
- **Waiting Indicator**: Displays a dynamic waiting message until another user joins.

## Technologies Used

- **Frontend**: React, Tailwind CSS, WebRTC, FontAwesome for icons.
- **Backend**: Node.js, Express.js, Socket.IO for signaling.
- **Tools**: Visual Studio Code

## Setup Instructions

Follow these steps to set up the project on your local machine.

### Prerequisites

- Node.js and npm installed.

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Zani10/Prototype-Videochat.git
   cd Prototype-Videochat
   ```

2. **Install backend dependencies**:

   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**:

   ```bash
   cd ../src
   npm install
   ```

4. **Run the Backend Server**:

   ```bash
   cd ../server
   node server.js
   ```

5. **Run the Frontend Server**:

   ```bash
   cd ../src
   npm run dev
   ```

6. **Access the Application**:

   - For local testing, open [http://localhost:5173](http://localhost:5173) in your web browser.
   - For public access, use the Render hosted links:
     - **Frontend**: [https://prototype-videochat-1.onrender.com/](https://prototype-videochat-1.onrender.com/)
     - **Backend**: [https://prototype-videochat.onrender.com/](https://prototype-videochat.onrender.com/)

## Features Overview

- **User Nickname Setup**: Before starting a chat, users are prompted to enter a nickname.
- **Video Feed**: Once paired, users can see each other in separate video containers.
- **Waiting State**: Users waiting for a partner are displayed a message "Waiting for another user..." with dynamic dots.
- **Media Controls**: Toggle video, toggle audio, and disconnect call functionalities.
- **Responsive UI**: Video containers are displayed side by side with a control bar at the bottom.

## Folder Structure

```
|-- server/
|   |-- server.js
|   |-- package.json
|-- src/
|   |-- assets/
|   |-- components/
|       |-- VideoChat.jsx
|   |-- App.jsx
|   |-- main.jsx
|   |-- index.css
|   |-- tailwind.config.js
|   |-- postcss.config.js
|   |-- package.json
|-- README.md
```

## Sources and References

- **Frontend**:
  - [WebRTC Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
    - https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
    - [Offer & answer signaling](https://youtu.be/WmR9IMUD_CY)
  - [Tailwind CSS Documentation](https://tailwindcss.com/docs/installation)
  - [React Documentation](https://react.dev/learn)
- **Backend**:
  - [Socket.IO Documentation](https://socket.io/s/)
    - [socket.io setup](https://youtu.be/adhiH99S78I)
    - [socket.io connection](https://youtu.be/g42yNO_dxWQ?t=2724) (min 45)
    - [video inputs](https://youtu.be/g42yNO_dxWQ?t=3297) (min 55)
    - [Peer Configuration](https://youtu.be/g42yNO_dxWQ?t=3524) (min 57)
  - [Express.js Documentation](https://expressjs.com/en/starter/basic-routing.html)
- **Deployment**:
  - [Render Documentation](https://render.com/docs)
- **AI help**:
  - [ChatGPT Chat](https://chatgpt.com/share/674e3d6b-3afc-800f-b692-58725c652886)
  - Users connection bugs & video input display bugs fixed with https://www.cursor.com/ Claude 3.5-sonnet model

## Future Improvements

- **Matching Algorithms**: Implement a more sophisticated matching algorithm.
- **Group Video Chat**: Extend functionality to support group calls.
- **Media Quality Controls**: Add options to adjust video quality depending on network conditions.

## Known Issues

- **Pairing Logic**: Currently, some users may experience issues with being paired properly. Improvements to the pairing mechanism are planned.
- **Dynamic Waiting Message**: The waiting message may not always update smoothly if the connection is unstable.
- **Media Control Issues**: Occasionally, toggling video or audio may not work as expected due to browser permissions or connection issues.

