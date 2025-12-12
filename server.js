const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 4. Configuración: Habilita CORS y JSON body parser
app.use(cors());
app.use(express.json());

// 1. Conexión BD
const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// 2. Modelo 'Evento'
const eventoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  timestamp: { type: Date, required: true },
  lugar: { type: String, required: true }, // Dirección postal
  coords: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true }
  },
  organizador: { type: String, required: true }, // Email del usuario
  imagen: { type: String } // URL de la imagen
});

const Evento = mongoose.model('Evento', eventoSchema);

// 3. Rutas API

// GET /api/eventos
// Recibe query params ?lat=X&lon=Y. Filtra por distancia euclidiana < 0.2
app.get('/api/eventos', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Obtenemos todos los eventos ordenados por fecha descendente
    let eventos = await Evento.find().sort({ timestamp: -1 });

    // Si hay coordenadas, filtramos en memoria (simple, como pedido)
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);

      eventos = eventos.filter(evento => {
        if (!evento.coords || evento.coords.lat === undefined || evento.coords.lon === undefined) return false;
        
        const dist = Math.sqrt(
          Math.pow(evento.coords.lat - userLat, 2) + 
          Math.pow(evento.coords.lon - userLon, 2)
        );
        return dist < 0.2;
      });
    }

    res.json(eventos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// POST /api/eventos
app.post('/api/eventos', async (req, res) => {
  try {
    const nuevoEvento = new Evento(req.body);
    const eventoGuardado = await nuevoEvento.save();
    res.status(201).json(eventoGuardado);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear evento' });
  }
});

// PUT /api/eventos/:id (Esqueleto básico)
app.put('/api/eventos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventoActualizado = await Evento.findByIdAndUpdate(id, req.body, { new: true });
    res.json(eventoActualizado);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar evento' });
  }
});

// DELETE /api/eventos/:id (Esqueleto básico)
app.delete('/api/eventos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Evento.findByIdAndDelete(id);
    res.json({ message: 'Evento eliminado correctamente' });
  } catch (error) {
    res.status(400).json({ error: 'Error al eliminar evento' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
