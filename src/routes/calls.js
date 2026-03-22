const express = require('express');
const { Op } = require('sequelize');
const { Call, User, Client, AgentStatus, CallerId, CreditTransaction } = require('../models');

function getPricing() {
  try {
    const adminRouter = require('./admin');
    if (adminRouter.getPricing) return adminRouter.getPricing();
  } catch (e) {}
  return {
    cost_per_minute: parseFloat(process.env.COST_PER_MINUTE || '0.05'),
    minimum_charge: parseFloat(process.env.MINIMUM_CHARGE || '0.01'),
    billing_increment: parseInt(process.env.BILLING_INCREMENT || '60'),
  };
}
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /calls/initiate - Initiate outbound call via SIP
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { to, callerId } = req.body;
    if (!to) return res.status(400).json({ error: 'Numéro requis' });

    const user = await User.findByPk(req.user.id);
    const pricing = getPricing();
    if (parseFloat(user.credits) < pricing.minimum_charge) {
      return res.status(402).json({ error: 'Crédits insuffisants', required: pricing.minimum_charge });
    }

    const call = await Call.create({
      user_id: req.user.id,
      direction: 'outbound',
      called_number: to,
      caller_id: callerId || to,
      start_time: new Date(),
      status: 'ringing',
    });

    await AgentStatus.upsert({ user_id: req.user.id, status: 'on_call', last_update: new Date() });

    res.json({ success: true, call, pricing });
  } catch (error) {
    console.error('Initiate call error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /calls/start
router.post('/start', authenticate, async (req, res) => {
  try {
    const { called_number, caller_id_id, client_id } = req.body;
    if (!called_number) return res.status(400).json({ error: 'Numéro à appeler requis' });

    const user = await User.findByPk(req.user.id);
    const pricing = getPricing();
    if (parseFloat(user.credits) < pricing.minimum_charge) {
      return res.status(402).json({ error: 'Crédits insuffisants', required: pricing.minimum_charge });
    }

    let callerIdNumber = called_number;
    if (caller_id_id) {
      const cid = await CallerId.findOne({ where: { id: caller_id_id, user_id: req.user.id, is_verified: true } });
      if (!cid) return res.status(400).json({ error: 'Caller ID non valide' });
      callerIdNumber = cid.phone_number;
    }

    const call = await Call.create({
      user_id: req.user.id,
      client_id: client_id || null,
      direction: 'outbound',
      called_number,
      caller_id: callerIdNumber,
      start_time: new Date(),
      status: 'ringing',
    });

    await AgentStatus.upsert({ user_id: req.user.id, status: 'on_call', last_update: new Date() });
    res.status(201).json({ call, pricing });
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /calls/end
router.post('/end', authenticate, async (req, res) => {
  try {
    const { call_id, status } = req.body;
    const call = call_id ? await Call.findByPk(call_id) : await Call.findOne({
      where: { user_id: req.user.id, status: { [Op.in]: ['ringing', 'answered'] } },
      order: [['start_time', 'DESC']],
    });
    if (!call) return res.status(404).json({ error: 'Appel non trouvé' });

    const endTime = new Date();
    const duration = Math.max(1, Math.ceil((endTime - new Date(call.start_time)) / 1000));
    const pricing = getPricing();
    const billableMinutes = Math.ceil(duration / pricing.billing_increment);
    const cost = Math.max(pricing.minimum_charge, billableMinutes * pricing.cost_per_minute);

    await call.update({ end_time: endTime, duration, cost, status: status || 'completed' });

    const user = await User.findByPk(call.user_id);
    const newBalance = parseFloat(user.credits) - cost;
    await user.update({ credits: Math.max(0, newBalance) });

    await CreditTransaction.create({
      user_id: call.user_id,
      amount: -cost,
      type: 'deduction',
      description: `Appel vers ${call.called_number} (${duration}s)`,
      call_id: call.id,
      balance_after: Math.max(0, newBalance),
    });

    await AgentStatus.upsert({ user_id: call.user_id, status: 'available', last_update: new Date() });
    res.json({ call, cost, newBalance: Math.max(0, newBalance), duration, pricing });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /calls/dtmf - Send DTMF digit
router.post('/dtmf', authenticate, async (req, res) => {
  try {
    const { digit } = req.body;
    if (!digit || !'0123456789*#'.includes(digit)) {
      return res.status(400).json({ error: 'Digit DTMF invalide' });
    }
    console.log(`DTMF digit sent: ${digit} by user ${req.user.id}`);
    res.json({ success: true, digit });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /calls/caller-ids - Get user's caller IDs
router.get('/caller-ids', authenticate, async (req, res) => {
  try {
    const callerIds = await CallerId.findAll({ where: { user_id: req.user.id } });
    res.json(callerIds);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /calls/webhook - Telnyx webhook
router.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body).substring(0, 500));
    res.json({ status: 'received' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// GET /calls
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, direction, status, user_id } = req.query;
    const where = {};
    if (req.user.role !== 'admin') where.user_id = req.user.id;
    else if (user_id) where.user_id = user_id;
    if (direction) where.direction = direction;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Call.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'username'] },
        { model: Client, attributes: ['id', 'name', 'phone_number'] },
      ],
      limit: parseInt(limit), offset, order: [['start_time', 'DESC']],
    });
    res.json({ calls: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /calls/stats/summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') where.user_id = req.user.id;
    const totalCalls = await Call.count({ where });
    const totalDuration = await Call.sum('duration', { where }) || 0;
    const totalCost = await Call.sum('cost', { where }) || 0;
    const inboundCalls = await Call.count({ where: { ...where, direction: 'inbound' } });
    const outboundCalls = await Call.count({ where: { ...where, direction: 'outbound' } });
    const answeredCalls = await Call.count({ where: { ...where, status: 'completed' } });
    const missedCalls = await Call.count({ where: { ...where, status: 'missed' } });
    res.json({ totalCalls, totalDuration, totalCost: parseFloat(totalCost).toFixed(2), inboundCalls, outboundCalls, answeredCalls, missedCalls, avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0 });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /calls/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const call = await Call.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username'] }, { model: Client }],
    });
    if (!call) return res.status(404).json({ error: 'Appel non trouvé' });
    res.json(call);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
