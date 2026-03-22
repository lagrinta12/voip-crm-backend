const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.userId = decoded.id;
        ws.userRole = decoded.role;
        ws.username = decoded.username;
        ws.isAuthenticated = true;
        console.log(`WebSocket: User ${decoded.username} connected`);
      } catch (err) {
        ws.isAuthenticated = false;
        console.log('WebSocket: Invalid token');
      }
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(wss, ws, message);
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (ws.username) {
        console.log(`WebSocket: User ${ws.username} disconnected`);
        broadcast(wss, {
          type: 'agent_disconnected',
          userId: ws.userId,
          username: ws.username,
        });
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  global.wss = wss;
  return wss;
}

function handleMessage(wss, ws, message) {
  switch (message.type) {
    case 'agent_status':
      broadcast(wss, {
        type: 'agent_status_changed',
        userId: ws.userId,
        username: ws.username,
        status: message.status,
      });
      break;
    case 'call_event':
      if (message.targetUserId) {
        sendToUser(wss, message.targetUserId, { type: 'incoming_call', ...message.data });
      }
      sendToAdmins(wss, { type: 'call_event', ...message.data });
      break;
    case 'typing':
      broadcast(wss, {
        type: 'agent_typing',
        userId: ws.userId,
        username: ws.username,
        clientId: message.clientId,
      });
      break;
    default:
      break;
  }
}

function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function sendToUser(wss, userId, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) client.send(msg);
  });
}

function sendToAdmins(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userRole === 'admin') client.send(msg);
  });
}

module.exports = { setupWebSocket };
