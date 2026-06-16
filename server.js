const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DADOS_PATH = path.join(__dirname, 'dados.json');
const USERS_PATH = path.join(__dirname, 'users.json');

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'vivero-eucalipto-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 días
}));

app.use(express.static(__dirname));

// ── Helpers de dados ────────────────────────────────────────────────────────
function lerDados() {
  if (!fs.existsSync(DADOS_PATH)) return [];
  return JSON.parse(fs.readFileSync(DADOS_PATH, 'utf8'));
}
function salvarDados(dados) {
  fs.writeFileSync(DADOS_PATH, JSON.stringify(dados, null, 2), 'utf8');
}

// ── Helpers de usuários ─────────────────────────────────────────────────────
function lerUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
}
function salvarUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// ── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ erro: 'Debe iniciar sesión para realizar esta acción.' });
}

// ── Rotas de autenticação ───────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Todos los campos son obligatorios.' });
    if (senha.length < 6)
      return res.status(400).json({ erro: 'La contraseña debe tener al menos 6 caracteres.' });
    const users = lerUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return res.status(400).json({ erro: 'Este email ya está registrado.' });
    const hash = await bcrypt.hash(senha, 10);
    const novo = { id: Date.now(), nome, email: email.toLowerCase(), senha: hash, createdAt: new Date().toISOString() };
    users.push(novo);
    salvarUsers(users);
    req.session.userId = novo.id;
    req.session.userName = novo.nome;
    res.json({ ok: true, nome: novo.nome });
  } catch (e) {
    res.status(500).json({ erro: 'Error al registrar.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ erro: 'Email y contraseña son obligatorios.' });
    const users = lerUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(401).json({ erro: 'Email o contraseña incorrectos.' });
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ erro: 'Email o contraseña incorrectos.' });
    req.session.userId = user.id;
    req.session.userName = user.nome;
    res.json({ ok: true, nome: user.nome });
  } catch (e) {
    res.status(500).json({ erro: 'Error al iniciar sesión.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ autenticado: true, nome: req.session.userName });
  } else {
    res.json({ autenticado: false });
  }
});

// ── Rotas da API (protegidas para escrita) ──────────────────────────────────
app.get('/api/doencas', (req, res) => {
  try { res.json(lerDados()); }
  catch (e) { res.status(500).json({ erro: 'Erro ao ler dados.' }); }
});

app.post('/api/doencas', requireAuth, (req, res) => {
  try {
    const dados = lerDados();
    const maxId = dados.reduce((m, d) => Math.max(m, d.id || 0), 0);
    const nova = { ...req.body, id: maxId + 1 };
    dados.push(nova);
    salvarDados(dados);
    res.status(201).json(nova);
  } catch (e) { res.status(500).json({ erro: 'Erro ao criar.' }); }
});

app.put('/api/doencas/:id', requireAuth, (req, res) => {
  try {
    const dados = lerDados();
    const id = parseInt(req.params.id);
    const idx = dados.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ erro: 'No encontrado.' });
    dados[idx] = { ...req.body, id };
    salvarDados(dados);
    res.json(dados[idx]);
  } catch (e) { res.status(500).json({ erro: 'Erro ao atualizar.' }); }
});

app.delete('/api/doencas/:id', requireAuth, (req, res) => {
  try {
    const dados = lerDados();
    const id = parseInt(req.params.id);
    const novos = dados.filter(d => d.id !== id);
    if (novos.length === dados.length) return res.status(404).json({ erro: 'No encontrado.' });
    salvarDados(novos);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro ao excluir.' }); }
});

// ── Páginas ─────────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'doencas_eucalipto_viveiro_chile.html'));
});

// ── Inicia servidor ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor iniciado — http://localhost:${PORT}\n`);
});
