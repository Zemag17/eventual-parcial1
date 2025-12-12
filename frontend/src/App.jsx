import { useState, useEffect } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode' 
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import './App.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix iconos Leaflet por defecto
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente auxiliar para recentrar el mapa
function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    // 1. Esto soluciona el problema del mapa gris/cortado al cargar
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // 2. Esto centra el mapa
    map.setView(center);
  }, [center, map]);

  return null;
}

function App() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_NAME; // Asegúrate de tener esto en tu .env
  const UPLOAD_PRESET = 'examen'; // Asegúrate de que este preset existe en tu Cloudinary

  const [user, setUser] = useState(null);
  const [tokenData, setTokenData] = useState(null); 
  const [reviews, setReviews] = useState([]);
  const [center, setCenter] = useState([36.721274, -4.421399]); // Coordenadas por defecto (Málaga)
  const [busqueda, setBusqueda] = useState('');
  
  const [nuevaResena, setNuevaResena] = useState({
    establecimiento: '', 
    direccion: '', 
    valoracion: 5, 
    imagen: null
  });

  // Cargar reseñas al inicio
  const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_URL}/api/reviews`);
        const data = await res.json();
        setReviews(data);
      } catch (error) { console.error("Error fetching reviews", error); }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // -----------------------------------------------------------------------
  // AUTH
  // -----------------------------------------------------------------------
  const handleLoginSuccess = (credentialResponse) => {
    const rawToken = credentialResponse.credential;
    const decoded = jwtDecode(rawToken);
    
    setUser({
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture
    });

    setTokenData({
      token: rawToken,
      iat: decoded.iat * 1000,
      exp: decoded.exp * 1000
    });
  };

  const handleLoginError = () => {
    console.log('❌ Login Failed');
  };

  const logout = () => {
    googleLogout();
    setUser(null);
    setTokenData(null);
  };

  // -----------------------------------------------------------------------
  // MAPA & GEOLOCALIZACIÓN
  // -----------------------------------------------------------------------
  const buscarDireccionMapa = async () => {
    if (!busqueda) return; 
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${busqueda}&limit=1`);
      const data = await response.json();
      if (data?.[0]) {
        setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]); 
      } else { alert("Dirección no encontrada"); }
    } catch (e) { console.error(e); }
  };

  // -----------------------------------------------------------------------
  // CREACIÓN DE RESEÑA
  // -----------------------------------------------------------------------
  const handleFileChange = (e) => setNuevaResena({ ...nuevaResena, imagen: e.target.files[0] });

  const crearResena = async (e) => {
    e.preventDefault();
    if (!user) return alert("Debes identificarte para publicar.");

    try {
      let imageUrl = '';

      // 1. Subir imagen a Cloudinary (si existe)
      if (nuevaResena.imagen) {
          const formData = new FormData();
          formData.append('file', nuevaResena.imagen);
          formData.append('upload_preset', UPLOAD_PRESET);
          
          const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { 
              method: 'POST', 
              body: formData 
          });
          const dataCloud = await resCloud.json();
          imageUrl = dataCloud.secure_url;
      }

      // 2. Obtener coordenadas de la dirección escrita
      const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${nuevaResena.direccion}`);
      const dataGeo = await resGeo.json();
      const coords = dataGeo?.[0] 
        ? { lat: parseFloat(dataGeo[0].lat), lon: parseFloat(dataGeo[0].lon) } 
        : { lat: 0, lon: 0 }; 

      // 3. Preparar el payload para el backend
      const payload = {
        establecimiento: nuevaResena.establecimiento,
        direccion: nuevaResena.direccion,
        valoracion: parseInt(nuevaResena.valoracion),
        coords,
        autor: {
            email: user.email, 
            nombre: user.name
        },
        tokenInfo: { 
            token: tokenData.token,
            emitido: new Date(tokenData.iat),
            caduca: new Date(tokenData.exp)
        },
        imagen: imageUrl
      };

      // 4. Enviar a tu Backend
      const resBack = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resBack.ok) {
        alert("¡Reseña creada con éxito!");
        setNuevaResena({ establecimiento: '', direccion: '', valoracion: 5, imagen: null });
        fetchReviews(); // Recargar mapa
      }
    } catch (error) { console.error(error); alert("Error creando reseña"); }
  };

  return (
    <div className="app-container">
      <h1>ReViews: Opiniones de Sitios</h1>
      
      {/* LOGIN / FORMULARIO */}
      {!user ? (
        <div className="card-box">
          <h2>Identifícate para participar</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} useOneTap={false} />
          </div>
        </div>
      ) : (
        <div className="card-box logged-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            {user.picture && <img src={user.picture} alt="user" style={{ borderRadius: '50%', width: '40px' }} />}
            <h3>Hola, {user.name}</h3>
            <button onClick={logout} className="btn-logout">Cerrar Sesión</button>
          </div>

          <h4>Nueva Reseña</h4>
          <form onSubmit={crearResena} className="form-column">
            <input 
                type="text" 
                className="form-input" 
                placeholder="Nombre Establecimiento" 
                value={nuevaResena.establecimiento} 
                onChange={e => setNuevaResena({...nuevaResena, establecimiento: e.target.value})} 
                required 
            />
            <input 
                type="text" 
                className="form-input" 
                placeholder="Dirección (ej: Calle Larios, Málaga)" 
                value={nuevaResena.direccion} 
                onChange={e => setNuevaResena({...nuevaResena, direccion: e.target.value})} 
                required 
            />
            
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <label>Valoración (0-5): </label>
                <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    className="form-input" 
                    style={{width:'60px'}} 
                    value={nuevaResena.valoracion} 
                    onChange={e => setNuevaResena({...nuevaResena, valoracion: e.target.value})} 
                    required 
                />
            </div>

            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button type="submit" className="btn-primary">Publicar Opinión</button>
          </form>
        </div>
      )}

      <hr style={{width: '100%', margin: '20px 0'}} />
      
      {/* BUSCADOR Y MAPA */}
      <div style={{ width: '100%' }}>
         <div className="search-bar">
            <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar zona en mapa..." 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)} 
                style={{ flex: 1 }} 
            />
            <button onClick={buscarDireccionMapa} className="btn-primary" style={{ width: '100px' }}>Buscar</button>
         </div>

         <div className="map-wrapper">
            <MapContainer center={center} zoom={13}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <RecenterMap center={center} />
              
              {reviews.map(rev => (
                <Marker key={rev._id} position={[rev.coords.lat, rev.coords.lon]}>
                  <Popup maxWidth="300">
                    <div style={{ textAlign: 'left', fontSize: '14px' }}>
                      <h3 style={{margin: '0 0 5px 0'}}>{rev.establecimiento}</h3>
                      <p style={{margin: '0'}}>📍 {rev.direccion}</p>
                      <p style={{margin: '5px 0'}}>⭐ Valoración: <strong>{rev.valoracion}/5</strong></p>
                      {rev.imagen && (
                        <img src={rev.imagen} alt="review" style={{ width: '100%', borderRadius: '4px', marginTop: '5px' }} />
                      )}
                      <hr style={{margin: '10px 0'}}/>
                      <div style={{ fontSize: '11px', color: '#555', background: '#f9f9f9', padding: '5px' }}>
                        <p><strong>Autor:</strong> {rev.autor.nombre}</p>
                        {rev.tokenInfo && <p><strong>Expira:</strong> {new Date(rev.tokenInfo.caduca).toLocaleTimeString()}</p>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
         </div>
         
         {/* LISTADO SIMPLE */}
         <div style={{marginTop: '20px'}}>
            <h3>Listado de Reseñas</h3>
            <ul className="review-list">
                {reviews.map(r => (
                    <li key={r._id}>
                        <strong>{r.establecimiento}</strong> ({r.direccion}) - {r.valoracion} ⭐
                    </li>
                ))}
            </ul>
         </div>
      </div>
    </div>
  )
}

export default App