import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Sparkles, RefreshCw, Layers, Printer, FileDown, 
  Trash2, ClipboardSignature, Heart, Volume2, ShieldCheck, Play, HelpCircle
} from 'lucide-react';
import { Patient, ClinicData } from '../types';

interface PsychologistAnamnesisWorkshopProps {
  clinicData: ClinicData;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  handleSaveGeneratedReportAsPDF: (patientId: string, name: string, type: 'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro', notes: string) => void;
  therapistName: string;
  therapistReg: string;
  clinicLogoIcon: string;
}

export const PsychologistAnamnesisWorkshop: React.FC<PsychologistAnamnesisWorkshopProps> = ({
  clinicData,
  selectedPatientId,
  setSelectedPatientId,
  showToast,
  handleSaveGeneratedReportAsPDF,
  therapistName,
  therapistReg,
  clinicLogoIcon
}) => {
  const selectedPatient = clinicData.pacientes.find(p => p.id === selectedPatientId) || clinicData.pacientes[0];

  // Anamnesis fields state
  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [desenvolvimentoMotor, setDesenvolvimentoMotor] = useState('');
  const [desenvolvimentoLinguagem, setDesenvolvimentoLinguagem] = useState('');
  const [comportamentoRotina, setComportamentoRotina] = useState('');
  const [historicoGestacionalMedico, setHistoricoGestacionalMedico] = useState('');
  const [antecedentesFamiliares, setAntecedentesFamiliares] = useState('');
  const [observacoesAnaliseAbordagem, setObservacoesAnaliseAbordagem] = useState('');

  // Recording & Transcription State
  const [isRecording, setIsRecording] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [selectedAnamnesisApproach, setSelectedAnamnesisApproach] = useState<'ABA' | 'Psicanálise' | 'Comportamental' | 'Integrativa'>('ABA');

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Setup Web Speech API if supported
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'pt-BR';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setRawTranscript(prev => prev + finalTranscript);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech Recognition Error:", err);
        if (err.error === 'not-allowed') {
          showToast("Acesso ao microfone negado ou bloqueado no iFrame. Use o campo de rascunhos abaixo ou acione o Simulador de Voz.", "info");
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      showToast("Seu navegador não oferece suporte nativo à gravação via microfone ou o iFrame bloqueou a API. Digite/cole no campo de notas ou use o simulador para testar a IA!", "info");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      showToast("Gravação interrompida. Texto coletado sob análise.", "info");
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        showToast("Microfone conectado! Fale de forma livre sobre a história do paciente...", "success");
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    }
  };

  // Preset Simulated Clinical Interviews for testing out the feature seamlessly
  const handleLoadSimulatedTranscript = (presetType: 'autismo' | 'tdah' | 'psicanalise') => {
    let transcriptText = "";
    if (presetType === 'autismo') {
      transcriptText = `Meu filho Guilherme está com 4 anos. A queixa principal é que ele não responde quando o chamamos pelo nome e vive no mundinho dele, girando rodinhas de carrinhos. Ele demorou para andar, andou só com 1 ano e 5 meses e vivia caindo. Sobre a fala, ele diz poucas palavras soltas, como 'água' e 'baba', mas não conversa, e repete muito o que ouve na TV. Na rotina de sono, acorda três vezes por noite chorando. Na alimentação, é muito seletivo: só aceita comidas pastosas e de cor amarela, como purê de batata, e se ver um pedaço de legume, ele vomita. Tem muitas crises de birra fortes e se joga no chão se mudamos o caminho da escola. A minha gestação foi tranquila, sem problemas, mas o parto foi cesárea de emergência porque o cordão estava enrolado. Não toma remédio controlado. Meu irmão mais novo também tem diagnóstico de Autismo leve.`;
    } else if (presetType === 'tdah') {
      transcriptText = `A Júlia tem 6 anos. A professora diz que ela não para quieta na carteira da escola, vive se levantando e mexe em tudo, além de distrair os colegas. Começou a andar bem cedo, com 10 meses já corria a casa toda. Ela fala bastante, fala sem parar na verdade, até atropela as palavras. O sono é agitado, ela chuta a noite inteira e demora para pegar no sono. Alimenta-se bem, mas come correndo e com muita pressa. Na escola é muito impulsiva e agressiva se perde algum jogo. A gestação foi marcada por muito estresse e ansiedade porque eu estava trabalhando sob pressão, mas o parto foi normal e sem complicações. O pai dela também é extremamente desatento e agitado.`;
    } else if (presetType === 'psicanalise') {
      transcriptText = `O bebê Pedro tem 3 anos. Vim buscar ajuda porque sinto que ele é muito distante de mim, sinto que ele não me olha nos olhos e não aceita meu abraço, parece que recusa meu carinho de mãe. Ele engatinhou normal, mas tem movimentos mecânicos ao andar. Na linguagem ele só emite sussurros e barulhos repetitivos e brinca muito isolado, empilhando objetos de forma rígida, quase obsessiva. Ele tem problemas severos de sono, acorda em pânico gritando e é impossível acalmá-lo se eu não sair do quarto. Alimenta-se apenas mamando no peito, recusa quase todo alimento sólido. Tive uma depressão pós-parto muito grave e passei os primeiros 6 meses dele muito deprimida sem conseguir me conectar bem com ele. Na minha família meu pai era muito frio e ausente.`;
    }

    setRawTranscript(transcriptText);
    showToast("Depoimento / Entrevista Clínica carregada com sucesso! Clique em 'Processar Inteligência e Preencher' para ver a mágica estruturada acontecer.", "success");
  };

  // Clear all form inputs
  const handleClearAnamnesis = () => {
    setQueixaPrincipal('');
    setDesenvolvimentoMotor('');
    setDesenvolvimentoLinguagem('');
    setComportamentoRotina('');
    setHistoricoGestacionalMedico('');
    setAntecedentesFamiliares('');
    setObservacoesAnaliseAbordagem('');
    setRawTranscript('');
    showToast("Telas e campos de anamnese limpos.", "info");
  };

  // AI parsed submission
  const handleProcessWithAI = async () => {
    if (!rawTranscript.trim()) {
      showToast("Por favor, fale ao microfone ou cole um texto de relato clínico no rascunho de gravação primeiro.", "error");
      return;
    }

    setAiParsing(true);
    showToast("Sincronizando com a Inteligência Artificial e convertendo áudio estruturado...", "info");

    try {
      const response = await fetch('/api/parse-anamnesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: selectedPatient,
          transcript: rawTranscript,
          approach: selectedAnamnesisApproach
        })
      });

      if (!response.ok) {
        throw new Error('Falha no processamento. Verifique sua chave de IA.');
      }

      const data = await response.json();
      
      setQueixaPrincipal(data.queixaPrincipal || '');
      setDesenvolvimentoMotor(data.desenvolvimentoMotor || '');
      setDesenvolvimentoLinguagem(data.desenvolvimentoLinguagem || '');
      setComportamentoRotina(data.comportamentoRotina || '');
      setHistoricoGestacionalMedico(data.historicoGestacionalMedico || '');
      setAntecedentesFamiliares(data.antecedentesFamiliares || '');
      setObservacoesAnaliseAbordagem(data.observacoesAnaliseAbordagem || '');

      showToast("Anamnese convertida e preenchida com sucesso sob abordagem " + selectedAnamnesisApproach + "!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Erro ao processar com IA: " + err.message, "error");
    } finally {
      setAiParsing(false);
    }
  };

  // Manually pre-populate typical scaffolding template text based on selected approach
  const handleLoadTemplateSkeleton = () => {
    if (selectedAnamnesisApproach === 'ABA') {
      setQueixaPrincipal("- Idade de início dos marcos atípicos de desenvolvimento:\n- Comportamentos de esquiva frequentes:\n- Barreiras comportamentais identificadas:\n- Habilidade de imitação motora e contato de olhar de baseline:");
      setDesenvolvimentoMotor("- Idade de engatinhar e andar:\n- Equilíbrio, hipotonia e coordenação fina (preensão pinça):\n- Domínio de brincadeira motora ampla:");
      setDesenvolvimentoLinguagem("- Nível de operantes verbais atuais (Mandos independentes, tatos, ecolalias):\n- Responder sob comandos instrucionais simples:\n- Uso de gestos compensatórios para contato social:");
      setComportamentoRotina("- Seletividade alimentar de texturas e cores:\n- Desfralde, barreiras no banheiro:\n- Características de sono (despertares, rituais):\n- Frequência observada de estereotipias motoras/vocais:");
      setHistoricoGestacionalMedico("- Idade gestacional no parto, complicações:\n- Choro imediato após nascimento, índice apgar:\n- Histórico de exames de audição, visão BERA:");
      setAntecedentesFamiliares("- Ocorrência de atrasos semelhantes ou neurodivergências na linhagem sanguínea consanguínea:\n- Dinâmica residencial e quantidade de cuidadores primários:");
      setObservacoesAnaliseAbordagem("Análise Funcional de Baseline (ABA):\n- Antecedentes frequentes das crises:\n- Consequências mantenedoras de fuga/esquiva ou acesso tangível:\n- Reforçadores primários e secundários altamente eficientes sugeridos:");
    } else if (selectedAnamnesisApproach === 'Psicanálise') {
      setQueixaPrincipal("- Conteúdo do sofrimento inicial relatado pela mãe/pai:\n- Primeiras percepções e expectativas sobre a gestação do bebê:\n- Singularidade do sintoma expresso no cotidiano familiar:");
      setDesenvolvimentoMotor("- Relação do bebê com o corpo e olhar materno:\n- Mobilidade, movimentos corporais lúdicos e autoerotismo primário:\n- Resposta aos limites físicos corporais:");
      setDesenvolvimentoLinguagem("- Encontro com a linguagem, atribuição de sentido dos pais aos sons do bebê:\n- Uso de balbucio simbólico, ecolalias como refúgio ou expressão afetiva:\n- Intenção de diálogo lúdico ou isolamento de fala:");
      setComportamentoRotina("- Vínculo alimentar (amamentação de peito, transição de sólidos e significados):\n- Controle de esfíncteres (significação de dar e reter fezes na relação com o Outro):\n- Angústias de separação no sono, pesadelos e rituais noturnos:");
      setHistoricoGestacionalMedico("- Significado inconsciente da gravidez para a constelação familiar:\n- Circunstâncias psíquicas do parto e nascimento do sujeito:");
      setAntecedentesFamiliares("- Mitos familiares, heranças psíquicas transgeracionais:\n- Traumas, depressões parentais pós-parto ou ausências fundamentais:");
      setObservacoesAnaliseAbordagem("Estruturação Subjetiva e Dinâmica Transferencial:\n- Funcionamento do brincar simbólico de representação de forte ausência/presença (Fort-Da):\n- Vínculo mãe-bebê e constituição de alteridade:\n- Linha de condução psicoterapêutica analítica indicada:");
    } else if (selectedAnamnesisApproach === 'Comportamental') {
      setQueixaPrincipal("- Resposta-alvo que motivou o atendimento:\n- Frequência, duração e intensidade dos episódios de birra ou agressividade:\n- Variáveis de antecedente imediato:");
      setDesenvolvimentoMotor("- Marcos observados e condicionamentos de imitação motiva:\n- Atividade física diária do paciente:");
      setDesenvolvimentoLinguagem("- Vocalizações contingentes a estímulos discriminativos específicos:\n- Operantes verbais elementares:\n- Barreiras de comunicação de baseline:");
      setComportamentoRotina("- Contingências que governam a hora de deitar e acordar (sono):\n- Pareamento clássico associado a texturas (alimentação):\n- Treino de toalete com base em reforço diferencial:");
      setHistoricoGestacionalMedico("- Histórico biológico e orgânico conhecido:\n- Histórico de exames médicos e audiológicos:");
      setAntecedentesFamiliares("- Padrão de respostas de reforço ou punição emitidas pelos próprios pais em ambiente naturalístico para comportamentos da criança:");
      setObservacoesAnaliseAbordagem("Tríplice Contingência Comportamental (SD -> R -> SC):\n- Funções operantes para comportamentos disruptivos:\n- Planejamento de contingências facilitadoras em ambiente domiciliar:\n- Reforço positivo diferencial de comportamentos alternativos (DRA/DRI):");
    } else {
      // General integrated
      setQueixaPrincipal("- Queixa clínica geral e linha do tempo de início de sinais:\n- Percepções de familiares e de outros profissionais:");
      setDesenvolvimentoMotor("- Locomoção, equilíbrio, postura ampla e coordenação motora óculo-manual de baseline:");
      setDesenvolvimentoLinguagem("- Nível de verbalização e pragmática social de conversação:\n- Contato ocular espontâneo e expressão postural comunicativa:");
      setComportamentoRotina("- Higiene de rotina diária (sono, escovação e banho):\n- Seleção e deglutição alimentar:\n- Manejo de birras ou episódios oposicionistas:");
      setHistoricoGestacionalMedico("- Transcurso médico, cirurgias e uso contínuo de terapia farmacológica:");
      setAntecedentesFamiliares("- Contexto afetivo, moradia e rede de apoio familiar disposta:");
      setObservacoesAnaliseAbordagem("Formulação Multiaxial Integrada:\n- Aspectos biológicos, socioemocionais e interacionistas da criança:\n- Indicação de acompanhamento conjunto multidisciplinar necessário:");
    }
    showToast("Modelo estrutural de anamnese para a abordagem " + selectedAnamnesisApproach + " inserido nos campos!", "success");
  };

  const handlePrintAnamnesis = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Incapaz de abrir popup de impressão. Verifique bloqueador de popups.", "warning");
      return;
    }

    const clinicDetailsName = clinicLogoIcon === 'puzzle' ? 'Clínica ABA – Acolher Brincar Aprender' :
                             clinicLogoIcon === 'steth' ? 'Clínica Caminho ABA Integrada' :
                             clinicLogoIcon === 'brain' ? 'Instituto de Mente Comportamental' :
                             clinicLogoIcon === 'lotus' ? 'Espaço Alternativo de Desenvolvimento' :
                             clinicLogoIcon === 'child' ? 'Viva Infância Centro de Desenvolvimento' :
                             'Clínica Aprender & Evoluir';

    const emojiLogo = clinicLogoIcon === 'puzzle' ? '🧩' :
                      clinicLogoIcon === 'steth' ? '🩺' :
                      clinicLogoIcon === 'brain' ? '🧠' :
                      clinicLogoIcon === 'lotus' ? '🌸' :
                      clinicLogoIcon === 'child' ? '🧒' : '💡';

    printWindow.document.write(`
      <html>
        <head>
          <title>Anamnese Completa - ${selectedPatient?.nome || 'Paciente'}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #e1e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 40px; margin-bottom: 10px; }
            .clinic-name { font-size: 22px; font-weight: bold; color: #1e1b4b; }
            .doc-title { font-size: 15px; font-weight: bold; letter-spacing: 1px; color: #4f46e5; margin-top: 5px; text-transform: uppercase; }
            
            .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
            .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
            .patient-label { font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 10px; }
            .patient-value { font-weight: 600; color: #1e293b; }

            .section-title { font-size: 14px; font-weight: bold; color: #1e1b4b; border-left: 3px solid #4f46e5; padding-left: 8px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; }
            .section-content { font-size: 13px; white-space: pre-wrap; color: #334155; pl: 11px; margin-bottom: 20px; }
            
            .signature-section { text-align: center; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .signature-line { width: 250px; border-bottom: 1px solid #94a3b8; margin: 0 auto 10px; }
            .therapist-name { font-weight: bold; color: #0f172a; font-size: 14px; }
            .therapist-reg { color: #64748b; font-size: 12px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${emojiLogo}</div>
            <div class="clinic-name">${clinicDetailsName}</div>
            <div class="doc-title">Anamnese de Desenvolvimento Clínico (${selectedAnamnesisApproach})</div>
          </div>
          
          <div class="patient-card">
            <div class="patient-grid">
              <div>
                <span class="patient-label">Paciente:</span>
                <div class="patient-value">${selectedPatient?.nome}</div>
              </div>
              <div>
                <span class="patient-label">Idade:</span>
                <div class="patient-value">${selectedPatient?.idade} anos</div>
              </div>
              <div>
                <span class="patient-label">Diagnóstico H.D:</span>
                <div class="patient-value">${selectedPatient?.diagnose}</div>
              </div>
              <div>
                <span class="patient-label">Responsáveis / Informante:</span>
                <div class="patient-value">${selectedPatient?.responsaveis || 'Não informado'}</div>
              </div>
              <div>
                <span class="patient-label">Abordagem de Análise:</span>
                <div class="patient-value">${selectedAnamnesisApproach}</div>
              </div>
              <div>
                <span class="patient-label">Data da Entrevista:</span>
                <div class="patient-value">${new Date().toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          </div>

          <div class="section-title">1. Queixa Principal e Sinais Iniciais</div>
          <div class="section-content">${queixaPrincipal || 'Sem registro.'}</div>

          <div class="section-title">2. Marcos de Desenvolvimento Motor</div>
          <div class="section-content">${desenvolvimentoMotor || 'Sem registro.'}</div>

          <div class="section-title">3. Desenvolvimento de Fala, Comunicação e Linguagem</div>
          <div class="section-content">${desenvolvimentoLinguagem || 'Sem registro.'}</div>

          <div class="section-title">4. Comportamento, Nutrição, Sono e Rotina Diária</div>
          <div class="section-content">${comportamentoRotina || 'Sem registro.'}</div>

          <div class="section-title">5. Histórico Médico e Intercorrências Gestacionais</div>
          <div class="section-content">${historicoGestacionalMedico || 'Sem registro.'}</div>

          <div class="section-title">6. Antecedentes e Dinâmica Familiar</div>
          <div class="section-content">${antecedentesFamiliares || 'Sem registro.'}</div>

          <div class="section-title">7. Análise, Conclusão Clínico-Teórica & Condutas (${selectedAnamnesisApproach})</div>
          <div class="section-content">${observacoesAnaliseAbordagem || 'Sem registro.'}</div>

          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="therapist-name">${therapistName}</div>
            <div class="therapist-reg">${therapistReg}</div>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleArchiveAnamnesis = () => {
    let combinedContent = `=== ANAMNESE CLÍNICA DE DESENVOLVIMENTO ===
Abordagem: ${selectedAnamnesisApproach}
Paciente: ${selectedPatient?.nome} | ${selectedPatient?.idade} anos | CID: ${selectedPatient?.diagnose}

1. QUEIXA PRINCIPAL:
${queixaPrincipal}

2. DESENVOLVIMENTO MOTOR:
${desenvolvimentoMotor}

3. DESENVOLVIMENTO DE LINGUAGEM:
${desenvolvimentoLinguagem}

4. COMPORTAMENTO E ROTINA DIÁRIA:
${comportamentoRotina}

5. HISTÓRICO GESTACIONAL E MÉDICO:
${historicoGestacionalMedico}

6. ANTECEDENTES FAMILIARES:
${antecedentesFamiliares}

7. FORMULAÇÃO E CONDUTA CLINICA:
${observacoesAnaliseAbordagem}

Assinado por: ${therapistName} (${therapistReg})`;

    // File type 'Avaliação Sensorial' or 'Outro' as container
    handleSaveGeneratedReportAsPDF(
      selectedPatient.id, 
      `Anamnese Clinica ${selectedAnamnesisApproach} - ${selectedPatient.nome}`,
      'Outro', 
      combinedContent
    );
    showToast("Anamnese registrada eletronicamente arquivada no prontuário do paciente!", "success");
  };

  return (
    <div className="bg-slate-50/40 rounded-2xl border border-slate-200/60 p-4 md:p-6 flex flex-col gap-6 animate-fade-in text-slate-800">
      
      {/* Title block */}
      <div className="border-b border-indigo-100/50 pb-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-2xl text-indigo-950 flex items-center gap-2.5">
              <ClipboardSignature className="w-7 h-7 text-indigo-750" /> Anamnese de Desenvolvimento Assistida por IA
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Colete históricos, realize gravação nativa da entrevista com responsáveis, selecione abordagens teóricas de relevo e estruture em blocos clínicos automaticamente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick selectors for simulator */}
            <div className="bg-white border border-slate-200 p-1 px-2.5 rounded-xl flex items-center gap-2 shadow-sm font-semibold text-xs">
              <span className="text-slate-400">⚡ Testar Simulador:</span>
              <button 
                type="button" 
                onClick={() => handleLoadSimulatedTranscript('autismo')}
                className="text-indigo-650 hover:text-indigo-800 hover:underline cursor-pointer font-bold"
              >
                Autismo (Guilherme)
              </button>
              <span className="text-slate-200">|</span>
              <button 
                type="button" 
                onClick={() => handleLoadSimulatedTranscript('tdah')}
                className="text-indigo-650 hover:text-indigo-800 hover:underline cursor-pointer font-bold"
              >
                TDAH (Júlia)
              </button>
              <span className="text-slate-200">|</span>
              <button 
                type="button" 
                onClick={() => handleLoadSimulatedTranscript('psicanalise')}
                className="text-indigo-650 hover:text-indigo-800 hover:underline cursor-pointer font-bold"
              >
                Psicanálise (Pedro)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: DICTATION PAD & CONTROLS */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Section 1: Approach Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
            <span className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> 1. Orientação Teórica da Anamnese
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ABA', label: 'ABA 🧩', subtitle: 'Análise funcional e barreiras' },
                { id: 'Psicanálise', label: 'Psicanálise 🌀', subtitle: 'Vínculos primários e lúdico' },
                { id: 'Comportamental', label: 'Behaviorismo ⌲', subtitle: 'Reforçamento e hábitos' },
                { id: 'Integrativa', label: 'Prática Integrada ⚡', subtitle: 'Evolutivo geral da criança' }
              ].map((appr) => (
                <button
                  key={appr.id}
                  type="button"
                  onClick={() => {
                    setSelectedAnamnesisApproach(appr.id as any);
                    showToast(`Abordagem de anamnese alterada para: ${appr.id}`, "info");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAnamnesisApproach === appr.id 
                      ? 'border-indigo-650 bg-indigo-50/30' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-850">{appr.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{appr.subtitle}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={handleLoadTemplateSkeleton}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold p-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ClipboardSignature className="w-3.5 h-3.5 text-indigo-600" /> Iniciar com Estrutura / Esqueleto
              </button>

              <button
                type="button"
                onClick={handleClearAnamnesis}
                className="bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 text-xs font-bold p-2 px-3 rounded-xl transition-all cursor-pointer"
                title="Limpar formulários"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section 2: Audio Recording & Raw Transcription Terminal */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider flex items-center gap-1">
                <Mic className="w-3.5 h-3.5 text-red-500" /> 2. Gravador Assistido de Voz / Entrevista
              </span>
              <span className="text-[9px] bg-red-50 text-red-600 font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {isRecording ? "Gravando Tempo Real" : "Inativo"}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Acione o microfone para gravar as declarações da mãe, pai ou terapeuta em tempo real. Você também pode digitar livremente ou carregar as entrevistas simuladas nos botões rápidos de teste na barra superior.
            </p>

            <div className="flex justify-center py-2.5">
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white font-bold text-xs transition-all border duration-300 relative cursor-pointer ${
                  isRecording 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-lg scale-105 border-red-300 ring-4 ring-rose-100' 
                    : 'bg-gradient-to-r from-indigo-750 to-indigo-850 hover:shadow-md border-indigo-600'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-7 h-7 mb-1 animate-pulse" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-7 h-7 mb-1" />
                    <span>Gravar</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Transcript Box */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="raw-transcript-box" className="text-[10px] font-bold text-slate-500">Texto bruto de transcrição / depoimento livre:</label>
              <textarea
                id="raw-transcript-box"
                value={rawTranscript}
                onChange={(e) => setRawTranscript(e.target.value)}
                placeholder="Exemplo de transcrição livre de entrevista com familiares ou colheita de dados cruciais de terapia..."
                className="w-full h-32 p-3 font-semibold text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* CTA action trigger */}
            <button
              type="button"
              disabled={aiParsing || !rawTranscript.trim()}
              onClick={handleProcessWithAI}
              className="w-full bg-gradient-to-r from-indigo-750 to-indigo-850 hover:from-indigo-800 hover:to-indigo-900 text-white font-extrabold text-xs p-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiParsing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Mapeando Dados Clínicos com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Processar Inteligência e Preencher
                </>
              )}
            </button>
          </div>

          {/* Quick tips card */}
          <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl flex gap-3 text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h5 className="font-bold text-xs text-emerald-900 flex items-center gap-1">Rigor Clínico e Compliance</h5>
              <p className="text-[10.5px] leading-relaxed text-emerald-850 mt-0.5">
                O processador de anamnese interpreta relatórios de desenvolvimento de fonoaudiologia, terapia ocupacional e medicina preventiva de forma totalmente aderente à portaria ética do CFP.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MEDICINE SHEETS & PREVIEW */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Interactive Document Editor / Review Board */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-md flex flex-col gap-5 relative">
            
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-600 to-indigo-700 rounded-t-2xl" />

            {/* Sheet action bar */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mt-1.5">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> Prontuário de Anamnese Estrutural
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Editores avançados para os sete blocos do prontuário.</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintAnamnesis}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>

                <button
                  type="button"
                  onClick={handleArchiveAnamnesis}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <FileDown className="w-3.5 h-3.5" /> Arquivar
                </button>
              </div>
            </div>

            {/* Form Fields: The 7 anamnesis sections */}
            <div className="flex flex-col gap-4">
              
              {/* Field 1 */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 relative">
                <label htmlFor="input-queixa" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">1. Queixa Principal e Manifestação de Sintomas</label>
                <textarea
                  id="input-queixa"
                  value={queixaPrincipal}
                  onChange={(e) => setQueixaPrincipal(e.target.value)}
                  placeholder="Idade dos primeiros atrasos, principais barreiras, comportamentos mais desafiadores relatados."
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-250 rounded-lg min-h-[60px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

              {/* Field 2 */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                <label htmlFor="input-motor" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">2. Evolução de Marcos Motores (Amplo e Fino)</label>
                <textarea
                  id="input-motor"
                  value={desenvolvimentoMotor}
                  onChange={(e) => setDesenvolvimentoMotor(e.target.value)}
                  placeholder="Andar, sustentar cabeça, pinça fina, tônus muscular, marcha atípica ou equilíbrio."
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-250 rounded-lg min-h-[60px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

              {/* Field 3 */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                <label htmlFor="input-lang" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">3. Fala, Linguagem e Intenção de Comunicação</label>
                <textarea
                  id="input-lang"
                  value={desenvolvimentoLinguagem}
                  onChange={(e) => setDesenvolvimentoLinguagem(e.target.value)}
                  placeholder="Idade das primeiras palavras, vocalização funcional, ecolalias, gestos e pragmática social."
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-250 rounded-lg min-h-[60px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

              {/* Field 4 */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                <label htmlFor="input-rotina" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">4. Comportamento, Nutrição, Sono e Ritmo Clínico</label>
                <textarea
                  id="input-rotina"
                  value={comportamentoRotina}
                  onChange={(e) => setComportamentoRotina(e.target.value)}
                  placeholder="Características alimentares, seletividade sensorial, barreiras de sono, controle esfincteriano e estereotipias."
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-250 rounded-lg min-h-[60px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

              {/* Field 5 */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                <label htmlFor="input-gestacional" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">5. Histórico Gestacional, Parto e Antecedentes Clínico-Médicos</label>
                <textarea
                  id="input-gestacional"
                  value={historicoGestacionalMedico}
                  onChange={(e) => setHistoricoGestacionalMedico(e.target.value)}
                  placeholder="Transcorrer da gestação, neonatal, tipo de parto, medicações, internações prévias."
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-250 rounded-lg min-h-[60px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

              {/* Field 6 */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                <label htmlFor="input-familiar" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">6. Histórico Genético e Dinâmica Familiar</label>
                <textarea
                  id="input-familiar"
                  value={antecedentesFamiliares}
                  onChange={(e) => setAntecedentesFamiliares(e.target.value)}
                  placeholder="Investigação de traços de autismo, TDAH ou outros diagnósticos em consanguíneos."
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-250 rounded-lg min-h-[60px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

              {/* Field 7 */}
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 relative">
                <div className="absolute top-2.5 right-2 text-[10px] font-black text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-full">
                  Foco: {selectedAnamnesisApproach}
                </div>
                <label htmlFor="input-obs" className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1.5">7. Análise Técnica Final & Orientação Terapêutica</label>
                <textarea
                  id="input-obs"
                  value={observacoesAnaliseAbordagem}
                  onChange={(e) => setObservacoesAnaliseAbordagem(e.target.value)}
                  placeholder="Formulação analítico-teórica à luz da abordagem escolhida e recomendações de acolhimento profissional."
                  className="w-full text-xs font-semibold p-2.5 bg-white border border-indigo-200 rounded-lg min-h-[90px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 shadow-none text-slate-850"
                />
              </div>

            </div>

            {/* Document stamping signature footer */}
            <div className="border-t border-slate-200/60 pt-4 flex flex-col items-center text-center mt-2">
              <div className="h-0.5 w-44 bg-slate-200 mb-1" />
              <div className="text-xs font-bold text-slate-800">{therapistName || 'Psicólogo Clínico Responsável'}</div>
              <div className="text-[10px] text-slate-400 font-semibold">{therapistReg || 'Conselho Regional'}</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
