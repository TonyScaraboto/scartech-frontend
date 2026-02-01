// ScarTech Cloud Data API
// Gerencia sincronização de dados entre localStorage e API do backend

const BACKEND_URL = 'https://querulous-kathleen-scartechsolution-c8941e0e.koyeb.app';

const ScartechCloud = {
    userId: null,
    
    // Inicializa com o userId do Clerk
    init: function(clerkUserId) {
        this.userId = clerkUserId;
        console.log('ScartechCloud inicializado para usuário:', clerkUserId);
    },
    
    // Verifica se está inicializado
    isReady: function() {
        return this.userId !== null;
    },
    
    // ========== ORDENS ==========
    
    async getOrdens() {
        if (!this.isReady()) return this.getFromLocalStorage('scartech_ordens');
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/ordens`);
            if (response.ok) {
                const ordens = await response.json();
                // Sincroniza com localStorage como backup
                localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
                return ordens;
            }
        } catch (error) {
            console.warn('Erro ao buscar ordens da nuvem, usando localStorage:', error);
        }
        return this.getFromLocalStorage('scartech_ordens');
    },
    
    async saveOrdens(ordens) {
        // Sempre salva no localStorage primeiro
        localStorage.setItem('scartech_ordens', JSON.stringify(ordens));
        
        if (!this.isReady()) return { success: true, local: true };
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/ordens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ordens)
            });
            return await response.json();
        } catch (error) {
            console.warn('Erro ao salvar ordens na nuvem:', error);
            return { success: true, local: true, error: error.message };
        }
    },
    
    async addOrdem(ordem) {
        const ordens = await this.getOrdens();
        ordens.push(ordem);
        return this.saveOrdens(ordens);
    },
    
    // ========== VENDAS ==========
    
    async getVendas() {
        if (!this.isReady()) return this.getFromLocalStorage('scartech_vendas');
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/vendas`);
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
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/vendas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendas)
            });
            return await response.json();
        } catch (error) {
            console.warn('Erro ao salvar vendas na nuvem:', error);
            return { success: true, local: true, error: error.message };
        }
    },
    
    async addVenda(venda) {
        const vendas = await this.getVendas();
        vendas.push(venda);
        return this.saveVendas(vendas);
    },
    
    // ========== PRODUTOS ==========
    
    async getProdutos() {
        if (!this.isReady()) return this.getFromLocalStorage('scartech_produtos');
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/produtos`);
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
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtos)
            });
            return await response.json();
        } catch (error) {
            console.warn('Erro ao salvar produtos na nuvem:', error);
            return { success: true, local: true, error: error.message };
        }
    },
    
    async addProduto(produto) {
        const produtos = await this.getProdutos();
        produtos.push(produto);
        return this.saveProdutos(produtos);
    },
    
    // ========== SYNC TOTAL ==========
    
    async syncAll() {
        if (!this.isReady()) return { success: false, message: 'Usuário não inicializado' };
        
        try {
            const data = {
                ordens: this.getFromLocalStorage('scartech_ordens'),
                vendas: this.getFromLocalStorage('scartech_vendas'),
                produtos: this.getFromLocalStorage('scartech_produtos')
            };
            
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.warn('Erro ao sincronizar dados:', error);
            return { success: false, error: error.message };
        }
    },
    
    async loadAll() {
        if (!this.isReady()) return null;
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/data/${this.userId}`);
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
