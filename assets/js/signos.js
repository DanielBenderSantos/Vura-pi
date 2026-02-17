// Variável global que irá armazenar todos os signos
// que vêm do backend (banco de dados).
let SIGNOS = [];

/*
  Função normalize(str)

  Objetivo:
  Padronizar texto para facilitar comparação na busca.

  O que ela faz:
  - Converte para minúsculo
  - Remove acentos (ex: Áries → aries)
  - Remove espaços extras

  Isso permite que o usuário digite:
  "aries", "ÁRIES", "ArIeS"
  e ainda assim funcione.
*/
function normalize(str) {
  return (str || "")
    .toLowerCase()                 // transforma em minúsculo
    .normalize("NFD")              // separa acento da letra
    .replace(/[\u0300-\u036f]/g, "") // remove os acentos
    .trim();                       // remove espaços extras
}

/*
  Função renderCards(lista)

  Objetivo:
  Receber uma lista de signos e renderizar (mostrar)
  os cards na tela dinamicamente.
*/
function renderCards(lista) {
  // Pega os elementos do HTML
  const grid = document.getElementById("gridSignos");
  const empty = document.getElementById("emptyState");

  // Limpa o conteúdo anterior
  grid.innerHTML = "";

  // Se a lista estiver vazia, mostra mensagem
  if (!lista.length) {
    empty.style.display = "block";
    return;
  }

  // Se houver resultados, esconde a mensagem
  empty.style.display = "none";

  // Para cada signo na lista
  lista.forEach((item) => {

    // Cria um novo elemento <article>
    const card = document.createElement("article");
    card.className = "card-signo";

    // Insere o HTML dentro do card
    card.innerHTML = `
      <div class="card-topo">
        <h2>${item.nome}</h2>
        <span class="badge">Personalidade</span>
      </div>
      <p>${item.personalidade}</p>
    `;

    // Adiciona o card dentro do grid
    grid.appendChild(card);
  });
}

/*
  Função filtrarSignos(termo)

  Objetivo:
  Filtrar os signos conforme o usuário digita
  no campo de pesquisa.
*/
function filtrarSignos(termo) {
  // Normaliza o texto digitado
  const t = normalize(termo);

  // Se estiver vazio, retorna todos os signos
  if (!t) return SIGNOS;

  // Retorna apenas os signos cujo nome
  // contenha o texto digitado
  return SIGNOS.filter((s) =>
    normalize(s.nome).includes(t)
  );
}

/*
  Função carregarSignos()

  Objetivo:
  Fazer requisição HTTP para o backend
  e buscar os signos do banco de dados.
*/
async function carregarSignos() {
  try {
    // Faz requisição GET para a API
    const response = await fetch("http://localhost:3000/signos");

    // Converte resposta para JSON
    const data = await response.json();

    // Armazena os dados na variável global
    SIGNOS = data;

    // Renderiza todos os signos na tela
    renderCards(SIGNOS);

  } catch (error) {
    console.error("Erro ao carregar signos:", error);
  }
}

/*
  Evento DOMContentLoaded

  Esse evento executa quando todo o HTML
  já foi carregado pelo navegador.
*/
document.addEventListener("DOMContentLoaded", () => {

  // Pega elementos do HTML
  const input = document.getElementById("searchInput");
  const btnLimpar = document.getElementById("btnLimpar");

  // Carrega os signos assim que a página abre
  carregarSignos();

  // Evento de digitação no campo de busca
  input.addEventListener("input", () => {
    renderCards(filtrarSignos(input.value));
  });

  // Botão limpar
  btnLimpar.addEventListener("click", () => {
    input.value = "";
    renderCards(SIGNOS);
    input.focus();
  });
});
