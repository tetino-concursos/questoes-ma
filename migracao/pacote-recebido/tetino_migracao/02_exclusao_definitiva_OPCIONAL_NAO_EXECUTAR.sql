-- TeTino Concursos | ALTERACAO DESTRUTIVA POTENCIAL | NAO EXECUTAR SEM NOVA APROVACAO
-- Substitui a implementacao de admin_delete_question na PRODUCAO.
-- Esta alteracao permite que futuros cliques Excluir APAGUEM respostas historicas.
-- O codigo abaixo reproduz a implementacao verificada na HOMOLOGACAO.
-- ANTES: backup, aprovacao separada, teste funcional sintetico, plano de retorno.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id bigint)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_questao_id integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.eh_admin() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    IF p_id IS NULL OR p_id < -2147483648 OR p_id > 2147483647 THEN
        RAISE EXCEPTION 'Identificador de questão inválido';
    END IF;
    v_questao_id := p_id::integer;
    PERFORM 1 FROM public.questoes q WHERE q.id = v_questao_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Questão não encontrada'; END IF;
    DELETE FROM public.respostas WHERE questao_id = v_questao_id;
    DELETE FROM public.tetino_questao_pastas WHERE questao_id = v_questao_id;
    DELETE FROM public.questoes WHERE id = v_questao_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Questão não encontrada'; END IF;
END;
$function$;
COMMIT;
