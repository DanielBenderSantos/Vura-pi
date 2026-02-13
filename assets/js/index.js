const formulario = document.getElementById("formularioLogin");

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    if(email === "" || senha === "") {
        alert("Preencha todos os campos!");
        return;
    }

    alert("Login realizado com sucesso!");
    // aqui você pode redirecionar se quiser
    // window.location.href = "home.html";
});

function irParaCadastro() {
    // redireciona para página de cadastro
    window.location.href = "cadastro.html";
}


function irParaHome() {
       const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    if (email.trim() === "" || senha.trim() === "") {
        alert("Preencha email e senha antes de continuar!");
        return; // impede de continuar
    }

    window.location.href = "home.html";
}