import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Cpu,
  Bot,
  Zap,
  ShieldAlert,
  Newspaper,
  Clock,
  RefreshCw,
  Settings,
  ExternalLink,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

const COLORS = {
  paper: "#EDEAE3",
  card: "#F6F4EF",
  ink: "#17181B",
  inkSoft: "#57554D",
  line: "#D8D2C2",
  blue: "#2451FF",
  orange: "#E85A2A",
  green: "#1F7A52",
  red: "#C62F3F",
  gray: "#7A776D",
};

const CATS = {
  IA: { label: "IA", color: COLORS.blue, Icon: Cpu, rx: /intelig|artificial\s*intelligence|\bai\b|machine learning|modelo de lenguaje|chatgpt|openai|llm|algoritmo/i },
  Robotica: { label: "Robótica", color: COLORS.orange, Icon: Bot, rx: /robot|robó|dron|drone|autónom|humanoid/i },
  Energia: { label: "Energía", color: COLORS.green, Icon: Zap, rx: /energ|batería|battery|solar|renovable|electrolito|chip|semiconductor/i },
  Seguridad: { label: "Seguridad", color: COLORS.red, Icon: ShieldAlert, rx: /seguridad|hacker|ciberataque|vulnerabilidad|malware|spyware|brecha/i },
  General: { label: "General", color: COLORS.gray, Icon: Newspaper, rx: null },
};

const KEY_STORAGE = "senal-gnews-key";
const SAVED_STORAGE = "senal-saved-articles";
const GNEWS_BASE = "https://gnews.io/api/v4/top-headlines";

function classify(text) {
  for (const [id, meta] of Object.entries(CATS)) {
    if (meta.rx && meta.rx.test(text)) return id;
  }
  return "General";
}

function cleanContent(content) {
  if (!content) return "";
  return content.replace(/\s*\[\+\d+\s*chars\]\s*$/i, "").trim();
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

async function fetchArticles(apiKey) {
  const tryLang = async (lang) => {
    const url = `${GNEWS_BASE}?category=technology&lang=${lang}&max=25&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try {
        const body = await res.json();
        if (body?.errors?.[0]) msg = body.errors[0];
      } catch (e) {}
      throw new Error(msg);
    }
    const data = await res.json();
    return data.articles || [];
  };
  let articles = await tryLang("es");
  if (!articles.length) articles = await tryLang("en");
  return articles.map((a) => {
    const text = `${a.title || ""} ${a.description || ""}`;
    return {
      id: a.url,
      cat: classify(text),
      headline: a.title,
      dek: a.description || "",
      content: cleanContent(a.content),
      source: a.source?.name || "Fuente desconocida",
      url: a.url,
      image: a.image || null,
      publishedAt: a.publishedAt,
    };
  });
}

function WaveMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="39" rx="9" stroke={COLORS.ink} strokeOpacity="0.15" />
      <path
        d="M4 20 L11 20 L14 9 L18 31 L22 15 L25 24 L28 20 L36 20"
        stroke={COLORS.blue}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || null);
  const [keyInput, setKeyInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastFetched, setLastFetched] = useState(null);

  const [category, setCategory] = useState("Todo");
  const [saved, setSaved] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_STORAGE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [view, setView] = useState("edition");
  const [openArticle, setOpenArticle] = useState(null);

  const loadArticles = useCallback(async (key) => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const items = await fetchArticles(key);
      setArticles(items);
      setLastFetched(new Date().toISOString());
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "No se pudo conectar con la API de noticias.");
    }
  }, []);

  useEffect(() => {
    if (apiKey && status === "idle") loadArticles(apiKey);
  }, [apiKey, status, loadArticles]);

  const saveKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY_STORAGE, trimmed);
    setApiKey(trimmed);
    setStatus("idle");
    setShowSettings(false);
    loadArticles(trimmed);
  };

  const clearKey = () => {
    localStorage.removeItem(KEY_STORAGE);
    setApiKey(null);
    setArticles([]);
    setStatus("idle");
    setKeyInput("");
  };

  const toggleSave = (article) => {
    setSaved((prev) => {
      const exists = prev.some((s) => s.id === article.id);
      const next = exists ? prev.filter((s) => s.id !== article.id) : [...prev, article];
      localStorage.setItem(SAVED_STORAGE, JSON.stringify(next));
      return next;
    });
  };
  const isSaved = (id) => saved.some((s) => s.id === id);

  const now = new Date();
  const editionNumber = useMemo(() => {
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }, []);
  const dateLabel = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  const pool = view === "saved" ? saved : articles;
  const filtered = category === "Todo" ? pool : pool.filter((a) => a.cat === category);
  const lead = view === "edition" && category === "Todo" ? filtered[0] : null;
  const rest = lead ? filtered.slice(1) : filtered;
  const tickerItems = articles.slice(0, 6).map((a) => a.headline).filter(Boolean);

  if (openArticle) {
    const a = openArticle;
    const meta = CATS[a.cat] || CATS.General;
    return (
      <div style={{ background: COLORS.paper, color: COLORS.ink, fontFamily: "'Source Serif 4', Georgia, serif", minHeight: "100vh" }}>
        <FontStyles />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: 16 }}>
          <button
            className="viewbtn sg"
            onClick={() => setOpenArticle(null)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: "8px 0", marginBottom: 8 }}
          >
            <ArrowLeft size={16} /> Volver a la edición
          </button>

          {a.image ? (
            <img
              src={a.image}
              alt=""
              style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: 16, border: `1px solid ${COLORS.line}` }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div style={{ width: "100%", height: 180, borderRadius: 16, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <WaveMark size={40} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <CategoryTag cat={a.cat} />
            <SaveButton saved={isSaved(a.id)} onSave={() => toggleSave(a)} />
          </div>

          <h1 className="sg" style={{ fontSize: 27, lineHeight: 1.25, fontWeight: 700, margin: "10px 0 8px" }}>{a.headline}</h1>

          <div className="mono" style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: COLORS.inkSoft, marginBottom: 16 }}>
            <span>{a.source}</span>
            <span>·</span>
            <span>{timeAgo(a.publishedAt)}</span>
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: COLORS.ink, fontWeight: 600 }}>{a.dek}</p>
          {a.content && <p style={{ fontSize: 15.5, lineHeight: 1.75, color: COLORS.inkSoft, marginTop: 12 }}>{a.content}</p>}

          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sg"
            style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: COLORS.ink, padding: "12px 18px", borderRadius: 999, textDecoration: "none" }}
          >
            Leer el artículo completo en {a.source} <ExternalLink size={15} />
          </a>
          <p style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
            El texto de arriba es el resumen que ofrece la API de noticias. El cuerpo completo pertenece a su editor
            original, por eso se abre en su web.
          </p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div style={{ background: COLORS.paper, color: COLORS.ink, fontFamily: "'Source Serif 4', Georgia, serif", minHeight: "100vh" }}>
        <FontStyles />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <WaveMark />
            <div className="sg" style={{ fontSize: 22, fontWeight: 700 }}>SEÑAL</div>
          </div>
          <h1 className="sg" style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Conecta tu fuente de noticias</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: COLORS.inkSoft, marginBottom: 18 }}>
            Consigue una clave gratuita en{" "}
            <a href="https://gnews.io" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.blue }}>gnews.io</a>{" "}
            (registro con email, sin tarjeta) y pégala aquí. Se guarda solo en este navegador.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Pega tu API key de GNews"
              className="mono"
              style={{ flex: 1, fontSize: 13, padding: "12px 14px", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: COLORS.card, color: COLORS.ink }}
            />
            <button
              onClick={saveKey}
              className="sg"
              style={{ fontSize: 13, fontWeight: 700, padding: "0 18px", borderRadius: 12, border: "none", background: COLORS.ink, color: "#fff", cursor: "pointer" }}
            >
              Conectar
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 11.5, color: COLORS.inkSoft }}>
            <KeyRound size={13} /> La clave se guarda solo en tu navegador, nunca se envía a ningún otro sitio.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.paper, color: COLORS.ink, fontFamily: "'Source Serif 4', Georgia, serif", minHeight: "100vh" }}>
      <FontStyles />
      <header style={{ padding: "20px 16px 12px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WaveMark />
            <div>
              <div className="sg" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.02em" }}>SEÑAL</div>
              <div className="mono" style={{ fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.08em" }}>DIARIO DE TECNOLOGÍA</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => loadArticles(apiKey)}
              disabled={status === "loading"}
              aria-label="Actualizar edición"
              style={{ background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: 8, cursor: "pointer", color: COLORS.ink }}
            >
              <RefreshCw size={15} className={status === "loading" ? "spin" : ""} />
            </button>
            <button
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Ajustes"
              style={{ background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: 8, cursor: "pointer", color: COLORS.ink }}
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: COLORS.inkSoft, textTransform: "capitalize", borderTop: `1px solid ${COLORS.line}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span>{dateLabel} · Edición Nº {editionNumber}</span>
          {lastFetched && <span className="mono" style={{ fontSize: 10.5 }}>act. {timeAgo(lastFetched)}</span>}
        </div>
      </header>

      {showSettings && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 16px" }}>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16 }}>
            <div className="sg" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Fuente de noticias</div>
            <div className="mono" style={{ fontSize: 11, color: COLORS.inkSoft, marginBottom: 10, wordBreak: "break-all" }}>
              Clave activa: {apiKey.slice(0, 4)}••••{apiKey.slice(-3)}
            </div>
            <button
              onClick={clearKey}
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.red, background: "none", border: `1px solid ${COLORS.red}55`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}
            >
              Desconectar clave
            </button>
          </div>
        </div>
      )}

      {tickerItems.length > 0 && (
        <div style={{ background: COLORS.ink, color: COLORS.paper, overflow: "hidden", padding: "7px 0" }}>
          <div className="ticker-track mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} style={{ marginRight: 36, opacity: 0.9 }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            className="sg"
            onClick={() => setView("edition")}
            style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, border: `1px solid ${COLORS.ink}`, background: view === "edition" ? COLORS.ink : "transparent", color: view === "edition" ? COLORS.paper : COLORS.ink, cursor: "pointer" }}
          >
            Edición de hoy
          </button>
          <button
            className="sg"
            onClick={() => setView("saved")}
            style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, border: `1px solid ${COLORS.ink}`, background: view === "saved" ? COLORS.ink : "transparent", color: view === "saved" ? COLORS.paper : COLORS.ink, cursor: "pointer" }}
          >
            Guardados {saved.length > 0 && `(${saved.length})`}
          </button>
        </div>

        {view === "edition" && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
            {["Todo", ...Object.keys(CATS)].map((c) => {
              const active = category === c;
              const meta = CATS[c];
              return (
                <button
                  key={c}
                  className="sg"
                  onClick={() => setCategory(c)}
                  style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999,
                    border: `1px solid ${active ? (meta ? meta.color : COLORS.ink) : COLORS.line}`,
                    background: active ? (meta ? meta.color : COLORS.ink) : "transparent",
                    color: active ? "#fff" : COLORS.inkSoft, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {meta ? meta.label : "Todo"}
                </button>
              );
            })}
          </div>
        )}

        {status === "loading" && articles.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px", color: COLORS.inkSoft, fontSize: 14 }}>Cargando la edición de hoy…</div>
        )}

        {status === "error" && (
          <div style={{ background: `${COLORS.red}0f`, border: `1px solid ${COLORS.red}55`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div className="sg" style={{ fontSize: 13, fontWeight: 700, color: COLORS.red, marginBottom: 4 }}>No se pudo cargar la edición</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 10 }}>{errorMsg}</div>
            <button
              onClick={() => loadArticles(apiKey)}
              style={{ fontSize: 12, fontWeight: 600, background: COLORS.ink, color: "#fff", border: "none", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {lead && <LeadCard article={lead} saved={isSaved(lead.id)} onSave={() => toggleSave(lead)} onOpen={() => setOpenArticle(lead)} />}

        {status === "ready" && rest.length === 0 && !lead && (
          <div style={{ textAlign: "center", padding: "48px 16px", color: COLORS.inkSoft, fontSize: 14 }}>
            {view === "saved" ? "Todavía no has guardado ningún artículo." : "No hay artículos en esta categoría ahora mismo."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rest.map((a) => (
            <ArticleCard key={a.id} article={a} saved={isSaved(a.id)} onSave={() => toggleSave(a)} onOpen={() => setOpenArticle(a)} />
          ))}
        </div>

        <footer style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${COLORS.line}`, fontSize: 11, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          Noticias servidas por GNews en vivo. Los resúmenes son los que ofrece la API; el texto íntegro y las
          imágenes pertenecen a cada medio original, al que se enlaza desde cada artículo.
        </footer>
      </main>
    </div>
  );
}

function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      .sg { font-family: 'Space Grotesk', sans-serif; }
      .mono { font-family: 'JetBrains Mono', monospace; }
      button:focus-visible, input:focus-visible { outline: 2px solid ${COLORS.blue}; outline-offset: 2px; }
      .ticker-track { display: inline-flex; animation: scroll-left 30s linear infinite; }
      @media (prefers-reduced-motion: reduce) { .ticker-track { animation: none; } .spin { animation: none !important; } }
      @keyframes scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style>
  );
}

function CategoryTag({ cat }) {
  const meta = CATS[cat] || CATS.General;
  const Icon = meta.Icon;
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, color: meta.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      <Icon size={12} strokeWidth={2} /> {meta.label}
    </span>
  );
}

function Thumb({ article, height }) {
  const meta = CATS[article.cat] || CATS.General;
  if (article.image) {
    return (
      <img
        src={article.image}
        alt=""
        style={{ width: "100%", height, objectFit: "cover", borderRadius: 12, marginBottom: 10, border: `1px solid ${COLORS.line}` }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{ width: "100%", height, borderRadius: 12, marginBottom: 10, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <WaveMark size={28} />
    </div>
  );
}

function LeadCard({ article, saved, onSave, onOpen }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 20, padding: 20, marginBottom: 18 }}>
      <div style={{ cursor: "pointer" }} onClick={onOpen}>
        <Thumb article={article} height={200} />
        <CategoryTag cat={article.cat} />
        <h1 className="sg" style={{ fontSize: 23, lineHeight: 1.25, fontWeight: 700, margin: "10px 0 8px" }}>{article.headline}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: COLORS.inkSoft, margin: 0 }}>{article.dek}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <Meta article={article} />
        <SaveButton saved={saved} onSave={onSave} />
      </div>
    </div>
  );
}

function ArticleCard({ article, saved, onSave, onOpen }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 14 }}>
      <div style={{ display: "flex", gap: 12, cursor: "pointer" }} onClick={onOpen}>
        <div style={{ width: 96, flexShrink: 0 }}>
          <Thumb article={article} height={76} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CategoryTag cat={article.cat} />
          <h2 className="sg" style={{ fontSize: 15.5, lineHeight: 1.3, fontWeight: 600, margin: "6px 0 4px" }}>{article.headline}</h2>
          <Meta article={article} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <SaveButton saved={saved} onSave={onSave} small />
      </div>
    </div>
  );
}

function Meta({ article }) {
  return (
    <div className="mono" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: COLORS.inkSoft, flexWrap: "wrap" }}>
      <span>{article.source}</span>
      <span>·</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <Clock size={10} /> {timeAgo(article.publishedAt)}
      </span>
    </div>
  );
}

function SaveButton({ saved, onSave, small }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSave(); }}
      aria-label={saved ? "Quitar de guardados" : "Guardar artículo"}
      style={{ background: "none", border: "none", cursor: "pointer", color: saved ? COLORS.blue : COLORS.inkSoft, padding: 2, display: "flex" }}
    >
      {saved ? <BookmarkCheck size={small ? 16 : 18} /> : <Bookmark size={small ? 16 : 18} />}
    </button>
  );
}
