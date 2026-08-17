import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ProductPrototype from './ProductPrototype'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProductPrototype />
  </StrictMode>,
)
