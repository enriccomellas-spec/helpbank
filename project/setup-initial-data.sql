-- Crear una empresa de ejemplo
INSERT INTO companies (name, primary_color, secondary_color)
VALUES ('Mi Empresa', '#2563eb', '#1e40af')
ON CONFLICT DO NOTHING;

-- Nota: Para crear el primer administrador, necesitas:
-- 1. Crear un usuario en Supabase Auth con email y contraseña
-- 2. Luego insertar en la tabla administrators con ese user_id

