// Esta función corre en el servidor de Vercel, no en el navegador.
// Por eso no hay problema de CORS: el navegador solo habla con tu propio dominio (/api/news),
// y es este servidor el que llama a GNews.
export default async function handler(req, res) {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error:
        "Falta configurar la variable de entorno GNEWS_API_KEY en Vercel (Project Settings → Environment Variables).",
    });
    return;
  }

  const lang = req.query.lang === "en" ? "en" : "es";
  const url = `https://gnews.io/api/v4/top-headlines?category=technology&lang=${lang}&max=25&apikey=${apiKey}`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json(data);
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error llamando a GNews." });
  }
}
