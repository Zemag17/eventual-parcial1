const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado a MongoDB (ReViews)'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// ---------------------------------------------------------
// 2. MODELO 'RESENA' (Adaptado al PDF)
// ---------------------------------------------------------
const resenaSchema = new mongoose.Schema({
  establecimiento: { type: String, required: true }, // Nombre del establecimiento
  direccion: { type: String, required: true },       // Dirección postal
  coords: {
    lat: { type: Number, required: true },           // Coordenadas
    lon: { type: Number, required: true }
  },
  valoracion: { type: Number, required: true, min: 0, max: 5 }, // Valoración 0-5
  autor: {
    email: { type: String, required: true },         // Email autor
    nombre: { type: String, required: true }         // Nombre autor
  },
  tokenInfo: {                                       // Datos técnicos del token
    token: { type: String },                         // Token raw
    emitido: { type: Date },                         // iat (timestamp)
    caduca: { type: Date }                           // exp (timestamp)
  },
  imagen: { type: String }                           // URL de la imagen
});

const Resena = mongoose.model('Resena', resenaSchema);

// ---------------------------------------------------------
// 3. RUTAS API
// ---------------------------------------------------------

// GET /api/reviews
app.get('/api/reviews', async (req, res) => {
  try {
    // Devuelve todas las reseñas. Podrías filtrar aquí si quisieras.
    const reviews = await Resena.find().sort({ _id: -1 });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// POST /api/reviews
app.post('/api/reviews', async (req, res) => {
  try {
    // Creación de reseñas
    const nuevaResena = new Resena(req.body);
    const guardado = await nuevaResena.save();
    res.status(201).json(guardado);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear reseña' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ReViews corriendo en http://localhost:${PORT}`);
});