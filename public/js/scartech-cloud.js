// ScarTech Cloud Data API
// Gerencia sincronização de dados entre localStorage e API do backend
// Funciona com JWT tokens para autenticação stateless

const BACKEND_URL = 'https://querulous-kathleen-scartechsolution-c8941e0e.koyeb.app';

const ScartechCloud = {
  userId: null,
  token: null,
  _backendUrl: null,

  getBaseUrl() {
    if (this._backendUrl) return this._backendUrl;
    try {
      const saved = localStorage.getItem('scartech_backend_url');
      if (saved) return saved;
    } catch (_) {}
    return BACKEND_URL;
  },

  setBackendUrl(url) {
    this._backendUrl = url;
    try {
      if (url) {
        localStorage.setItem('scartech_backend_url', url);
      } else {
        localStorage.removeItem('scartech_backend_url');
      }
    } catch (_) {}
  },

  // Persiste o token JWT para uso nas requisições
  setToken(token) {
    this.token = token;
    localStorage.setItem('scartech_jwt_token', token);
  },

  // Inicializa com email + access_token do Supabase e obtém JWT local do backend
  async init(userEmail, supabaseAccessToken = null) {
    this.userId = userEmail;

    // Tenta recuperar token do localStorage
    const savedToken = localStorage.getItem('scartech_jwt_token');
    if (savedToken) {
      this.token = savedToken;
      console.log('ScartechCloud: Token recuperado do localStorage');
      // Sincronizar dados do backend
      await this.sincronizarDadosDoBackend();
      return;
    }

    try {
      let loginSuccess = false;
      if (supabaseAccessToken) {
        loginSuccess = await this.fazerLoginComSupabaseToken(supabaseAccessToken);
      }
      if (!loginSuccess) {
        console.warn('[ScartechCloud] Login no backend requer access_token do Supabase válido.');
      }
      if (loginSuccess) {
        // Sincronizar dados do backend após login
        await this.sincronizarDadosDoBackend();
      }
    } catch (error) {
      console.warn('Não conseguiu fazer login:', error);
    }
  },

  // Login recomendado: backend valida access_token no Supabase (/api/auth/login-supabase)
  async fazerLoginComSupabaseToken(accessToken) {
    const baseUrl = this.getBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/auth/login-supabase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.setToken(data.token);
          this.userId = data.userId || this.userId;
          return true;
        }
      }
    } catch (error) {
      console.warn('[ScartechCloud] Erro no login Supabase -> backend:', error.message || error);
    }
    return false;
  },

  // Sincroniza todos os dados do backend para localStorage
  async sincronizarDadosDoBackend() {
    if (!this.isReady()) {
      console.warn('Não há token para sincronizar dados');
      return;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();

        // Atualiza localStorage com dados do backend
        if (data.ordens) {
          localStorage.setItem('scartech_ordens', JSON.stringify(data.ordens));
          console.log('Ordens sincronizadas do backend:', data.ordens.length);
        }
        if (data.vendas) {
          localStorage.setItem('scartech_vendas', JSON.stringify(data.vendas));
          console.log('Vendas sincronizadas do backend:', data.vendas.length);
        }
        if (data.produtos) {
          localStorage.setItem('scartech_produtos', JSON.stringify(data.produtos));
          console.log('Produtos sincronizados do backend:', data.produtos.length);
        }

        return true;
      } else if (response.status === 401) {
        console.warn('[ScartechCloud] Token expirado ao sincronizar dados');
        this.token = null;
        localStorage.removeItem('scartech_jwt_token');
        return false;
      }
    } catch (error) {
      console.warn('[ScartechCloud] Erro ao sincronizar dados:', error.message || error);
    }
  },

  // Obtém headers com autenticação JWT
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  },

  // Verifica se está inicializado e tem token
  isReady() {
    return this.token !== null && this.token !== undefined && this.token !== '';
  },

  // ========== ORDENS ==========

  async getOrdens() {
    const fallback = this.getFromLocalStorage('scartech_ordens');
    const baseUrl = this.getBaseUrl();
    if (!this.isReady()) {
      console.log('[ScartechCloud] getOrdens: sem token, usando localStorage. Backend:', baseUrl);
      return Array.isArray(fallback) ? fallback : [];
    }

    try {
      const response = await fetch(`${baseUrl}/api/user-data/ordens`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const ordens = Array.isArray(data) ? data : (data && Array.isArray(data.ordens) ? data.ordens : []);
        localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
        console.log('[ScartechCloud] getOrdens:', ordens.length, 'ordens | Backend:', baseUrl);
        return ordens;
      } else if (response.status === 401) {
        console.warn('[ScartechCloud] Token expirado ao buscar ordens');
        this.token = null;
        localStorage.removeItem('scartech_jwt_token');
        return Array.isArray(fallback) ? fallback : [];
      } else {
        console.warn('[ScartechCloud] getOrdens HTTP', response.status, '| URL:', baseUrl);
      }
    } catch (error) {
      console.warn('[ScartechCloud] Erro ao buscar ordens. Backend:', baseUrl, error.message || error);
    }
    return Array.isArray(fallback) ? fallback : [];
  },

  async saveOrdens(ordens) {
    localStorage.setItem('scartech_ordens', JSON.stringify(ordens));

    if (!this.isReady()) return { success: true, local: true };

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/ordens`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ordens)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: true, local: true };
    } catch (error) {
      console.warn('Erro ao salvar ordens na nuvem:', error);
      return { success: true, local: true, error: error.message };
    }
  },

  async addOrdem(ordem) {
    if (!this.isReady()) {
      const ordens = this.getFromLocalStorage('scartech_ordens') || [];
      ordens.push(ordem);
      localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
      return { success: true, local: true };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/ordens/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ordem)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: false };
    } catch (error) {
      console.warn('Erro ao adicionar ordem:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== VENDAS ==========

  async getVendas() {
    if (!this.isReady()) return this.getFromLocalStorage('scartech_vendas');

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/vendas`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (response.ok) {
        const vendas = await response.json();
        localStorage.setItem('scartech_vendas', JSON.stringify(vendas));
        return vendas;
      }
    } catch (error) {
      console.warn('Erro ao buscar vendas da nuvem, usando localStorage:', error);
    }
    return this.getFromLocalStorage('scartech_vendas');
  },

  async saveVendas(vendas) {
    localStorage.setItem('scartech_vendas', JSON.stringify(vendas));

    if (!this.isReady()) return { success: true, local: true };

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/vendas`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(vendas)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: true, local: true };
    } catch (error) {
      console.warn('Erro ao salvar vendas na nuvem:', error);
      return { success: true, local: true, error: error.message };
    }
  },

  async addVenda(venda) {
    if (!this.isReady()) {
      const vendas = this.getFromLocalStorage('scartech_vendas') || [];
      vendas.push(venda);
      localStorage.setItem('scartech_vendas', JSON.stringify(vendas));
      return { success: true, local: true };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/vendas/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(venda)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: false };
    } catch (error) {
      console.warn('Erro ao adicionar venda:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== PRODUTOS ==========

  async getProdutos() {
    if (!this.isReady()) return this.getFromLocalStorage('scartech_produtos');

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/produtos`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (response.ok) {
        const produtos = await response.json();
        localStorage.setItem('scartech_produtos', JSON.stringify(produtos));
        return produtos;
      }
    } catch (error) {
      console.warn('Erro ao buscar produtos da nuvem, usando localStorage:', error);
    }
    return this.getFromLocalStorage('scartech_produtos');
  },

  async saveProdutos(produtos) {
    localStorage.setItem('scartech_produtos', JSON.stringify(produtos));

    if (!this.isReady()) return { success: true, local: true };

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/produtos`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(produtos)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: true, local: true };
    } catch (error) {
      console.warn('Erro ao salvar produtos na nuvem:', error);
      return { success: true, local: true, error: error.message };
    }
  },

  async addProduto(produto) {
    if (!this.isReady()) {
      const produtos = this.getFromLocalStorage('scartech_produtos') || [];
      produtos.push(produto);
      localStorage.setItem('scartech_produtos', JSON.stringify(produtos));
      return { success: true, local: true };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data/produtos/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(produto)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: false };
    } catch (error) {
      console.warn('Erro ao adicionar produto:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== SYNC TOTAL ==========

  async syncAll() {
    if (!this.isReady()) return { success: false, message: 'Token não inicializado' };

    try {
      const data = {
        ordens: this.getFromLocalStorage('scartech_ordens'),
        vendas: this.getFromLocalStorage('scartech_vendas'),
        produtos: this.getFromLocalStorage('scartech_produtos')
      };

      const response = await fetch(`${this.getBaseUrl()}/api/user-data/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      if (response.ok) {
        return { success: true, synced: true };
      }
      return { success: false };
    } catch (error) {
      console.warn('Erro ao sincronizar dados:', error);
      return { success: false, error: error.message };
    }
  },

  async loadAll() {
    if (!this.isReady()) return null;

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/user-data`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        // Atualiza localStorage
        if (data.ordens) localStorage.setItem('scartech_ordens', JSON.stringify(data.ordens));
        if (data.vendas) localStorage.setItem('scartech_vendas', JSON.stringify(data.vendas));
        if (data.produtos) localStorage.setItem('scartech_produtos', JSON.stringify(data.produtos));
        return data;
      }
    } catch (error) {
      console.warn('Erro ao carregar todos os dados:', error);
    }
    return null;
  },

  // ========== HELPER ==========

  getFromLocalStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }
};

// Exporta para uso global
window.ScartechCloud = ScartechCloud;
