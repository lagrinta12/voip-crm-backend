const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ==================== USER MODEL ====================
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'agent'), defaultValue: 'agent' },
  sip_username: { type: DataTypes.STRING(100), unique: true },
  sip_password: { type: DataTypes.STRING(100) },
  credits: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'users', timestamps: true, underscored: true });

// ==================== CLIENT MODEL ====================
const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  phone_number: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(255) },
  company: { type: DataTypes.STRING(255) },
  address: { type: DataTypes.TEXT },
}, { tableName: 'clients', timestamps: true, underscored: true });

// ==================== CLIENT NOTE MODEL ====================
const ClientNote = sequelize.define('ClientNote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  note_text: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'client_notes', timestamps: true, underscored: true });

// ==================== CLIENT TAG MODEL ====================
const ClientTag = sequelize.define('ClientTag', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  color: { type: DataTypes.STRING(7), defaultValue: '#3B82F6' },
}, { tableName: 'client_tags', timestamps: true, underscored: true });

// ==================== CLIENT TAG MAP ====================
const ClientTagMap = sequelize.define('ClientTagMap', {
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  tag_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'client_tag_map', timestamps: false });

// ==================== CLIENT INTERACTION MODEL ====================
const ClientInteraction = sequelize.define('ClientInteraction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('call', 'note', 'sms', 'email'), allowNull: false },
  description: { type: DataTypes.TEXT },
}, { tableName: 'client_interactions', timestamps: true, underscored: true });

// ==================== CALL MODEL ====================
const Call = sequelize.define('Call', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  client_id: { type: DataTypes.INTEGER },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  called_number: { type: DataTypes.STRING(50) },
  caller_id: { type: DataTypes.STRING(50) },
  start_time: { type: DataTypes.DATE },
  end_time: { type: DataTypes.DATE },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  cost: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
  status: { type: DataTypes.ENUM('ringing', 'answered', 'completed', 'failed', 'missed', 'busy'), defaultValue: 'ringing' },
  recording_url: { type: DataTypes.STRING(500) },
}, { tableName: 'calls', timestamps: true, underscored: true });

// ==================== AGENT STATUS MODEL ====================
const AgentStatus = sequelize.define('AgentStatus', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  status: { type: DataTypes.ENUM('available', 'busy', 'offline', 'on_call', 'break'), defaultValue: 'offline' },
  last_update: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'agent_status', timestamps: false });

// ==================== CALLER ID MODEL ====================
const CallerId = sequelize.define('CallerId', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  phone_number: { type: DataTypes.STRING(50), allowNull: false },
  label: { type: DataTypes.STRING(100) },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'caller_ids', timestamps: true, underscored: true });

// ==================== SIP TRUNK MODEL ====================
const SipTrunk = sequelize.define('SipTrunk', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  provider: { type: DataTypes.STRING(255) },
  type: { type: DataTypes.ENUM('sip_trunk', 'voip_provider', 'api_service'), defaultValue: 'sip_trunk' },
  host: { type: DataTypes.STRING(255) },
  port: { type: DataTypes.INTEGER, defaultValue: 5060 },
  username: { type: DataTypes.STRING(255) },
  password: { type: DataTypes.STRING(255) },
  auth_type: { type: DataTypes.ENUM('credentials', 'ip_based', 'api_key'), defaultValue: 'credentials' },
  api_key: { type: DataTypes.STRING(500) },
  api_endpoint: { type: DataTypes.STRING(500) },
  transport: { type: DataTypes.ENUM('udp', 'tcp', 'tls', 'wss'), defaultValue: 'udp' },
  codecs: { type: DataTypes.STRING(255), defaultValue: 'ulaw,alaw,g729' },
  max_channels: { type: DataTypes.INTEGER, defaultValue: 30 },
  caller_id_mode: { type: DataTypes.ENUM('trunk_default', 'user_defined', 'passthrough'), defaultValue: 'user_defined' },
  default_caller_id: { type: DataTypes.STRING(50) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
  priority: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: { type: DataTypes.ENUM('connected', 'disconnected', 'error', 'unknown'), defaultValue: 'unknown' },
  last_checked: { type: DataTypes.DATE },
  config_json: { type: DataTypes.JSONB },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'sip_trunks', timestamps: true, underscored: true });

// ==================== CALL QUEUE MODEL ====================
const CallQueue = sequelize.define('CallQueue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  strategy: { type: DataTypes.ENUM('ringall', 'roundrobin', 'leastrecent', 'fewestcalls', 'random'), defaultValue: 'roundrobin' },
  timeout: { type: DataTypes.INTEGER, defaultValue: 30 },
  max_wait: { type: DataTypes.INTEGER, defaultValue: 300 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'call_queues', timestamps: true, underscored: true });

// ==================== QUEUE MEMBER MODEL ====================
const QueueMember = sequelize.define('QueueMember', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  queue_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  priority: { type: DataTypes.INTEGER, defaultValue: 1 },
}, { tableName: 'queue_members', timestamps: false });

// ==================== CREDIT TRANSACTION MODEL ====================
const CreditTransaction = sequelize.define('CreditTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  type: { type: DataTypes.ENUM('topup', 'deduction', 'refund', 'adjustment'), allowNull: false },
  description: { type: DataTypes.TEXT },
  call_id: { type: DataTypes.INTEGER },
  balance_after: { type: DataTypes.DECIMAL(10, 2) },
}, { tableName: 'credit_transactions', timestamps: true, underscored: true });

// ==================== ASSOCIATIONS ====================
User.hasMany(ClientNote, { foreignKey: 'user_id' });
User.hasMany(Call, { foreignKey: 'user_id' });
User.hasOne(AgentStatus, { foreignKey: 'user_id' });
User.hasMany(CallerId, { foreignKey: 'user_id' });
User.hasMany(CreditTransaction, { foreignKey: 'user_id' });

Client.hasMany(ClientNote, { foreignKey: 'client_id' });
Client.hasMany(ClientInteraction, { foreignKey: 'client_id' });
Client.hasMany(Call, { foreignKey: 'client_id' });
Client.belongsToMany(ClientTag, { through: ClientTagMap, foreignKey: 'client_id', otherKey: 'tag_id', as: 'tags' });

ClientTag.belongsToMany(Client, { through: ClientTagMap, foreignKey: 'tag_id', otherKey: 'client_id', as: 'clients' });

ClientNote.belongsTo(User, { foreignKey: 'user_id' });
ClientNote.belongsTo(Client, { foreignKey: 'client_id' });

ClientInteraction.belongsTo(User, { foreignKey: 'user_id' });
ClientInteraction.belongsTo(Client, { foreignKey: 'client_id' });

Call.belongsTo(User, { foreignKey: 'user_id' });
Call.belongsTo(Client, { foreignKey: 'client_id' });

AgentStatus.belongsTo(User, { foreignKey: 'user_id' });
CallerId.belongsTo(User, { foreignKey: 'user_id' });

CallQueue.hasMany(QueueMember, { foreignKey: 'queue_id', as: 'members' });
QueueMember.belongsTo(CallQueue, { foreignKey: 'queue_id' });
QueueMember.belongsTo(User, { foreignKey: 'user_id' });

CreditTransaction.belongsTo(User, { foreignKey: 'user_id' });
CreditTransaction.belongsTo(Call, { foreignKey: 'call_id' });

module.exports = {
  sequelize,
  User,
  Client,
  ClientNote,
  ClientTag,
  ClientTagMap,
  ClientInteraction,
  Call,
  AgentStatus,
  CallerId,
  SipTrunk,
  CallQueue,
  QueueMember,
  CreditTransaction,
};
