import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/authContext.jsx'
import './index.css'
import App from './App.jsx'
import Signup from './components/auth/signup'
import Login from './components/auth/login.tsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
<AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login/>}/>
      </Routes>
    </BrowserRouter>
</AuthProvider>
  </StrictMode>,
)
