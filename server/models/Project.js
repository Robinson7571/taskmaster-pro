const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
  color: { type: String, default: '#6366f1' },
  description: { type: String, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
