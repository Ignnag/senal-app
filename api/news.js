// Esta función corre en el servidor de Vercel, no en el navegador.
// Por eso no hay problema de CORS: el navegador solo habla con tu propio dominio (/api/news),
// y es este servidor el que llama a GNews.

// --- Filtro geográfico: España primero, si no EEUU / Europa / China. Nada de Sudamérica ni otras regiones. ---

const LATAM_CC = ["mx", "ar", "co", "cl", "pe", "ve", "ec", "uy", "py", "bo", "do", "cr", "pa", "gt", "hn", "sv", "ni", "cu", "pr", "br"];
const OTHER_EXCLUDED_CC = ["in", "jp", "kr", "au", "nz", "za", "ng", "ke", "ph", "id", "th", "vn", "sa", "ae", "il", "tr", "ru", "ca", "eg"];
const EUROPE_CC = ["uk", "de", "fr", "it", "nl", "be", "pt", "ie", "se", "no", "dk", "fi", "pl", "at", "ch", "gr", "cz", "ro", "hu", "bg", "hr", "sk", "si", "lt", "lv", "ee", "lu", "mt", "cy", "is", "eu"];

// Medios conocidos con dominio genérico (.com/.org) donde el TLD no delata el país.
const KNOWN_SPAIN = new Set([
  "elpais.com", "elmundo.es", "expansion.com", "elconfidencial.com", "abc.es", "lavanguardia.com",
  "elespanol.com", "eldiario.es", "publico.es", "larazon.es", "eleconomista.es", "cincodias.elpais.com",
  "xataka.com", "genbeta.com", "applesfera.com", "computerhoy.com", "muycomputer.com", "hipertextual.com",
  "20minutos.es", "elperiodico.com", "lasexta.com", "rtve.es",
]);
const KNOWN_LATAM = new Set([
  "infobae.com", "clarin.com", "lanacion.com.ar", "tn.com.ar", "perfil.com", "ambito.com", "cronista.com",
  "semana.com", "eltiempo.com", "elespectador.com", "larepublica.co", "milenio.com", "eluniversal.com.mx",
  "excelsior.com.mx", "elcomercio.pe", "eluniverso.com", "emol.com", "latercera.com", "elmostrador.cl",
  "elcolombiano.com", "publimetro.co", "diariolibre.com", "prensa.com",
]);
const KNOWN_USA = new Set([
  "nytimes.com", "wsj.com", "bloomberg.com", "reuters.com", "apnews.com", "cnbc.com", "techcrunch.com",
  "theverge.com", "wired.com", "engadget.com", "arstechnica.com", "forbes.com", "businessinsider.com",
  "axios.com", "cnn.com", "washingtonpost.com", "usatoday.com", "npr.org", "theinformation.com",
  "venturebeat.com", "9to5mac.com", "9to5google.com", "gizmodo.com", "mashable.com", "fastcompany.com",
]);
const KNOWN_CHINA = new Set([
  "scmp.com", "globaltimes.cn", "xinhuanet.com", "ecns.cn", "caixinglobal.com", "chinadaily.com.cn",
  "cgtn.com", "technode.com",
]);
const KNOWN_EUROPE = new Set([
  "bbc.com", "bbc.co.uk", "dw.com", "france24.com", "euronews.com", "politico.eu", "ft.com",
  "theguardian.com", "reutersagency.com", "handelsblatt.com", "lemonde.fr", "faz.net", "corriere.it",
  "ansa.it", "nu.nl", "spiegel.de",
]);

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function regionOf(hostname) {
  if (!hostname) return null;
  const parts = hostname.split(".");
  const tld = parts[parts.length - 1];
  const sld = parts.length > 2 ? parts[parts.length - 2] : null;

  // Dominios compuestos tipo .com.mx, .com.ar, etc.
  if (sld === "com" && LATAM_CC.includes(tld)) return null;
  if (LATAM_CC.includes(tld)) return null;
  if (OTHER_EXCLUDED_CC.includes(tld)) return null;

  if (KNOWN_LATAM.has(hostname)) return null;
  if (KNOWN_SPAIN.has(hostname)) return "España";
  if (KNOWN_CHINA.has(hostname)) return "China";
  if (KNOWN_EUROPE.has(hostname)) return "Europa";
  if (KNOWN_USA.has(hostname)) return "EEUU";

  if (tld === "es") return "España";
  if (tld === "cn") return "China";
  if (EUROPE_CC.includes(tld)) return "Europa";
  if (tld === "us") return "EEUU";

  // Dominio genérico (.com/.org/.net/.io) que no reconocemos: lo tratamos como EEUU/global
  // por defecto, ya que la mayoría de medios anglosajones usan estos TLD.
  if (["com", "org", "net", "io"].includes(tld)) return "EEUU";

  return null; // cualquier otro caso, fuera
}

const REGION_ORDER = { "España": 0, "EEUU": 1, "Europa": 1, "China": 1 };

function filterAndSort(articles) {
  return articles
    .map((a) => ({ ...a, __region: regionOf(hostnameOf(a.url)) }))
    .filter((a) => a.__region !== null)
    .sort((a, b) => REGION_ORDER[a.__region] - REGION_ORDER[b.__region]);
}

export default async function handler(req, res) {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error:
        "Falta configurar la variable de entorno GNEWS_API_KEY en Vercel (Project Settings → Environment Variables).",
    });
    return;
  }

  const buildUrl = (lang) =>
    `https://gnews.io/api/v4/top-headlines?category=technology&lang=${lang}&max=25&apikey=${apiKey}`;

  try {
    const [esRes, enRes] = await Promise.all([fetch(buildUrl("es")), fetch(buildUrl("en"))]);

    if (!esRes.ok && !enRes.ok) {
      const errBody = await esRes.json().catch(() => ({}));
      res.status(esRes.status).json(errBody);
      return;
    }

    const esData = esRes.ok ? await esRes.json() : { articles: [] };
    const enData = enRes.ok ? await enRes.json() : { articles: [] };

    const seen = new Set();
    const merged = [...(esData.articles || []), ...(enData.articles || [])].filter((a) => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    const filtered = filterAndSort(merged).slice(0, 30);

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=600");
    res.status(200).json({ articles: filtered, totalArticles: filtered.length });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error llamando a GNews." });
  }
}
