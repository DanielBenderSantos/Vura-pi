// const token = localStorage.getItem("token");
// if (!token) {
//   window.location.href = "index.html";
// }

function toggleMenu() {
    const menu = document.getElementById("listaMenu");
    menu.classList.toggle("ativo");
}

function sair() {
 localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
}
