const express = require('express');
const { User, AgentStatus, Call, CallerId } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'busy', 'offline', 'on_call', 'break'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    await AgentStatus.upsert({ user_id: req.user.id, status, last_update: new Date() });
    if (global.wss) {
      const msg = JSON.stringify({ type: 'agent_status_changed', userId: req.user.id, username: req.user.username, status });
      global.wss.clients.forEach(ws => ws.send(msg));
    }
    res.json({ user_id: req.user.id, status });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/status', authenticate, async (req, res) => {
  try {
    const agents = await AgentStatus.findAll({
      include: [{ model: User, attributes: ['id', 'username', 'role', 'sip_username'] }],
    });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/caller-ids', authenticate, async (req, res) => {
  try {
    const callerIds = await CallerId.findAll({ where: { user_id: req.user.id }, order: [['is_default', 'DESC']] });
    res.json(callerIds);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/caller-ids', authenticate, async (req, res) => {
  try {
    const { phone_number, label } = req.body;
    const callerId = await CallerId.create({ user_id: req.user.id, phone_number, label, is_verified: req.user.role === 'admin' });
    res.status(201).json(callerId);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/caller-ids/:id', authenticate, async (req, res) => {
  try {
    const callerId = await CallerId.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!callerId) return res.status(404).json({ error: 'Caller ID non trouvé' });
    await callerId.destroy();
    res.json({ message: 'Caller ID supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
