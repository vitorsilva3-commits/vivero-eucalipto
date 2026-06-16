const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DADOS_PATH = path.join(__dirname, 'dados.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

function lerDados() {
  if (!fs.existsSync(DADOS_PATH)) return [];
  return JSON.parse(fs.readFileSync(DADOS_PATH, 'utf8'));
}
function salvarDados(dados) {
  fs.writeFileSync(DADOS_PATH, JSON.stringify(dados, null, 2), 'utf8');
}

// ── API ─────────────────────────────────────────────────────────────────────
app.get('/api/doencas', (req, res) => {
  try { res.json(lerDados()); }
  catch (e) { res.status(500).json({ erro: 'Erro ao ler dados.' }); }
});

app.post('/api/doencas', (req, res) => {
  try {
    const dados = lerDados();
    const maxId = dados.reduce((m, d) => Math.max(m, d.id || 0), 0);
    const nova = { ...req.body, id: maxId + 1 };
    dados.push(nova);
    salvarDados(dados);
    res.status(201).json(nova);
  } catch (e) { res.status(500).json({ erro: 'Erro ao criar.' }); }
});

app.put('/api/doencas/:id', (req, res) => {
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

app.delete('/api/doencas/:id', (req, res) => {
  try {
    const dados = lerDados();
    const id = parseInt(req.params.id);
    const novos = dados.filter(d => d.id !== id);
    if (novos.length === dados.length) return res.status(404).json({ erro: 'No encontrado.' });
    salvarDados(novos);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro ao excluir.' }); }
});

// ── Página principal ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'doencas_eucalipto_viveiro_chile.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor iniciado — http://localhost:${PORT}`);
});
