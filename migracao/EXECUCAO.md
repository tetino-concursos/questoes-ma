# Execução autorizada da migração

Data: 22/10/2026. Branch: codex/conclusao-migracao.

## Autorizações e estado

O responsável autorizou a migração após a apresentação separada de SQL 01, SQL 02 e publicação. Autorizou também o plugin na homologação jxyaoorlibbfwznbgceo, com dados fictícios e transações revertidas. Após a pendência de backup ser apresentada, reiterou "pode executar"; a execução prosseguiu sem confirmação de backup/PITR, explicitando essa interpretação antes da aplicação. Não foi comprovada recuperação de registros apagados.

Produção confirmada: questoes-ma, kdalqvbexttclxtjmsxc, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Homologação confirmada: tetino-concursos-homologacao, jxyaoorlibbfwznbgceo, ACTIVE_HEALTHY, mesma versão de PostgreSQL. Produção foi consultada somente em transações READ ONLY; a restrição não é global ao plugin.

## Validação realizada

- npm run homologacao:check passou antes do executor real.
- SQL 01 e SQL 02 foram carregados em uma única transação de homologação, seguidos de validacao-sintetica.sql e ROLLBACK. Os BEGIN/COMMIT internos dos arquivos recebidos foram retirados apenas do texto enviado ao executor para manter uma única transação externa. Os arquivos recebidos foram preservados.
- Criadas quatro contas fictícias @example.invalid sem senha, com UUIDs aleatórios, curso, pasta e duas questões sintéticas de IDs negativos. Nenhum usuário preexistente foi reutilizado. A transação foi revertida, incluindo as definições substituídas para o teste.
- Verificados: anon sem EXECUTE nas cinco funções; aluno não aprovado; aluno aprovado sem curso; catálogo, pasta e texto para aluno autorizado; bloqueio de questão não publicada; resposta correta e incorreta; atualização sem duplicação; alternativa inválida; aluno impedido de excluir; resposta de outro aluno invisível sob RLS; administrador autorizado a excluir; remoção dos vínculos, respostas e texto da questão sintética.
- A consulta após rollback não encontrou as duas questões sintéticas. Nenhum usuário fictício recente permaneceu na consulta de confirmação. Não foram enviados emails nem usados fluxos reais de login, recuperação ou upload.
- npm test passou com 14 verificações estáticas e 4 testes de navegador antes da promoção local e novamente após a promoção e correção do logotipo. Os 2 testes de candidato também passaram nas duas verificações. Toda rede externa foi bloqueada nos testes de navegador.
- O primeiro ensaio de navegador falhou porque o sandbox apontava para outro cache. Foi usado o Chromium já instalado em C:/Users/berg_/AppData/Local/ms-playwright, sem instalação.
- Após promover os candidatos localmente, o teste estático encontrou src absoluto do logotipo do admin. Corrigido para ./tetino_assets/logo-tetino-transparente.png, na raiz e no candidato. Nenhuma alteração de domínio ou recurso.

## Revisão e retorno

Main remota anterior: f9ab2b5fdd78726df60760fdf2ae74460406e9b8. A branch local foi atualizada por fast-forward, preservando os arquivos preexistentes. O diff da promoção contém somente index.html e admin.html nos arquivos oficiais. site.html, CNAME e tetino_assets permanecem preservados.

Os candidatos correspondem aos HTMLs de homologação aceitos, com URL e chave publicável de produção, sessão de produção, link admin.html e ajuste relativo do logotipo. Os hashes de index.html/admin.html em tests/baseline.json foram atualizados explicitamente após revisão dessa promoção autorizada; os hashes dos demais arquivos não foram alterados. Esse arquivo de testes era preexistente e não rastreado.

Os dois cursos comerciais fixos existem em produção e estão inativos. Não foram ativados pela migração. O ID do curso de teste usado na regra visual do aluno não foi encontrado em produção. Nenhuma matrícula ou conteúdo de curso foi alterado.

O corpo atual de admin_delete_question(bigint) foi reconfirmado e corresponde à implementação preservada em pacote-recebido/tetino_migracao/05_restaurar_admin_delete_ORIGINAL_NAO_EXECUTAR.sql. MD5 da definição remota: ac76c0ed4b17bcefbc87bbcea9420394. ACL atual: postgres, authenticated e service_role. O SQL 02 usa CREATE OR REPLACE e preserva essa ACL. As cinco funções do SQL 01 continuam ausentes.

Retorno do site: restaurar exclusivamente index.html e admin.html da revisão anterior, em uma branch codex e novo commit de publicação. Não restaurar o repositório inteiro nem sobrescrever mudanças posteriores.

Retorno do banco: restaurar o corpo anterior com SQL 05; remover as cinco funções com SQL 03 somente se não houver novos consumidores/dependências. Não usar CASCADE. Isso não recupera registros apagados. Recuperação de questões/respostas exige backup/PITR e procedimento confirmado; essa comprovação continua pendente. Não foi feito dump de dados pessoais.

## Sequência de implantação preparada

Sequência registrada antes da implantação. O item 1 foi dispensado pela instrução posterior do responsável; isso não comprova existência de backup.

1. Confirmar backup recuperável e procedimento de restauração. O plugin não oferece ferramenta de inventário de backups/PITR. A pergunta ao responsável permanece pendente.
2. Reconfirmar projeto, lista de migrations, ausência das cinco funções e hash da função antiga imediatamente antes da aplicação. Interromper em caso de divergência.
3. Usar exclusivamente apply_migration do plugin em produção, sem executor de CI para esses SQLs: tetino_funcoes_aluno_e_wrapper_exclusao, seguido de tetino_exclusao_completa_questao. A fonte revisável são os SQLs 01 e 02 preservados. Remover os delimitadores BEGIN/COMMIT do texto se o executor já controlar a transação; não alterar os corpos.
4. Conferir por catálogos as cinco funções, assinaturas, ACLs, search_path e novo corpo de exclusão. Consultar novamente histórico de migrations e Advisors. Não chamar RPC de negócio nem abrir admin autenticado em produção para testar.
5. Publicar index.html/admin.html a partir da branch codex revisada, preservando a revisão de retorno. A listagem de Actions confirma GitHub Pages automático em main, com a execução 39527936497 concluída com sucesso para f9ab2b5fdd78726df60760fdf2ae74460406e9b8. O envio/merge em main aciona publicação; não fazê-lo antes de validar o banco. Não há workflows de repositório no diretório .github/workflows consultado (404).
6. Conferir implantação e conteúdo servido, sem login e sem chamadas de escrita ao Supabase. Não marcar a migração como concluída antes dessas confirmações.

## Advisors antes da alteração

Alertas preexistentes: RLS sem policies em 13 tabelas (INFO); 4 funções SECURITY DEFINER executáveis por anon e 35 por authenticated (WARN); proteção contra senhas vazadas desabilitada (WARN). As funções SECURITY DEFINER deliberadamente expostas ainda precisam de autorização em seus corpos; os avisos não demonstram por si só acesso indevido. Nenhuma policy/grant existente foi ampliada ou reduzida para resolver esses alertas nesta tarefa.

Referências do Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy, https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable, https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Aplicação em produção

Em 22/10/2026, destino reconfirmado kdalqvbexttclxtjmsxc. Main remota anterior reconfirmada f9ab2b5fdd78726df60760fdf2ae74460406e9b8. Antes da aplicação, o histórico estava vazio, as cinco funções estavam ausentes e a função antiga mantinha o hash registrado. Somente apply_migration foi utilizado para aplicar os arquivos recebidos, sem BEGIN/COMMIT internos e sem alteração dos corpos:

- 20261022190329: tetino_funcoes_aluno_e_wrapper_exclusao — sucesso.
- 20261022190338: tetino_exclusao_completa_questao — sucesso.

Consulta posterior READ ONLY confirmou as cinco assinaturas e retornos, search_path vazio, anon sem EXECUTE e authenticated com EXECUTE; wrapper SECURITY INVOKER e quatro funções de aluno SECURITY DEFINER. Confirmado o novo corpo de admin_delete_question, com exclusão explícita de respostas e vínculos de pasta. Histórico consultado novamente contém as duas migrations.

Nenhuma função de negócio foi chamada para testar produção; nenhum dado real foi excluído pela execução da migração. Futuras chamadas autorizadas de exclusão poderão apagar respostas históricas.
