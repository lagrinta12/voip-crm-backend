const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { sequelize } = require('./models');
const { setupWebSocket } = require('./websocket');

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const callRoutes = require('./routes/calls');
const agentRoutes = require('./routes/agents');
const adminRoutes = require('./routes/admin');
const tagRoutes = require('./routes/tags');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tags', tagRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Serve frontend static files from /public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Setup WebSocket
setupWebSocket(server);

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Auto-sync tables (create if not exist)
    await sequelize.sync({ alter: true });
    console.log('Models synchronized.');

    // Auto-seed admin user if not exists
    await autoSeed();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server started on port ${PORT}`);
      console.log(`Frontend: http://0.0.0.0:${PORT}`);
      console.log(`API: http://0.0.0.0:${PORT}/api`);
      console.log(`WebSocket: ws://0.0.0.0:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Auto-seed function - creates admin and agent users if they don't exist
async function autoSeed() {
  try {
    const bcrypt = require('bcryptjs');
    const { User, ClientTag, SipTrunk, Client } = require('./models');

    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        email: 'admin@voipcrm.com',
        password: hash,
        role: 'admin',
        credits: 999999.00,
        is_active: true,
        sip_username: 'admin',
        sip_password: 'admin_sip_pass'
      });
      console.log('Admin created: admin / admin123');
    }

    const agentExists = await User.findOne({ where: { username: 'agent1' } });
    if (!agentExists) {
      const hash = await bcrypt.hash('agent123', 10);
      await User.create({
        username: 'agent1',
        email: 'agent1@voipcrm.com',
        password: hash,
        role: 'agent',
        credits: 50.00,
        is_active: true,
        sip_username: 'agent1',
        sip_password: 'agent1_sip_pass'
      });
      console.log('Agent created: agent1 / agent123');
    }

    // Create demo clients if none exist
    const clientCount = await Client.count();
    if (clientCount === 0) {
      await Client.bulkCreate([
        { name: 'Jean Dupont', phone_number: '+33612345678', email: 'jean@example.com', company: 'Dupont SARL', address: 'Paris, France' },
        { name: 'Marie Martin', phone_number: '+33698765432', email: 'marie@example.com', company: 'Martin et Co', address: 'Lyon, France' },
        { name: 'Pierre Bernard', phone_number: '+33655443322', email: 'pierre@example.com', company: 'Bernard Tech', address: 'Marseille, France' },
      ]);
      console.log('Demo clients created');
    }

    // Create default tags
    const tagCount = await ClientTag.count().catch(() => 0);
    if (tagCount === 0) {
      await ClientTag.bulkCreate([
        { name: 'VIP', color: '#f59e0b' },
        { name: 'Prospect', color: '#3b82f6' },
        { name: 'Client', color: '#10b981' },
        { name: 'Urgent', color: '#ef4444' },
      ]).catch(() => {});
      console.log('Default tags created');
    }

    console.log('Auto-seed completed.');
  } catch (err) {
    console.error('Auto-seed error (non-fatal):', err.message);
  }
}

start();
