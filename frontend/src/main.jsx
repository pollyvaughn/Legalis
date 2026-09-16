import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// AuthProvider envuelve toda la app: así cualquier componente,
// sin importar cuán anidado esté, puede usar useAuth() para saber
// si hay alguien logueado o llamar a login()/logout().
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)