-- ============================================================
-- SCARTECH — ATUALIZAÇÃO TABELA FORNECEDORES
-- Adiciona campo de Sinopse (Descrição) para Fornecedores
-- ============================================================

-- Adiciona a coluna sinopse se não existir
ALTER TABLE public.fornecedores_produtos 
ADD COLUMN IF NOT EXISTS sinopse TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.fornecedores_produtos.sinopse IS 'Descrição curta ou sinopse da loja do fornecedor';

-- Opcional: Index para busca rápida por texto (se houver muitos)
CREATE INDEX IF NOT EXISTS idx_fornecedores_sinopse ON public.fornecedores_produtos USING gin(to_tsvector('portuguese', COALESCE(sinopse, '')));
