import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './styles/style.css'
import App from './App.jsx'
import AdminPortal from './pages/AdminPortal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin-portal" element={<AdminPortal />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
