const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Conectar a MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/teams', require('./routes/teams'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: '🚀 TaskMaster Pro API funcionando correctamente' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ========================================');
  console.log('  🚀 TaskMaster Pro API');
  console.log('  Servidor corriendo en puerto ' + PORT);
  console.log('  http://localhost:' + PORT);
  console.log('  ========================================');
  console.log('');
});
