-- Reversao do PACOTE 01, SOMENTE se as funcoes nao tiverem dependentes novos.
-- NAO recupera respostas/questoes apagadas; isso exige restauracao do backup.
-- NAO reverte o PACOTE 02 (admin_delete_question): restaurar definicao anterior separadamente.
BEGIN;
DROP FUNCTION IF EXISTS public.tetino_admin_excluir_questao_completa(bigint);
DROP FUNCTION IF EXISTS public.tetino_catalogo_questoes();
DROP FUNCTION IF EXISTS public.tetino_pastas_questoes_autorizadas();
DROP FUNCTION IF EXISTS public.tetino_responder_questao(integer,integer);
DROP FUNCTION IF EXISTS public.tetino_texto_apoio_autorizado(bigint);
COMMIT;
