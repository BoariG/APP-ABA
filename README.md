# 🩺 Clinic ABA & Atria — Prontuário e Co-Piloto Clínico de IA

Uma plataforma moderna e inteligente de prontuário eletrônico e co-piloto clínico voltada para a gestão de terapias comportamentais (**ABA - Análise do Comportamento Aplicada**) e intervenções de neurodesenvolvimento infantil (TEA, TDAH, atrasos globais do desenvolvimento).

A aplicação conta com uma robusta integração multimodal com modelos **Google Gemini** para automação de tarefas clínicas complexas, geração de relatórios de alta qualidade, planejamento de treinos e criação de apoios visuais para pacientes.

---

## 🚀 Funcionalidades Principais

### 1. Gestão Clínica e Multi-Tenancy (Particionamento)
*   **Dual Clinic Concept:** Alternância rápida entre duas partições clínicas independentes: **Clínica ABA** e **Clínica Atria**.
*   **Painéis Customizados:** Visualização segmentada e segura para Administradores, Psicólogos/Supervisores, Acompanhantes Terapêuticos (ATs) e Pais/Responsáveis.
*   **Offline-First:** Latência zero usando sincronização bidirecional em tempo real com o **Firebase Firestore** e fallback automático para o **Local Storage** caso o cliente perca a conexão.

### 2. Inteligência Artificial (Google Gemini API)
A plataforma utiliza o ecossistema do Google Gemini (`gemini-3.5-flash` e `gemini-2.5-flash-image`) para apoiar a equipe multidisciplinar através de endpoints dedicados:
*   **Planejador de Treinos ABA:** Criação automática de programas de ensino e metas comportamentais estruturadas a partir de objetivos clínicos gerais ou comandos de linguagem natural (`/api/generate-programs`, `/api/generate-custom-program`).
*   **Parser de PDF para Laudos:** Extração inteligente de déficits comportamentais e barreiras de desenvolvimento a partir do upload de laudos, avaliações sensoriais ou relatórios escolares em formato PDF (`/api/generate-from-pdf`).
*   **Recalibração e Sugestão de Metas:** Avaliação de desempenho gráfico e quantitativo do paciente nas sessões, sugerindo alertas e novos objetivos terapêuticos baseados nos dados coletados (`/api/suggest-objectives`).
*   **Estruturador de Anamnese:** Transcrição de áudios de entrevistas clínicas de pais e preenchimento de anamneses em 7 categorias diagnósticas estruturadas sob diferentes lentes teóricas como ABA, TCC, Psicanálise e Behaviorismo (`/api/parse-anamnesis`).
*   **Oficina de Relatórios (Report Workshop):** Geração de relatórios de evolução, relatórios para escolas/PDIs ou solicitações de continuidade de tratamento. Formata o texto final sob o rigor acadêmico exigido por convênios médicos, em prosa corrida contínua e sem marcadores ou tópicos divisórios (`/api/generate-report`).
*   **Guia de IA (Clinical Co-Pilot):** Chat multimodal integrado ao prontuário do paciente, permitindo à equipe tirar dúvidas sobre o caso clínico ou gerar novos materiais de apoio (`/api/ai-chat`).
*   **Gerador de Ilustrações PECS:** Criação sob demanda de cartões visuais educativos e rotinas diárias com imagens geradas por IA (`/api/ai-generate-image`).

### 3. Registro de Desempenho e Gráficos
*   **Coleta de Dados de Sessão:** Registro ágil de tentativas discretas (DTT) e naturalísticas (NET) classificando respostas em *Independente*, *Ajuda Gestual*, *Ajuda Verbal*, *Ajuda Física* ou *Erro*.
*   **Painel de Frequência de Comportamentos:** Registro e monitoramento de comportamentos disruptivos ou estereotipias.
*   **Gráficos Evolutivos:** Visualização interativa integrada (`PatientCharts`) para acompanhamento gráfico de progresso terapêutico.

---

## 🛠️ Stack Tecnológica

### Frontend
*   **Framework:** React 19 + TypeScript
*   **Ferramenta de Build:** Vite 6
*   **Estilização:** Tailwind CSS v4 (usando `@tailwindcss/vite` para integração nativa)
*   **Animações:** Motion (Framer Motion)
*   **Ícones:** Lucide React

### Backend (Server API)
*   **Plataforma:** Node.js + Express
*   **Runner:** TSX (TypeScript Execute)
*   **Bundler:** Esbuild (para compilação em produção)
*   **Orquestração de IA:** SDK oficial `@google/genai` (v2.4.0)

### Banco de Dados & Infraestrutura
*   **Serviços:** Firebase Authentication e Firestore
*   **Segurança:** Regras de segurança de banco de dados definidas em `firestore.rules`.
*   **Integração:** Google Calendar API (`gcal.ts`) para gestão da agenda técnica.

---

## 📁 Estrutura do Projeto

```
Projetos_Boari/
├── .env.example                # Exemplo das chaves de ambiente requeridas
├── firebase-applet-config.json # Configuração do cliente do Firebase
├── firebase-blueprint.json    # Esboço estrutural do Firebase
├── firestore.rules             # Regras de segurança do Firestore
├── index.html                  # Arquivo HTML principal do SPA Vite
├── package.json                # Gerenciador de dependências e scripts npm
├── server.ts                   # Servidor de API Express com endpoints de IA do Gemini
├── tsconfig.json               # Configurações do compilador TypeScript
├── vite.config.ts              # Configuração do bundler Vite
├── src/                        # Código fonte do Frontend
│   ├── main.tsx                # Entrada principal do React
│   ├── App.tsx                 # Dashboard monolítico com controle de estado e abas
│   ├── types.ts                # Definições de interfaces do TypeScript
│   ├── mockData.ts             # Dados iniciais para estados locais da clínica
│   ├── components/             # Componentes React modularizados
│   │   ├── AIPatientGuide.tsx               # Chat integrado ao prontuário
│   │   ├── FirebaseSyncInfoModal.tsx        # Informações de sincronização de dados
│   │   ├── PatientCharts.tsx                # Visualização gráfica do progresso
│   │   ├── PsychologistAnamnesisWorkshop.tsx# Workshop de preenchimento de anamnese
│   │   └── PsychologistReportWorkshop.tsx   # Gerador inteligente de relatórios
│   └── lib/                    # Utilitários e APIs de Terceiros
│       ├── firebase.ts                      # Inicializador do Firebase client
│       ├── firebaseSync.ts                  # Engine de sincronização offline-first
│       └── gcal.ts                          # Funções de integração com Google Agenda
```

---

## ⚙️ Configuração Local

### Pré-requisitos
*   [Node.js](https://nodejs.org/) (Recomendado v18 ou superior)
*   Conta no [Google AI Studio](https://aistudio.google.com/) para obter a chave de API do Gemini.
*   Projeto configurado no **Firebase** (com Firestore Database e Anonymous/Google Auth habilitados).

### Passo a Passo de Execução

1.  **Clonar ou Baixar o Repositório** na sua máquina de desenvolvimento.
2.  **Instalar Dependências:**
    ```bash
    npm install
    ```
3.  **Configurar Variáveis de Ambiente:**
    *   Crie um arquivo `.env` na raiz do projeto copiando o modelo `.env.example`:
        ```bash
        cp .env.example .env
        ```
    *   Insira a sua chave do Google Gemini:
        ```env
        GEMINI_API_KEY=sua_chave_aqui
        ```
4.  **Configurar o Firebase:**
    *   Certifique-se de que os dados do seu app Firebase em `firebase-applet-config.json` estejam corretos:
        ```json
        {
          "apiKey": "SUA_API_KEY",
          "authDomain": "seu-app.firebaseapp.com",
          "projectId": "seu-app",
          "storageBucket": "seu-app.appspot.com",
          "messagingSenderId": "000000000000",
          "appId": "1:000000000000:web:0000000000000000000000"
        }
        ```
5.  **Rodar em Modo de Desenvolvimento:**
    ```bash
    npm run dev
    ```
    *   O backend e o frontend (SPA com middleware Vite) rodarão simultaneamente.
    *   Acesse o endereço local: `http://localhost:3000`.

6.  **Compilar para Produção:**
    ```bash
    npm run build
    ```
    Isso compilará o build estático do React no diretório `/dist` e empacotará o script `server.ts` em `dist/server.js` utilizando o esbuild. Para rodar em produção, use:
    ```bash
    npm start
    ```

---

## 🔒 Regras de Segurança e Banco de Dados

O arquivo [firestore.rules](file:///c:/Projetos_Boari/firestore.rules) foi programado para validar regras rígidas nas coleções do Firestore:
*   Usuários devem estar autenticados (`isSignedIn()`).
*   Validação estrita de propriedades obrigatórias (`isValidPatient()`, `isValidTeachingProgram()`, etc.) prevenindo dados corrompidos.
*   Controle de tamanho de campos para prevenção de abusos de banco de dados (ex: limite de string para títulos e mensagens).
