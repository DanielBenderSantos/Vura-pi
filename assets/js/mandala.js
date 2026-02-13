// mandala.js
// GitHub Pages (front) chamando Vercel (backend)

const API_BASE = "https://vura-pi.vercel.app";

const pegarEl = (id) => document.getElementById(id);

const formulario = pegarEl("formMandala");
const elStatus = pegarEl("status");
const elResultado = pegarEl("output");

const inputCidade = pegarEl("city");
const listaCidades = pegarEl("cityList");

let cidadeSelecionada = null;
let zoomAtual = 1;

// ================= STATUS =================

function definirStatus(mensagem) {
  elStatus.textContent = mensagem || "";
}

// ================= UTILS =================

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

// ================= AUTOCOMPLETE =================

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
      const resp = await fetch(`${API_BASE}/api/api-geo?q=${encodeURIComponent(termo)}&limit=8`);
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.error || "Erro ao buscar cidades.");

      mostrarSugestoes(dados.results || []);
    } catch (erro) {
      mostrarSugestoes([]);
      definirStatus(erro.message);
    }
  }, 250);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".mandala-autocomplete")) {
    mostrarSugestoes([]);
  }
});

// ================= GERAR MANDALA =================

formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  definirStatus("");

  if (!cidadeSelecionada) {
    definirStatus("Selecione uma cidade na lista.");
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
    size: 900
  };

  try {
    definirStatus("Gerando mandala...");

    elResultado.innerHTML = `
      <div style="color:#a9b6d3; font-size:14px;">
        🔄 Gerando visual...
      </div>
    `;

    const resp = await fetch(`${API_BASE}/api/api-mandala`, {
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

    if (!svg) throw new Error("SVG não encontrado na resposta.");

    elResultado.innerHTML = `
      <div id="svgWrapper" style="transition: transform .2s ease;">
        ${svg}
      </div>
      <div style="margin-top:16px; text-align:center;">
        <button id="btnDownload" style="
          padding:10px 16px;
          border-radius:12px;
          border:none;
          cursor:pointer;
          font-weight:600;
        ">
          📥 Baixar PNG
        </button>
      </div>
    `;

    const svgEl = elResultado.querySelector("svg");
    if (svgEl) {
      svgEl.removeAttribute("width");
      svgEl.removeAttribute("height");
      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svgEl.style.width = "100%";
      svgEl.style.height = "auto";
    }

    ativarZoom();
    ativarDownload();

    definirStatus("Pronto ✅");

  } catch (erro) {
    definirStatus(erro.message);
  }
});

// ================= ZOOM =================

function ativarZoom() {
  const wrapper = pegarEl("svgWrapper");
  if (!wrapper) return;

  zoomAtual = 1;

  wrapper.addEventListener("wheel", (e) => {
    e.preventDefault();

    zoomAtual += e.deltaY * -0.001;
    zoomAtual = Math.min(Math.max(1, zoomAtual), 3);

    wrapper.style.transform = `scale(${zoomAtual})`;
  });
}

// ================= DOWNLOAD PNG =================

function ativarDownload() {
  const btn = pegarEl("btnDownload");
  const svgEl = elResultado.querySelector("svg");
  if (!btn || !svgEl) return;

  btn.addEventListener("click", () => {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "mandala-astral.png";
      a.click();
    };

    img.src = url;
  });
}
