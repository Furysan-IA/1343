import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductPassport from './pages/ProductPassport';
import Welcome from './pages/Welcome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/products/:uuid" element={<ProductPassport />} />
        <Route path="/" element={<Welcome />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;