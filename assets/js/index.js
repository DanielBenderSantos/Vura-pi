const formulario = document.getElementById("formularioLogin");

formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const resp = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const dados = await resp.json();

    if (!resp.ok) {
      alert(dados.error || "Erro no login");
      return;
    }

    // salva token e usuário
    localStorage.setItem("token", dados.token);
    localStorage.setItem("usuario", JSON.stringify(dados.usuario));

    window.location.href = "home.html";
  } catch (e) {
    console.error(e);
    alert("Não foi possível conectar no servidor (backend).");
  }
});

function irParaCadastro() {
  window.location.href = "cadastro.html";
}
