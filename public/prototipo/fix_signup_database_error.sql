-- ============================================================
--  SCARTECH — Corrigir erro de banco ao criar conta (signUp)
--  Execute no Supabase → SQL Editor (uma vez)
--
--  Causas comuns deste projeto:
--  1) Coluna "category" não existe, mas o trigger fix_trigger_category.sql
--     faz INSERT nela → erro PostgreSQL ao cadastrar.
--  2) Trigger antigo (autenticacao.sql) insere em audit_logs com RLS que
--     bloqueia INSERT (política "INSERT WITH CHECK (false)") → falha no trigger.
-- 3) Dois triggers em auth.users tentando criar o mesmo perfil.
-- ============================================================

-- 1) Garantir coluna usada pelo frontend (index.html envia category no signUp)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'gerir_assistencia';

-- 2) Função única: só cria/atualiza perfil (sem audit_logs — evita RLS no log)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_category text;
BEGIN
  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Usuário');
  v_category := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'category'), ''),
    'gerir_assistencia'
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    category,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_category,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = EXCLUDED.email,
    category = COALESCE(EXCLUDED.category, public.profiles.category),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 3) Um único trigger (remove nomes antigos usados em scripts diferentes)
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verificação rápida:
-- SELECT tgname FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
-- WHERE c.relname = 'users' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');
