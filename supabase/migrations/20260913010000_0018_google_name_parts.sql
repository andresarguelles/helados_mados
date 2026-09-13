-- 0018: derivar nombre y apellido de `full_name` cuando Google no manda given_name/family_name.
--
-- 0017 asumía que identity_data traía `given_name` y `family_name`. En la práctica, el payload que
-- llega de Google en este proyecto solo trae `name`, `full_name`, `email`, `picture` y `avatar_url`
-- (verificado sobre las identidades reales), así que el nombre y el apellido quedaban en NULL.
-- La partición se hace por el primer espacio: "Andres Arguelles Gonzalez" -> "Andres" +
-- "Arguelles Gonzalez", que es lo correcto para nombres mexicanos con dos apellidos. Es una
-- heurística, y por eso el usuario puede corregirla desde /perfil.

create or replace function public.google_name_parts(p_data jsonb)
returns table(first_name text, last_name text)
language sql immutable set search_path = public, extensions
as $$
  with fuente as (
    select nullif(trim(coalesce(p_data->>'full_name', p_data->>'name', '')), '') as nombre
  )
  select
    -- Si Google sí mandó las llaves separadas, esas ganan.
    coalesce(
      nullif(trim(p_data->>'given_name'), ''),
      nullif(split_part(coalesce(nombre, ''), ' ', 1), '')
    ),
    coalesce(
      nullif(trim(p_data->>'family_name'), ''),
      -- Sin espacio no hay apellido que extraer; si no, todo lo que sigue al primer espacio.
      case
        when position(' ' in coalesce(nombre, '')) > 0
          then nullif(trim(substring(nombre from position(' ' in nombre) + 1)), '')
        else null
      end
    )
  from fuente;
$$;

revoke all on function public.google_name_parts(jsonb) from public, anon, authenticated;

-- Reemplaza la versión de 0017 para usar el helper.
create or replace function public.handle_identity_linked()
returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_data  jsonb := coalesce(new.identity_data, '{}'::jsonb);
  v_first text;
  v_last  text;
begin
  if new.provider <> 'google' then
    return new;
  end if;

  select n.first_name, n.last_name into v_first, v_last
  from public.google_name_parts(v_data) n;

  update public.profiles set
    -- Google es la fuente de verdad del correo: se refresca siempre.
    email      = coalesce(nullif(v_data->>'email', ''), email),
    -- Estos no pisan lo que el usuario ya escribió a mano.
    first_name = coalesce(first_name, v_first),
    last_name  = coalesce(last_name,  v_last),
    avatar_url = coalesce(nullif(v_data->>'avatar_url', ''), nullif(v_data->>'picture', ''), avatar_url)
  where id = new.user_id;

  return new;
end;
$$;

-- Rellena las cuentas que 0017 dejó sin nombre. Idempotente: el coalesce respeta lo ya escrito.
update public.profiles p set
  first_name = coalesce(p.first_name, n.first_name),
  last_name  = coalesce(p.last_name,  n.last_name)
from auth.identities i,
     lateral public.google_name_parts(i.identity_data) n
where i.user_id = p.id and i.provider = 'google';
