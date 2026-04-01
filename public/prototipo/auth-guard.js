/* ============================================================
   SCARTECH — auth-guard.js
   Controle de acesso por categoria de conta.

   Uso: inclua este script APÓS supabasecliente.js em cada
   página que precisa de proteção.

   Páginas restritas a 'gerir_assistencia':
     dashboard, faturamento, ordens, produtos, vendas

   Páginas restritas a 'fornecedor':
     fornecimento

   Páginas acessíveis a ambos:
     fornecedores, perfil
   ============================================================ */

(async function authGuard() {
  if (!window.supabase || typeof window.supabase.auth.getUser !== 'function') return;

  const { data: { user } } = await window.supabase.auth.getUser();
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isLoginPage = currentPath === 'index.html' || currentPath === '';

  // ── Se NÃO logado: manda p/ login (exceto se já estiver na login) ──
  if (!user) {
    if (!isLoginPage) window.location.href = 'index.html';
    return;
  }

  // ── Se LOGADO: Busca a categoria do perfil ──
  const { data: profile } = await window.supabase
    .from('profiles')
    .select('full_name, category')
    .eq('id', user.id)
    .single();

  const category = profile?.category ?? 'gerir_assistencia';

  // ── Definição de Rotas Permitidas ──
  const ASSISTENCIA_PAGES = ['dashboard.html', 'faturamento.html', 'ordens.html', 'produtos.html', 'vendas.html'];
  const SUPPLIER_PAGES = ['fornecimento.html'];
  const SHARED_PAGES = ['fornecedores.html', 'perfil.html'];

  // ── Se estiver no LOGIN e já logado, vai p/ home correta ──
  if (isLoginPage) {
    window.location.href = category === 'fornecedor' ? 'fornecimento.html' : 'dashboard.html';
    return;
  }

  // ── Enforce Access Rules ──
  if (category === 'fornecedor') {
    // Fornecedor: Bloqueia acesso a páginas de gestão de assistência
    if (ASSISTENCIA_PAGES.some(p => currentPath.includes(p.replace('.html', '')))) {
      window.location.href = 'fornecimento.html';
      return;
    }
  } else {
    // Gestor: Bloqueia acesso à página de fornecimento
    if (SUPPLIER_PAGES.some(p => currentPath.includes(p.replace('.html', '')))) {
      window.location.href = 'dashboard.html';
      return;
    }
  }

  // ── UI Updates (Sidebar) ──
  const el = document.getElementById('sidebarNome');
  const av = document.getElementById('sidebarAvatar');
  if (profile?.full_name) {
    if (el) el.textContent = profile.full_name;
    if (av) {
      const partes = profile.full_name.trim().split(' ').filter(Boolean);
      av.textContent = partes.length > 1
        ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
        : profile.full_name.slice(0, 2).toUpperCase();
    }
  }

  // Exibe item "Meu Fornecimento" na sidebar apenas para fornecedores
  const supplierNav = document.getElementById('nav-fornecimento-section');
  if (supplierNav) {
    supplierNav.style.display = (category === 'fornecedor') ? '' : 'none';
  }

  // ── Restrição de Visualização da Sidebar para Fornecedores ──
  if (category === 'fornecedor') {
    // 1. Esconde a seção "PRINCIPAL" (Dashboard, Faturamento)
    const navSections = document.querySelectorAll('.nav-section');
    navSections.forEach(section => {
      const label = section.querySelector('.nav-label')?.textContent || '';
      if (label.includes('PRINCIPAL')) {
        section.style.display = 'none';
      }
      
      // 2. Em "GESTÃO", esconde tudo EXCETO "Fornecedores"
      if (label.includes('GESTÃO')) {
        const items = section.querySelectorAll('.nav-item');
        items.forEach(item => {
          const text = item.querySelector('.nav-text')?.textContent || '';
          if (!text.includes('Fornecedores')) {
            item.style.display = 'none';
          }
        });
      }
    });
  }

})();
