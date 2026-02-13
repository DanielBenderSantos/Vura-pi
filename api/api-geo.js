// api/geo.js
// AUTOCOMPLETE de cidades (Open-Meteo) + timezone via tz-lookup.
// Retorna: { results: [ { name, country, lat, lng, timezone } ] }

import tzlookup from "tz-lookup";

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
    const termo = String(req.query.q || "").trim();
    const limite = Math.min(parseInt(String(req.query.limit || "8"), 10), 20);

    if (termo.length < 2) {
      return res.status(400).json({
        error: "Digite ao menos 2 caracteres para buscar a cidade.",
      });
    }

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", termo);
    url.searchParams.set("count", String(limite));
    url.searchParams.set("language", "pt");
    url.searchParams.set("format", "json");

    const resposta = await fetch(url.toString());

    if (!resposta.ok) {
      const corpoTexto = await resposta.text().catch(() => "");
      return res.status(502).json({
        error: "Falha ao consultar serviço de cidades (Open-Meteo).",
        status: resposta.status,
        details: corpoTexto || "Sem detalhes.",
      });
    }

    const dados = await resposta.json();

    const results = (dados.results || []).map((item) => {
      const latitude = Number(item.latitude);
      const longitude = Number(item.longitude);

      let timezone = "AUTO";
      try {
        timezone = tzlookup(latitude, longitude);
      } catch {}

      return {
        name: item.name,
        country: item.country || "",
        lat: latitude,
        lng: longitude,
        timezone,
      };
    });

    return res.status(200).json({ results });
  } catch (erro) {
    return res.status(500).json({
      error: "Erro interno ao buscar cidades (/api/geo).",
      details: String(erro?.stack || erro),
    });
  }
}
