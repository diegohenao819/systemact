## Base de datos en SupaBase

CREATE TABLE public.areas (
id_area integer NOT NULL DEFAULT nextval('areas_id_area_seq'::regclass),
nombre_area text NOT NULL UNIQUE,
estado text DEFAULT 'ACTIVO'::text CHECK (estado = ANY (ARRAY['ACTIVO'::text, 'INACTIVO'::text])),
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT areas_pkey PRIMARY KEY (id_area)
);
CREATE TABLE public.bajas (
id_baja integer NOT NULL DEFAULT nextval('bajas_id_baja_seq'::regclass),
id_bien integer NOT NULL,
motivo text NOT NULL CHECK (motivo = ANY (ARRAY['DAÑO IRREPARABLE'::text, 'OBSOLESCENCIA'::text, 'ROBO'::text, 'PERDIDA'::text, 'DONACION'::text, 'VENTA'::text, 'OTRO'::text])),
descripcion text,
usuario_registro uuid NOT NULL,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT bajas_pkey PRIMARY KEY (id_baja),
CONSTRAINT bajas_id_bien_fkey FOREIGN KEY (id_bien) REFERENCES public.bienes(id_bien),
CONSTRAINT bajas_usuario_registro_fkey FOREIGN KEY (usuario_registro) REFERENCES public.profiles(id)
);
CREATE TABLE public.bienes (
id_bien integer NOT NULL DEFAULT nextval('bienes_id_bien_seq'::regclass),
codigo_generado text NOT NULL UNIQUE,
nombre text NOT NULL,
id_caracteristica integer,
id_responsable uuid,
id_sede integer NOT NULL,
id_area integer,
serial text,
placa text UNIQUE,
cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
valor_unitario numeric NOT NULL DEFAULT 0,
valor_total numeric DEFAULT ((cantidad)::numeric \* valor_unitario),
estado text NOT NULL DEFAULT 'ACTIVO'::text CHECK (estado = ANY (ARRAY['ACTIVO'::text, 'INACTIVO'::text, 'DE BAJA'::text])),
imagen_url text,
observaciones text,
fecha_registro timestamp with time zone DEFAULT now(),
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
responsable_texto text,
CONSTRAINT bienes_pkey PRIMARY KEY (id_bien),
CONSTRAINT bienes_id_caracteristica_fkey FOREIGN KEY (id_caracteristica) REFERENCES public.caracteristicas(id_caracteristica),
CONSTRAINT bienes_id_responsable_fkey FOREIGN KEY (id_responsable) REFERENCES public.profiles(id),
CONSTRAINT bienes_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sedes(id_sede),
CONSTRAINT bienes_id_area_fkey FOREIGN KEY (id_area) REFERENCES public.areas(id_area)
);
CREATE TABLE public.caracteristicas (
id_caracteristica integer NOT NULL DEFAULT nextval('caracteristicas_id_caracteristica_seq'::regclass),
codigo text NOT NULL UNIQUE,
descripcion text NOT NULL,
imagen_url text,
observaciones text,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT caracteristicas_pkey PRIMARY KEY (id_caracteristica)
);
CREATE TABLE public.instruments (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
name text NOT NULL,
CONSTRAINT instruments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.movimiento_bienes (
id_movimiento integer NOT NULL DEFAULT nextval('movimiento_bienes_id_movimiento_seq'::regclass),
id_bien integer NOT NULL,
tipo_movimiento text NOT NULL CHECK (tipo_movimiento = ANY (ARRAY['REGISTRO'::text, 'TRANSFERENCIA'::text, 'BAJA'::text, 'MODIFICACION'::text])),
detalle text,
usuario_responsable uuid NOT NULL,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT movimiento_bienes_pkey PRIMARY KEY (id_movimiento),
CONSTRAINT movimiento_bienes_id_bien_fkey FOREIGN KEY (id_bien) REFERENCES public.bienes(id_bien),
CONSTRAINT movimiento_bienes_usuario_responsable_fkey FOREIGN KEY (usuario_responsable) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
id uuid NOT NULL,
nombre text NOT NULL DEFAULT ''::text,
apellido text NOT NULL DEFAULT ''::text,
cedula text UNIQUE,
cargo text,
rol text NOT NULL DEFAULT 'CONSULTOR'::text CHECK (rol = ANY (ARRAY['ADMINISTRADOR'::text, 'ESTANDAR'::text, 'CONSULTOR'::text])),
id_sede integer,
area text,
activo boolean DEFAULT true,
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT profiles_pkey PRIMARY KEY (id),
CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
CONSTRAINT profiles_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sedes(id_sede)
);
CREATE TABLE public.sedes (
id_sede integer NOT NULL DEFAULT nextval('sedes_id_sede_seq'::regclass),
nombre_sede text NOT NULL UNIQUE,
abreviatura text,
ciudad text,
direccion text,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT sedes_pkey PRIMARY KEY (id_sede)
);
CREATE TABLE public.transferencias (
id_transferencia integer NOT NULL DEFAULT nextval('transferencias_id_transferencia_seq'::regclass),
id_bien integer NOT NULL,
sede_origen integer NOT NULL,
sede_destino integer NOT NULL,
area_origen text,
area_destino text,
responsable_origen uuid,
responsable_destino uuid,
motivo text NOT NULL,
usuario_registro uuid NOT NULL,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT transferencias_pkey PRIMARY KEY (id_transferencia),
CONSTRAINT transferencias_id_bien_fkey FOREIGN KEY (id_bien) REFERENCES public.bienes(id_bien),
CONSTRAINT transferencias_sede_origen_fkey FOREIGN KEY (sede_origen) REFERENCES public.sedes(id_sede),
CONSTRAINT transferencias_sede_destino_fkey FOREIGN KEY (sede_destino) REFERENCES public.sedes(id_sede),
CONSTRAINT transferencias_responsable_origen_fkey FOREIGN KEY (responsable_origen) REFERENCES public.profiles(id),
CONSTRAINT transferencias_responsable_destino_fkey FOREIGN KEY (responsable_destino) REFERENCES public.profiles(id),
CONSTRAINT transferencias_usuario_registro_fkey FOREIGN KEY (usuario_registro) REFERENCES public.profiles(id)
);
