-- EXCLUSIVO de homologacao jxyaoorlibbfwznbgceo. Nunca executar em producao.
-- Executar dentro de BEGIN, depois das definicoes SQL 01/02, e encerrar ROLLBACK.
-- Contas sem senha, email ficticio e UUID aleatorio. Nenhum dado preexistente e alterado.
DO $setup$
DECLARE u uuid; c uuid; p uuid;
BEGIN
  FOR i IN 1..4 LOOP
    u := gen_random_uuid();
    PERFORM set_config('tetino.test_user_' || i, u::text, true);
    INSERT INTO auth.users(id, email, aud, role)
      VALUES (u, u::text || '@example.invalid', 'authenticated', 'authenticated');
    INSERT INTO public.tetino_aprovacoes(user_id, aprovado) VALUES (u, i <> 1)
      ON CONFLICT(user_id) DO UPDATE SET aprovado = EXCLUDED.aprovado;
  END LOOP;
  INSERT INTO public.admin_usuarios(user_id) VALUES(current_setting('tetino.test_user_4')::uuid);
  c := gen_random_uuid(); p := gen_random_uuid();
  PERFORM set_config('tetino.test_course',c::text,true);
  PERFORM set_config('tetino.test_folder',p::text,true);
  INSERT INTO public.tetino_cursos(id,nome,slug,ativo,banca)
    VALUES(c,'Teste sintetico migracao',c::text,true,'SINTETICA');
  INSERT INTO public.tetino_pastas(id,nome) VALUES(p,'Pasta sintetica migracao');
  INSERT INTO public.questoes(id,banca,materia,assunto,tipo,texto,opcoes,correta,comentario,publicada)
    VALUES(-2147000000,'SINTETICA','Teste','Teste','multi','Questao sintetica',ARRAY['A','B'],1,'Comentario sintetico',true),
          (-2147000001,'SINTETICA','Teste','Teste','multi','Questao nao publicada',ARRAY['A','B'],0,'Restrito',false);
  INSERT INTO public.tetino_curso_questoes(curso_id,questao_id)
    VALUES(c,-2147000000),(c,-2147000001);
  INSERT INTO public.tetino_questao_pastas(questao_id,pasta_id,posicao) VALUES(-2147000000,p,1);
  INSERT INTO public.tetino_textos_apoio(questao_id,texto) VALUES(-2147000000,'Apoio sintetico');
  INSERT INTO public.tetino_matriculas(user_id,curso_id,modalidade)
    VALUES(current_setting('tetino.test_user_1')::uuid,c,'cortesia'),
          (current_setting('tetino.test_user_3')::uuid,c,'cortesia');
END $setup$;

DO $acl$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('tetino_admin_excluir_questao_completa',
      'tetino_catalogo_questoes','tetino_pastas_questoes_autorizadas','tetino_responder_questao',
      'tetino_texto_apoio_autorizado') AND has_function_privilege('anon',p.oid,'EXECUTE')) THEN
    RAISE EXCEPTION 'anon consegue executar funcao nova';
  END IF;
END $acl$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('tetino.test_user_1'),true);
DO $unapproved$
BEGIN
  IF EXISTS(SELECT 1 FROM public.tetino_catalogo_questoes() WHERE id=-2147000000) THEN
    RAISE EXCEPTION 'Aluno nao aprovado viu questao'; END IF;
  BEGIN
    PERFORM public.tetino_responder_questao(-2147000000,1);
    RAISE EXCEPTION 'Resposta indevidamente aceita';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Cadastro ainda não aprovado' THEN RAISE; END IF;
  END;
END $unapproved$;

SELECT set_config('request.jwt.claim.sub',current_setting('tetino.test_user_2'),true);
DO $nocourse$
BEGIN
  IF EXISTS(SELECT 1 FROM public.tetino_catalogo_questoes() WHERE id=-2147000000)
    OR public.tetino_texto_apoio_autorizado(-2147000000) <> '' THEN
    RAISE EXCEPTION 'Aluno sem curso acessou conteudo'; END IF;
  BEGIN
    PERFORM public.tetino_responder_questao(-2147000000,1);
    RAISE EXCEPTION 'Resposta indevidamente aceita';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Você não possui acesso a esta questão' THEN RAISE; END IF;
  END;
END $nocourse$;

SELECT set_config('request.jwt.claim.sub',current_setting('tetino.test_user_3'),true);
DO $authorized$
DECLARE r record;
BEGIN
  IF (SELECT count(*) FROM public.tetino_catalogo_questoes() WHERE id=-2147000000) <> 1 THEN
    RAISE EXCEPTION 'Catalogo autorizado falhou'; END IF;
  IF EXISTS(SELECT 1 FROM public.tetino_catalogo_questoes() WHERE id=-2147000001) THEN
    RAISE EXCEPTION 'Questao nao publicada exposta'; END IF;
  IF public.tetino_texto_apoio_autorizado(-2147000000) <> 'Apoio sintetico' THEN
    RAISE EXCEPTION 'Texto apoio autorizado falhou'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tetino_pastas_questoes_autorizadas() WHERE questao_id=-2147000000) THEN
    RAISE EXCEPTION 'Pastas autorizadas falharam'; END IF;
  SELECT * INTO r FROM public.tetino_responder_questao(-2147000000,1);
  IF r.acertou IS DISTINCT FROM true OR r.correta <> 1 THEN RAISE EXCEPTION 'Gabarito incorreto'; END IF;
  SELECT * INTO r FROM public.tetino_responder_questao(-2147000000,0);
  IF r.acertou IS DISTINCT FROM false THEN RAISE EXCEPTION 'Atualizacao de resposta falhou'; END IF;
  BEGIN
    PERFORM public.tetino_responder_questao(-2147000000,2);
    RAISE EXCEPTION 'Alternativa invalida aceita';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Alternativa inválida' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.tetino_responder_questao(-2147000001,0);
    RAISE EXCEPTION 'Questao nao publicada aceita';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Questão não encontrada ou indisponível' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.tetino_admin_excluir_questao_completa(-2147000000);
    RAISE EXCEPTION 'Aluno conseguiu excluir';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Acesso negado' THEN RAISE; END IF;
  END;
END $authorized$;

SELECT set_config('request.jwt.claim.sub',current_setting('tetino.test_user_2'),true);
DO $isolation$
BEGIN
  IF EXISTS(SELECT 1 FROM public.respostas WHERE questao_id=-2147000000) THEN
    RAISE EXCEPTION 'Resposta de outro aluno visivel'; END IF;
END $isolation$;
RESET ROLE;
DO $upsert$
BEGIN
  IF (SELECT count(*) FROM public.respostas WHERE questao_id=-2147000000) <> 1 THEN
    RAISE EXCEPTION 'Upsert duplicou resposta'; END IF;
END $upsert$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('tetino.test_user_4'),true);
SELECT public.tetino_admin_excluir_questao_completa(-2147000000);
RESET ROLE;
DO $deleted$
BEGIN
  IF EXISTS(SELECT 1 FROM public.questoes WHERE id=-2147000000)
    OR EXISTS(SELECT 1 FROM public.respostas WHERE questao_id=-2147000000)
    OR EXISTS(SELECT 1 FROM public.tetino_questao_pastas WHERE questao_id=-2147000000)
    OR EXISTS(SELECT 1 FROM public.tetino_curso_questoes WHERE questao_id=-2147000000)
    OR EXISTS(SELECT 1 FROM public.tetino_textos_apoio WHERE questao_id=-2147000000) THEN
    RAISE EXCEPTION 'Exclusao sintetica deixou registros'; END IF;
END $deleted$;
SELECT 'Validacao sintetica concluida; transacao sera revertida' AS resultado;
