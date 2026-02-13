// api/mandala.js
// Gera mandala (SVG) usando FreeAstroAPI e devolve:
// { svg: "<svg>...</svg>" }

export default async function handler(req, res) {
  // CORS (para permitir seu GitHub Pages chamar esta API)
  res.setHeader("Access-Control-Allow-Origin", "https://danielbendersantos.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight do navegador
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido. Use POST." });
    }

    const dadosEntrada = await lerBodyJson(req);

    const camposObrigatorios = [
      "name", "year", "month", "day", "hour", "minute",
      "city", "lat", "lng", "tz_str"
    ];

    for (const campo of camposObrigatorios) {
      if (dadosEntrada[campo] === undefined || dadosEntrada[campo] === null || dadosEntrada[campo] === "") {
        return res.status(400).json({ error: `Campo obrigatório: ${campo}` });
      }
    }

    const chaveApi = process.env.FREEASTRO_API_KEY;
    if (!chaveApi) {
      return res.status(500).json({
        error: "FREEASTRO_API_KEY não configurada na Vercel (Environment Variables)."
      });
    }

    const payload = {
      name: String(dadosEntrada.name),
      year: Number(dadosEntrada.year),
      month: Number(dadosEntrada.month),
      day: Number(dadosEntrada.day),
      hour: Number(dadosEntrada.hour),
      minute: Number(dadosEntrada.minute),

      city: String(dadosEntrada.city),
      lat: Number(dadosEntrada.lat),
      lng: Number(dadosEntrada.lng),
      tz_str: String(dadosEntrada.tz_str),

      zodiac_type: dadosEntrada.zodiac_type || "tropical",
      house_system: dadosEntrada.house_system || "placidus",

      format: "svg",
      size: Number(dadosEntrada.size || 900),
      theme_type: dadosEntrada.theme_type || "light",
      show_metadata: true,

      display_settings: {
        chiron: true,
        lilith: true,
        north_node: true,
        south_node: true,
        asc: true,
        mc: true
      },

      chart_config: {
        show_color_background: false,
        sign_ring_thickness_fraction: 0.17,
        house_ring_thickness_fraction: 0.07,
        planet_symbol_scale: 0.40,
        sign_symbol_scale: 0.62
      }
    };

    const resposta = await fetch(
      "https://astro-api-1qnc.onrender.com/api/v1/natal/experimental",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": chaveApi
        },
        body: JSON.stringify(payload)
      }
    );

    if (!resposta.ok) {
      const textoErro = await resposta.text();

      let erroParseado;
      try { erroParseado = JSON.parse(textoErro); }
      catch { erroParseado = { raw: textoErro }; }

      return res.status(resposta.status).json({
        error: "A FreeAstro retornou erro ao gerar o SVG.",
        status: resposta.status,
        response: erroParseado
      });
    }

    const svgTexto = await resposta.text();
    return res.status(200).json({ svg: svgTexto });

  } catch (erro) {
    return res.status(500).json({
      error: "Erro interno ao gerar mandala (/api/mandala).",
      details: String(erro?.stack || erro)
    });
  }
}

async function lerBodyJson(req) {
  return new Promise((resolve, reject) => {
    let bruto = "";

    req.on("data", (chunk) => (bruto += chunk));
    req.on("end", () => {
      try {
        resolve(bruto ? JSON.parse(bruto) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
