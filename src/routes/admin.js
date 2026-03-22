const express = require('express');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const {
  User, Client, Call, AgentStatus, CallerId, SipTrunk,
  CallQueue, QueueMember, CreditTransaction, sequelize
} = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Pricing config
let pricingConfig = {
  cost_per_minute: parseFloat(process.env.COST_PER_MINUTE || '0.05'),
  minimum_charge: parseFloat(process.env.MINIMUM_CHARGE || '0.01'),
  billing_increment: parseInt(process.env.BILLING_INCREMENT || '60'),
  currency: 'EUR',
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

router.get('/pricing', authenticate, requireAdmin, (req, res) => { res.json(pricingConfig); });

router.put('/pricing', authenticate, requireAdmin, async (req, res) => {
  try {
    const { cost_per_minute, minimum_charge, billing_increment, currency } = req.body;
    if (cost_per_minute !== undefined) pricingConfig.cost_per_minute = parseFloat(cost_per_minute);
    if (minimum_charge !== undefined) pricingConfig.minimum_charge = parseFloat(minimum_charge);
    if (billing_increment !== undefined) pricingConfig.billing_increment = parseInt(billing_increment);
    if (currency) pricingConfig.currency = currency;
    pricingConfig.updated_at = new Date().toISOString();
    pricingConfig.updated_by = req.user.username;
    res.json({ message: 'Tarification mise à jour', pricing: pricingConfig });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/pricing/current', authenticate, (req, res) => { res.json(pricingConfig); });

module.exports.getPricing = () => pricingConfig;

// Credits
router.get('/credits', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, user_id, type } = req.query;
    const where = {};
    if (user_id) where.user_id = user_id;
    if (type) where.type = type;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await CreditTransaction.findAndCountAll({
      where, include: [{ model: User, attributes: ['id', 'username', 'email', 'credits'] }],
      order: [['created_at', 'DESC']], limit: parseInt(limit), offset,
    });
    res.json({ transactions: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/credits/topup', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'user_id et amount requis' });
    if (isNaN(amount) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Montant invalide' });
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const topupAmount = parseFloat(amount);
    const newBalance = parseFloat(user.credits) + topupAmount;
    await user.update({ credits: newBalance });
    const transaction = await CreditTransaction.create({
      user_id, amount: topupAmount, type: 'topup',
      description: description || `Recharge manuelle par admin (${req.user.username})`,
      balance_after: newBalance,
    });
    if (global.wss) {
      global.wss.clients.forEach(ws => {
        if (ws.userId === parseInt(user_id)) {
          ws.send(JSON.stringify({ type: 'credits_updated', newBalance, amount: topupAmount }));
        }
      });
    }
    res.status(201).json({ message: 'Crédits rechargés', user: { id: user.id, username: user.username, credits: newBalance }, transaction });
  } catch (error) { console.error('Topup error:', error); res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/credits/adjust', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;
    if (!user_id || amount === undefined) return res.status(400).json({ error: 'user_id et amount requis' });
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const adjustAmount = parseFloat(amount);
    const newBalance = Math.max(0, parseFloat(user.credits) + adjustAmount);
    await user.update({ credits: newBalance });
    const transaction = await CreditTransaction.create({
      user_id, amount: adjustAmount, type: adjustAmount >= 0 ? 'topup' : 'deduction',
      description: description || `Ajustement par admin (${req.user.username})`, balance_after: newBalance,
    });
    res.json({ message: 'Ajustement effectué', user: { id: user.id, username: user.username, credits: newBalance }, transaction });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Users
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, include: [{ model: AgentStatus, required: false }], order: [['created_at', 'DESC']] });
    res.json(users);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, sip_username, sip_password, credits } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email et password requis' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword, role: role || 'agent', sip_username: sip_username || username, sip_password: sip_password || password, credits: credits || 0 });
    await AgentStatus.create({ user_id: user.id, status: 'offline' });
    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Username ou email déjà utilisé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { username, email, password, role, sip_username, sip_password, is_active, credits } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (role) updates.role = role;
    if (sip_username) updates.sip_username = sip_username;
    if (sip_password) updates.sip_password = sip_password;
    if (is_active !== undefined) updates.is_active = is_active;
    if (credits !== undefined) updates.credits = credits;
    await user.update(updates);
    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.json(userWithoutPassword);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Impossible de supprimer un admin' });
    await user.destroy();
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Trunks
router.get('/trunks', authenticate, requireAdmin, async (req, res) => {
  try { const trunks = await SipTrunk.findAll({ order: [['priority', 'ASC']] }); res.json(trunks); }
  catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/trunks', authenticate, requireAdmin, async (req, res) => {
  try { const trunk = await SipTrunk.create(req.body); res.status(201).json(trunk); }
  catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.put('/trunks/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const trunk = await SipTrunk.findByPk(req.params.id);
    if (!trunk) return res.status(404).json({ error: 'Trunk non trouvé' });
    await trunk.update(req.body);
    res.json(trunk);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/trunks/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const trunk = await SipTrunk.findByPk(req.params.id);
    if (!trunk) return res.status(404).json({ error: 'Trunk non trouvé' });
    await trunk.destroy();
    res.json({ message: 'Trunk supprimé' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/trunks/:id/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const trunk = await SipTrunk.findByPk(req.params.id);
    if (!trunk) return res.status(404).json({ error: 'Trunk non trouvé' });
    const isReachable = trunk.host && trunk.host.length > 0;
    await trunk.update({ status: isReachable ? 'connected' : 'error', last_checked: new Date() });
    res.json({ status: isReachable ? 'connected' : 'error', trunk });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Queues
router.get('/queues', authenticate, requireAdmin, async (req, res) => {
  try {
    const queues = await CallQueue.findAll({ include: [{ model: QueueMember, as: 'members', include: [{ model: User, attributes: ['id', 'username'] }] }] });
    res.json(queues);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/queues', authenticate, requireAdmin, async (req, res) => {
  try { const queue = await CallQueue.create(req.body); res.status(201).json(queue); }
  catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.put('/queues/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const queue = await CallQueue.findByPk(req.params.id);
    if (!queue) return res.status(404).json({ error: 'Queue non trouvée' });
    await queue.update(req.body);
    res.json(queue);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/queues/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const queue = await CallQueue.findByPk(req.params.id);
    if (!queue) return res.status(404).json({ error: 'Queue non trouvée' });
    await queue.destroy();
    res.json({ message: 'Queue supprimée' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/queues/:id/members', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_id, priority } = req.body;
    const member = await QueueMember.create({ queue_id: req.params.id, user_id, priority: priority || 1 });
    res.status(201).json(member);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/queues/:queueId/members/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    await QueueMember.destroy({ where: { queue_id: req.params.queueId, user_id: req.params.userId } });
    res.json({ message: 'Membre retiré' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Caller IDs admin
router.get('/caller-ids', authenticate, requireAdmin, async (req, res) => {
  try {
    const callerIds = await CallerId.findAll({ include: [{ model: User, attributes: ['id', 'username'] }], order: [['created_at', 'DESC']] });
    res.json(callerIds);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.put('/caller-ids/:id/verify', authenticate, requireAdmin, async (req, res) => {
  try {
    const callerId = await CallerId.findByPk(req.params.id);
    if (!callerId) return res.status(404).json({ error: 'Caller ID non trouvé' });
    await callerId.update({ is_verified: true });
    res.json(callerId);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// Analytics
router.get('/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalClients = await Client.count();
    const totalCalls = await Call.count();
    const totalRevenue = await CreditTransaction.sum('amount', { where: { type: 'topup' } }) || 0;
    const totalCost = await Call.sum('cost') || 0;
    const activeTrunks = await SipTrunk.count({ where: { is_active: true } });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCalls = await Call.findAll({
      where: { start_time: { [Op.gte]: sevenDaysAgo } },
      attributes: [[sequelize.fn('DATE', sequelize.col('start_time')), 'date'], [sequelize.fn('COUNT', '*'), 'count']],
      group: [sequelize.fn('DATE', sequelize.col('start_time'))],
      order: [[sequelize.fn('DATE', sequelize.col('start_time')), 'ASC']],
      raw: true,
    });
    res.json({ totalUsers, totalClients, totalCalls, totalRevenue: parseFloat(totalRevenue).toFixed(2), totalCost: parseFloat(totalCost).toFixed(2), activeTrunks, recentCalls, pricing: pricingConfig });
  } catch (error) { console.error('Analytics error:', error); res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
