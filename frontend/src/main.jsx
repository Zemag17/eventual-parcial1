import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'

// Ponemos el ID directamente para asegurar que no sea undefined por culpa del .env
const CLIENT_ID = "262189482030-2lgh69jcc878r389nqtc19vdut1l3sve.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
    <GoogleOAuthProvider clientId={CLIENT_ID}>
        <App />
    </GoogleOAuthProvider>
)
