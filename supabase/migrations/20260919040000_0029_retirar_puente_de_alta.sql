-- 0029 — Fuera el puente. La web nueva ya esta en produccion.
--
-- La 0026 devolvio temporalmente la firma de tres parametros de complete_signup, porque la
-- 0023 la habia eliminado mientras el cliente desplegado seguia llamandola y eso dejo las
-- altas caidas. Era un puente, no un diseno: no registraba ni la declaracion de edad ni la
-- aceptacion del texto legal, asi que mientras existio hubo un camino de alta que no dejaba
-- constancia de nada.
--
-- Verificado antes de correr esto: el bundle servido en www.heladosmados.com es el nuevo
-- (trae la ruta /eliminar-cuenta, el banner de cookies y el correo corregido), y por tanto
-- llama a la firma de seis parametros.
--
-- A partir de aqui vuelve a haber una sola forma de crear una cuenta, y exige edad y
-- aceptacion. Una pestana vieja que siguiera abierta fallara hasta recargar: es el precio
-- correcto frente a dejar abierta una puerta sin constancia.

drop function if exists public.complete_signup(text, text, boolean);
