# SEÑAL — Diario de tecnología

App de noticias tecnológicas conectada en vivo a [GNews](https://gnews.io), con fotos reales de cada
artículo, lectura de cada noticia y guardados.

La llamada a GNews la hace una función serverless (`/api/news`) que vive en el propio proyecto de
Vercel — el navegador nunca llama a GNews directamente, así que no hay problemas de CORS ni la clave
queda expuesta en el código.

## 1. Consigue tu clave de GNews (gratis)

1. Ve a https://gnews.io y regístrate con tu email (no pide tarjeta).
2. Copia la API key que te dan en el panel.

## 2. Configúrala en Vercel (una sola vez)

1. En tu proyecto de Vercel, ve a **Settings → Environment Variables**.
2. Añade una variable:
   - **Name**: `GNEWS_API_KEY`
   - **Value**: tu clave de GNews
   - Entorno: marca **Production** (y Preview/Development si quieres probar en esas ramas).
3. Guarda y vuelve a desplegar el proyecto (Deployments → los tres puntos del último deploy → Redeploy),
   para que la función serverless recoja la nueva variable.

## 3. Probar en local (opcional)

Necesitas [Node.js](https://nodejs.org) y la CLI de Vercel (para que `/api/news` funcione en local):

```bash
npm install -g vercel
npm install
vercel dev
```

Crea un archivo `.env.local` en la raíz con:
```
GNEWS_API_KEY=tu_clave_aqui
```

## 4. Desplegar en Vercel

**Sin terminal:**
1. Sube esta carpeta a un repositorio en GitHub.
2. Entra en https://vercel.com → "Add New Project" → importa el repositorio.
3. Antes o después del primer deploy, añade la variable de entorno del paso 2.
4. Deploy. En 1–2 minutos tendrás tu URL pública.

## Notas

- Tus artículos guardados se quedan en tu navegador (localStorage), no en ningún servidor.
- El plan gratuito de GNews da 100 peticiones al día: usa el botón de actualizar en la app en vez de
  refrescar muy seguido. La función serverless además cachea la respuesta 30 minutos.
- Si `/api/news` devuelve el error "Falta configurar la variable de entorno GNEWS_API_KEY", significa
  que el paso 2 no se guardó o falta volver a desplegar tras añadirla.
