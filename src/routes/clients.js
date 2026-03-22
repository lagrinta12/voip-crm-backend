const express = require('express');
const { Op } = require('sequelize');
const { Client, ClientNote, ClientTag, ClientTagMap, ClientInteraction, Call, User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, tag, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const include = [{ model: ClientTag, as: 'tags', through: { attributes: [] } }];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Client.findAndCountAll({
      where, include, limit: parseInt(limit), offset, order: [['created_at', 'DESC']], distinct: true,
    });
    res.json({ clients: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [
        { model: ClientTag, as: 'tags', through: { attributes: [] } },
        { model: ClientNote, include: [{ model: User, attributes: ['id', 'username'] }], order: [['created_at', 'DESC']] },
        { model: ClientInteraction, include: [{ model: User, attributes: ['id', 'username'] }], order: [['created_at', 'DESC']], limit: 50 },
        { model: Call, include: [{ model: User, attributes: ['id', 'username'] }], order: [['start_time', 'DESC']], limit: 50 },
      ],
    });
    if (!client) return res.status(404).json({ error: 'Client non trouvé' });
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone_number, email, company, address, tags } = req.body;
    const client = await Client.create({ name, phone_number, email, company, address });
    if (tags && tags.length > 0) {
      await ClientTagMap.bulkCreate(tags.map(tagId => ({ client_id: client.id, tag_id: tagId })));
    }
    const fullClient = await Client.findByPk(client.id, { include: [{ model: ClientTag, as: 'tags', through: { attributes: [] } }] });
    res.status(201).json(fullClient);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client non trouvé' });
    const { name, phone_number, email, company, address, tags } = req.body;
    await client.update({ name, phone_number, email, company, address });
    if (tags !== undefined) {
      await ClientTagMap.destroy({ where: { client_id: client.id } });
      if (tags.length > 0) {
        await ClientTagMap.bulkCreate(tags.map(tagId => ({ client_id: client.id, tag_id: tagId })));
      }
    }
    const fullClient = await Client.findByPk(client.id, { include: [{ model: ClientTag, as: 'tags', through: { attributes: [] } }] });
    res.json(fullClient);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client non trouvé' });
    await ClientTagMap.destroy({ where: { client_id: client.id } });
    await ClientNote.destroy({ where: { client_id: client.id } });
    await ClientInteraction.destroy({ where: { client_id: client.id } });
    await client.destroy();
    res.json({ message: 'Client supprimé' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client non trouvé' });
    const note = await ClientNote.create({ client_id: client.id, user_id: req.user.id, note_text: req.body.note_text });
    await ClientInteraction.create({ client_id: client.id, user_id: req.user.id, type: 'note', description: req.body.note_text.substring(0, 200) });
    const fullNote = await ClientNote.findByPk(note.id, { include: [{ model: User, attributes: ['id', 'username'] }] });
    res.status(201).json(fullNote);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/search/phone/:phone', authenticate, async (req, res) => {
  try {
    const client = await Client.findOne({
      where: { phone_number: { [Op.like]: `%${req.params.phone}%` } },
      include: [{ model: ClientTag, as: 'tags', through: { attributes: [] } }],
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
