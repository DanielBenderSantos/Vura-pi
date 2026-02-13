const formulario = document.getElementById("formularioCadastro");

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    alert("Cadastro realizado com sucesso!");
    window.location.href = "index.html";

});

function voltarLogin() {
    window.location.href = "index.html";
}