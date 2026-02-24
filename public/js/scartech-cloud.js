// ScarTech Cloud Data API
// Gerencia sincronização de dados entre localStorage e API do backend
// Funciona com JWT tokens para autenticação stateless

const BACKEND_URL = 'https://querulous-kathleen-scartechsolution-c8941e0e.koyeb.app';

const ScartechCloud = {
    userId: null,
    token: null,
    
    // Inicializa com o email do Clerk e obtém JWT token
    async init(clerkEmail) {
        this.userId = clerkEmail; // Armazena email como identificador
        
        // Tenta recuperar token do localStorage
        const savedToken = localStorage.getItem('scartech_jwt_token');
        if (savedToken) {
            this.token = savedToken;
            console.log('ScartechCloud: Token recuperado do localStorage');
            return;
        }
        
        // Se não houver token, tenta fazer login com o email Clerk
        try {
            await this.refreshToken(clerkEmail);
        } catch (error) {
            console.warn('Não conseguiu obter token JWT:', error);
        }
    },
    
    // Obtém novo token JWT através do backend
    async refreshToken(email) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Token verificado com sucesso');
                return true;
            }
        } catch (error) {
            console.warn('Erro ao verificar token:', error);
        }
        return false;
    },
    
    // Define o token JWT (chamado após autenticação bem-sucedida)
    setToken(token) {
        this.token = token;
        localStorage.setItem('scartech_jwt_token', token);
        console.log('JWT Token salvo no localStorage');
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
        if (!this.isReady()) return this.getFromLocalStorage('scartech_ordens');
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/ordens`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            if (response.ok) {
                const ordens = await response.json();
                localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
                return ordens;
            } else if (response.status === 401) {
                console.warn('Token expirado ao buscar ordens');
                return this.getFromLocalStorage('scartech_ordens');
            }
        } catch (error) {
            console.warn('Erro ao buscar ordens da nuvem, usando localStorage:', error);
        }
        return this.getFromLocalStorage('scartech_ordens');
    },
    
    async saveOrdens(ordens) {
        localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
        
        if (!this.isReady()) return { success: true, local: true };
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/ordens`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/ordens/add`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/vendas`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/vendas`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/vendas/add`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/produtos`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/produtos`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data/produtos/add`, {
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
            
            const response = await fetch(`${BACKEND_URL}/api/data/sync`, {
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
            const response = await fetch(`${BACKEND_URL}/api/data`, {
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
