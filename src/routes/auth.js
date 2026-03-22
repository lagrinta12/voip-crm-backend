const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, AgentStatus } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username et password requis' });
    }
    const user = await User.findOne({ where: { username } });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'voip-crm-secret-key-2024',
      { expiresIn: '24h' }
    );
    await AgentStatus.upsert({ user_id: user.id, status: 'available', last_update: new Date() });
    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: AgentStatus, required: false }],
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    await AgentStatus.upsert({ user_id: req.user.id, status: 'offline', last_update: new Date() });
    res.json({ message: 'Déconnecté avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }
    const user = await User.findByPk(req.user.id);
    const isValid = await bcrypt.compare(current_password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
