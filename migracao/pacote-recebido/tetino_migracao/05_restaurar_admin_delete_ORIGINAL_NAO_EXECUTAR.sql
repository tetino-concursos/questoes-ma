-- Definicao ORIGINAL de PRODUCAO, capturada por pg_get_functiondef antes de qualquer mudanca.
-- So executavel mediante autorizacao especifica de reversao.
-- NAO restaura dados excluidos (questoes, respostas, vinculos).
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not public.eh_admin() then raise exception 'Acesso negado'; end if;
  delete from public.questoes where id=p_id;
  if not found then raise exception 'Questão não encontrada'; end if;
end $function$;
COMMIT;
