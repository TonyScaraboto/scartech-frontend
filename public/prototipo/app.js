/* =============================================
   SCARTECH — APP.JS
   Lógica de navegação, dados e interações
   ============================================= */

// ==================== STATE ====================
let ordens   = JSON.parse(localStorage.getItem('scartech_ordens') || '[]');
let produtos = JSON.parse(localStorage.getItem('scartech_produtos') || '[]');
let vendas   = JSON.parse(localStorage.getItem('scartech_vendas') || '[]');
let chartsInit = {};
let produtoEmEdicao = null;
let ordemEmEdicao = null;
let fotoAparelhoDataUrl = null;
const signaturePads = {};
let ordensDetalhesCache = JSON.parse(localStorage.getItem('scartech_ordens_detalhes') || '{}');
let ordemDetalhesAtual = null;

function saveData() {
  localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
  localStorage.setItem('scartech_produtos', JSON.stringify(produtos));
  localStorage.setItem('scartech_vendas', JSON.stringify(vendas));
}

function saveOrdensDetalhesCache() {
  localStorage.setItem('scartech_ordens_detalhes', JSON.stringify(ordensDetalhesCache));
}

function getOrderCacheKey(order) {
  if (!order) return '';
  if (order.id !== undefined && order.id !== null) return `id:${order.id}`;
  if (order.numOS) return `os:${order.numOS}`;
  return '';
}

function setDetalhesCache(order, detalhes) {
  const key = getOrderCacheKey(order);
  if (!key) return;
  ordensDetalhesCache[key] = detalhes;
  saveOrdensDetalhesCache();
}

function getDetalhesFromCache(order) {
  const key = getOrderCacheKey(order);
  if (!key) return null;
  return ordensDetalhesCache[key] || null;
}

async function initPage() {
  const currentPath = window.location.pathname;
  const isFaturamento = currentPath.includes('faturamento') || document.getElementById('page-faturamento');
  const isOrdens = currentPath.includes('ordens') || document.getElementById('page-ordens');
  const isProdutos = currentPath.includes('produtos') || document.getElementById('page-produtos');
  const isVendas = currentPath.includes('vendas') || document.getElementById('page-vendas');
  const isFornecedores = currentPath.includes('fornecedores') || document.getElementById('page-fornecedores');
  const isDashboard = currentPath.includes('dashboard') || document.getElementById('page-dashboard');

  
  if (isDashboard) {
    await carregarProdutos();
    await carregarVendas();
    await carregarOrdens();
  }
  if (isProdutos) await carregarProdutos();
  if (isVendas) {
    await carregarProdutos();
    await carregarVendas();
  }
  if (isOrdens) await carregarOrdens();
  if (isFaturamento) {
    await carregarVendas();
    await carregarOrdens();
    renderChartsIfNeeded();
  }
}

// ==================== SIDEBAR ====================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainWrapper');
  if (window.innerWidth <= 700) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  }
}

// ==================== THEME ====================
function syncThemeState(theme) {
  const root = document.documentElement;
  const normalized = theme === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', normalized);
  // Backward compatibility: some scripts/styles still depend on body.dark.
  document.body.classList.toggle('dark', normalized === 'dark');
  localStorage.setItem('scartech_theme', normalized);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.innerHTML = normalized === 'dark' ? '&#9728;' : '&#9790;';
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  syncThemeState(currentTheme === 'dark' ? 'light' : 'dark');
  // Re-render charts se estiver na página de faturamento
  chartsInit = {};
  const pageFat = document.getElementById('page-faturamento');
  if (pageFat && !pageFat.classList.contains('hidden')) {
    renderChartsIfNeeded();
  }
}

function applyStoredTheme() {
  const saved = localStorage.getItem('scartech_theme');
  syncThemeState(saved === 'dark' ? 'dark' : 'light');
}

// ==================== NAVIGATE (multi-page) ====================
function navigate(page) {
  const urls = {
    dashboard: 'dashboard.html',
    faturamento: 'faturamento.html',
    ordens: 'ordens.html',
    produtos: 'produtos.html',
    fornecedores: 'fornecedores.html',
    vendas: 'vendas.html',
  };
  if (urls[page]) window.location.href = urls[page];
}

// ==================== TABS ====================
function switchTab(tabId, btn) {
  // Esconde todas as tabs
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  // Mostra a tab selecionada
  document.getElementById(tabId).classList.remove('hidden');
  btn.classList.add('active');

  // Se for relatórios, renderiza os charts
  if (tabId === 'tab-rel') {
    setTimeout(() => {
      renderRelatorioCharts();
    }, 50);
  }
}

// ==================== MODAL ====================
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function abrirNovaOrdem() {
  if (!hasOrdemFormV2()) {
    window.location.href = 'ordens.html';
    return;
  }
  ordemEmEdicao = null;
  limparFormOrdem();
  openModal('modal-nova-ordem');
}

// Fecha modal ao clicar no overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.add('hidden');
    }
  });
});

// ==================== TOAST ====================
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== SUPABASE (UTIL) ====================
function hasSupabaseClient() {
  return window.supabase && typeof window.supabase.from === 'function';
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('pt-BR');
}

async function carregarProdutos() {
  if (!hasSupabaseClient()) {
    popularProdutosVenda();
    renderProdutos();
    atualizarCardsResumo();
    return;
  }

  const { data, error } = await window.supabase
    .from('produtos')
    .select('id, nome, categoria, estoque, preco, custo_compra')
    .order('id', { ascending: true });

  if (error) {
    showToast('Erro ao carregar produtos. Verifique o Supabase.', 'error');
    return;
  }

  produtos = (data || []).map(p => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    estoque: p.estoque ?? 0,
    preco: Number(p.preco ?? 0),
    custo: Number(p.custo_compra ?? 0),
  }));
  popularProdutosVenda();
  renderProdutos();
  atualizarCardsResumo();
}

async function carregarOrdens() {
  if (!hasSupabaseClient()) {
    renderOrdens();
    return;
  }

  const { data: authData } = await window.supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { data, error } = await window.supabase
    .from('ordens_servico')
    .select('id, cliente, equipamento, status, valor, descricao, data, created_at')
    .eq('user_id', userId)
    .order('id', { ascending: true });

  if (error) {
    showToast('Erro ao carregar ordens. Verifique o Supabase.', 'error');
    return;
  }

  ordens = (data || []).map(o => ({
    id: o.id,
    numOS: String(o.id).slice(-8),
    cliente: o.cliente,
    equipamento: o.equipamento,
    status: o.status,
    valor: Number(o.valor ?? 0),
    descricao: o.descricao || '',
    data: formatDateBR(o.data || o.created_at),
  }));
  renderOrdens();
  atualizarCardsResumo();
}

async function carregarVendas() {
  if (!hasSupabaseClient()) {
    renderVendas();
    return;
  }

  const { data: authData } = await window.supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { data, error } = await window.supabase
    .from('vendas')
    .select('id, cliente, produto, produto_id, qtd, valor, lucro, data, created_at')
    .eq('user_id', userId)
    .order('id', { ascending: true });

  if (error) {
    showToast('Erro ao carregar vendas. Verifique o Supabase.', 'error');
    return;
  }

  vendas = (data || []).map(v => ({
    id: v.id,
    cliente: v.cliente,
    produto: v.produto,
    produto_id: v.produto_id,
    qtd: v.qtd ?? 1,
    valor: Number(v.valor ?? 0),
    lucro: Number(v.lucro ?? 0),
    data: formatDateBR(v.data || v.created_at),
    dataIso: v.data || v.created_at,
    timestamp: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
  }));
  renderVendas();
  atualizarCardsResumo();
}
// ==================== ORDENS DE SERVICO ====================
function getById(id) {
  return document.getElementById(id);
}

function setInputValue(id, value) {
  const el = getById(id);
  if (el) el.value = value ?? '';
}

function hasOrdemFormV2() {
  return !!(
    getById('nomeAssistencia') &&
    getById('nomeCliente') &&
    getById('documentoCliente') &&
    getById('telefoneCliente') &&
    getById('modeloAparelho') &&
    getById('defeitoApresentado') &&
    getById('termoGarantia') &&
    getById('valorConserto')
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeOrderNumber(order) {
  if (order?.numOS) return String(order.numOS);
  if (order?.id) return String(order.id).slice(-8);
  return String(Date.now()).slice(-8);
}

function formatCurrencyBRL(value) {
  const num = Number(value || 0);
  return num.toFixed(2).replace('.', ',');
}

function showPdfResult(message, type) {
  const result = getById('ordemPdfResult');
  if (!result) return;
  result.className = `pdf-result show ${type}`;
  result.textContent = message;
}

function collectOrdemFormData() {
  return {
    nomeAssistencia: getById('nomeAssistencia')?.value.trim() || '',
    nomeCliente: getById('nomeCliente')?.value.trim() || '',
    documentoCliente: getById('documentoCliente')?.value.trim() || '',
    telefoneCliente: getById('telefoneCliente')?.value.trim() || '',
    modeloAparelho: getById('modeloAparelho')?.value.trim() || '',
    defeitoApresentado: getById('defeitoApresentado')?.value.trim() || '',
    termoGarantia: getById('termoGarantia')?.value.trim() || '',
    valorConserto: Number(getById('valorConserto')?.value || 0),
    previsaoEntrega: getById('previsaoEntrega')?.value || '',
    status: getById('ordemStatus')?.value || 'Aberta',
  };
}

function collectMediaData() {
  return {
    fotoAparelho: fotoAparelhoDataUrl || '',
    assinaturaTecnico: signaturePads.signatureTecnico && !signaturePads.signatureTecnico.isEmpty()
      ? signaturePads.signatureTecnico.toDataURL()
      : '',
    assinaturaCliente: signaturePads.signatureCliente && !signaturePads.signatureCliente.isEmpty()
      ? signaturePads.signatureCliente.toDataURL()
      : '',
  };
}

function validateOrdemData(data) {
  if (!data.nomeAssistencia || !data.nomeCliente || !data.documentoCliente || !data.telefoneCliente || !data.modeloAparelho || !data.defeitoApresentado || !data.termoGarantia) {
    showToast('Preencha todos os campos obrigatórios da O.S.', 'error');
    return false;
  }
  if (Number.isNaN(data.valorConserto) || data.valorConserto <= 0) {
    showToast('Informe um valor de conserto válido.', 'error');
    return false;
  }
  return true;
}

function initPhotoUploadArea() {
  const area = getById('photoUploadArea');
  const input = getById('fotoAparelho');
  const preview = getById('photoPreview');
  const placeholder = getById('uploadPlaceholder');
  if (!area || !input || !preview || !placeholder) return;
  if (area.dataset.photoInit === '1') return;
  area.dataset.photoInit = '1';

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      fotoAparelhoDataUrl = e.target?.result || null;
      if (!fotoAparelhoDataUrl) return;
      preview.src = fotoAparelhoDataUrl;
      preview.classList.add('visible');
      placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  };

  area.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') input.click();
  });
  area.addEventListener('dragover', (e) => e.preventDefault());
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    processFile(e.dataTransfer?.files?.[0]);
  });
  input.addEventListener('change', (e) => processFile(e.target.files?.[0]));
}

function initSignaturePad(canvasId) {
  const canvas = getById(canvasId);
  if (!canvas || signaturePads[canvasId]) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const setSizeAndReset = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(300, Math.floor(rect.width || 300));
    canvas.height = Math.max(130, Math.floor(rect.height || 130));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    signaturePads[canvasId].hasInk = false;
  };

  signaturePads[canvasId] = {
    canvas,
    ctx,
    hasInk: false,
    clear() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.hasInk = false;
    },
    isEmpty() {
      return !this.hasInk;
    },
    toDataURL() {
      return canvas.toDataURL('image/png');
    },
  };

  setSizeAndReset();
  window.addEventListener('resize', setSizeAndReset);

  let drawing = false;
  const getPos = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches && event.touches.length ? event.touches[0] : event;
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  };

  const start = (event) => {
    event.preventDefault();
    drawing = true;
    const p = getPos(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    signaturePads[canvasId].hasInk = true;
  };
  const move = (event) => {
    if (!drawing) return;
    event.preventDefault();
    const p = getPos(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const stop = (event) => {
    if (event) event.preventDefault();
    drawing = false;
  };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', stop);
  canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', stop, { passive: false });
}

window.limparAssinatura = function limparAssinatura(tipo) {
  const pad = signaturePads[`signature${tipo}`];
  if (pad) pad.clear();
};

window.removerFotoAparelho = function removerFotoAparelho() {
  fotoAparelhoDataUrl = null;
  const preview = getById('photoPreview');
  const placeholder = getById('uploadPlaceholder');
  const input = getById('fotoAparelho');
  if (preview) {
    preview.src = '';
    preview.classList.remove('visible');
  }
  if (placeholder) placeholder.style.display = 'block';
  if (input) input.value = '';
};

function applyPhotoToForm(dataUrl) {
  if (!dataUrl) {
    window.removerFotoAparelho();
    return;
  }
  fotoAparelhoDataUrl = dataUrl;
  const preview = getById('photoPreview');
  const placeholder = getById('uploadPlaceholder');
  if (preview) {
    preview.src = dataUrl;
    preview.classList.add('visible');
  }
  if (placeholder) placeholder.style.display = 'none';
}

function applySignatureToPad(padName, dataUrl) {
  const pad = signaturePads[padName];
  if (!pad) return;
  pad.clear();
  if (!dataUrl) return;
  const image = new Image();
  image.onload = () => {
    pad.ctx.drawImage(image, 0, 0, pad.canvas.width, pad.canvas.height);
    pad.hasInk = true;
  };
  image.src = dataUrl;
}

function initOrdemFormEnhancements() {
  if (!getById('modal-nova-ordem')) return;
  if (!hasOrdemFormV2()) return;
  initPhotoUploadArea();
  initSignaturePad('signatureTecnico');
  initSignaturePad('signatureCliente');
  const assistInput = getById('nomeAssistencia');
  if (assistInput && !assistInput.value.trim()) {
    const saved = localStorage.getItem('scartech_assistencia_nome');
    assistInput.value = saved && saved.trim() ? saved : 'ScarTech Solutions';
  }
}

function gerarPdfOrdem(data, orderNumber) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showPdfResult('Erro: biblioteca de PDF não carregou.', 'error');
    return false;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const numOS = orderNumber || String(Date.now()).slice(-8);
  const dataAtual = new Date().toLocaleString('pt-BR');
  let y = 18;

  doc.setFontSize(20);
  doc.setTextColor(0, 155, 165);
  doc.text('ORDEM DE SERVIÇO', 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(`${data.nomeAssistencia} - Assistência Técnica`, 105, y, { align: 'center' });
  y += 10;
  doc.setDrawColor(0, 155, 165);
  doc.line(15, y, 195, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Data: ${dataAtual}`, 15, y);
  doc.text(`OS N: ${numOS}`, 195, y, { align: 'right' });
  y += 10;

  const writeField = (label, value) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, 20, y);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(String(value || '-'), 130);
    doc.text(lines, 58, y);
    y += Math.max(7, lines.length * 5 + 2);
  };

  writeField('Cliente', data.nomeCliente);
  writeField('Documento', data.documentoCliente);
  writeField('Telefone', data.telefoneCliente);
  writeField('Aparelho', data.modeloAparelho);
  writeField('Defeito', data.defeitoApresentado);
  writeField('Valor', `R$ ${formatCurrencyBRL(data.valorConserto)}`);
  writeField('Status', data.status);
  if (data.previsaoEntrega) writeField('Previsão', new Date(`${data.previsaoEntrega}T00:00:00`).toLocaleDateString('pt-BR'));

  const fotoParaPdf = data.fotoAparelho || fotoAparelhoDataUrl || '';
  if (fotoParaPdf) {
    if (y > 205) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(undefined, 'bold');
    doc.text('Foto do aparelho:', 20, y);
    y += 4;
    try {
      doc.addImage(fotoParaPdf, 'JPEG', 20, y, 85, 58);
      y += 64;
    } catch (_err) {
      y += 8;
    }
  }

  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  doc.setFont(undefined, 'bold');
  doc.text('Termo de garantia:', 20, y);
  y += 6;
  doc.setFont(undefined, 'normal');
  const termo = doc.splitTextToSize(data.termoGarantia, 170);
  doc.text(termo, 20, y);
  y += termo.length * 5 + 10;

  const assinaturaTecData = data.assinaturaTecnico || '';
  const assinaturaCliData = data.assinaturaCliente || '';
  const padTec = signaturePads.signatureTecnico;
  const padCli = signaturePads.signatureCliente;
  if (y > 235) {
    doc.addPage();
    y = 20;
  }
  doc.setFont(undefined, 'bold');
  doc.text('Assinaturas:', 20, y);
  y += 5;
  if (assinaturaTecData) {
    try { doc.addImage(assinaturaTecData, 'PNG', 20, y, 70, 32); } catch (_err) {}
  } else if (padTec && !padTec.isEmpty()) {
    try { doc.addImage(padTec.toDataURL(), 'PNG', 20, y, 70, 32); } catch (_err) {}
  }
  if (assinaturaCliData) {
    try { doc.addImage(assinaturaCliData, 'PNG', 120, y, 70, 32); } catch (_err) {}
  } else if (padCli && !padCli.isEmpty()) {
    try { doc.addImage(padCli.toDataURL(), 'PNG', 120, y, 70, 32); } catch (_err) {}
  }
  y += 36;
  doc.line(20, y, 90, y);
  doc.line(120, y, 190, y);
  doc.setFontSize(9);
  doc.text('Assinatura do Técnico', 55, y + 4, { align: 'center' });
  doc.text('Assinatura do Cliente', 155, y + 4, { align: 'center' });

  doc.save(`OS_${numOS}.pdf`);
  return true;
}

async function salvarOrdem() {
  if (window.isSavingOrdem) return;
  window.isSavingOrdem = true;

  try {
    if (!hasOrdemFormV2()) {
      window.location.href = 'ordens.html';
      return;
    }
    const data = collectOrdemFormData();
    if (!validateOrdemData(data)) return;
    const mediaData = collectMediaData();
    const detalhesCompletos = { ...data, ...mediaData };
    const cliente = data.nomeCliente;
    const equipamento = data.modeloAparelho;
    const status = data.status;
    const valor = Number(data.valorConserto || 0);
    const descricao = data.defeitoApresentado;
    const existingOrder = ordemEmEdicao ? ordens.find((o) => o.id === ordemEmEdicao) : null;
    const numOS = normalizeOrderNumber(existingOrder);
    localStorage.setItem('scartech_assistencia_nome', data.nomeAssistencia);

    if (hasSupabaseClient()) {
      const { data: authData, error: authErr } = await window.supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (authErr || !userId) {
        showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
      }

      const payload = {
        user_id: userId,
        cliente,
        equipamento,
        status,
        valor,
        descricao,
        data: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      };

      if (ordemEmEdicao) {
        const { error } = await window.supabase
          .from('ordens_servico')
          .update(payload)
          .eq('id', ordemEmEdicao);
        if (error) {
          showToast('Erro ao atualizar ordem.', 'error');
          return;
        }
        showToast('Ordem atualizada com sucesso!', 'success');
        setDetalhesCache({ id: ordemEmEdicao, numOS }, detalhesCompletos);
      } else {
        const { data: inserted, error } = await window.supabase
          .from('ordens_servico')
          .insert(payload)
          .select('id')
          .single();
        if (error) {
          showToast('Erro ao cadastrar ordem.', 'error');
          return;
        }
        showToast('Ordem de serviço criada com sucesso!', 'success');
        setDetalhesCache({ id: inserted?.id, numOS }, detalhesCompletos);
      }

      if (gerarPdfOrdem(data, numOS)) {
        showPdfResult('PDF gerado com sucesso e download iniciado.', 'success');
      }
      ordemEmEdicao = null;
      closeModal('modal-nova-ordem');
      limparFormOrdem();
      await carregarOrdens();
      return;
    }

    if (ordemEmEdicao) {
      const idx = ordens.findIndex((o) => o.id === ordemEmEdicao);
      if (idx >= 0) {
        const updatedOrder = {
          ...ordens[idx],
          cliente,
          equipamento,
          status,
          valor,
          descricao,
          numOS,
          detalhesOS: detalhesCompletos,
        };
        ordens[idx] = updatedOrder;
        setDetalhesCache(updatedOrder, detalhesCompletos);
      }
      ordemEmEdicao = null;
      saveData();
      renderOrdens();
      if (gerarPdfOrdem(data, numOS)) {
        showPdfResult('PDF gerado com sucesso e download iniciado.', 'success');
      }
      closeModal('modal-nova-ordem');
      limparFormOrdem();
      showToast('Ordem atualizada com sucesso!', 'success');
      return;
    }

    const ordem = {
      id: Date.now(),
      numero: ordens.length + 1,
      numOS,
      cliente,
      equipamento,
      status,
      valor,
      descricao,
      detalhesOS: detalhesCompletos,
      data: new Date().toLocaleDateString('pt-BR'),
    };

    ordens.push(ordem);
    setDetalhesCache(ordem, detalhesCompletos);
    saveData();
    renderOrdens();
    if (gerarPdfOrdem(data, numOS)) {
      showPdfResult('PDF gerado com sucesso e download iniciado.', 'success');
    }
    closeModal('modal-nova-ordem');
    limparFormOrdem();
    showToast('Ordem de serviço criada com sucesso!', 'success');

  } finally {
    window.isSavingOrdem = false;
  }
}

function limparFormOrdem() {
  const ids = [
    'nomeCliente',
    'documentoCliente',
    'telefoneCliente',
    'modeloAparelho',
    'defeitoApresentado',
    'valorConserto',
    'previsaoEntrega',
  ];
  ids.forEach((id) => setInputValue(id, ''));
  const termo = getById('termoGarantia');
  if (termo) {
    termo.value = 'Garantia de 90 dias para o serviço realizado, conforme legislação vigente. A garantia não cobre danos causados por mau uso, quedas, contato com líquidos ou tentativa de reparo por terceiros.';
  }
  const status = getById('ordemStatus');
  if (status) status.value = 'Aberta';
  window.removerFotoAparelho();
  window.limparAssinatura('Tecnico');
  window.limparAssinatura('Cliente');
  const pdfResult = getById('ordemPdfResult');
  if (pdfResult) {
    pdfResult.className = 'pdf-result';
    pdfResult.textContent = '';
  }
}

function renderOrdens(lista = null) {
  const tbody = document.getElementById('tbodyOrdens');
  if (!tbody) return;
  const dados = lista || ordens;

  if (dados.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>Nenhuma ordem de serviço cadastrada</p>
            <button class="btn-primary btn-sm" onclick="abrirNovaOrdem()">Criar primeira ordem</button>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = dados.map((o, idx) => `
    <tr>
      <td><strong>#${o.numOS ?? o.numero ?? (idx + 1)}</strong></td>
      <td>${o.cliente}</td>
      <td>${o.equipamento}</td>
      <td><span class="badge ${badgeClass(o.status)}">${o.status}</span></td>
      <td>${o.data}</td>
      <td>
        <button class="action-btn" onclick="verDetalhesOrdem(${o.id})">Detalhes</button>
        <button class="action-btn" onclick="editarOrdem(${o.id})">Editar</button>
        <button class="action-btn danger" onclick="excluirOrdem(${o.id})">Excluir</button>
      </td>
    </tr>`).join('');
}

function badgeClass(status) {
  const map = {
    'Aberta':       'badge-aberta',
    'Em andamento': 'badge-andamento',
    'Concluída':    'badge-concluida',
    'Cancelada':    'badge-cancelada',
  };
  return map[status] || 'badge-aberta';
}

function excluirOrdem(id) {
  if (!confirm('Deseja excluir esta ordem?')) return;
  if (hasSupabaseClient()) {
    window.supabase
      .from('ordens_servico')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          showToast('Erro ao excluir ordem.', 'error');
          return;
        }
        carregarOrdens();
        showToast('Ordem excluída.', 'error');
      });
    return;
  }
  ordens = ordens.filter(o => o.id !== id);
  saveData();
  renderOrdens();
  showToast('Ordem excluída.', 'error');
}

function editarOrdem(id) {
  const o = ordens.find(x => x.id === id);
  if (!o) return;
  const detalhes = o.detalhesOS || getDetalhesFromCache(o) || {};
  const savedAssist = localStorage.getItem('scartech_assistencia_nome') || 'ScarTech Solutions';
  setInputValue('nomeAssistencia', detalhes.nomeAssistencia || savedAssist);
  setInputValue('nomeCliente', detalhes.nomeCliente || o.cliente || '');
  setInputValue('documentoCliente', detalhes.documentoCliente || '');
  setInputValue('telefoneCliente', detalhes.telefoneCliente || '');
  setInputValue('modeloAparelho', detalhes.modeloAparelho || o.equipamento || '');
  setInputValue('defeitoApresentado', detalhes.defeitoApresentado || o.descricao || '');
  setInputValue('valorConserto', detalhes.valorConserto || o.valor || '');
  setInputValue('previsaoEntrega', detalhes.previsaoEntrega || '');
  setInputValue('termoGarantia', detalhes.termoGarantia || 'Garantia de 90 dias para o serviço realizado, conforme legislação vigente. A garantia não cobre danos causados por mau uso, quedas, contato com líquidos ou tentativa de reparo por terceiros.');
  setInputValue('ordemStatus', o.status || 'Aberta');
  applyPhotoToForm(detalhes.fotoAparelho || '');
  applySignatureToPad('signatureTecnico', detalhes.assinaturaTecnico || '');
  applySignatureToPad('signatureCliente', detalhes.assinaturaCliente || '');
  ordemEmEdicao = id;
  openModal('modal-nova-ordem');
}

function buildDetalhesBlock(label, value, full = false) {
  return `
    <div class="ordem-detalhes-item ${full ? 'ordem-detalhes-full' : ''}">
      <span class="ordem-detalhes-label">${escapeHtml(label)}</span>
      <span class="ordem-detalhes-value">${escapeHtml(value || '-')}</span>
    </div>`;
}

function verDetalhesOrdem(id) {
  const ordem = ordens.find((item) => item.id === id);
  if (!ordem) return;
  const detalhes = ordem.detalhesOS || getDetalhesFromCache(ordem) || {};
  ordemDetalhesAtual = {
    id: ordem.id,
    numOS: ordem.numOS || ordem.numero || '',
    cliente: ordem.cliente || '',
    equipamento: ordem.equipamento || '',
    valor: ordem.valor || 0,
    descricao: ordem.descricao || '',
    status: ordem.status || 'Aberta',
    detalhes,
  };
  const content = getById('ordemDetalhesContent');
  if (!content) return;

  const fotoHtml = detalhes.fotoAparelho
    ? `<div class="ordem-detalhes-item ordem-detalhes-full">
         <span class="ordem-detalhes-label">Foto do aparelho</span>
         <img class="ordem-detalhes-photo" src="${escapeHtml(detalhes.fotoAparelho)}" alt="Foto do aparelho" />
       </div>`
    : '';

  const assinaturasHtml = (detalhes.assinaturaTecnico || detalhes.assinaturaCliente)
    ? `<div class="ordem-detalhes-item ordem-detalhes-full">
         <span class="ordem-detalhes-label">Assinaturas</span>
         <div class="ordem-signatures-view">
           <div class="ordem-signature-box">
             <span class="ordem-detalhes-label">Técnico</span>
             ${detalhes.assinaturaTecnico ? `<img src="${escapeHtml(detalhes.assinaturaTecnico)}" alt="Assinatura do técnico" />` : '<span class="ordem-detalhes-value">Não informada</span>'}
           </div>
           <div class="ordem-signature-box">
             <span class="ordem-detalhes-label">Cliente</span>
             ${detalhes.assinaturaCliente ? `<img src="${escapeHtml(detalhes.assinaturaCliente)}" alt="Assinatura do cliente" />` : '<span class="ordem-detalhes-value">Não informada</span>'}
           </div>
         </div>
       </div>`
    : '';

  content.innerHTML = `
    <div class="ordem-detalhes-grid">
      ${buildDetalhesBlock('Número da O.S.', ordem.numOS || ordem.numero || '-')}
      ${buildDetalhesBlock('Status', ordem.status || '-')}
      ${buildDetalhesBlock('Cliente', detalhes.nomeCliente || ordem.cliente || '-')}
      ${buildDetalhesBlock('Documento', detalhes.documentoCliente || '-')}
      ${buildDetalhesBlock('Telefone', detalhes.telefoneCliente || '-')}
      ${buildDetalhesBlock('Aparelho', detalhes.modeloAparelho || ordem.equipamento || '-')}
      ${buildDetalhesBlock('Valor', `R$ ${formatCurrencyBRL(detalhes.valorConserto || ordem.valor || 0)}`)}
      ${buildDetalhesBlock('Previsão de entrega', detalhes.previsaoEntrega ? new Date(`${detalhes.previsaoEntrega}T00:00:00`).toLocaleDateString('pt-BR') : '-')}
      ${buildDetalhesBlock('Defeito apresentado', detalhes.defeitoApresentado || ordem.descricao || '-', true)}
      ${buildDetalhesBlock('Termo de garantia', detalhes.termoGarantia || '-', true)}
      ${fotoHtml}
      ${assinaturasHtml}
    </div>
  `;
  openModal('modal-detalhes-ordem');
}

function regerarPdfOrdemAtual() {
  if (!ordemDetalhesAtual) {
    showToast('Nenhuma ordem selecionada para regerar PDF.', 'error');
    return;
  }
  const base = ordemDetalhesAtual;
  const detalhes = base.detalhes || {};
  const dataPdf = {
    nomeAssistencia: detalhes.nomeAssistencia || localStorage.getItem('scartech_assistencia_nome') || 'ScarTech Solutions',
    nomeCliente: detalhes.nomeCliente || base.cliente || '',
    documentoCliente: detalhes.documentoCliente || '',
    telefoneCliente: detalhes.telefoneCliente || '',
    modeloAparelho: detalhes.modeloAparelho || base.equipamento || '',
    defeitoApresentado: detalhes.defeitoApresentado || base.descricao || '',
    termoGarantia: detalhes.termoGarantia || 'Garantia de 90 dias para o servico realizado, conforme legislacao vigente.',
    valorConserto: Number(detalhes.valorConserto ?? base.valor ?? 0),
    previsaoEntrega: detalhes.previsaoEntrega || '',
    status: detalhes.status || base.status || 'Aberta',
    fotoAparelho: detalhes.fotoAparelho || '',
    assinaturaTecnico: detalhes.assinaturaTecnico || '',
    assinaturaCliente: detalhes.assinaturaCliente || '',
  };
  const ok = gerarPdfOrdem(dataPdf, String(base.numOS || '').trim() || null);
  if (ok) {
    showToast('PDF regerado com sucesso!', 'success');
  }
}

function filterOrdens() {
  const search = document.getElementById('searchOrdem').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const filtradas = ordens.filter(o => {
    const matchSearch = o.cliente.toLowerCase().includes(search) || o.equipamento.toLowerCase().includes(search);
    const matchStatus = !status || o.status === status;
    return matchSearch && matchStatus;
  });
  renderOrdens(filtradas);
}

function exportarOrdensCSV() {
  if (!ordens || ordens.length === 0) {
    showToast('Nenhuma ordem para exportar. Assegure-se de que os dados foram carregados.', 'error');
    return;
  }

  const cabecalhos = ['Nº da O.S.', 'Cliente', 'Equipamento', 'Status', 'Valor (R$)', 'Data'];
  const linhas = ordens.map((o, idx) => {
    const num = o.numOS ?? o.numero ?? (idx + 1);
    const cliente = `"${(o.cliente || '').replace(/"/g, '""')}"`;
    const equipamento = `"${(o.equipamento || '').replace(/"/g, '""')}"`;
    const status = `"${(o.status || '').replace(/"/g, '""')}"`;
    const valor = (o.valor || 0).toFixed(2).replace('.', ',');
    const data = o.data || '';
    return [num, cliente, equipamento, status, valor, data].join(';');
  });

  const csvBody = [cabecalhos.join(';'), ...linhas].join('\n');
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `ordens_servico_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== PRODUTOS ====================
async function salvarProduto() {
  const parseCurrencyBr = (val) => {
    if(!val) return 0;
    if(typeof val === 'number') return val;
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const nome      = document.getElementById('prodNome').value.trim();
  const categoria = document.getElementById('prodCategoria').value;
  const estoque   = parseInt(document.getElementById('prodEstoque').value) || 0;
  
  const preco      = parseCurrencyBr(document.getElementById('prodPreco').value);
  const custoInput = document.getElementById('prodCusto').value;
  const custo      = parseCurrencyBr(custoInput);

  if (!nome) {
    showToast('Informe o nome do produto!', 'error');
    return;
  }
  if (custoInput === '' || Number.isNaN(custo) || custo < 0) {
    showToast('Informe o preço de compra do produto!', 'error');
    return;
  }

  if (hasSupabaseClient()) {
    if (produtoEmEdicao) {
      const { error } = await window.supabase
        .from('produtos')
        .update({ nome, categoria, estoque, preco, custo_compra: custo })
        .eq('id', produtoEmEdicao);

      if (error) {
        showToast('Erro ao atualizar produto.', 'error');
        return;
      }

      showToast('Produto atualizado com sucesso!');
    } else {
      const { error } = await window.supabase
        .from('produtos')
        .insert({ nome, categoria, estoque, preco, custo_compra: custo });

      if (error) {
        showToast('Erro ao cadastrar produto.', 'error');
        return;
      }

      showToast('Produto cadastrado com sucesso!');
    }

    produtoEmEdicao = null;
    closeModal('modal-novo-produto');
    limparFormProduto();
    await carregarProdutos();
    return;
  }

  if (produtoEmEdicao) {
    const idx = produtos.findIndex(p => p.id === produtoEmEdicao);
    if (idx >= 0) {
      produtos[idx] = { id: produtoEmEdicao, numero: produtos[idx].numero ?? (idx + 1), nome, categoria, estoque, preco, custo };
    } else {
      produtos.push({ id: Date.now(), numero: produtos.length + 1, nome, categoria, estoque, preco, custo });
    }
    produtoEmEdicao = null;
    saveData();
    renderProdutos();
    closeModal('modal-novo-produto');
    limparFormProduto();
    showToast('Produto atualizado com sucesso!');
    return;
  }

  const produto = {
    id: Date.now(),
    numero: produtos.length + 1,
    nome, categoria, estoque, preco, custo,
  };

  produtos.push(produto);
  saveData();
  renderProdutos();
  closeModal('modal-novo-produto');
  limparFormProduto();
  showToast('Produto cadastrado com sucesso!');
}

function limparFormProduto() {
  ['prodNome','prodEstoque','prodPreco','prodCusto'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('prodCategoria').value = 'Peças';
}

function renderProdutos(lista = null) {
  const tbody = document.getElementById('tbodyProdutos');
  if (!tbody) return;
  const dados = lista || produtos;

  if (dados.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <span class="empty-icon">📦</span>
            <p>Nenhum produto cadastrado</p>
            <button class="btn-primary btn-sm" onclick="openModal('modal-novo-produto')">Adicionar produto</button>
          </div>
        </td>
      </tr>`;
    if (typeof renderProductsChartOtimista === 'function') {
      renderProductsChartOtimista(dados);
    }
    return;
  }

  tbody.innerHTML = dados.map((p, idx) => `
    <tr>
      <td><strong>#${p.numero ?? (idx + 1)}</strong></td>
      <td>${p.nome}</td>
      <td><span class="badge badge-aberta">${p.categoria}</span></td>
      <td>${p.estoque} un.</td>
      <td>R$ ${p.preco.toFixed(2)}</td>
      <td>
        <button class="action-btn" onclick="editarProduto(${p.id})">Editar</button>
        <button class="action-btn danger" onclick="excluirProduto(${p.id})">Excluir</button>
      </td>
    </tr>`).join('');

  if (typeof renderProductsChartOtimista === 'function') {
    renderProductsChartOtimista(dados);
  }
}

async function excluirProduto(id) {
  if (!confirm('Deseja excluir este produto?')) return;
  if (hasSupabaseClient()) {
    const { error } = await window.supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Erro ao excluir produto.', 'error');
      return;
    }

    await carregarProdutos();
    showToast('Produto excluído.', 'error');
    return;
  }

  produtos = produtos.filter(p => p.id !== id);
  saveData();
  renderProdutos();
  showToast('Produto excluído.', 'error');
}

function editarProduto(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('prodNome').value      = p.nome;
  document.getElementById('prodCategoria').value = p.categoria;
  document.getElementById('prodEstoque').value   = p.estoque;
  const formatEdit = (num) => Number(num || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('prodPreco').value     = formatEdit(p.preco);
  document.getElementById('prodCusto').value     = formatEdit(p.custo);
  produtoEmEdicao = id;
  openModal('modal-novo-produto');
}
function filterProdutos() {
  const search    = document.getElementById('searchProduto').value.toLowerCase();
  const categoria = document.getElementById('filterCategoria').value;
  const filtrados = produtos.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search);
    const matchCat    = !categoria || p.categoria === categoria;
    return matchSearch && matchCat;
  });
  renderProdutos(filtrados);
}

function exportarProdutosCSV() {
  if (!produtos || produtos.length === 0) {
    showToast('Nenhum produto para exportar. Assegure-se de que os dados foram carregados.', 'error');
    return;
  }

  const cabecalhos = ['Nº', 'Nome do Produto', 'Categoria', 'Estoque', 'Preço de Venda (R$)', 'Preço de Compra (R$)'];
  const linhas = produtos.map((p, idx) => {
    const num = p.numero ?? (idx + 1);
    const nome = `"${(p.nome || '').replace(/"/g, '""')}"`;
    const cat = `"${(p.categoria || '').replace(/"/g, '""')}"`;
    const estoque = p.estoque || 0;
    const preco = (p.preco || 0).toFixed(2).replace('.', ',');
    const custo = (p.custo || 0).toFixed(2).replace('.', ',');
    return [num, nome, cat, estoque, preco, custo].join(';');
  });

  const csvBody = [cabecalhos.join(';'), ...linhas].join('\n');
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `produtos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== VENDAS ====================
async function salvarVenda() {
  const cliente = document.getElementById('vendaCliente').value.trim();
  const produtoId = parseInt(document.getElementById('vendaProduto').value, 10);
  const qtd     = parseInt(document.getElementById('vendaQtd').value) || 1;
  const valorInput   = parseFloat(document.getElementById('vendaValor').value) || 0;

  if (!cliente || !produtoId) {
    showToast('Preencha os campos obrigatórios!', 'error');
    return;
  }

  const produtoSel = produtos.find(p => p.id === produtoId);
  if (!produtoSel) {
    showToast('Selecione um produto válido.', 'error');
    return;
  }

  const valor = valorInput > 0 ? valorInput : (produtoSel.preco * qtd);

  if (produtoSel.estoque < qtd) {
    showToast('Estoque insuficiente para esta venda.', 'error');
    return;
  }

  if (hasSupabaseClient()) {
    const { error } = await window.supabase
      .rpc('registrar_venda', {
        p_produto_id: produtoId,
        p_cliente: cliente,
        p_qtd: qtd,
        p_valor: valor,
      });
    if (error) {
      const raw = (error.message || '').toLowerCase();
      if (raw.includes('estoque_insuficiente')) {
        showToast('Estoque insuficiente para esta venda.', 'error');
      } else if (raw.includes('produto_nao_encontrado')) {
        showToast('Produto não encontrado.', 'error');
      } else if (raw.includes('forbidden')) {
        showToast('Produto não pertence ao usuário.', 'error');
      } else {
        showToast(error.message || 'Erro ao registrar venda.', 'error');
      }
      return;
    }

    closeModal('modal-nova-venda');
    limparFormVenda();
    await carregarVendas();
    await carregarProdutos();
    showToast('Venda registrada com sucesso!');
    return;
  }

  const lucro = valor - (qtd * (produtoSel.custo || 0));
  const venda = {
    id: Date.now(),
    numero: vendas.length + 1,
    cliente,
    produto: produtoSel.nome,
    produto_id: produtoId,
    qtd,
    valor,
    lucro,
    data: new Date().toLocaleDateString('pt-BR'),
    dataIso: new Date().toISOString(),
    timestamp: Date.now(),
  };

  vendas.push(venda);
  produtoSel.estoque = Math.max(0, produtoSel.estoque - qtd);
  saveData();
  renderVendas();
  closeModal('modal-nova-venda');
  limparFormVenda();
  showToast('Venda registrada com sucesso!');
}

function limparFormVenda() {
  const sel = document.getElementById('vendaProduto');
  if (sel) sel.value = '';
  const ids = ['vendaCliente','vendaQtd','vendaValor'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function popularProdutosVenda() {
  const sel = document.getElementById('vendaProduto');
  const filterSel = document.getElementById('filterVendaProduto');

  const opts = ['<option value="">Selecione um produto</option>'];
  const filterOpts = ['<option value="">Produto</option>'];

  produtos.forEach(p => {
    const label = `${p.nome} (Estoque: ${p.estoque})`;
    const disabled = p.estoque <= 0 ? ' disabled' : '';
    opts.push(`<option value="${p.id}"${disabled}>${label}</option>`);
    filterOpts.push(`<option value="${p.id}">${p.nome}</option>`);
  });

  if (sel) sel.innerHTML = opts.join('');
  if (filterSel) filterSel.innerHTML = filterOpts.join('');
}

function atualizarPrecoVenda() {
  const sel = document.getElementById('vendaProduto');
  const qtdEl = document.getElementById('vendaQtd');
  const valEl = document.getElementById('vendaValor');
  if (!sel || !qtdEl || !valEl) return;
  const produtoId = parseInt(sel.value, 10);
  const produtoSel = produtos.find(p => p.id === produtoId);
  if (!produtoSel) return;
  const qtd = parseInt(qtdEl.value) || 1;
  valEl.value = (produtoSel.preco * qtd).toFixed(2);
}

function renderVendas(lista = null) {
  const tbody = document.getElementById('tbodyVendas');
  if (!tbody) return;
  const dados = lista || vendas;

  if (dados.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <span class="empty-icon">🛒</span>
            <p>Nenhuma venda encontrada</p>
            <button class="btn-primary btn-sm" onclick="openModal('modal-nova-venda')">Registrar venda</button>
          </div>
        </td>
      </tr>`;
    atualizarStatsVendas(dados);
    renderRelatoriosVendasSidebar(dados);
    return;
  }

  tbody.innerHTML = dados.map((v, idx) => `
    <tr>
      <td><strong>#${v.numero ?? (idx + 1)}</strong></td>
      <td>${v.cliente}</td>
      <td>${v.produto}</td>
      <td>${v.qtd}</td>
      <td>R$ ${v.valor.toFixed(2)}</td>
      <td>R$ ${Number(v.lucro ?? 0).toFixed(2)}</td>
      <td>${v.data}</td>
      <td>
        <button class="action-btn danger" onclick="excluirVenda(${v.id})">Excluir</button>
      </td>
    </tr>`).join('');

  atualizarStatsVendas(dados);
  renderRelatoriosVendasSidebar(dados);
}

function excluirVenda(id) {
  if (!confirm('Deseja excluir esta venda?')) return;
  if (hasSupabaseClient()) {
    window.supabase
      .from('vendas')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          showToast('Erro ao excluir venda.', 'error');
          return;
        }
        carregarVendas();
        showToast('Venda excluída.', 'error');
      });
    return;
  }
  vendas = vendas.filter(v => v.id !== id);
  saveData();
  renderVendas();
  showToast('Venda excluída.', 'error');
}

function atualizarStatsVendas(lista = vendas) {
  const total = lista.reduce((s, v) => s + v.valor, 0);
  const ticket = lista.length > 0 ? total / lista.length : 0;
  const hoje = new Date().toLocaleDateString('pt-BR');
  const hojeCount = lista.filter(v => v.data === hoje).length;

  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('totalVendas', `R$ ${total.toFixed(2)}`);
  el('qtdVendas', lista.length);
  el('ticketMedioVendas', `R$ ${ticket.toFixed(2)}`);
  el('vendasHoje', hojeCount);
}

// === FILTROS AVANÇADOS ===
window.vendasCurrentPeriod = '30dias'; // padrão inicial compatível com HTML
function setVendasPeriod(period) {
  const btns = document.querySelectorAll('#filterDateGroup .vendas-filter-btn');
  if(!btns.length) return;
  btns.forEach(b => {
    if (b.dataset.period === period) b.classList.add('active');
    else b.classList.remove('active');
  });
  window.vendasCurrentPeriod = period;
  runVendasFilters();
}

function runVendasFilters() {
  const prod = document.getElementById('filterVendaProduto')?.value;
  const buscaCliente = document.getElementById('filterVendaCliente')?.value.toLowerCase();
  const period = window.vendasCurrentPeriod;
  
  const now = new Date();
  let cutoffTime = 0;
  
  if (period === 'hoje') {
    cutoffTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (period === '7dias') {
    cutoffTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (period === '30dias') {
    cutoffTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }
  
  const filtradas = vendas.filter(v => {
    if (period !== 'all' && v.timestamp < cutoffTime) return false;
    if (prod && String(v.produto_id) !== String(prod)) return false;
    if (buscaCliente && !(v.cliente || '').toLowerCase().includes(buscaCliente)) return false;
    return true;
  });
  renderVendas(filtradas);
}

function renderRelatoriosVendasSidebar(dados) {
  const topContainer = document.getElementById('topProductsList');
  const lastContainer = document.getElementById('latestCustomersList');
  if (!topContainer || !lastContainer) return;

  const pMap = {};
  dados.forEach(v => {
    if (!pMap[v.produto]) pMap[v.produto] = 0;
    pMap[v.produto] += v.qtd;
  });
  const sortedProducts = Object.entries(pMap)
    .map(([nome, qty]) => ({ nome, qty }))
    .sort((a,b) => b.qty - a.qty)
    .slice(0, 5);
  
  if (sortedProducts.length === 0) {
    topContainer.innerHTML = '<div class="stat-empty">Nenhuma venda encontrada</div>';
  } else {
    topContainer.innerHTML = sortedProducts.map(p => `
      <div class="widget-item">
        <div class="w-avatar">🛍️</div>
        <div class="w-info">
          <strong>${p.nome}</strong>
          <span>Vendas no período</span>
        </div>
        <div class="w-value">${p.qty} <span style="font-size:0.75rem;color:var(--text-muted);font-weight:400"> un</span></div>
      </div>
    `).join('');
  }

  const recentes = [...dados].sort((a, b) => b.timestamp - a.timestamp);
  const clientesVistos = new Set();
  const ultimosClientes = [];
  for(let v of recentes) {
    const nomeNormalizado = (v.cliente || '').trim().toLowerCase();
    if (nomeNormalizado && !clientesVistos.has(nomeNormalizado)) {
      clientesVistos.add(nomeNormalizado);
      ultimosClientes.push(v);
    }
    if (ultimosClientes.length >= 3) break;
  }

  if (ultimosClientes.length === 0) {
    lastContainer.innerHTML = '<div class="stat-empty">Nenhum cliente recente</div>';
  } else {
    lastContainer.innerHTML = ultimosClientes.map(v => {
      const initial = (v.cliente || 'C').charAt(0).toUpperCase();
      return `
      <div class="widget-item">
        <div class="w-avatar round">${initial}</div>
        <div class="w-info">
          <strong>${v.cliente}</strong>
          <span>${v.data}</span>
        </div>
        <button class="w-btn" onclick="document.getElementById('filterVendaCliente').value='${v.cliente}'; runVendasFilters();">Ver ▸</button>
      </div>`;
    }).join('');
  }
}
function isStatusConcluida(status) {
  const s = (status || '').toLowerCase();
  return s.includes('conclu');
}

function isStatusAbertaOuAndamento(status) {
  const s = (status || '').toLowerCase();
  return s.includes('aberta') || s.includes('andamento');
}

function renderListaOrdensDashboard() {
  let list = document.getElementById('dashOrdensList');
  if (!list) {
    const info = document.getElementById('dashOrdens')?.closest('.stat-info');
    if (info) {
      list = document.createElement('div');
      list.id = 'dashOrdensList';
      list.className = 'stat-sublist';
      info.appendChild(list);
    }
  }
  if (!list) return;

  const abertas = ordens.filter(o => isStatusAbertaOuAndamento(o.status));
  if (abertas.length === 0) {
    list.innerHTML = '<div class="stat-empty">Sem ordens em aberto</div>';
    return;
  }

  const itens = abertas.slice(0, 4).map(o => {
    const status = o.status || 'Aberta';
    const cliente = o.cliente || 'Cliente';
    const equipamento = o.equipamento || 'Equipamento';
    return `
      <div class="stat-item">
        <span class="badge ${badgeClass(status)}">${status}</span>
        <span class="stat-text">${cliente} — ${equipamento}</span>
      </div>`;
  }).join('');

  const extra = abertas.length > 4 ? `<div class="stat-more">+${abertas.length - 4} outras</div>` : '';
  list.innerHTML = itens + extra;
}

function atualizarCardsResumo() {
  const totalVendas = vendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const ordensConcluidas = ordens.filter(o => isStatusConcluida(o.status));
  const totalOrdensConcluidas = ordensConcluidas.reduce((s, o) => s + Number(o.valor || 0), 0);
  const totalFaturamento = totalVendas + totalOrdensConcluidas;
  const totalItens = vendas.length + ordensConcluidas.length;
  const ticket = totalItens > 0 ? totalFaturamento / totalItens : 0;

  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

  set('dashFaturamento', `R$ ${totalFaturamento.toFixed(2)}`);
  set('dashOrdens', ordens.length);
  set('dashVendas', vendas.length);
  set('dashProdutos', produtos.length);

  set('fatTotal', `R$ ${totalFaturamento.toFixed(2)}`);
  set('fatOrdens', ordens.length);
  set('fatVendas', vendas.length);
  set('fatTicket', `R$ ${ticket.toFixed(2)}`);

  renderListaOrdensDashboard();
}

// ==================== CHARTS ====================
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    text:   isDark ? '#8A9BB0' : '#637083',
    teal:   '#0E9FAA',
    purple: '#6366F1',
    amber:  '#F59E0B',
    green:  '#10B981',
  };
}

function renderChartsIfNeeded() {
  if (!chartsInit['fatMensal']) {
    chartsInit['fatMensal'] = true;
    renderFaturamentoMensalChart();
  }
}

function getLucroMensal() {
  const meses = Array(12).fill(0);
  vendas.forEach(v => {
    const base = v.dataIso || v.data;
    let d = new Date(base);
    if (Number.isNaN(d.getTime()) && typeof v.data === 'string') {
      const partes = v.data.split('/');
      if (partes.length === 3) {
        d = new Date(partes[2], partes[1] - 1, partes[0]);
      }
    }
    if (Number.isNaN(d.getTime())) return;
    meses[d.getMonth()] += Number(v.lucro ?? 0);
  });
  return meses;
}
function renderFaturamentoMensalChart() {
  const ctx = document.getElementById('chartFaturamentoMensal');
  if (!ctx) return;
  const c = getChartColors();
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
      datasets: [{
        label: 'Lucro',
        data: getLucroMensal(),
        borderColor: c.teal,
        backgroundColor: 'rgba(14,159,170,0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: c.teal,
        pointRadius: 4,
        fill: true,
        tension: 0.4,
      }]
    },
    options: chartOptions(c, 'R$')
  });
}

function renderRelatorioCharts() {
  const c = getChartColors();

  // Chart 1 - Faturamento mensal (barras)
  const ctx1 = document.getElementById('chartFatMensal2');
  if (ctx1 && !ctx1._chart) {
    ctx1._chart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
        datasets: [{
          label: 'Lucro',
          data: getLucroMensal(),
          backgroundColor: 'rgba(14,159,170,0.65)',
          borderColor: c.teal,
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: chartOptions(c, 'R$')
    });
  }

  // Chart 2 - Donut distribuição
  const ctx2 = document.getElementById('chartDistribuicao');
  if (ctx2 && !ctx2._chart) {
    ctx2._chart = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Serviços (OS)', 'Vendas'],
        datasets: [{
          data: [50, 50],
          backgroundColor: [c.teal, c.green],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: c.text, font: { size: 12, family: 'Plus Jakarta Sans' }, padding: 16 }
          }
        },
        cutout: '60%',
      }
    });
  }

  // Chart 3 - Ordens por status
  const ctx3 = document.getElementById('chartOrdensPorStatus');
  if (ctx3 && !ctx3._chart) {
    ctx3._chart = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: ['Abertas', 'Em andamento', 'Concluídas', 'Canceladas'],
        datasets: [{
          label: 'Ordens',
          data: [
            ordens.filter(o => o.status === 'Aberta').length,
            ordens.filter(o => o.status === 'Em andamento').length,
            ordens.filter(o => o.status === 'Concluída').length,
            ordens.filter(o => o.status === 'Cancelada').length,
          ],
          backgroundColor: [c.purple, c.amber, c.green, 'rgba(239,68,68,0.65)'],
          borderRadius: 6,
          borderWidth: 0,
        }]
      },
      options: chartOptions(c, '')
    });
  }

  // Chart 4 - Vendas por dia da semana
  const ctx4 = document.getElementById('chartVendasDia');
  if (ctx4 && !ctx4._chart) {
    const diasNomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const diasCount = [0,0,0,0,0,0,0];
    vendas.forEach(v => {
      const partes = v.data.split('/');
      if (partes.length === 3) {
        const d = new Date(partes[2], partes[1]-1, partes[0]);
        diasCount[d.getDay()]++;
      }
    });
    ctx4._chart = new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: diasNomes,
        datasets: [{
          label: 'Vendas',
          data: diasCount,
          backgroundColor: 'rgba(99,102,241,0.65)',
          borderColor: c.purple,
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: chartOptions(c, '')
    });
  }
}

function chartOptions(c, prefix) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,24,35,0.9)',
        titleColor: '#fff',
        bodyColor: '#aaa',
        padding: 10,
        callbacks: prefix ? {
          label: ctx => `${prefix} ${ctx.parsed.y.toFixed(2)}`
        } : {}
      }
    },
    scales: {
      x: {
        grid: { color: c.grid },
        ticks: { color: c.text, font: { size: 11, family: 'Plus Jakarta Sans' } }
      },
      y: {
        grid: { color: c.grid },
        ticks: { color: c.text, font: { size: 11, family: 'Plus Jakarta Sans' } }
      }
    }
  };
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
  }
});

// ==================== LOGOUT ====================
async function logout() {
  try {
    if (window.supabase && typeof window.supabase.auth?.signOut === 'function') {
      await window.supabase.auth.signOut();
    }
  } catch (e) {
    console.warn('Erro ao deslogar do Supabase:', e);
  }
  localStorage.removeItem('scartech_theme');
  localStorage.removeItem('scartech_ordens');
  localStorage.removeItem('scartech_produtos');
  localStorage.removeItem('scartech_vendas');
  localStorage.removeItem('scartech_ordens_detalhes');
  localStorage.removeItem('scartech_jwt_token');
  localStorage.removeItem('scartech_backend_url');
  const basePath = window.location.pathname.includes('/prototipo/') ? '/' : 'index.html';
  window.location.href = basePath;
}

// ==================== INIT ====================
let appInitDone = false;
function bootApp() {
  if (appInitDone) return;
  appInitDone = true;
  applyStoredTheme();
  initOrdemFormEnhancements();
  if (typeof ajustarLabelsPrecoProduto === 'function') ajustarLabelsPrecoProduto();
  initPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}





























function ajustarLabelsPrecoProduto() {
  const setLabel = (inputId, text) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const group = input.closest('.form-group');
    const label = group ? group.querySelector('label') : null;
    if (label) label.textContent = text;
  };

  setLabel('prodPreco', 'Preço de Venda (R$ / unidade)');
  setLabel('prodCusto', 'Preço de Compra (R$ / unidade)');
}

function renderProductsChartOtimista(dados) {
  const ctx = document.getElementById('chartOtimista');
  if (!ctx) return;
  
  let totalCusto = 0;
  let totalLucroEstimado = 0;

  dados.forEach(p => {
    const qty = Number(p.estoque || 0);
    const custo = Number(p.custo || 0);
    const preco = Number(p.preco || 0);
    totalCusto += custo * qty;
    totalLucroEstimado += (preco - custo) * qty;
  });

  const c = getChartColors ? getChartColors() : { amber: '#F59E0B', green: '#10B981', text: '#637083', grid: 'rgba(0,0,0,0.05)' };
  
  if (ctx._chart) {
    ctx._chart.destroy();
  }

  ctx._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Projeção de Estoque'],
      datasets: [
        {
          label: 'Total Gasto (Custo)',
          data: [totalCusto],
          backgroundColor: c.amber,
          borderRadius: 6,
        },
        {
          label: 'Lucro Estimado ao Vender Tudo',
          data: [totalLucroEstimado],
          backgroundColor: c.green,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: c.text, font: { family: 'Plus Jakarta Sans' } }
        },
        tooltip: {
          backgroundColor: 'rgba(15,24,35,0.9)',
          titleColor: '#fff',
          bodyColor: '#aaa',
          padding: 10,
          callbacks: {
            label: context => `R$ ${context.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits:2})}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text } },
        y: {
          grid: { color: c.grid },
          ticks: {
            color: c.text,
            callback: value => 'R$ ' + value.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})
          }
        }
      }
    }
  });
}

document.addEventListener('input', e => {
  if (e.target && e.target.classList.contains('mask-currency')) {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      e.target.value = '';
      return;
    }
    value = (parseInt(value, 10) / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    e.target.value = value;
  }
});


