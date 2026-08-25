# SEÑAL — Diario de tecnología

App de noticias tecnológicas conectada en vivo a [GNews](https://gnews.io), con fotos reales de cada
artículo, lectura de cada noticia y guardados. Pensada para desplegarse fuera de Claude, donde el
navegador ya no tiene las restricciones de un artifact.

## 1. Consigue tu clave de GNews (gratis)

1. Ve a https://gnews.io y regístrate con tu email (no pide tarjeta).
2. Copia la API key que te dan en el panel.
3. La pegarás dentro de la app la primera vez que la abras — se guarda solo en tu navegador.

## 2. Prueba en local (opcional)

Necesitas [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

Abre la URL que te muestre la terminal (normalmente http://localhost:5173).

## 3. Desplegar en Vercel (recomendado, gratis)

**Opción A — sin usar la terminal:**
1. Sube esta carpeta a un repositorio nuevo en GitHub.
2. Entra en https://vercel.com → "Add New Project" → importa el repositorio.
3. Vercel detecta Vite automáticamente. Pulsa "Deploy".
4. En 1–2 minutos tendrás una URL pública (algo como `senal-app.vercel.app`).

**Opción B — con la terminal:**
```bash
npm install -g vercel
vercel
```
Sigue las preguntas (puedes aceptar todas las opciones por defecto).

## 4. Desplegar en Netlify (alternativa)

**La forma más rápida — arrastrar y soltar:**
1. Ejecuta `npm install` y luego `npm run build`. Esto crea una carpeta `dist/`.
2. Ve a https://app.netlify.com/drop y arrastra la carpeta `dist/` ahí.
3. Netlify te da una URL pública al momento.

## Notas

- La clave de GNews y tus artículos guardados se quedan en el navegador (localStorage) — no se
  envían a ningún servidor tuyo ni de terceros.
- El plan gratuito de GNews da 100 peticiones al día: usa el botón de actualizar en la app en vez de
  dejar que refresque sola con mucha frecuencia.
- Si más adelante quieres poner esto en tu propio dominio (por ejemplo algo tipo `noticias.tudominio.com`),
  tanto Vercel como Netlify permiten añadir un dominio personalizado gratis desde su panel.
