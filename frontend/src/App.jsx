import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Library from './pages/Library'
import FicDetail from './pages/FicDetail'
import Reader from './pages/Reader'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e1e1e',
            color: '#e0e0e0',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#7d9c7a',
              secondary: '#1e1e1e',
            },
          },
          error: {
            iconTheme: {
              primary: '#c97d7d',
              secondary: '#1e1e1e',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/fic/:id" element={<FicDetail />} />
        <Route path="/read/:id" element={<Reader />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
