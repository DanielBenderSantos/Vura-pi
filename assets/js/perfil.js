const API_BASE = "http://localhost:3000";

function getToken(){
  return localStorage.getItem("token");
}

function setStatus(tipo,msg){
  const badge=document.getElementById("statusBadge");
  const text=document.getElementById("statusMsg");

  badge.textContent=tipo==="ok"?"OK":tipo==="erro"?"Erro":"Info";
  text.textContent=msg||"";

  if(tipo==="ok"){
    badge.style.background="rgba(167,238,192,0.2)";
  }else if(tipo==="erro"){
    badge.style.background="rgba(255,94,120,0.2)";
  }else{
    badge.style.background="rgba(255,255,255,0.1)";
  }
}

async function carregarPerfil(){
  const token=getToken();

  if(!token){
    window.location.href="./index.html";
    return;
  }

  try{
    setStatus("info","Carregando...");

    const resp=await fetch(`${API_BASE}/me`,{
      headers:{ Authorization:`Bearer ${token}` }
    });

    const data=await resp.json();

    if(!resp.ok){
      setStatus("erro",data.error);
      return;
    }

    document.getElementById("nome").value=data.nome;
    document.getElementById("email").value=data.email;

    setStatus("ok","Perfil carregado com sucesso");

  }catch(err){
    setStatus("erro","Erro ao conectar no servidor");
  }
}

async function salvarPerfil(e){
  e.preventDefault();

  const token=getToken();

  const nome=document.getElementById("nome").value.trim();
  const email=document.getElementById("email").value.trim();
  const senhaAtual=document.getElementById("senhaAtual").value;
  const novaSenha=document.getElementById("novaSenha").value;
  const confirmar=document.getElementById("confirmarNovaSenha").value;

  if(!nome||!email){
    setStatus("erro","Nome e email obrigatórios");
    return;
  }

  if(novaSenha||senhaAtual||confirmar){
    if(!senhaAtual||!novaSenha||!confirmar){
      setStatus("erro","Preencha todos os campos de senha");
      return;
    }
    if(novaSenha!==confirmar){
      setStatus("erro","As senhas não conferem");
      return;
    }
  }

  try{
    setStatus("info","Salvando...");

    const resp=await fetch(`${API_BASE}/perfil`,{
      method:"PUT",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify({
        nome,
        email,
        senhaAtual,
        novaSenha
      })
    });

    const data=await resp.json();

    if(!resp.ok){
      setStatus("erro",data.error);
      return;
    }

    setStatus("ok",data.message);

  }catch(err){
    setStatus("erro","Erro ao salvar");
  }
}

document.addEventListener("DOMContentLoaded",()=>{

  carregarPerfil();

  document.getElementById("perfilForm")
    .addEventListener("submit",salvarPerfil);

  document.getElementById("btnCancelar")
    .addEventListener("click",carregarPerfil);

  // Toggle mostrar/ocultar senha
  document.querySelectorAll(".btn-eye").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.getAttribute("data-target");
      const input=document.getElementById(id);

      if(input.type==="password"){
        input.type="text";
        btn.textContent="🙈";
      }else{
        input.type="password";
        btn.textContent="👁";
      }
    });
  });

});
