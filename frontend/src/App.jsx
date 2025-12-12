import { useState, useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode' // <--- IMPORTANTE: Esto es lo que pide la diapositiva
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import './App.css'

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center, map]);
  return null;
}

function App() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_NAME;
  const UPLOAD_PRESET = 'examen';

  const [user, setUser] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [center, setCenter] = useState([40.416775, -3.703790]); 
  const [busqueda, setBusqueda] = useState('');
  
  const [nuevoEvento, setNuevoEvento] = useState({
    nombre: '', timestamp: '', lugar: '', imagen: null
  });

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/eventos?lat=${center[0]}&lon=${center[1]}`);
        const data = await res.json();
        setEventos(data);
      } catch (error) { console.error("Error eventos", error); }
    };
    fetchEventos();
  }, [center, API_URL]);

  // -----------------------------------------------------------------------
  // MÉTODO DIAPOSITIVAS (Componente GoogleLogin + JWT)
  // -----------------------------------------------------------------------
  const handleLoginSuccess = (credentialResponse) => {
    // ESTE ES EL MOMENTO DE LA VERDAD
    console.log("🔥 ¡RESPUESTA RECIBIDA DE GOOGLE!", credentialResponse);

    // Slide 7 y 8: Decodificar el JWT
    const decoded = jwtDecode(credentialResponse.credential);
    console.log("✅ DATOS DECODIFICADOS:", decoded);

    setUser({
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture
    });
  };

  const handleLoginError = () => {
    console.log('❌ Login Failed');
  };
  // -----------------------------------------------------------------------

  const buscarDireccion = async () => {
    if (!busqueda) return; 
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${busqueda}&limit=1`, {
         headers: { "Accept-Language": "es-ES" }
      });
      const data = await response.json();
      if (data?.[0]) {
        setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]); 
      } else { alert("Dirección no encontrada"); }
    } catch (e) { console.error(e); }
  };

  const handleFileChange = (e) => setNuevoEvento({ ...nuevoEvento, imagen: e.target.files[0] });

  const crearEvento = async (e) => {
    e.preventDefault();
    if (!nuevoEvento.imagen) return alert("Sube una imagen");
    try {
      const formData = new FormData();
      formData.append('file', nuevoEvento.imagen);
      formData.append('upload_preset', UPLOAD_PRESET);
      const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const dataCloud = await resCloud.json();
      
      const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${nuevoEvento.lugar}`);
      const dataGeo = await resGeo.json();
      const coords = dataGeo?.[0] ? { lat: parseFloat(dataGeo[0].lat), lon: parseFloat(dataGeo[0].lon) } : { lat: 0, lon: 0 };

      const resBack = await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoEvento.nombre,
          timestamp: nuevoEvento.timestamp,
          lugar: nuevoEvento.lugar,
          coords,
          organizador: user.email,
          imagen: dataCloud.secure_url
        })
      });

      if (resBack.ok) {
        alert("Evento creado!");
        setNuevoEvento({ nombre: '', timestamp: '', lugar: '', imagen: null });
        const res = await fetch(`${API_URL}/api/eventos?lat=${center[0]}&lon=${center[1]}`);
        setEventos(await res.json());
      }
    } catch (error) { console.error(error); alert("Error creando evento"); }
  };

  return (
    <div className="app-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Eventual</h1>
      
      {!user ? (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Inicia sesión</h2>
          
          {/* COMPONENTE OFICIAL (Como en las diapositivas) */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              useOneTap
              // Esto evita el bloqueo moderno de Chrome en localhost
              use_fedcm_for_prompt={false} 
            />
          </div>

        </div>
      ) : (
        <div style={{ padding: '20px', border: '1px solid #4caf50', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user.picture && <img src={user.picture} alt="user" style={{ borderRadius: '50%', width: '40px' }} />}
            <h3>Hola, {user.name}</h3>
          </div>
          <h4>Crear Evento</h4>
          <form onSubmit={crearEvento} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <input type="text" placeholder="Nombre" value={nuevoEvento.nombre} onChange={e => setNuevoEvento({...nuevoEvento, nombre: e.target.value})} required style={{ padding: '8px' }}/>
            <input type="datetime-local" value={nuevoEvento.timestamp} onChange={e => setNuevoEvento({...nuevoEvento, timestamp: e.target.value})} required style={{ padding: '8px' }}/>
            <input type="text" placeholder="Lugar" value={nuevoEvento.lugar} onChange={e => setNuevoEvento({...nuevoEvento, lugar: e.target.value})} required style={{ padding: '8px' }}/>
            <input type="file" accept="image/*" onChange={handleFileChange} required />
            <button type="submit" style={{ padding: '10px', background: '#4caf50', color: 'white', border: 'none' }}>Publicar</button>
          </form>
        </div>
      )}

      <hr />
      <div style={{ marginTop: '20px' }}>
         <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Buscar zona..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ padding: '8px', flex: 1 }} />
            <button onClick={buscarDireccion}>Buscar</button>
         </div>
         <div style={{ height: '400px', border: '2px solid #ddd' }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <RecenterMap center={center} />
              {eventos.map(ev => (
                <Marker key={ev._id} position={[ev.coords.lat, ev.coords.lon]}>
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      {/* IMAGEN */}
                      {ev.imagen && (
                        <img 
                          src={ev.imagen} 
                          alt={ev.nombre} 
                          style={{ width: '100%', borderRadius: '4px', marginBottom: '5px' }} 
                        />
                      )}
                      
                      {/* TÍTULO */}
                      <strong style={{ fontSize: '1.1em' }}>{ev.nombre}</strong>
                      <br/>
                      
                      {/* FECHA FORMATEADA */}
                      <span style={{ fontSize: '0.9em', color: '#555' }}>
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                      <br/>
                      
                      {/* LUGAR */}
                      <span style={{ fontSize: '0.8em', fontStyle: 'italic' }}>📍 {ev.lugar}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
         </div>
      </div>
    </div>
  )
}
export default App