// mandala.js
const API_BASE = "https://vura-pi.vercel.app";

const pegarEl = (id) => document.getElementById(id);

const formulario   = pegarEl("formMandala");
const elStatus     = pegarEl("status");
const elResultado  = pegarEl("output");
const inputCidade  = pegarEl("city");
const listaCidades = pegarEl("cityList");

let cidadeSelecionada = null;
let timerDebounce = null;

// ================= STATUS =================
function definirStatus(mensagem) {
  elStatus.textContent = mensagem || "";
}

// ================= AUTOCOMPLETE =================
function mostrarSugestoes(cidades) {
  if (!cidades || cidades.length === 0) {
    listaCidades.hidden = true;
    listaCidades.innerHTML = "";
    return;
  }

  listaCidades.hidden = false;
  listaCidades.innerHTML = cidades.map((cidade, idx) => `
    <button type="button" data-idx="${idx}">
      ${cidade.name} (${cidade.country}) — ${cidade.timezone}
    </button>
  `).join("");

  listaCidades.querySelectorAll("button").forEach((botao) => {
    botao.addEventListener("click", () => {
      cidadeSelecionada = cidades[Number(botao.dataset.idx)];

      inputCidade.value    = `${cidadeSelecionada.name} (${cidadeSelecionada.country})`;
      pegarEl("lat").value = cidadeSelecionada.lat;
      pegarEl("lng").value = cidadeSelecionada.lng;
      pegarEl("tz").value  = cidadeSelecionada.timezone;

      mostrarSugestoes([]);
      definirStatus("");
    });
  });
}

inputCidade.addEventListener("input", () => {
  cidadeSelecionada    = null;
  pegarEl("lat").value = "";
  pegarEl("lng").value = "";
  pegarEl("tz").value  = "";

  clearTimeout(timerDebounce);

  const termo = inputCidade.value.trim();
  if (termo.length < 2) { mostrarSugestoes([]); return; }

  timerDebounce = setTimeout(async () => {
    try {
      const resp  = await fetch(`${API_BASE}/api/api-geo?q=${encodeURIComponent(termo)}&limit=8`);
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.error || "Erro ao buscar cidades.");
      mostrarSugestoes(dados.results || []);
    } catch (erro) {
      mostrarSugestoes([]);
      definirStatus(erro.message);
    }
  }, 250);
});

// Fecha sugestões ao clicar fora
document.addEventListener("click", (e) => {
  if (!e.target.closest(".mandala-autocomplete")) mostrarSugestoes([]);
});

// ================= GERAR MANDALA =================
formulario.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!cidadeSelecionada) { definirStatus("Selecione uma cidade na lista."); return; }

  const valorData = pegarEl("date").value;
  const valorHora = pegarEl("time").value;
  if (!valorData || !valorHora) { definirStatus("Preencha data e hora."); return; }

  const [ano, mes, dia] = valorData.split("-").map(Number);
  const [hora, minuto]  = valorHora.split(":").map(Number);

  const payload = {
    name:   pegarEl("name").value.trim(),
    year:   ano,
    month:  mes,
    day:    dia,
    hour:   hora,
    minute: minuto,
    city:   cidadeSelecionada.name,
    lat:    cidadeSelecionada.lat,
    lng:    cidadeSelecionada.lng,
    tz_str: cidadeSelecionada.timezone,
    // valores fixos (removidos do formulário)
    house_system: "placidus",
    zodiac_type:  "tropical",
    theme_type:   "light",
    size: 900,
  };

  try {
    definirStatus("Gerando mandala...");
    elResultado.innerHTML = `<div style="color:#a9b6d3; font-size:14px;">🔄 Gerando visual...</div>`;

    const resp  = await fetch(`${API_BASE}/api/api-mandala`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await resp.json();
    console.log("Resposta da API:", dados);

    if (!resp.ok) throw new Error(dados?.error || "Falha ao gerar mandala.");

    const svg = dados.svg || dados.chart_svg || dados.output_svg || dados?.result?.svg || dados?.data?.svg;
    if (!svg) throw new Error("SVG não encontrado na resposta.");

    elResultado.innerHTML = `<div id="svgWrapper">${svg}</div>`;

    // Deixa o SVG responsivo
    const svgEl = elResultado.querySelector("svg");
    if (svgEl) {
      const w = svgEl.getAttribute("width");
      const h = svgEl.getAttribute("height");
      if (w && h && !svgEl.getAttribute("viewBox")) svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svgEl.removeAttribute("width");
      svgEl.removeAttribute("height");
      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svgEl.style.cssText = "width:100%; height:auto; display:block;";
    }

    definirStatus("Pronto ✅");
  } catch (erro) {
    definirStatus(erro.message);
  }
});