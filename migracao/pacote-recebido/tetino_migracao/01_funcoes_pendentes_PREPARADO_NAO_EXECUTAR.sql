-- TeTino Concursos | PACOTE PARA REVISAO | NAO EXECUTAR SEM APROVACAO
-- Alvo futuro: PRODUCAO kdalqvbexttclxtjmsxc
-- Fonte: HOMOLOGACAO jxyaoorlibbfwznbgceo (pg_get_functiondef, 2026-10-21)
-- IMPORTANTE: a funcao de exclusao depende de admin_delete_question.
-- Em PRODUCAO, admin_delete_question AINDA NAO APAGA respostas nem tetino_questao_pastas.
-- Logo, a instalacao desta funcao wrapper NAO habilita a exclusao completa!
-- Nao aplicar este arquivo antes da aprovacao da estrategia de exclusao e dos testes.
BEGIN;

CREATE OR REPLACE FUNCTION public.tetino_admin_excluir_questao_completa(p_id bigint)
 RETURNS void LANGUAGE plpgsql SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.admin_delete_question(p_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.tetino_catalogo_questoes()
 RETURNS TABLE(id integer, banca text, materia text, assunto text, tipo text, texto text, opcoes text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
    SELECT q.id, q.banca, q.materia, q.assunto, q.tipo, q.texto, q.opcoes
    FROM public.questoes q
    WHERE auth.uid() IS NOT NULL
      AND public.tetino_acesso_aprovado()
      AND q.publicada = true
      AND public.tetino_pode_ler_questao(q.id)
    ORDER BY q.id;
$function$;

CREATE OR REPLACE FUNCTION public.tetino_pastas_questoes_autorizadas()
 RETURNS TABLE(pasta_id uuid, pasta_nome text, questao_id bigint, posicao bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
    SELECT DISTINCT p.id, p.nome, qp.questao_id, qp.posicao
    FROM public.tetino_pastas p
    JOIN public.tetino_questao_pastas qp ON qp.pasta_id = p.id
    JOIN public.questoes q ON q.id = qp.questao_id
    WHERE auth.uid() IS NOT NULL
      AND public.tetino_acesso_aprovado()
      AND q.publicada = true
      AND public.tetino_pode_ler_questao(q.id)
    ORDER BY p.nome, qp.posicao, qp.questao_id;
$function$;

CREATE OR REPLACE FUNCTION public.tetino_responder_questao(p_questao_id integer, p_resposta integer)
 RETURNS TABLE(questao_id integer, resposta integer, acertou boolean, correta integer, comentario text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_questao public.questoes%ROWTYPE;
    v_acertou boolean;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Faça login para responder';
    END IF;
    IF NOT public.tetino_acesso_aprovado() THEN
        RAISE EXCEPTION 'Cadastro ainda não aprovado';
    END IF;
    SELECT q.* INTO v_questao
    FROM public.questoes AS q
    WHERE q.id = p_questao_id AND q.publicada = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Questão não encontrada ou indisponível';
    END IF;
    IF NOT public.tetino_pode_ler_questao(p_questao_id) THEN
        RAISE EXCEPTION 'Você não possui acesso a esta questão';
    END IF;
    IF p_resposta IS NULL OR p_resposta < 0
       OR p_resposta >= COALESCE(array_length(v_questao.opcoes, 1), 0)
    THEN
        RAISE EXCEPTION 'Alternativa inválida';
    END IF;
    v_acertou := (p_resposta = v_questao.correta);
    INSERT INTO public.respostas (user_id, questao_id, resposta, acertou, atualizado_em)
    VALUES (v_user_id, p_questao_id, p_resposta, v_acertou, now())
    ON CONFLICT ON CONSTRAINT respostas_usuario_questao_unique
    DO UPDATE SET resposta = EXCLUDED.resposta,
                  acertou = EXCLUDED.acertou,
                  atualizado_em = now();
    RETURN QUERY SELECT v_questao.id, p_resposta, v_acertou,
                        v_questao.correta, v_questao.comentario;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tetino_texto_apoio_autorizado(p_questao_id bigint)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
    SELECT COALESCE((
        SELECT t.texto
        FROM public.tetino_textos_apoio AS t
        JOIN public.questoes AS q ON q.id = t.questao_id
        WHERE t.questao_id = p_questao_id
          AND q.publicada = true
          AND auth.uid() IS NOT NULL
          AND public.tetino_acesso_aprovado()
          AND public.tetino_pode_ler_questao(q.id)
    ), '');
$function$;

-- O Postgres concede EXECUTE a PUBLIC por padrao em novas funcoes.
-- Negar anon e PUBLIC e conceder apenas authenticated, mantendo chamadas do site.
REVOKE ALL ON FUNCTION public.tetino_admin_excluir_questao_completa(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tetino_catalogo_questoes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tetino_pastas_questoes_autorizadas() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tetino_responder_questao(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tetino_texto_apoio_autorizado(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tetino_admin_excluir_questao_completa(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tetino_catalogo_questoes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tetino_pastas_questoes_autorizadas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tetino_responder_questao(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tetino_texto_apoio_autorizado(bigint) TO authenticated;
COMMIT;
