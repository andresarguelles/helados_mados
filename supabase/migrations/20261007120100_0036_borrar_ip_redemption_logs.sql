-- 0036 — El canje deja de mirar la IP (parte B: se borra el rastro).
--
-- Se aplica DESPUES de desplegar la edge function redeem-keyword que llama a
-- redeem_keyword(p_keyword) (0035): a partir de ahi nadie usa la firma vieja.
--
-- Se borran la RPC que recibia el hash y la tabla con los hashes de IP (con pepper) que
-- contaban canjes por red. Con la tabla se van sus datos, su indice (0011) y su FK a dynamics.
-- El pepper (secreto IP_HASH_PEPPER de la edge function) se borra aparte, en el panel.
--
-- Queda fuera de alcance lo que no es nuestro: los registros tecnicos de Supabase y Vercel
-- siguen viendo la IP de cada peticion, y el aviso de privacidad lo declara.

drop function public.redeem_keyword(text, text);

drop table public.ip_redemption_logs;
