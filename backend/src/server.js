// ============================================
// SERVER.JS
// Punto de entrada de la aplicación.
// Levanta el servidor Express en el puerto configurado.
// ============================================

require('dotenv').config();
const app = require('./app');

// PORT viene del .env; si no está definido, usa 3000 por defecto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor PROYECTO 26 corriendo en http://localhost:${PORT}`);
});