-- =============================================================
--  SCARTECH — SUPABASE SQL SETUP
--  Segurança: RLS, roles, auditoria, rate limiting, 2FA ready
--  Execute no Supabase SQL Editor (em ordem)
-- =============================================================
-- ============================================================
-- 0. EXTENSÕES NECESSÁRIAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- UUIDs seguros
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Criptografia interna
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
-- Monitoramento de queries
-- ============================================================
-- 1. ENUM TYPES
-- ============================================================
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'technician', 'viewer');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- 2. TABELA: profiles
--    Extende auth.users do Supabase com dados do negócio
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (
        char_length(full_name) BETWEEN 3 AND 100
    ),
    email TEXT NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
    phone TEXT CHECK (
        phone IS NULL
        OR phone ~ '^\+?[0-9\s\-\(\)]{7,20}$'
    ),
    avatar_url TEXT CHECK (
        avatar_url IS NULL
        OR avatar_url ~* '^https?://'
    ),
    role user_role NOT NULL DEFAULT 'technician',
    status user_status NOT NULL DEFAULT 'pending_verification',
    is_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret TEXT,
    -- Segredo TOTP (criptografado via app)
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_login_ua TEXT,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Evita emails duplicados na tabela profiles
    UNIQUE (email)
);
COMMENT ON TABLE public.profiles IS 'Perfis de usuários — extende auth.users com dados do ScarTech';
-- ============================================================
-- 3. TABELA: audit_logs
--    Registro imutável de ações sensíveis (WORM-style)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        action TEXT NOT NULL,
        -- Ex: 'login', 'profile_update', 'delete_order'
        table_name TEXT,
        record_id TEXT,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        session_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Audit logs nunca são atualizados ou deletados por usuários
-- (RLS sem UPDATE/DELETE para ninguém exceto service_role)
COMMENT ON TABLE public.audit_logs IS 'Log imutável de auditoria — nunca deletar manualmente';
-- ============================================================
-- 4. TABELA: login_attempts
--    Rate limiting server-side para brute force protection
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address INET NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index para consultas rápidas de rate limiting
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts (ip_address, attempted_at DESC);
COMMENT ON TABLE public.login_attempts IS 'Tentativas de login para detecção de brute force';
-- ============================================================
-- 5. TABELA: active_sessions
--    Controle de sessões ativas do usuário
-- ============================================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    -- Token hasheado (SHA-256)
    ip_address INET,
    user_agent TEXT,
    device_hint TEXT,
    -- Ex: 'Chrome / Windows'
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions (user_id)
WHERE is_revoked = FALSE;
-- ============================================================
-- 6. INDEXES DE PERFORMANCE + SEGURANÇA
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON public.audit_logs (user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_logs (table_name, record_id);
-- ============================================================
-- 7. FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- ============================================================
-- 8. FUNÇÃO: criar perfil automaticamente ao criar usuário
--    Dispara via trigger no auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, full_name, email, role, status)
VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        NEW.email,
        'technician',
        -- role padrão: técnico
        'pending_verification'
    ) ON CONFLICT (id) DO NOTHING;
-- Audit: novo usuário criado
INSERT INTO public.audit_logs (user_id, action, new_values)
VALUES (
        NEW.id,
        'user_created',
        jsonb_build_object('email', NEW.email, 'created_at', now())
    );
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8B. SINCRONIZAR EMAIL DO PERFIL COM AUTH.USERS
--    MantÃ©m profiles.email sempre igual ao email real do Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_email_update ON auth.users;
CREATE TRIGGER trg_on_auth_user_email_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_update();
-- ============================================================
-- 9. FUNÇÃO: registrar login bem-sucedido
--    Chame esta função via API após signIn()
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_login(
        p_user_id UUID,
        p_ip INET DEFAULT NULL,
        p_ua TEXT DEFAULT NULL
    ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Atualiza perfil com info do último login
UPDATE public.profiles
SET last_login_at = now(),
    last_login_ip = p_ip,
    last_login_ua = p_ua,
    failed_login_count = 0,
    -- Reseta contador de falhas
    locked_until = NULL
WHERE id = p_user_id;
-- Registra tentativa bem-sucedida
INSERT INTO public.login_attempts (email, ip_address, success, user_agent)
SELECT email,
    p_ip,
    TRUE,
    p_ua
FROM public.profiles
WHERE id = p_user_id;
-- Audit
INSERT INTO public.audit_logs (user_id, action, ip_address, user_agent)
VALUES (p_user_id, 'login_success', p_ip, p_ua);
END;
$$;
-- ============================================================
-- 10. FUNÇÃO: registrar tentativa de login falha
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_failed_login(
        p_email TEXT,
        p_ip INET DEFAULT NULL,
        p_ua TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_user_id UUID;
v_attempts INTEGER;
v_locked TIMESTAMPTZ;
v_max_attempts CONSTANT INTEGER := 5;
v_lockout_min CONSTANT INTEGER := 30;
BEGIN -- Busca usuário pelo email
SELECT id,
    failed_login_count,
    locked_until INTO v_user_id,
    v_attempts,
    v_locked
FROM public.profiles
WHERE email = lower(trim(p_email));
-- Registra tentativa falha na tabela de logs
INSERT INTO public.login_attempts (email, ip_address, success, user_agent)
VALUES (lower(trim(p_email)), p_ip, FALSE, p_ua);
-- Se o usuário existe, incrementa contador
IF v_user_id IS NOT NULL THEN v_attempts := COALESCE(v_attempts, 0) + 1;
IF v_attempts >= v_max_attempts THEN -- Bloqueia a conta por 30 minutos
UPDATE public.profiles
SET failed_login_count = v_attempts,
    locked_until = now() + (v_lockout_min || ' minutes')::INTERVAL
WHERE id = v_user_id;
-- Audit: conta bloqueada
INSERT INTO public.audit_logs (
        user_id,
        action,
        ip_address,
        user_agent,
        new_values
    )
VALUES (
        v_user_id,
        'account_locked',
        p_ip,
        p_ua,
        jsonb_build_object(
            'locked_until',
            now() + (v_lockout_min || ' minutes')::INTERVAL,
            'attempts',
            v_attempts
        )
    );
RETURN jsonb_build_object(
    'locked',
    TRUE,
    'unlock_at',
    now() + (v_lockout_min || ' minutes')::INTERVAL,
    'message',
    'Conta bloqueada por ' || v_lockout_min || ' minutos.'
);
ELSE
UPDATE public.profiles
SET failed_login_count = v_attempts
WHERE id = v_user_id;
END IF;
END IF;
RETURN jsonb_build_object(
    'locked',
    FALSE,
    'attempts',
    COALESCE(v_attempts, 1)
);
END;
$$;
-- ============================================================
-- 11. FUNÇÃO: verificar se conta está bloqueada
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_account_lock(p_email TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_locked_until TIMESTAMPTZ;
v_status user_status;
BEGIN
SELECT locked_until,
    status INTO v_locked_until,
    v_status
FROM public.profiles
WHERE email = lower(trim(p_email));
IF v_status = 'suspended' THEN RETURN jsonb_build_object('blocked', TRUE, 'reason', 'account_suspended');
END IF;
IF v_locked_until IS NOT NULL
AND v_locked_until > now() THEN RETURN jsonb_build_object(
    'blocked',
    TRUE,
    'reason',
    'too_many_attempts',
    'unlock_at',
    v_locked_until,
    'seconds_remaining',
    EXTRACT(
        EPOCH
        FROM (v_locked_until - now())
    )::INTEGER
);
END IF;
RETURN jsonb_build_object('blocked', FALSE);
END;
$$;
-- ============================================================
-- 12. FUNÇÃO: revogar todas as sessões do usuário
--    Use em: troca de senha, suspeita de comprometimento
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_all_sessions(p_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE public.active_sessions
SET is_revoked = TRUE
WHERE user_id = p_user_id
    AND is_revoked = FALSE;
-- Força logout no Supabase Auth
-- (chame também supabaseAdmin.auth.signOut na sua API)
INSERT INTO public.audit_logs (user_id, action)
VALUES (p_user_id, 'all_sessions_revoked');
END;
$$;
-- ============================================================
-- 13. FUNÇÃO: limpar dados antigos automaticamente (CRON-ready)
--    Agende via pg_cron ou Edge Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_data() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Remove tentativas de login com mais de 30 dias
DELETE FROM public.login_attempts
WHERE attempted_at < now() - INTERVAL '30 days';
-- Remove sessões expiradas há mais de 7 dias
DELETE FROM public.active_sessions
WHERE expires_at < now() - INTERVAL '7 days';
END;
$$;
-- ============================================================
-- 14. VIEW SEGURA: perfil do usuário logado
--    Exposta via API — só retorna dados do próprio usuário
-- ============================================================
CREATE OR REPLACE VIEW public.my_profile AS
SELECT p.id,
    p.full_name,
    u.email,
    p.phone,
    p.avatar_url,
    p.role,
    p.status,
    p.is_2fa_enabled,
    p.last_login_at,
    p.password_changed_at,
    p.created_at,
    p.updated_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = auth.uid();
-- ============================================================
-- 15. HABILITAR ROW LEVEL SECURITY (RLS)
--    NENHUM dado acessível sem autenticação
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
-- ============================================================
-- 16. POLÍTICAS RLS — profiles
-- ============================================================
-- Usuário vê apenas o próprio perfil
CREATE POLICY "profiles: leitura própria" ON public.profiles FOR
SELECT USING (auth.uid() = id);
-- Usuário edita apenas o próprio perfil (campos permitidos)
CREATE POLICY "profiles: edição própria" ON public.profiles FOR
UPDATE USING (auth.uid() = id) WITH CHECK (
        auth.uid() = id
        AND role = (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) -- Não pode auto-promover
        AND status = (
            SELECT status
            FROM public.profiles
            WHERE id = auth.uid()
        ) -- Não pode se ativar
    );
-- Admin vê todos os perfis
CREATE POLICY "profiles: admin leitura total" ON public.profiles FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- Admin edita qualquer perfil
CREATE POLICY "profiles: admin edição total" ON public.profiles FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- Ninguém deleta diretamente (soft delete via status='suspended')
CREATE POLICY "profiles: proibir delete direto" ON public.profiles FOR DELETE USING (FALSE);
-- ============================================================
-- 17. POLÍTICAS RLS — audit_logs
-- ============================================================
-- Usuário vê apenas seus próprios logs
CREATE POLICY "audit: leitura própria" ON public.audit_logs FOR
SELECT USING (auth.uid() = user_id);
-- Admin vê todos os logs
CREATE POLICY "audit: admin leitura total" ON public.audit_logs FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- NINGUÉM insere/atualiza/deleta via API (apenas functions SECURITY DEFINER)
CREATE POLICY "audit: bloqueio total DML direto" ON public.audit_logs FOR
INSERT WITH CHECK (FALSE);
CREATE POLICY "audit: bloqueio update" ON public.audit_logs FOR
UPDATE USING (FALSE);
CREATE POLICY "audit: bloqueio delete" ON public.audit_logs FOR DELETE USING (FALSE);
-- ============================================================
-- 18. POLÍTICAS RLS — login_attempts
-- ============================================================
-- Apenas admin visualiza tentativas de login
CREATE POLICY "login_attempts: admin only" ON public.login_attempts FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "login_attempts: bloqueio insert direto" ON public.login_attempts FOR
INSERT WITH CHECK (FALSE);
-- ============================================================
-- 19. POLÍTICAS RLS — active_sessions
-- ============================================================
-- Usuário vê apenas suas sessões
CREATE POLICY "sessions: leitura própria" ON public.active_sessions FOR
SELECT USING (auth.uid() = user_id);
-- Usuário pode revogar suas próprias sessões
CREATE POLICY "sessions: revogar própria" ON public.active_sessions FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (
        auth.uid() = user_id
        AND is_revoked = TRUE
    );
-- Admin vê todas as sessões
CREATE POLICY "sessions: admin leitura total" ON public.active_sessions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- ============================================================
-- 20. GRANTS — controle de permissões por role
-- ============================================================
-- Revoga acesso público por padrão
REVOKE ALL ON ALL TABLES IN SCHEMA public
FROM anon,
    authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public
FROM anon,
    authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public
FROM anon,
    authenticated;
-- Usuários autenticados: acesso controlado pelas políticas RLS
GRANT SELECT,
    UPDATE ON public.profiles TO authenticated;
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON public.produtos TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT,
    UPDATE ON public.active_sessions TO authenticated;
GRANT SELECT ON public.my_profile TO authenticated;
-- Funções públicas seguras
GRANT EXECUTE ON FUNCTION public.record_login(UUID, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_account_lock(TEXT) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(TEXT, INET, TEXT) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_sessions(UUID) TO authenticated;
-- ============================================================
-- 21. CONFIGURAÇÕES DE SEGURANÇA DO SUPABASE AUTH
--    Execute no Supabase Dashboard > Authentication > Settings
--    OU via SQL nos parâmetros do projeto
-- ============================================================
-- ATENÇÃO: As linhas abaixo são COMENTADAS por segurança.
-- Configure estas opções no Dashboard > Authentication:
--
--  ✅ Enable email confirmations (obrigatório)
--  ✅ Enable Secure Email Change
--  ✅ Minimum password length: 8
--  ✅ Require uppercase letter
--  ✅ Require number
--  ✅ Require special character
--  ✅ JWT expiry: 3600 (1 hora)
--  ✅ Enable refresh token rotation
--  ✅ Revoke refresh token on sign out
--  ✅ Rate limit sign-ins: 5/hour per IP
--  ❌ Disable: "Allow new user signups" (se for sistema fechado)
-- ============================================================
-- 22. DADOS INICIAIS — Usuário Admin
--    IMPORTANTE: Crie o usuário PRIMEIRO via Supabase Auth,
--    depois rode este UPDATE com o UUID gerado.
-- ============================================================
-- PASSO 1: Crie o usuário admin em:
--   Supabase Dashboard > Authentication > Users > Add User
--   (use um email e senha fortes)
-- PASSO 2: Copie o UUID gerado e substitua abaixo:
/*
 UPDATE public.profiles
 SET
 role   = 'admin',
 status = 'active',
 full_name = 'Administrador ScarTech'
 WHERE id = 'COLE-O-UUID-DO-ADMIN-AQUI';
 */
-- ============================================================
-- 23. VERIFICAÇÃO FINAL — confirme que tudo foi criado
-- ============================================================
SELECT schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Verifique as políticas:
SELECT tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename,
    policyname;







-- tabela produtos
-- Tabela de produtos
create table if not exists public.produtos (
  id bigserial primary key,
  nome text not null,
  categoria text,
  estoque integer not null default 0,
  preco numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estoque_nao_negativo check (estoque >= 0),
  constraint preco_nao_negativo check (preco >= 0)
);

-- Índices úteis para busca/filtro
create index if not exists produtos_nome_idx on public.produtos (nome);
create index if not exists produtos_categoria_idx on public.produtos (categoria);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists produtos_set_updated_at on public.produtos;
create trigger produtos_set_updated_at
before update on public.produtos
for each row execute function public.set_updated_at();

-- ============================================================
-- PRODUTOS POR USUÃRIO (multi-tenant)
-- Cada produto pertence ao usuÃ¡rio que cadastrou
-- ============================================================
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- IMPORTANTE: se jÃ¡ existir produto antigo, defina o dono antes de tornar NOT NULL
-- Exemplo (troque pelo UUID correto):
-- UPDATE public.produtos SET user_id = 'COLE-UUID-DO-USUARIO-AQUI' WHERE user_id IS NULL;

ALTER TABLE public.produtos
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Habilita RLS para garantir isolamento por usuÃ¡rio
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Remove polÃ­ticas antigas se existirem
DROP POLICY IF EXISTS "produtos: leitura prÃ³pria" ON public.produtos;
DROP POLICY IF EXISTS "produtos: inserir prÃ³prio" ON public.produtos;
DROP POLICY IF EXISTS "produtos: atualizar prÃ³prio" ON public.produtos;
DROP POLICY IF EXISTS "produtos: deletar prÃ³prio" ON public.produtos;

-- PolÃ­ticas: cada usuÃ¡rio vÃª/insere/atualiza/deleta apenas seus produtos
CREATE POLICY "produtos: leitura prÃ³pria"
  ON public.produtos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "produtos: inserir prÃ³prio"
  ON public.produtos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "produtos: atualizar prÃ³prio"
  ON public.produtos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "produtos: deletar prÃ³prio"
  ON public.produtos
  FOR DELETE
  USING (auth.uid() = user_id);





-- ============================================================
--  SCARTECH — Script SQL para Página de Perfil
--  Cole este script no SQL Editor do seu Supabase
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. GARANTIR QUE A TABELA PROFILES EXISTE COM TODAS AS COLUNAS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  email           text,
  phone           text,
  avatar_url      text,
  role            text DEFAULT 'user',
  status          text DEFAULT 'active',
  is_2fa_enabled  boolean DEFAULT false,
  totp_secret     text,
  failed_login_count int4 DEFAULT 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  last_login_ip   inet,
  last_login_ua   text,
  password_changed_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Adiciona colunas que podem estar faltando (seguro rodar mesmo se já existirem)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();


-- ────────────────────────────────────────────────────────────
-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar conflito
DROP POLICY IF EXISTS "Usuário lê próprio perfil"    ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Inserir próprio perfil"       ON public.profiles;

-- Política: cada usuário pode ler apenas seu próprio perfil
CREATE POLICY "Usuário lê próprio perfil"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: cada usuário pode atualizar apenas seu próprio perfil
CREATE POLICY "Usuário atualiza próprio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: permite inserção apenas do próprio registro
CREATE POLICY "Inserir próprio perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- 3. TRIGGER — Cria perfil automaticamente ao cadastrar usuário
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Garante que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 4. TRIGGER — Atualiza updated_at automaticamente
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 5. BUCKET DE AVATARES (Storage)
-- ────────────────────────────────────────────────────────────

-- Cria bucket público para avatares (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Remove políticas antigas do storage
DROP POLICY IF EXISTS "Avatar upload próprio"   ON storage.objects;
DROP POLICY IF EXISTS "Avatar público leitura"  ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete próprio"   ON storage.objects;

-- Usuário pode fazer upload do próprio avatar
CREATE POLICY "Avatar upload próprio"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Qualquer um pode ver avatares (público)
CREATE POLICY "Avatar público leitura"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Usuário pode deletar/atualizar o próprio avatar
CREATE POLICY "Avatar delete próprio"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ────────────────────────────────────────────────────────────
-- 6. CRIAR PERFIS PARA USUÁRIOS JÁ EXISTENTES (retroativo)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Usuário'),
  u.email,
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);


-- ────────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- ────────────────────────────────────────────────────────────
-- Após rodar este script, a página perfil.html poderá:
--   ✅ Ler dados do usuário logado
--   ✅ Editar nome, telefone
--   ✅ Fazer upload de foto de perfil
--   ✅ Ver data de criação da conta
-- ────────────────────────────────────────────────────────────

-- ============================================================
--  SCARTECH � ORDENS DE SERVI�O (por usu�rio)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente    text NOT NULL,
  equipamento text NOT NULL,
  status     text NOT NULL DEFAULT 'Aberta',
  valor      numeric(10,2) NOT NULL DEFAULT 0,
  descricao  text,
  data       date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ordens_user_idx ON public.ordens_servico (user_id);
CREATE INDEX IF NOT EXISTS ordens_data_idx ON public.ordens_servico (data);

DROP TRIGGER IF EXISTS ordens_set_updated_at ON public.ordens_servico;
CREATE TRIGGER ordens_set_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ordens: leitura pr�pria"  ON public.ordens_servico;
DROP POLICY IF EXISTS "ordens: inserir pr�pria"  ON public.ordens_servico;
DROP POLICY IF EXISTS "ordens: atualizar pr�pria" ON public.ordens_servico;
DROP POLICY IF EXISTS "ordens: deletar pr�pria"   ON public.ordens_servico;

CREATE POLICY "ordens: leitura pr�pria"
  ON public.ordens_servico
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ordens: inserir pr�pria"
  ON public.ordens_servico
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ordens: atualizar pr�pria"
  ON public.ordens_servico
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ordens: deletar pr�pria"
  ON public.ordens_servico
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;

-- ============================================================
--  SCARTECH � VENDAS (por usu�rio)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendas (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente    text NOT NULL,
  produto    text NOT NULL,
  qtd        integer NOT NULL DEFAULT 1 CHECK (qtd > 0),
  valor      numeric(10,2) NOT NULL DEFAULT 0,
  data       date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendas_user_idx ON public.vendas (user_id);
CREATE INDEX IF NOT EXISTS vendas_data_idx ON public.vendas (data);

DROP TRIGGER IF EXISTS vendas_set_updated_at ON public.vendas;
CREATE TRIGGER vendas_set_updated_at
BEFORE UPDATE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas: leitura pr�pria"  ON public.vendas;
DROP POLICY IF EXISTS "vendas: inserir pr�pria"  ON public.vendas;
DROP POLICY IF EXISTS "vendas: atualizar pr�pria" ON public.vendas;
DROP POLICY IF EXISTS "vendas: deletar pr�pria"   ON public.vendas;

CREATE POLICY "vendas: leitura pr�pria"
  ON public.vendas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vendas: inserir pr�pria"
  ON public.vendas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vendas: atualizar pr�pria"
  ON public.vendas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vendas: deletar pr�pria"
  ON public.vendas
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;

-- ============================================================
--  SCARTECH � CLIENTES (por usu�rio)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  email      text,
  telefone   text,
  documento  text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clientes_user_idx ON public.clientes (user_id);
CREATE INDEX IF NOT EXISTS clientes_nome_idx ON public.clientes (nome);

DROP TRIGGER IF EXISTS clientes_set_updated_at ON public.clientes;
CREATE TRIGGER clientes_set_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes: leitura pr�pria"  ON public.clientes;
DROP POLICY IF EXISTS "clientes: inserir pr�prio"  ON public.clientes;
DROP POLICY IF EXISTS "clientes: atualizar pr�prio" ON public.clientes;
DROP POLICY IF EXISTS "clientes: deletar pr�prio"   ON public.clientes;

CREATE POLICY "clientes: leitura pr�pria"
  ON public.clientes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "clientes: inserir pr�prio"
  ON public.clientes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clientes: atualizar pr�prio"
  ON public.clientes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clientes: deletar pr�prio"
  ON public.clientes
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;

-- ============================================================
--  SCARTECH � AJUSTES DE PRODUTOS E VENDAS (custo/lucro)
-- ============================================================
-- Produtos: custo de compra
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS custo_compra numeric(10,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.produtos
    ADD CONSTRAINT custo_compra_nao_negativo CHECK (custo_compra >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Vendas: produto_id e lucro
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS produto_id bigint REFERENCES public.produtos(id) ON DELETE SET NULL;

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS lucro numeric(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS vendas_produto_idx ON public.vendas (produto_id);

-- Fun��o at�mica para registrar venda e baixar estoque
CREATE OR REPLACE FUNCTION public.registrar_venda(
  p_produto_id bigint,
  p_cliente text,
  p_qtd integer,
  p_valor numeric,
  p_data date DEFAULT current_date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $
DECLARE
  v_user_id uuid;
  v_prod record;
  v_lucro numeric(10,2);
  v_valor numeric(10,2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, user_id, estoque, custo_compra, nome, preco
  INTO v_prod
  FROM public.produtos
  WHERE id = p_produto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'produto_nao_encontrado';
  END IF;

  IF v_prod.user_id <> v_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_qtd IS NULL OR p_qtd <= 0 THEN
    RAISE EXCEPTION 'qtd_invalida';
  END IF;

  IF v_prod.estoque < p_qtd THEN
    RAISE EXCEPTION 'estoque_insuficiente';
  END IF;

  v_valor := COALESCE(NULLIF(p_valor, 0), p_qtd * COALESCE(v_prod.preco, 0));
  v_lucro := v_valor - (p_qtd * COALESCE(v_prod.custo_compra, 0));

  UPDATE public.produtos
  SET estoque = estoque - p_qtd,
      updated_at = now()
  WHERE id = p_produto_id;

  INSERT INTO public.vendas (user_id, cliente, produto, produto_id, qtd, valor, lucro, data)
  VALUES (v_user_id, p_cliente, v_prod.nome, p_produto_id, p_qtd, v_valor, v_lucro, p_data);
END;
$;

GRANT EXECUTE ON FUNCTION public.registrar_venda(bigint, text, integer, numeric, date) TO authenticated;
