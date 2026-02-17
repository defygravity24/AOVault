import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Library from './pages/Library'
import FicDetail from './pages/FicDetail'
import Reader from './pages/Reader'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/fic/:id" element={<FicDetail />} />
        <Route path="/read/:id" element={<Reader />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
