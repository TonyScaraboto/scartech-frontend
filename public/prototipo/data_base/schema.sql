-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
CREATE TABLE public.active_sessions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    session_token text NOT NULL UNIQUE,
    ip_address inet,
    user_agent text,
    device_hint text,
    is_revoked boolean NOT NULL DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT active_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT active_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_logs (
    id bigint NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass),
    user_id uuid,
    action text NOT NULL,
    table_name text,
    record_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    session_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.clientes (
    id bigint NOT NULL DEFAULT nextval('clientes_id_seq'::regclass),
    user_id uuid NOT NULL,
    nome text NOT NULL,
    email text,
    telefone text,
    documento text,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT clientes_pkey PRIMARY KEY (id),
    CONSTRAINT clientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.faturas_loja (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    descricao text NOT NULL,
    valor numeric NOT NULL,
    data_vencimento date NOT NULL,
    renova_mensalmente boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    pago boolean DEFAULT false,
    data_pagamento timestamp with time zone,
    CONSTRAINT faturas_loja_pkey PRIMARY KEY (id),
    CONSTRAINT faturas_loja_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.fornecedores_produtos (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    nome_fornecedor text NOT NULL,
    nome_produto text NOT NULL,
    preco numeric NOT NULL DEFAULT 0,
    tempo_entrega text,
    preco_frete numeric NOT NULL DEFAULT 0,
    contato text,
    cidade text,
    estado text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sinopse text,
    CONSTRAINT fornecedores_produtos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.login_attempts (
    id bigint NOT NULL DEFAULT nextval('login_attempts_id_seq'::regclass),
    email text NOT NULL,
    ip_address inet NOT NULL,
    success boolean NOT NULL DEFAULT false,
    user_agent text,
    attempted_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ordens_servico (
    id bigint NOT NULL DEFAULT nextval('ordens_servico_id_seq'::regclass),
    user_id uuid NOT NULL,
    cliente text NOT NULL,
    equipamento text NOT NULL,
    status text NOT NULL DEFAULT 'Aberta'::text,
    valor numeric NOT NULL DEFAULT 0,
    descricao text,
    data date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    documento_cliente text,
    telefone_cliente text,
    nome_assistencia text,
    termo_garantia text,
    previsao_entrega date,
    foto_aparelho text,
    assinatura_tecnico text,
    assinatura_cliente text,
    CONSTRAINT ordens_servico_pkey PRIMARY KEY (id),
    CONSTRAINT ordens_servico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.produtos (
    id bigint NOT NULL DEFAULT nextval('produtos_id_seq'::regclass),
    nome text NOT NULL,
    categoria text,
    estoque integer NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    preco numeric NOT NULL DEFAULT 0 CHECK (preco >= 0::numeric),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid DEFAULT auth.uid(),
    custo_compra numeric NOT NULL DEFAULT 0 CHECK (custo_compra >= 0::numeric),
    data_compra date,
    CONSTRAINT produtos_pkey PRIMARY KEY (id),
    CONSTRAINT produtos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL CHECK (
        char_length(full_name) >= 3
        AND char_length(full_name) <= 100
    ),
    email text NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'::text),
    phone text CHECK (
        phone IS NULL
        OR phone ~ '^\+?[0-9\s\-\(\)]{7,20}$'::text
    ),
    avatar_url text CHECK (
        avatar_url IS NULL
        OR avatar_url ~* '^https?://'::text
    ),
    role USER - DEFINED NOT NULL DEFAULT 'technician'::user_role,
    status USER - DEFINED NOT NULL DEFAULT 'pending_verification'::user_status,
    is_2fa_enabled boolean NOT NULL DEFAULT false,
    totp_secret text,
    failed_login_count integer NOT NULL DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    last_login_ip inet,
    last_login_ua text,
    password_changed_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    category text NOT NULL DEFAULT 'gerir assistencia'::text CHECK (
        category = ANY (
            ARRAY ['fornecedor'::text, 'gerir_assistencia'::text]
        )
    ),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.vendas (
    id bigint NOT NULL DEFAULT nextval('vendas_id_seq'::regclass),
    user_id uuid NOT NULL,
    cliente text NOT NULL,
    produto text NOT NULL,
    qtd integer NOT NULL DEFAULT 1 CHECK (qtd > 0),
    valor numeric NOT NULL DEFAULT 0,
    data date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    produto_id bigint,
    lucro numeric NOT NULL DEFAULT 0,
    pagamentos jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT vendas_pkey PRIMARY KEY (id),
    CONSTRAINT vendas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT vendas_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id)
);