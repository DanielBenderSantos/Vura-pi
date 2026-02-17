/*
  ================================
  IMPORTAÇÃO DE BIBLIOTECAS
  ================================
*/
const jwt = require("jsonwebtoken");
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const JWT_SECRET = "coloque-um-segredo-grande-aqui";

/*
  ================================
  CONFIGURAÇÃO DO SERVIDOR
  ================================
*/
const app = express();

// ✅ CORS liberado (ok para faculdade/local).
// Se for hospedar (GitHub Pages), você pode restringir depois.
app.use(cors());

app.use(express.json());

/*
  ================================
  CONEXÃO COM BANCO DE DADOS
  ================================
*/
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "vura",
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar:", err);
  } else {
    console.log("Conectado ao MySQL");
  }
});

/*
  ================================
  MIDDLEWARE DE VERIFICAÇÃO DE TOKEN
  ================================
  - Protege rotas que exigem usuário logado.
  - Lê Authorization: Bearer <token>
  - Valida assinatura do JWT e coloca dados em req.user
*/
function verifyToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const [tipo, token] = auth.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { usuario_id, email, nome }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/*
  ================================
  ROTAS PÚBLICAS: CADASTRO E LOGIN
  ================================
*/
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Campos obrigatórios" });
  }

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
      [nome, email, senhaCriptografada],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "Email já cadastrado" });
          }
          return res.status(500).json({ error: "Erro no servidor" });
        }

        res.status(201).json({ message: "Usuário cadastrado com sucesso" });
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Erro ao criptografar senha" });
  }
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  db.query(
    "SELECT id AS usuario_id, nome, email, senha FROM usuarios WHERE email = ? LIMIT 1",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ error: "Erro no servidor" });

      if (results.length === 0) {
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }

      const usuario = results[0];

      const senhaOk = await bcrypt.compare(senha, usuario.senha);
      if (!senhaOk) {
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }

      const token = jwt.sign(
        { usuario_id: usuario.usuario_id, email: usuario.email, nome: usuario.nome },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: "Login OK",
        token,
        usuario: {
          usuario_id: usuario.usuario_id,
          nome: usuario.nome,
          email: usuario.email,
        },
      });
    }
  );
});

/*
  ================================
  ROTAS PÚBLICAS: SIGNOS
  ================================
*/
app.get("/signos", (req, res) => {
  const sql = "SELECT nome, personalidade FROM signos ORDER BY nome ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar signos:", err);
      return res.status(500).json({ error: "Erro no banco de dados" });
    }
    res.json(results);
  });
});

app.get("/signos/:nome", (req, res) => {
  const { nome } = req.params;

  const sql = "SELECT nome, personalidade FROM signos WHERE nome = ?";

  db.query(sql, [nome], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no banco" });
    if (results.length === 0) return res.status(404).json({ error: "Signo não encontrado" });

    res.json(results[0]);
  });
});

/*
  ================================
  ROTAS PROTEGIDAS: PERFIL
  ================================
*/
app.get("/me", verifyToken, (req, res) => {
  const usuario_id = req.user.usuario_id;

  db.query(
    "SELECT id AS usuario_id, nome, email FROM usuarios WHERE id = ? LIMIT 1",
    [usuario_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Erro no servidor" });
      if (results.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });

      res.json(results[0]);
    }
  );
});

app.put("/perfil", verifyToken, async (req, res) => {
  const usuario_id = req.user.usuario_id;
  const { nome, email, senhaAtual, novaSenha } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: "Nome e email são obrigatórios" });
  }

  // ✅ valida caso venha “meio preenchido”
  const querTrocarSenha = Boolean(senhaAtual || novaSenha);
  if (querTrocarSenha && (!senhaAtual || !novaSenha)) {
    return res
      .status(400)
      .json({ error: "Para trocar senha, envie senhaAtual e novaSenha." });
  }

  try {
    if (querTrocarSenha) {
      const [rows] = await db
        .promise()
        .query("SELECT senha FROM usuarios WHERE id = ? LIMIT 1", [usuario_id]);

      if (!rows.length) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const senhaOk = await bcrypt.compare(senhaAtual, rows[0].senha);
      if (!senhaOk) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      await db
        .promise()
        .query("UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?", [
          nome,
          email,
          senhaCriptografada,
          usuario_id,
        ]);

      return res.json({ message: "Perfil e senha atualizados com sucesso" });
    }

    await db
      .promise()
      .query("UPDATE usuarios SET nome = ?, email = ? WHERE id = ?", [nome, email, usuario_id]);

    return res.json({ message: "Perfil atualizado com sucesso" });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email já está em uso" });
    }

    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/*
  ================================
  INICIALIZAÇÃO DO SERVIDOR
  ================================
*/
app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
