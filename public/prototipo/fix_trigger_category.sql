-- ============================================================
--  SCARTECH — Correção: Trigger que salva a categoria da conta
--  Execute no Supabase SQL Editor
-- ============================================================
-- Atualiza a função do trigger para também salvar 'category'
-- lendo de raw_user_meta_data (enviado no signUp pelo frontend)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'category',
            'gerir_assistencia'
        ),
        now(),
        now()
    ) ON CONFLICT (id) DO
UPDATE
SET category = COALESCE(
        NEW.raw_user_meta_data->>'category',
        'gerir_assistencia'
    ),
    updated_at = now();
RETURN NEW;
END;
$$;
-- Garante que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================
-- Verificação: veja as categorias salvas
-- ============================================================
-- SELECT id, full_name, email, category FROM public.profiles ORDER BY created_at DESC LIMIT 10;