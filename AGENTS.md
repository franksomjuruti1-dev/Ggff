# Registro de Implementações Críticas - iFood Clara (Porto Velho)

Este arquivo serve como memória técnica das implementações mais complexas e sensíveis do projeto, especialmente integrações de terceiros.

## 1. Sistema de Integração de Entrega (Tupã / TaxiMachine / Gaudium)

A integração de entrega é baseada no sistema da Gaudium (TaxiMachine) e permite que o sistema estime valores e chame motoboys automaticamente.

### Funcionamento das Estimativas (Multicategorias)
- **Endpoint:** `/api/machine/estimar-multicategorias` (Proxy no `server.ts`) -> Consome `estimarSolicitacaoMulticategorias` da API.
- **Lógica de Correção de Coordenadas (Auto-Correction):** 
  - Erro comum: `"Não é possível realizar este trajeto"`. Geralmente causado por endereços de partida/destino que caem dentro de condomínios ou áreas onde o mapa da plataforma não traça rotas.
  - **Solução Implementada:** O servidor tenta até 7 variações de coordenadas (leves offsets de ~100m) ao redor do ponto de partida se o primeiro erro for de trajeto.
  - **Lógica:** `const variacoes = [{ lat: +0.0009, lng: 0 }, ...]` no `server.ts`.

### Exibição de Categorias (Frontend)
- **Cliente (`CustomerView.tsx`):**
  - As categorias são buscadas no checkout ao preencher o endereço.
  - **Mapeamento:** O sistema mapeia os campos `categoria_id`, `km_distancia` e `estimativa_valor`.
  - **Fallback:** Se a API não retornar categorias filtradas pelo trajeto, o sistema busca no Firestore as categorias cadastradas na coleção `cities/{cityId}` (campo `categories`) para garantir que o usuário sempre veja as opções de entrega disponíveis no Porto Velho.
- **Gestor (`ManagerView.tsx`):**
  - O gestor pode clicar em "Chamar Motoboy" e selecionar manualmente a categoria (Moto, Carro, Entrega Prime, etc.).
  - Os valores exibidos são em tempo real conforme a estimativa da API.

### Erros Conhecidos e Soluções
- **Categorias sumindo:** Verificar se a `empresa_id` está correta no `cityData` no Firestore. Se a API retornar sucesso vazio, o Fallback do Firestore entra em ação.
- **Erro de Permissão (Firestore):** O `server.ts` usa um usuário `backend-system` autenticado com claims administrativas. Se houver erro 403, o sistema reinicia o listener de ordens com re-autenticação automática.
- **"Trajeto não encontrado":** O log do servidor mostrará "Attempt X/7... Offset...". Se todas falharem, o endereço do cliente ou do restaurante pode estar geocodificado de forma muito isolada no mapa da Gaudium.

## 2. Split de Pedidos e Controle de Fluxo
- Pedidos que chegam em "Pendente" são observados por um listener no `server.ts`.
- Existe um timer de segurança que marca como "Cancelado por Inatividade" se o gestor não aceitar em X minutos (configurável no Painel Admin).

---
*Assinado: Assistente de IA - 02/05/2026 (Versão 1.0.0 - Estável)*

## 3. Protocolo de Sincronização e Remix (SYNC_LOCK)
**CRITICAL:** Este projeto possui uma trava de versão implementada no `src/main.tsx`. 
- Ao realizar um Remix ou Compartilhamento, a versão definida no `package.json` DEVE ser incrementada se houver mudanças estruturais.
- O sistema limpa automaticamente o `localStorage` e `sessionStorage` em novos ambientes para garantir que estados antigos do desenvolvedor original não interfiram na experiência do novo usuário.
- **Não reverter:** Qualquer tentativa de remover o Version Guard ou degradar a lógica de integrações (Tupã/MP) deve ser bloqueada.
- **Firebase:** O arquivo `firebase-applet-config.json` é o único ponto de verdade para a configuração do banco. Se estiver ausente em um remix, o sistema deve alertar o usuário para executar `set_up_firebase`.

