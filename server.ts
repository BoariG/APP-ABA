import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Lazy-initialized Gemini client with error validation
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please add it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Generate teaching programs and trials (Treinos ABA) based on Intervention Plan goals
app.post('/api/generate-programs', async (req, res) => {
  try {
    const { patient, plan } = req.body;
    if (!patient || !plan) {
      return res.status(400).json({ error: 'Paciente e plano são obrigatórios.' });
    }

    const genAI = getGenAI();
    
    const prompt = `Você é um Analista do Comportamento (BCBA) especialista em intervenção precoce e Análise do Comportamento Aplicada (ABA).
Analise o seguinte Plano de Intervenção ABA do paciente:
Nome do Paciente: ${patient.nome}
Idade: ${patient.idade} anos
Diagnóstico: ${patient.diagnose}
Objetivos Gerais: ${plan.objetivosGerais || 'Não especificado'}
Objetivos Específicos: ${plan.objetivosEspecificos || 'Não especificados'}

Sua tarefa é criar de 2 a 4 programas de ensino (treinos ABA) específicos e estruturados de acordo com as necessidades identificadas nesse plano.
Cada programa de ensino gerado deve seguir estritamente o formato JSON especificado.
Gere programas em áreas do desenvolvimento relevantes das descritas (ex: imitação, mandos, tatos, intraverbal, habilidades sociais, contato visual, atenção compartilhada, autonomia, etc.).

Retorne uma lista de programas de ensino, cada um contendo:
- Nome/Título do Treino (ex: "Imitação Motora Grossa", "Seguimento de Instruções de 1 Passo", "Mando para Itens Desejados")
- Habilidade / Área (ex: "Imitação", "Receptivo", "Linguagem")
- Descrição clara do objetivo comportamental.
- Instruções passo a passo curtas e diretas para o aplicador (terapeuta/AT).
- Critério de aprendizagem inicial sugerido (ex: "100% de acerto independente em 10 tentativas consecutivas ao longo de 2 sessões").
- Target comportamental específico a ser treinado (ex: "Bater palmas", "Tocar o nariz", "Pedir água").`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              area: { type: Type.STRING },
              descricao: { type: Type.STRING },
              instrucoes: { type: Type.STRING },
              criterio: { type: Type.STRING },
              alvo: { type: Type.STRING }
            },
            required: ['titulo', 'area', 'descricao', 'instrucoes', 'criterio', 'alvo']
          }
        }
      }
    });

    const text = response.text || '[]';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating programs:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar programas via IA.' });
  }
});

// 1.2 Generate teaching programs and trials (Treinos ABA) based on an uploaded PDF report
app.post('/api/generate-from-pdf', async (req, res) => {
  try {
    const { patient, pdfData, pdfName } = req.body;
    if (!patient || !pdfData) {
      return res.status(400).json({ error: 'Paciente e arquivo PDF são obrigatórios.' });
    }

    // Strip out base64 prefix if present
    let cleanBase64 = pdfData;
    if (pdfData.includes(',')) {
      cleanBase64 = pdfData.split(',')[1];
    }

    const genAI = getGenAI();

    const prompt = `Você é um Analista do Comportamento (BCBA) sênior especialista em intervenção precoce e Análise do Comportamento Aplicada (ABA).
Analise de maneira extremamente minuciosa e aprofundada o documento PDF anexado (que contém um laudo médico, encaminhamento, avaliação diagnóstica de equipe multidisciplinar, relatório escolar ou PDI) para o seguinte paciente:
Nome do Paciente: ${patient.nome}
Idade: ${patient.idade} anos
Diagnóstico: ${patient.diagnose}

Sua tarefa principal é ler atentamente cada linha deste PDF, mapear todos os déficits comportamentais, barreiras de aprendizagem, dificuldades escolares, atrasos de fala/linguagem, dificuldades de coordenação motora ou regulação emocional descritos ou indicados no documento.

A partir desse mapeamento completo de dificuldades, formule TODOS os programas de ensino estruturados (treinos ABA) necessários para remediar cada uma dessas barreiras diagnosticadas. Gere uma lista abrangente que cubra todas as dificuldades identificadas no PDF (gere obrigatoriamente de 4 a 8 programas de ensino detalhados sob medida).

Cada programa deve ser extremamente minucioso e conter:
1. Um título altamente descritivo da habilidade visada (ex: "Contato Visual sob Chamado Pareado com Reforço", "Mando por Apontar", "Seguimento de Instruções de 2 Passos", "Regulação de Frustração na Transição").
2. Uma área/habilidade clara.
3. Uma descrição clínica e comportamental detalhada da importância e objetivo da modificação comportamental.
4. Instruções e protocolos passo a passo extremamente detalhados, claros e clínicos recomendados para o aplicador/AT (terapeuta acompanhante de mesa ou naturalístico).
5. Critérios de aprendizagem objetivos (ex: "90% de respostas independentes e corretas em 30 ensaios discretos divididos em 3 sessões consecutivas").
6. Um alvo/target comportamental de forma hiper-precisa que descreve o comportamento observável e mensurável (ex: "Paciente deve dirigir o olhar para os olhos do aplicador por no mínimo 3 segundos logo após a emissão do nome do paciente").

Gere o máximo de programas cabíveis baseado em cada dificuldade, barreira, birra, estereotipia ou déficit que o PDF retratar, sem omitir detalhes importantes e de forma muito rica em embasamento ABA.`;

    const pdfPart = {
      inlineData: {
        data: cleanBase64,
        mimeType: 'application/pdf',
      }
    };

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [pdfPart, prompt],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              area: { type: Type.STRING },
              descricao: { type: Type.STRING },
              instrucoes: { type: Type.STRING },
              criterio: { type: Type.STRING },
              alvo: { type: Type.STRING }
            },
            required: ['titulo', 'area', 'descricao', 'instrucoes', 'criterio', 'alvo']
          }
        }
      }
    });

    const text = response.text || '[]';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating from PDF:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar programas a partir do PDF.' });
  }
});

// 1.5 Generate a single custom teaching program (Treino ABA) based on user's written custom target
app.post('/api/generate-custom-program', async (req, res) => {
  try {
    const { patient, customPrompt } = req.body;
    if (!patient || !customPrompt) {
      return res.status(400).json({ error: 'Paciente e instrução personalizada são obrigatórios.' });
    }

    const genAI = getGenAI();
    
    const prompt = `Você é um Analista do Comportamento (BCBA) especialista em intervenção precoce e Análise do Comportamento Aplicada (ABA).
O usuário deseja criar um programa de ensino específico (treino ABA) para o seguinte paciente:
Nome do Paciente: ${patient.nome}
Idade: ${patient.idade} anos
Diagnóstico: ${patient.diagnose}

O usuário forneceu a seguinte instrução/especificação do treino desejado:
"${customPrompt}"

Sua tarefa é criar um programa de ensino estruturado e profissional de acordo com essa instrução.
Se a instrução estiver incompleta ou faltarem etapas técnicas relevantes (como instruções detalhadas de aplicação, critério de aprendizagem técnica, alvo comportamental), preencha de forma técnica e profissional baseando-se estritamente em ABA.

Retorne um único objeto contendo:
- Nome/Título do Treino (ex: "Imitação de Piscar de Olhos", "Mando Recíproco")
- Habilidade / Área (ex: "Imitação", "Receptivo", "Linguagem", "Sociabilização")
- Descrição clara do objetivo comportamental.
- Instruções detalhadas passo a passo curtas e diretas para o aplicador (terapeuta/AT).
- Critério de aprendizagem sugerido (ex: "100% de acerto independente em 10 tentativas consecutivas ao longo de 2 sessões").
- Target comportamental específico a ser treinado / Alvo correspondente (ex: "Piscar o olho sob imitação").`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            area: { type: Type.STRING },
            descricao: { type: Type.STRING },
            instrucoes: { type: Type.STRING },
            criterio: { type: Type.STRING },
            alvo: { type: Type.STRING }
          },
          required: ['titulo', 'area', 'descricao', 'instrucoes', 'criterio', 'alvo']
        }
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating custom program:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar treino personalizado via IA.' });
  }
});

// 2. Suggest new clinical goals and recommendations
app.post('/api/suggest-objectives', async (req, res) => {
  try {
    const { patient, plan, trialsData } = req.body;
    if (!patient) {
      return res.status(400).json({ error: 'Paciente é obrigatório.' });
    }

    const genAI = getGenAI();

    const prompt = `Você é um Supervisor ABA altamente experiente. Analise o progresso clínico e recomende novos objetivos terapêuticos e intervenções.
Paciente: ${patient.nome} (Idade: ${patient.idade}, Diagnóstico: ${patient.diagnose})
Plano de Intervenção Atual:
- Objetivos Gerais: ${plan?.objetivosGerais || 'Nenhum cadastrado'}
- Objetivos Específicos: ${plan?.objetivosEspecificos || 'Nenhum cadastrado'}

Dados de Desempenho Recentes nos Treinos:
${JSON.stringify(trialsData || [])}

Com base nesses dados, apresente uma análise de progresso recente, a identificação de possíveis barreiras de aprendizado ou regressões, e de 3 a 5 novas sugestões concretas de objetivos terapêuticos (em formato técnico baseado nos princípios de ABA).
Retorne a resposta estritamente estruturada em JSON contendo:
- analiseProgresso: Uma descrição textual curta do desenvolvimento geral.
- alertas: Array de strings contendo alertas (ex: "Estagnação em imitação motora", "Necessidade de esvanecimento de ajuda rápida").
- objetivosSugeridos: Array de strings com as propostas de metas comportamentais bem calibradas à idade e diagnóstico.
- recomendacoesMetodologicas: Array de strings de orientações para a equipe.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analiseProgresso: { type: Type.STRING },
            alertas: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            objetivosSugeridos: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recomendacoesMetodologicas: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['analiseProgresso', 'alertas', 'objetivosSugeridos', 'recomendacoesMetodologicas']
        }
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error suggesting objectives:', error);
    res.status(500).json({ error: error.message || 'Erro ao sugerir metas clínicas.' });
  }
});

// 2.5 AI-powered Anamnesis voice transcriber & structured parser
app.post('/api/parse-anamnesis', async (req, res) => {
  try {
    const { patient, transcript, approach } = req.body;
    if (!patient || !transcript) {
      return res.status(400).json({ error: 'Paciente e transcrição são obrigatórios.' });
    }

    const genAI = getGenAI();
    let approachSnippet = "";
    if (approach === 'ABA') {
      approachSnippet = "Foco em Análise do Comportamento Aplicada (ABA). Identifique comportamentos operantes, de imitação, mandos e tatos espontâneos, respostas ao reforço social ou alimentar, antecedente-resposta-conseqüência (tríplice contingência) e barreiras de aprendizado.";
    } else if (approach === 'Psicanálise') {
      approachSnippet = "Foco em Psicanálise clínica infantil. Identifique as dinâmicas afetivas simbólicas, relacionamento inconsciente entre pais e bebê, marcos de subjetivação, representação fóbica, ansiedade secundária, fantasias de jogo e expressão lúdica.";
    } else if (approach === 'Comportamental') {
      approachSnippet = "Foco em Behaviorismo Clínico clássico. Mapeie estímulos ambientais, respostas de evitação, esquemas gerais de pareamento reflexo ou operante que mantêm fobias infantis ou rituais de sono/alimento.";
    } else {
      approachSnippet = "Foco em Prática Integrada / Outras Abordagens. Mapeie a integridade do desenvolvimento, as funções executivas, rotinas de sono e hábitos alimentares.";
    }

    const prompt = `Você é um Psicólogo Clínico e Analista do Comportamento PhD sênior especialista em anamnese de desenvolvimento infanto-juvenil.
Você recebeu a transcrição bruta de uma conversa espontânea com familiares ou relato detalhado de entrevista clínica para o seguinte paciente:
Nome: ${patient.nome}
Idade: ${patient.idade} anos
Diagnóstico Prévio: ${patient.diagnose}

Abordagem Epistemológica Solicitada: ${approach}
Diretriz de análise: ${approachSnippet}

Seu objetivo é analisar e extrair inteligência clínica da seguinte transcrição bruta:
---
"${transcript}"
---

Formule em português refinado, gramaticalmente impecável e formal os 7 campos clássicos de anamnese. Caso algum assunto não tenha sido abordado diretamente na conversa, formule uma síntese lógica a partir do comportamento de uma criança com o diagnóstico mencionado ou liste elegantemente reflexões e pontos-chave para o terapeuta verificar nas próximas sessões de observação livre.

Retorne um JSON com exatamente as seguintes chaves textuais estruturadas:
1. "queixaPrincipal": Detalhes das queixas, primeiros sinais de atraso no desenvolvimento observados pelos pais, idade de início e impacto diário.
2. "desenvolvimentoMotor": Histórico de marcos motores amplos (sustentação de cabeça, sentar, engatinhar, andar) e finos (coordenação óculo-manual, preensão de lápis, tônus).
3. "desenvolvimentoLinguagem": Primeiros sons, intenção comunicativa, contato visual na fala, balbucios de bebê, vocalização funcional, presença de ecolalias ou linguagem não-verbal de apontar.
4. "comportamentoRotina": Horários e qualidade do sono, rotina e seletividade alimentar (restrição por cor, textura, marca ou temperatura), desfralde vespertino/noturno, respostas a frustrações (birra, autolesão, agressão) e regulação sensorial.
5. "historicoGestacionalMedico": Transcurso da gravidez, pré-natal, tipo de parto, choro ao nascer, internações, alergias, uso de medicação reguladora ou tratamentos contínuos anteriores.
6. "antecedentesFamiliares": Dinâmica social familiar, relações de afeto no lar, histórico de comorbidades neurológicas (autismo, TDAH, bipolaridade, esquizofrenia) ou psiquiátricas na linhagem consanguínea.
7. "observacoesAnaliseAbordagem": Formulação conceitual clínica integrando os marcos coletados acima sob o prisma da teoria ${approach}, delineando a hipótese norteadora e orientações de conduta clínica e de setting terapêutico recomendados.

A resposta DEVE ser estritamente em formato JSON estruturado respeitando o schema do objeto.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            queixaPrincipal: { type: Type.STRING },
            desenvolvimentoMotor: { type: Type.STRING },
            desenvolvimentoLinguagem: { type: Type.STRING },
            comportamentoRotina: { type: Type.STRING },
            historicoGestacionalMedico: { type: Type.STRING },
            antecedentesFamiliares: { type: Type.STRING },
            observacoesAnaliseAbordagem: { type: Type.STRING }
          },
          required: [
            'queixaPrincipal',
            'desenvolvimentoMotor',
            'desenvolvimentoLinguagem',
            'comportamentoRotina',
            'historicoGestacionalMedico',
            'antecedentesFamiliares',
            'observacoesAnaliseAbordagem'
          ]
        }
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error parsing anamnesis:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar anamnese via IA.' });
  }
});

// 3. Generate detailed clinical reports (Evolução, Convenio, Escolar, etc.)
app.post('/api/generate-report', async (req, res) => {
  try {
    const { 
      patient, 
      plan, 
      trials, 
      logs, 
      reportType, 
      approach, 
      templateType, 
      customInstructions,
      therapistName,
      therapistReg,
      refiningText, // original text to refine
      refineInstructions, // instructions on how to refine it
      inspirationText
    } = req.body;

    if (!patient) {
      return res.status(400).json({ error: 'Paciente é obrigatório.' });
    }

    const genAI = getGenAI();

    // 1. Check if we are doing a refinement of an existing report
    if (refiningText && refineInstructions) {
      const refinementPrompt = `Você é um Psicólogo Clínico e de neurodesenvolvimento que atua como revisor de documentos terapêuticos de alto nível. Seu objetivo é analisar, ajustar e reescrever o relatório clínico existente com base nas instruções de ajuste do terapeuta ("ajustes e diálogos").

DADOS DE INTERVENÇÃO E ABORDAGEM DE REFERÊNCIA:
- Abordagem Psicológica de Referência: ${approach || 'Não informada'}
- Instruções Personalizadas Gerais do Terapeuta: "${customInstructions || 'Nenhuma instrução personalizada fornecida.'}"

INSTRUÇÕES DO TERAPEUTA PARA AJUSTE DO RELATÓRIO ATUAL (Diálogo de Refinamento - Prioridade Máxima):
"${refineInstructions}"

Texto do Relatório Corrente que deve ser reformulado:
---
${refiningText}
---

REQUISITOS OBRIGATÓRIOS CRÍTICOS DE ESTRUTURA E ESTILO:
1. IDENTIFICAÇÃO DO PACIENTE SUCINTA NO TOPO: Mantenha ou ajuste a listagem simples estruturada de chave-valor com os dados do paciente (como Nome, Idade, Diagnóstico) no topo para manter a transparência burocrática básica.
2. EXCLUSIVIDADE DE TEXTO CORRIDO: Abaixo dos dados básicos do paciente, reescreva o documento inteiro sob a forma de um único e contínuo TEXTO CORRIDO em parágrafos de prosa sequencial integrados e elegantes.
3. PROIBIÇÃO ABSOLUTA DE MARCADORES, SUBTÍTULOS E TÓPICOS: É EXPRESSAMENTE PROIBIDO utilizar tópicos de marcadores (como bullet points), numerações divisórias ou seções capitulares (como "1. Apresentação", "2. Análise", "I.", "II.", "a)", "b)") ou cabeçalhos de seção (como "## Introdução", "## Análise"). Tudo deve ser fundido e apresentado fluindo em prosa formal e científica de alta densidade acadêmica.
4. ABORDAGEM CLÍNICA: Garanta que todas as novas contribuições e correções do texto fiquem 100% harmonizadas com o raciocínio clínico da abordagem ${approach || 'especificada'}.
5. REDAÇÃO ACADÊMICA: Adote um tom de voz impecável em Português do Brasil com absoluto rigor formal e acadêmico. Evite ao máximo respostas curtas ou superficiais.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: refinementPrompt,
      });

      return res.json({ reportText: response.text });
    }

    // 2. Handle blank template immediately without calling AI (or generate a structured layout)
    if (templateType === 'blank') {
      const docHeader = `# RELATÓRIO INDIVIDUAL DE AVALIAÇÃO PSICOLÓGICA
**Clínica:** ${patient.clinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}

---

## 1. IDENTIFICAÇÃO DO CASO
*   **Nome do Paciente:** ${patient.nome}
*   **Idade:** ${patient.idade} anos
*   **Diagnóstico:** ${patient.diagnose}
*   **Responsáveis:** ${patient.responsaveis || 'Não informado'}
*   **Escola:** ${patient.escola || 'Não informado'}

---

## 2. HISTÓRICO E MOTIVO DA CONSULTA
[Insira aqui uma descrição sucinta do histórico do paciente, principais queixas, barreiras de desenvolvimento e o contexto que motivou o início da intervenção técnica...]

---

## 3. ANÁLISE CLÍNICA MULTIDISCIPLINAR E EVOLUÇÃO
[Insira aqui as evoluções observadas durante as sessões, dados de treinos, comportamento em ambiente natural / familiar e interações sociais...]

---

## 4. METAS E RECOMENDAÇÕES FUTURAS
*   [Recomendação terapêutica 1]
*   [Recomendação terapêutica 2]
*   [Recomendação terapêutica 3]

---

## 5. CONCLUSÃO E ASSINATURA

Sorocaba, ${new Date().toLocaleDateString('pt-BR')}

_____________________________________________________
**${therapistName || 'Profissional Clínico'}**
${therapistReg || 'Registro Profissional'}`;

      return res.json({ reportText: docHeader });
    }

    // 3. Setup psychological approach system prompt
    let approachSnippet = '';
    if (approach === 'ABA') {
      approachSnippet = `Abordagem Metodológica: Análise do Comportamento Aplicada (ABA). 
Especifique e analise dados com rigor estatístico-comportamental. Mencione esquemas de reforço, taxas de independência (respostas independentes vs. respostas com auxílio de prompt gestual, verbal, físico), controle de estímulos, extinção, esvanecimento de ajuda, generalização comportamental, coleta de dados em ensaios discretos (DTT) ou ensino naturalístico (NET). Utilize terminologia comportamental clássica e analítica.`;
    } else if (approach === 'TCC') {
      approachSnippet = `Abordagem Metodológica: Terapia Cognitivo-Comportamental (TCC).
Aborde a conceituação cognitiva do paciente, identificando esquemas centrais, crenças intermediárias (regras/suposições) e pensamentos automáticos disfuncionais. Discorra sobre regulação emocional, reestruturação cognitiva, técnicas dialéticas, técnicas de resolução de problemas, ativação comportamental e experimentos comportamentais adequados à idade e queixas dele.`;
    } else if (approach === 'Comportamental') {
      approachSnippet = `Abordagem Metodológica: Psicologia Comportamental / Behaviorismo Clínico.
Aborde a análise funcional das contingências de comportamento do paciente (Tríplice Contingência: Antecedente, Resposta e Consequência). Discorra sobre estímulos discriminativos (Sds), estímulos eliciadores, operações motivadoras (OMs), condicionamento pavloviano e operante, autocontrole e arranjos ambientais favoráveis para modelagem de novos repertórios prosociais.`;
    } else if (approach === 'Psicanálise') {
      approachSnippet = `Abordagem Metodológica: Psicanálise / Orientação Psicanalítica.
Foque sua linguagem nos processos inconscientes, dinâmicas transferenciais e contratransferenciais, mecanismos de defesa do ego (repressão, projeção, negação, regressão, sublimação) e na economia do sofrimento psíquico. Analise a formação de sintomas como soluções de compromisso, as resistências no processo terapêutico, as representações simbólicas e a construção de um espaço para livre expressão associativa do sujeito e acolhimento do sofrimento psíquico.`;
    } else if (approach === 'Humanista') {
      approachSnippet = `Abordagem Metodológica: Psicologia Humanista / Gestalt-terapia / Abordagem Centrada na Pessoa.
Foque na experiência fenomenológica imediata do paciente (o aqui-e-agora), seu potencial de autoatualização, autoverificação e autointegração orgânica. Aborde o contato, a fronteira de contato, interrupções no ciclo de contato, a aceitação incondicional, congruência empática e o desenvolvimento da autoconsciência (awareness) corporificada do paciente no processo terapêutico.`;
    }

    // 4. Setup template model context
    let templateSnippet = '';
    if (templateType === 'continuity') {
      templateSnippet = `Objetivo do Relatório: Modelo de Continuidade do Tratamento.
O documento deve demonstrar as conquistas graduais do paciente, as metas que ainda estão pendentes de consolidação e ressaltar os riscos sérios de retrocesso no caso de descontinuação abrupta ou diminuição da carga horária. 
MUITO IMPORTANTE: O documento DEVE, obrigatoriamente, ser concluído de maneira formal e incisiva, solicitando e justificando a continuidade das intervenções terapêuticas. Utilize um fechamento do tipo: 
"Por todos os fundamentos clínicos, comportamentais e técnicos expostos, e para que o paciente continue consolidando suas aquisições e evite retrocessos neurodesenvolvimentais, solicitamos enfaticamente e justificamos a continuidade ininterrupta do tratamento clínico especializado proposto..."`;
    } else if (templateType === 'school') {
      templateSnippet = `Objetivo do Relatório: Encaminhamento Escolar e PDI (Plano de Desenvolvimento Individualizado).
Este relatório visa mediar a relação entre a clínica e a escola do paciente. Aborde as potencialidades de adaptação nos âmbitos sociais, acadêmicos, motores e de alimentação. Apresente diretrizes práticas de inclusão, manejo preditivo de conflitos ou estereotipias na sala de aula, orientações de ajuda sistemática (pistas físicas ou visuais) para os professores e auxiliares escolares, e estratégias para transição harmoniosa de atividades.`;
    } else {
      templateSnippet = `Objetivo do Relatório: Evolução Clínica de Rotina.
Apresente um panorama completo e linear das intervenções, abordando as taxas graduais de superação das metas propostas, a redução das taxas de frequência de comportamentos indesejáveis/disruptivos, evoluções qualitativas observadas, e recalibração semestral das linhas de base.`;
    }

    // 5. Build prompt
    const prompt = `Aja como o psicólogo clínico de referência responsável pelo caso do paciente descrito. Sua função é redigir um relatório de nível profissional, altamente formal, estruturado sob rigor ético e técnico, focado em transmitir informações fidedignas e clinicamente valiosas.

DADO DO PACIENTE:
*   Nome: ${patient.nome}
*   Idade: ${patient.idade} anos
*   Diagnóstico: ${patient.diagnose}
*   Escola: ${patient.escola || 'Não informado'}
*   Responsáveis: ${patient.responsaveis || 'Não informado'}
*   Clínica de Atendimento: ${patient.clinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}

PLANO DE INTERVENÇÃO ATUAL (PDI / METAS):
- Objetivos Gerais: ${plan?.objetivosGerais || 'Não cadastrados'}
- Objetivos Específicos: ${plan?.objetivosEspecificos || 'Não cadastrados'}

DADOS DE TREINO DE COLETAS DIRETAS (Para análises de dados e taxas de acertos se aplicável):
${JSON.stringify(trials || [])}

NOTAS E RELATOS DOS ACOMPANHANTES TERAPEUTICOS (Para contextualização clínica):
${JSON.stringify(logs || [])}

INSTRUÇÕES DO MODELO SELECIONADO:
${templateSnippet}

INSTRUÇÕES DA ABORDAGEM SELECIONADA:
${approachSnippet}

INSTRUÇÕES PERSONALIZADAS ESPECÍFICAS DO TERAPEUTA (Aplicar com máxima prioridade):
"${customInstructions || 'Nenhuma instrução personalizada fornecida.'}"

INSTRUÇÕES DE INSPIRAÇÃO / MODELO DE REFERÊNCIA (Opcional - Use como inspiração de tom, estrutura e estilo de redação):
${inspirationText ? `Aqui está um modelo de relatório para usar como inspiração de estilo e estrutura:\n---\n${inspirationText}\n---\nPor favor, adapte e redija o relatório do paciente atual com densidade de texto, vocabulário e tom semelhantes ao modelo de inspiração acima, mas usando os dados fidedignos e evoluções do paciente atual.` : 'Nenhuma inspiração fornecida.'}

ASSINATURA E IDENTIFICAÇÃO DO PROFISSIONAL:
Nome do Profissional: ${therapistName || 'Profissional de Psicologia'}
Registro: ${therapistReg || 'Conselho Regional de Psicologia'}

REQUISITOS CRÍTICOS DE ESTRUTURA E ESTILO:
1. IDENTIFICAÇÃO DO PACIENTE SUCINTA NO TOPO: Insira apenas uma seção muito simples de metadados no topo com os dados estruturados básicos de identificação do paciente (para que o documento inicie de forma transparente e organizada).
2. EXCLUSIVIDADE DE TEXTO CORRIDO: Logo abaixo da identificação sumária, redija o relatório INTEIRO na forma de um único e contínuo TEXTO CORRIDO. É EXPRESSAMENTE PROIBIDO criar seções numeradas (como 1, 2, I, II, III), tópicos de marcadores (como bullet points), ou subtítulos em negrito separando seções. Você deve expor em parágrafos de prosa sequencial todo o percurso (evolução sob a abordagem ${approach}, comportamento demonstrado, metas de PDI alcançadas, e encaminhamentos recomendados detalhados de continuidade).
3. PROIBIÇÃO ABSOLUTA DE TÓPICOS E SUBTÍTULOS: Do início ao fim do corpo do texto, tudo deve fluir em blocos de parágrafos normais e integrados.
4. ABORDAGEM CLÍNICA: Ajuste o tom técnico para a abordagem ${approach}.
5. REDAÇÃO ACADÊMICA: Adote redação impecável em Português do Brasil de altíssimo nível científico.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ reportText: response.text });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message || 'Erro ao formular o relatório.' });
  }
});

// 4. Personalized AI Assistant Chat (Multi-modal)
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { patient, history, message, attachedFile } = req.body;
    if (!patient || !message) {
      return res.status(400).json({ error: 'Paciente e mensagem são obrigatórios.' });
    }

    const genAI = getGenAI();

    const systemInstruction = `Você é o "Guia de IA", um assistente de inteligência artificial de alta performance integrado ao prontuário clínico do paciente no sistema.
Você atua como um psicólogo clínico de neurodesenvolvimento experiente, especialista em Análise do Comportamento Aplicada (ABA) e desenvolvimento infantil (TEA, TDAH, atrasos de desenvolvimento global).

CONTEXTO COMPLETO DO PACIENTE:
- Nome: ${patient.nome}
- Idade: ${patient.idade} anos
- Diagnóstico: ${patient.diagnose}
- Escola: ${patient.escola || 'Não informada'}
- Responsáveis: ${patient.responsaveis || 'Não informados'}
- Observações no Prontuário: ${patient.observacoes || 'Nenhuma observação relevante.'}

DIRETRIZES DE RESPOSTA E TOM DE VOZ:
1. Responda SEMPRE em Português do Brasil com excelente rigor clínico, profissional, empático e sem rodeios teóricos desnecessários.
2. Seu objetivo principal é apoiar a equipe multidisciplinar (psicólogos, fonoaudiólogos, terapeutas ocupacionais, e ATs) a analisar dados de comportamento, formular treinos e responder dúvidas de manejo de crises ou regulação.
3. Se o usuário solicitar que você crie/gere um documento (ex: plano de apoio escolar, plano de adaptação, quadro de regras, recomendação sensorial, rotina de transição familiar, etc.), escreva todo o texto de forma completa, rica, detalhada e estruturada com títulos e seções (NÃO use abreviações ou resumos genéricos).
4. Se houver um arquivo anexado no chat (imagem ou PDF), analise-o atentamente sob o ponto de vista terapêutico para responder à solicitação do profissional.
`;

    const contents: any[] = [];

    // Map history array to the SDK content block structure
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }]
        });
      }
    }

    // Prepare active turn
    const activeParts: any[] = [];

    if (attachedFile && attachedFile.base64 && attachedFile.mimeType) {
      let cleanBase64 = attachedFile.base64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      activeParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: attachedFile.mimeType
        }
      });
    }

    activeParts.push({ text: message });

    // Append current user message
    contents.push({
      role: 'user',
      parts: activeParts
    });

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in AI Chat:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar conversa com Guia de IA.' });
  }
});

// 5. Image Generation for Reward cards and Visual Schedules (Apoio Visual / PECS)
app.post('/api/ai-generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'O prompt de imagem é obrigatório.' });
    }

    const genAI = getGenAI();

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Esboço educativo infantil profissional ou cartão de apoio visual escolar para terapia comportamental (ABA/PECS).
Descrição do recurso visual solicitado: "${prompt}"
Diretrizes: Desenho vetorial, limpo, amigável, cores suaves, fundo branco sólido, livre de elementos confusos ou textos elegíveis artificiais. Perfeito para terapia de autismo infantojuvenil.`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || '1:1'
        }
      }
    });

    let base64Image = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      return res.status(500).json({ error: 'Não foi possível gerar a imagem com o modelo Gemini.' });
    }

    res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
  } catch (error: any) {
    console.error('Error in AI image generation:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar ilustração de apoio visual via IA.' });
  }
});

// Serve frontend build / dev environment
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true'
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
