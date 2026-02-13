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

// controla resolução do PNG (2, 3, 4...)
let qualidadePNG = 3; // ✅ 3x fica bem nítido

// guarda o size usado na API (pra exportar com a mesma base)
let ultimoSize = 900;

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

function garantirXmlns(svgString) {
  // garante xmlns pro navegador rasterizar corretamente
  if (!/xmlns=/.test(svgString)) {
    return svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svgString;
}

function obterDimensoesDoSVG(svgEl) {
  // tenta pegar do viewBox
  const vb = svgEl.getAttribute("viewBox");
  if (vb) {
    const parts = vb.trim().split(/\s+|,/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { w: parts[2], h: parts[3] };
    }
  }
  // fallback: assume quadrado do size usado
  return { w: ultimoSize, h: ultimoSize };
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

  ultimoSize = 900;

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
    size: ultimoSize
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

    // UI com área do SVG + controles de zoom + download + qualidade
    elResultado.innerHTML = `
      <div class="mandala-svg-area">
        <div id="svgWrapper">${svg}</div>
      </div>

      <div class="mandala-controles">
        <button class="mandala-btn" id="zoomMenos" type="button">−</button>
        <div class="mandala-zoom-label" id="zoomLabel">100%</div>
        <button class="mandala-btn" id="zoomMais" type="button">+</button>
        <button class="mandala-btn" id="zoomReset" type="button">Reset</button>

        <span style="width:12px; display:inline-block;"></span>

        <button class="mandala-btn" id="btnDownload" type="button">📥 Baixar PNG (HD)</button>

        <select class="mandala-btn" id="qualidadeSelect" title="Qualidade do PNG" style="padding:10px 12px;">
          <option value="2">Qualidade 2x</option>
          <option value="3" selected>Qualidade 3x</option>
          <option value="4">Qualidade 4x</option>
        </select>
      </div>
    `;

    const svgEl = elResultado.querySelector("svg");
    if (svgEl) {
      const w = svgEl.getAttribute("width");
      const h = svgEl.getAttribute("height");

      if (w && h && !svgEl.getAttribute("viewBox")) {
        svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }

      svgEl.removeAttribute("width");
      svgEl.removeAttribute("height");

      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

      svgEl.style.width = "100%";
      svgEl.style.height = "auto";
      svgEl.style.display = "block";
    }

    ativarZoom();
    ativarDownload();

    definirStatus("Pronto ✅ (use o scroll do mouse ou botões + / −)");
  } catch (erro) {
    definirStatus(erro.message);
  }
});

// ================= ZOOM (FUNCIONA SEMPRE) =================
function atualizarLabelZoom() {
  const label = pegarEl("zoomLabel");
  if (!label) return;
  label.textContent = `${Math.round(zoomAtual * 100)}%`;
}

function aplicarZoom() {
  const wrapper = pegarEl("svgWrapper");
  if (!wrapper) return;

  wrapper.style.width = `${zoomAtual * 100}%`;
  wrapper.style.minWidth = "100%";
  atualizarLabelZoom();
}

function ativarZoom() {
  const wrapper = pegarEl("svgWrapper");
  if (!wrapper) return;

  zoomAtual = 1;
  aplicarZoom();

  const btnMais = pegarEl("zoomMais");
  const btnMenos = pegarEl("zoomMenos");
  const btnReset = pegarEl("zoomReset");

  if (btnMais) {
    btnMais.onclick = () => {
      zoomAtual = Math.min(3, zoomAtual + 0.15);
      aplicarZoom();
    };
  }

  if (btnMenos) {
    btnMenos.onclick = () => {
      zoomAtual = Math.max(1, zoomAtual - 0.15);
      aplicarZoom();
    };
  }

  if (btnReset) {
    btnReset.onclick = () => {
      zoomAtual = 1;
      aplicarZoom();
    };
  }

  // ✅ Wheel no container inteiro (#output), mais confiável
  const wheelHandler = (e) => {
    // se o usuário estiver só scrollando (sem intenção de zoom), você pode exigir CTRL:
    // if (!e.ctrlKey) return;

    e.preventDefault();

    zoomAtual += e.deltaY * -0.0012;
    zoomAtual = Math.min(Math.max(1, zoomAtual), 3);
    aplicarZoom();
  };

  // Remove handlers antigos (se regenerar várias vezes)
  elResultado.onwheel = null;
  elResultado.addEventListener("wheel", wheelHandler, { passive: false });
}

// ================= DOWNLOAD PNG (ALTA RESOLUÇÃO) =================
function ativarDownload() {
  const btn = pegarEl("btnDownload");
  const svgEl = elResultado.querySelector("svg");
  const qualidadeEl = pegarEl("qualidadeSelect");
  if (!btn || !svgEl) return;

  if (qualidadeEl) {
    qualidadeEl.onchange = () => {
      qualidadePNG = Number(qualidadeEl.value) || 3;
    };
  }

  btn.addEventListener("click", async () => {
    try {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgEl);
      svgString = garantirXmlns(svgString);

      const { w, h } = obterDimensoesDoSVG(svgEl);

      // Base export: usa w/h do SVG e multiplica pela qualidade
      const exportW = Math.round(w * qualidadePNG);
      const exportH = Math.round(h * qualidadePNG);

      const canvas = document.createElement("canvas");
      canvas.width = exportW;
      canvas.height = exportH;

      const ctx = canvas.getContext("2d");

      // Fundo branco (se quiser transparente, remova essas 2 linhas)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportW, exportH);

      const img = new Image();

      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        // desenha na resolução alta
        ctx.drawImage(img, 0, 0, exportW, exportH);
        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `mandala-astral-${exportW}x${exportH}.png`;
        a.click();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        definirStatus("Falha ao converter SVG para PNG (verifique se o SVG tem fontes/externos).");
      };

      img.src = url;
    } catch (e) {
      definirStatus(e?.message || "Erro ao gerar PNG.");
    }
  });
}
