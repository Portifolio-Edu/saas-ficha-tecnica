-- Reverte 20261002100000_avisos_whatsapp: some a central de avisos (config,
-- histórico e a função de reserva). Desligue o workflow "FT — Avisos" antes.
begin;
drop function if exists public.reservar_avisos(integer);
drop table if exists avisos;
drop table if exists avisos_config;
commit;
