const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DADOS_PATH = path.join(__dirname, 'dados.json');

// ── Middleware ──────────────────────────────────────────────────────────────
// Aumenta o limite para 50MB para suportar fotos em base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve os arquivos estáticos (HTML, CSS, JS) da mesma pasta
app.use(express.static(__dirname));

// ── Helpers de arquivo ──────────────────────────────────────────────────────
function lerDados() {
  if (!fs.existsSync(DADOS_PATH)) {
    console.error('Arquivo dados.json não encontrado. Crie-o ou execute o projeto pela primeira vez.');
    return [];
  }
  return JSON.parse(fs.readFileSync(DADOS_PATH, 'utf8'));
}

function salvarDados(dados) {
  fs.writeFileSync(DADOS_PATH, JSON.stringify(dados, null, 2), 'utf8');
}

// ── Rotas da API ────────────────────────────────────────────────────────────

// GET /api/doencas → retorna todas as doenças
app.get('/api/doencas', (req, res) => {
  try {
    res.json(lerDados());
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao ler dados.' });
  }
});

// POST /api/doencas → cria uma nova doença
app.post('/api/doencas', (req, res) => {
  try {
    const dados = lerDados();
    const maxId = dados.reduce((m, d) => Math.max(m, d.id || 0), 0);
    const nova = { ...req.body, id: maxId + 1 };
    dados.push(nova);
    salvarDados(dados);
    res.status(201).json(nova);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao criar doença.' });
  }
});

// PUT /api/doencas/:id → atualiza uma doença existente
app.put('/api/doencas/:id', (req, res) => {
  try {
    const dados = lerDados();
    const id = parseInt(req.params.id);
    const idx = dados.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ erro: 'Doença não encontrada.' });
    dados[idx] = { ...req.body, id };
    salvarDados(dados);
    res.json(dados[idx]);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao atualizar doença.' });
  }
});

// DELETE /api/doencas/:id → exclui uma doença
app.delete('/api/doencas/:id', (req, res) => {
  try {
    const dados = lerDados();
    const id = parseInt(req.params.id);
    const novosDados = dados.filter(d => d.id !== id);
    if (novosDados.length === dados.length) {
      return res.status(404).json({ erro: 'Doença não encontrada.' });
    }
    salvarDados(novosDados);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao excluir doença.' });
  }
});

// ── Rota raiz → serve o HTML principal ─────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'doencas_eucalipto_viveiro_chile.html'));
});

// ── Inicia o servidor ───────────────────────────────────────────────────────
// '0.0.0.0' faz o servidor escutar em todas as interfaces de rede,
// permitindo acesso de outros dispositivos na mesma rede Wi-Fi
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ Servidor iniciado com sucesso!');
  console.log('');
  console.log(`   Acesso local:      http://localhost:${PORT}`);
  console.log(`   Acesso na rede:    http://SEU_IP:${PORT}`);
  console.log('');
  console.log('   Para descobrir seu IP, abra outro terminal e execute:');
  console.log('   ipconfig');
  console.log('');
  console.log('   Pressione Ctrl+C para parar o servidor.');
  console.log('');
});
