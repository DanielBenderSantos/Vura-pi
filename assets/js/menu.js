function toggleMenu() {
    const menu = document.getElementById("listaMenu");
    menu.classList.toggle("ativo");
}

function navegar(lugar) {
    alert("Você saiu!");
    window.location.href = lugar + ".html";
}
