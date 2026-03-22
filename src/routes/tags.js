const express = require('express');
const { ClientTag } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const tags = await ClientTag.findAll({ order: [['name', 'ASC']] });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, color } = req.body;
    const tag = await ClientTag.create({ name, color });
    res.status(201).json(tag);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'Tag déjà existant' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tag = await ClientTag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ error: 'Tag non trouvé' });
    await tag.destroy();
    res.json({ message: 'Tag supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
