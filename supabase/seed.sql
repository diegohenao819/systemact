-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTEMACT — Datos de ejemplo (seed)
-- ═══════════════════════════════════════════════════════════════════════════
-- Se ejecuta automáticamente con `supabase db reset`. Carga catálogos
-- mínimos para que el sistema sea utilizable después de un clone limpio:
-- sedes de Conviventia, áreas organizacionales y tipos de bienes con sus
-- prefijos para los códigos automáticos.
--
-- Es idempotente: usa ON CONFLICT para no duplicar al re-ejecutar.
-- No crea usuarios — el primer admin se promueve manualmente con SQL una
-- vez registrado vía la app (ver README de supabase/).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── Sedes ───
insert into public.sedes (nombre_sede, abreviatura, ciudad, direccion) values
  ('Sede Nacional Bogotá', 'BOG',  'Bogotá',     'Calle 100 #15-20'),
  ('Sede Medellín',        'MED',  'Medellín',   'Carrera 70 #10-30'),
  ('Sede Cali',            'CALI', 'Cali',       'Avenida 6N #25-15'),
  ('Sede Barranquilla',    'BAQ',  'Barranquilla','Calle 84 #50-32')
on conflict (nombre_sede) do nothing;


-- ─── Áreas organizacionales ───
insert into public.areas (nombre_area, estado) values
  ('Gestión Administrativa y Financiera (GAF)', 'ACTIVO'),
  ('Focos',                                     'ACTIVO'),
  ('Tecnología',                                'ACTIVO'),
  ('Talento Humano',                            'ACTIVO'),
  ('Comunicaciones',                            'ACTIVO'),
  ('Dirección',                                 'ACTIVO')
on conflict (nombre_area) do nothing;


-- ─── Características (tipos de bienes con prefijos para código automático) ───
insert into public.caracteristicas (codigo, descripcion, observaciones) values
  ('COMP', 'Computador de escritorio',     'Incluye torre, monitor y periféricos'),
  ('PORT', 'Computador portátil',          'Laptops y notebooks'),
  ('MON',  'Monitor',                      'Pantallas externas'),
  ('IMP',  'Impresora',                    'Impresoras y multifuncionales'),
  ('MOB',  'Mobiliario de oficina',        'Sillas, escritorios, archivadores'),
  ('VID',  'Equipo de videoconferencia',   'Cámaras, micrófonos, displays'),
  ('TEL',  'Teléfono / dispositivo móvil', 'Celulares, smartphones, tablets'),
  ('RED',  'Equipo de red',                'Routers, switches, access points'),
  ('OTRO', 'Otro tipo de bien',            'Para casos no clasificados')
on conflict (codigo) do nothing;
