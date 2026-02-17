const formulario = document.getElementById("formularioCadastro");

formulario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    try {
        const resposta = await fetch("http://localhost:3000/cadastro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nome, email, senha })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.error);
            return;
        }

        alert("Cadastro realizado com sucesso!");
        window.location.href = "index.html";

    } catch (erro) {
        alert("Erro ao conectar com servidor");
        console.error(erro);
    }
});

function voltarLogin() {
    window.location.href = "index.html";
}
