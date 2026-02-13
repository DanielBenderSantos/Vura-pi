// app.js
// GitHub Pages (front) chamando Vercel (backend)

const API_BASE = "https://vura-pi.vercel.app/"; // ✅ sem "/" no final

const pegarEl = (id) => document.getElementById(id);

const formulario = pegarEl("formMandala");
const elStatus = pegarEl("status");
const elResultado = pegarEl("output");

const inputCidade = pegarEl("city");
const listaCidades = pegarEl("cityList");

let cidadeSelecionada = null;

function definirStatus(mensagem) {
  elStatus.textContent = mensagem || "";
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function mostrarSugestoes(cidades) {
  if (!cidades || cidades.length === 0) {
    listaCidades.hidden = true;
    listaCidades.innerHTML = "";
    return;
  }

  listaCidades.hidden = false;

  listaCidades.innerHTML = cidades.map((cidade, idx) => {
    const nome = escaparHtml(cidade.name);
    const pais = escaparHtml(cidade.country);
    const fuso = escaparHtml(cidade.timezone);

    return `<button type="button" data-idx="${idx}">
      ${nome} (${pais}) — ${fuso}
    </button>`;
  }).join("");

  listaCidades.querySelectorAll("button").forEach((botao) => {
    botao.addEventListener("click", () => {
      const idx = Number(botao.dataset.idx);
      cidadeSelecionada = cidades[idx];

      inputCidade.value = `${cidadeSelecionada.name} (${cidadeSelecionada.country})`;
      pegarEl("lat").value = cidadeSelecionada.lat;
      pegarEl("lng").value = cidadeSelecionada.lng;
      pegarEl("tz").value = cidadeSelecionada.timezone;

      mostrarSugestoes([]);
      definirStatus("");
    });
  });
}

// Debounce
let timerDebounce = null;

inputCidade.addEventListener("input", () => {
  cidadeSelecionada = null;
  pegarEl("lat").value = "";
  pegarEl("lng").value = "";
  pegarEl("tz").value = "";

  clearTimeout(timerDebounce);

  const termo = inputCidade.value.trim();

  if (termo.length < 2) {
    mostrarSugestoes([]);
    return;
  }

  timerDebounce = setTimeout(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/geo?q=${encodeURIComponent(termo)}&limit=8`);
      const dados = await resp.json();

      if (!resp.ok) {
        throw new Error(dados?.error || "Erro ao buscar cidades.");
      }

      const cidades = dados.results || [];
      mostrarSugestoes(cidades);

    } catch (erro) {
      mostrarSugestoes([]);
      definirStatus(erro.message || String(erro));
    }
  }, 250);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".mandala-autocomplete")) {
    mostrarSugestoes([]);
  }
});

formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  definirStatus("");

  if (!cidadeSelecionada) {
    definirStatus("Selecione uma cidade na lista (isso garante lat/lng e timezone).");
    return;
  }

  const valorData = pegarEl("date").value;
  const valorHora = pegarEl("time").value;

  if (!valorData || !valorHora) {
    definirStatus("Preencha data e hora.");
    return;
  }

  const [ano, mes, dia] = valorData.split("-").map(Number);
  const [hora, minuto] = valorHora.split(":").map(Number);

  const payload = {
    name: pegarEl("name").value.trim(),
    year: ano,
    month: mes,
    day: dia,
    hour: hora,
    minute: minuto,

    city: cidadeSelecionada.name,
    lat: cidadeSelecionada.lat,
    lng: cidadeSelecionada.lng,
    tz_str: cidadeSelecionada.timezone,

    house_system: pegarEl("house_system").value,
    zodiac_type: pegarEl("zodiac_type").value,
    theme_type: pegarEl("theme_type").value,
    size: Number(pegarEl("size").value || 900),
  };

  try {
    definirStatus("Gerando mandala...");
    elResultado.innerHTML = "";

    const resp = await fetch(`${API_BASE}/api/mandala`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados?.error || "Falha ao gerar mandala.");

    const svg =
      dados.svg ||
      dados.chart_svg ||
      dados.output_svg ||
      dados?.result?.svg ||
      dados?.data?.svg;

    if (!svg) {
      console.log("Resposta da API (sem svg encontrado):", dados);
      throw new Error("Não achei o SVG na resposta. Veja o console (F12) para ajustar o campo.");
    }

    elResultado.innerHTML = svg;
    definirStatus("Pronto ✅");

  } catch (erro) {
    definirStatus(erro.message || String(erro));
  }
});