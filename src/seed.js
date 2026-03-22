const bcrypt = require('bcryptjs');
const { sequelize, User, Client, Call, CreditTransaction, CallerId, SipTrunk, CallQueue, ClientTag } = require('./models');

async function seed() {
  try {
    console.log('Sync tables...');
    await sequelize.sync({ alter: true });
    console.log('Tables OK');

    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({ username: 'admin', email: 'admin@voipcrm.com', password: hash, role: 'admin', credits: 999999.00, is_active: true, sip_username: 'admin', sip_password: 'admin_sip_pass' });
      console.log('Admin cree: admin / admin123');
    } else { console.log('Admin existe deja'); }

    const agentExists = await User.findOne({ where: { username: 'agent1' } });
    if (!agentExists) {
      const hash = await bcrypt.hash('agent123', 10);
      await User.create({ username: 'agent1', email: 'agent1@voipcrm.com', password: hash, role: 'agent', credits: 50.00, is_active: true, sip_username: 'agent1', sip_password: 'agent1_sip_pass' });
      console.log('Agent cree: agent1 / agent123');
    }

    const clientCount = await Client.count();
    if (clientCount === 0) {
      await Client.bulkCreate([
        { name: 'Jean Dupont', phone_number: '+33612345678', email: 'jean@example.com', company: 'Dupont SARL', address: 'Paris, France' },
        { name: 'Marie Martin', phone_number: '+33698765432', email: 'marie@example.com', company: 'Martin et Co', address: 'Lyon, France' },
        { name: 'Pierre Bernard', phone_number: '+33655443322', email: 'pierre@example.com', company: 'Bernard Tech', address: 'Marseille, France' },
      ]);
      console.log('Clients demo crees');
    }

    const tagCount = await ClientTag.count().catch(() => 0);
    if (tagCount === 0) {
      await ClientTag.bulkCreate([
        { name: 'VIP', color: '#f59e0b' }, { name: 'Prospect', color: '#3b82f6' },
        { name: 'Client', color: '#10b981' }, { name: 'Urgent', color: '#ef4444' },
      ]).catch(() => {});
      console.log('Tags demo crees');
    }

    console.log('Seed termine!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
