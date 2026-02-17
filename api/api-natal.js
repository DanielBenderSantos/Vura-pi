// api/api-natal.js
// Chama o endpoint /natal/calculate da FreeAstroAPI e devolve JSON completo
// { subject, planets, houses, angles, angles_details, aspects, dominants }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://danielbendersantos.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const dados = await lerBodyJson(req);

    const camposObrigatorios = ["name", "year", "month", "day", "hour", "minute", "city", "lat", "lng", "tz_str"];
    for (const campo of camposObrigatorios) {
      if (dados[campo] === undefined || dados[campo] === null || dados[campo] === "") {
        return res.status(400).json({ error: `Campo obrigatório: ${campo}` });
      }
    }

    const chaveApi = process.env.FREEASTRO_API_KEY;
    if (!chaveApi) {
      return res.status(500).json({ error: "FREEASTRO_API_KEY não configurada na Vercel." });
    }

    const payload = {
      name:   String(dados.name),
      year:   Number(dados.year),
      month:  Number(dados.month),
      day:    Number(dados.day),
      hour:   Number(dados.hour),
      minute: Number(dados.minute),
      city:   String(dados.city),
      lat:    Number(dados.lat),
      lng:    Number(dados.lng),
      tz_str: String(dados.tz_str),

      // fixos
      house_system: "placidus",
      zodiac_type:  "tropical",
      include_speed: true,
      include_dominants: true,
      include_features: ["chiron", "lilith", "true_node"],

      // interpretações em português (por enquanto só tem 'en', mas deixamos preparado)
      interpretation: {
        enable: true,
        style: "improved"
      }
    };

    const resposta = await fetch("https://astro-api-1qnc.onrender.com/api/v1/natal/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": chaveApi
      },
      body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
      const textoErro = await resposta.text();
      let erroParseado;
      try { erroParseado = JSON.parse(textoErro); }
      catch { erroParseado = { raw: textoErro }; }

      return res.status(resposta.status).json({
        error: "A FreeAstroAPI retornou erro.",
        status: resposta.status,
        response: erroParseado
      });
    }

    const json = await resposta.json();
    return res.status(200).json(json);

  } catch (erro) {
    return res.status(500).json({
      error: "Erro interno em /api/api-natal.",
      details: String(erro?.stack || erro)
    });
  }
}

async function lerBodyJson(req) {
  return new Promise((resolve, reject) => {
    let bruto = "";
    req.on("data", (chunk) => (bruto += chunk));
    req.on("end", () => {
      try { resolve(bruto ? JSON.parse(bruto) : {}); }
      catch (e) { reject(e); }
    });
  });
}