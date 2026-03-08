const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false }
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  time: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true
  },
  desc: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium'
  },
  project: {
    type: String,
    default: 'General'
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  tags: [{ type: String }],
  dueDate: { type: Date },
  subtasks: [subtaskSchema],
  comments: [commentSchema],
  hoursLogged: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Task', taskSchema);
