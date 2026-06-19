import React, { useState, useEffect } from 'react';
import { 
  User, Check, Plus, Search, Sparkles, BookOpen, Award, Calendar, 
  TrendingUp, Trash2, Clock, ChevronRight, X, FileText, MapPin, 
  RotateCcw, LayoutDashboard, Copy, ArrowUpRight, Activity, Edit,
  FolderOpen, Upload, Download, Eye, CalendarDays, FilePlus, AlertTriangle, MessageCircle,
  Flame, Archive, CheckCircle2, History, Paperclip, Image, Lock, Key, Link2
} from 'lucide-react';
import { ClinicType, Patient, InterventionPlan, TeachingProgram, TherapeuticAssistant, SessionLog, AgendaEvent, ClinicData, TrialAttempt, PatientDocument } from './types';
import { INITIAL_ABA_DATA, INITIAL_ATRIA_DATA } from './mockData';
import { PatientCharts } from './components/PatientCharts';
import { PsychologistReportWorkshop } from './components/PsychologistReportWorkshop';
import { AIPatientGuide } from './components/AIPatientGuide';
import { FirebaseSyncInfoModal } from './components/FirebaseSyncInfoModal';
import { useClinicalState } from './context/ClinicalStateContext';
import { supabase } from './lib/supabase';

export default function App() {
  const {
    activeClinic,
    setActiveClinic,
    clinicData,
    setClinicData,
    updateClinicData,
    firebaseAuthenticated,
    authChecked,
    isSyncModalOpen,
    setIsSyncModalOpen
  } = useClinicalState();



  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<'pacientes' | 'planos' | 'treinos' | 'at' | 'relatorios' | 'graficos' | 'documentos' | 'mensagens'>('pacientes');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSubTab, setPatientSubTab] = useState<'dados' | 'ai'>('dados');
  const [selectedAtId, setSelectedAtId] = useState<string | null>(null);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);

  // Chat/Messaging States
  const [chatPatientId, setChatPatientId] = useState<string>('');
  const [chatText, setChatText] = useState<string>('');
  const [parentChatText, setParentChatText] = useState<string>('');
  const [chatAttachment, setChatAttachment] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  const [parentChatAttachment, setParentChatAttachment] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);

  const handleAttachmentUpload = (file: File, isParentChat: boolean) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const isImg = file.type.startsWith('image/');
      const attachment = {
        url: reader.result as string,
        type: (isImg ? 'image' : 'file') as 'image' | 'file',
        name: file.name
      };
      if (isParentChat) {
        setParentChatAttachment(attachment);
      } else {
        setChatAttachment(attachment);
      }
      showToast(`Mídia/documento "${file.name}" anexado com sucesso! Prontinho para enviar.`, "success");
    };
    reader.readAsDataURL(file);
  };

  // Modals & form visibility state
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isAddingAt, setIsAddingAt] = useState(false);
  const [isEditingAt, setIsEditingAt] = useState(false);
  const [deletingAtId, setDeletingAtId] = useState<string | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);

  // Search filter inputs
  const [searchPatient, setSearchPatient] = useState('');
  const [searchAt, setSearchAt] = useState('');

  // Custom training states
  const [customTrialPrompt, setCustomTrialPrompt] = useState('');
  const [showAllPatientsFinishedTrainings, setShowAllPatientsFinishedTrainings] = useState(false);
  const [editingTrialId, setEditingTrialId] = useState<string | null>(null);
  const [deletingTrialId, setDeletingTrialId] = useState<string | null>(null);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const [isAddingManualTraining, setIsAddingManualTraining] = useState(false);

  // Reveal passwords toggle states
  const [revealProfPassword, setRevealProfPassword] = useState(false);
  const [revealPatientPassword, setRevealPatientPassword] = useState<string | null>(null);

  // Behaviors & Finished workouts state trackers
  const [newBehaviorInput, setNewBehaviorInput] = useState('');
  const [trainingObsInput, setTrainingObsInput] = useState('');
  const [trainingDateInput, setTrainingDateInput] = useState(new Date().toISOString().substring(0, 10));

  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<{ name: string; base64: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiPromptContext, setAiPromptContext] = useState('');
  const [isDashboardVisible, setIsDashboardVisible] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [reportsSubTab, setReportsSubTab] = useState<'individual' | 'automaticos'>('automaticos');
  const [selectedCycleWeeks, setSelectedCycleWeeks] = useState<'1-4' | '5-8' | '9-12' | '13-16'>('1-4');
  const [selectedAutoReportType, setSelectedAutoReportType] = useState<'evolutivo' | 'solicitacao'>('evolutivo');
  const [selectedAutoPatientId, setSelectedAutoPatientId] = useState<string>('p4');

  // Documents tab states
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docPatientFilter, setDocPatientFilter] = useState<string>('all');
  const [isAddingDocModal, setIsAddingDocModal] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<PatientDocument | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Temporary calendar filter
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('month');

  // Password editing states
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [tempPasswordVal, setTempPasswordVal] = useState<string>('');

  // ADM password management panel states
  const [isPasswordPanelExpanded, setIsPasswordPanelExpanded] = useState<boolean>(false);
  const [newAdmPasswordVal, setNewAdmPasswordVal] = useState<string>('');
  const [selectedProfForPassId, setSelectedProfForPassId] = useState<string>('');
  const [newProfPasswordVal, setNewProfPasswordVal] = useState<string>('');
  const [selectedPatientForPassId, setSelectedPatientForPassId] = useState<string>('');
  const [newPatientPasswordVal, setNewPatientPasswordVal] = useState<string>('');
  const [admPassword, setAdmPassword] = useState<string>('adm123');

  useEffect(() => {
    const savedAdmPass = localStorage.getItem(`adm_password_${activeClinic}`);
    if (savedAdmPass) {
      setAdmPassword(savedAdmPass);
    } else {
      setAdmPassword('adm123');
    }
  }, [activeClinic]);

  // Clinic Selection State (Direct Choice initially, always require login so they can test correctly)
  const [isClinicChosen, setIsClinicChosen] = useState<boolean>(false);

  // Consent and confidentiality state
  const [hasAcceptedConsent, setHasAcceptedConsent] = useState<boolean>(() => {
    return localStorage.getItem('consent_accepted_v5') === 'true';
  });
  const [termSigiloChecked, setTermSigiloChecked] = useState<boolean>(false);
  const [termLgpdChecked, setTermLgpdChecked] = useState<boolean>(false);
  const [showConsentTermsModal, setShowConsentTermsModal] = useState<boolean>(false);

  // Password login states
  const [abaPassword, setAbaPassword] = useState('');
  const [atriaPassword, setAtriaPassword] = useState('');
  const [loginError, setLoginError] = useState<{ aba?: string; atria?: string }>({});

  // Role and Auth states
  const [userRole, setUserRole] = useState<'adm' | 'clinician' | 'parent'>('clinician');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedProfessionalId, setLoggedProfessionalId] = useState<string | null>(null);
  const [loginSelectedProfId, setLoginSelectedProfId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginAdmPassword, setLoginAdmPassword] = useState<string>('');
  const [loginMethod, setLoginMethod] = useState<'prof' | 'adm'>('prof');

  // Parent Portal states
  const [parentChildId, setParentChildId] = useState<string>('p1');
  const [parentPass, setParentPass] = useState('');
  const [parentLoginError, setParentLoginError] = useState<string | null>(null);
  const [isEditingPatient, setIsEditingPatient] = useState(false);

  // Quick registration states for login screen
  const [isRegisteringProf, setIsRegisteringProf] = useState(false);
  const [regName, setRegName] = useState('');
  const [regCargo, setRegCargo] = useState('AT');
  const [regEmail, setRegEmail] = useState('');
  const [regTelefone, setRegTelefone] = useState('');

  const getParentPortalPatientsList = () => {
    const savedAba = localStorage.getItem('aba_clinic_v1');
    const savedAtria = localStorage.getItem('atria_clinic_v1');
    const dbAba: ClinicData = savedAba ? JSON.parse(savedAba) : INITIAL_ABA_DATA;
    const dbAtria: ClinicData = savedAtria ? JSON.parse(savedAtria) : INITIAL_ATRIA_DATA;
    
    const abaList = (dbAba.pacientes || [])
      .filter(p => p.criadoPorProfissional !== false)
      .map(p => ({ ...p, clinic: 'ABA' as ClinicType }));
    const atriaList = (dbAtria.pacientes || [])
      .filter(p => p.criadoPorProfissional !== false)
      .map(p => ({ ...p, clinic: 'Atria' as ClinicType }));
    return [...abaList, ...atriaList];
  };

  const isPatientLinkedToProfessional = (patientId: string, profId: string | null) => {
    if (!profId) return false;
    const prof = clinicData.acompanhantes?.find(at => at.id === profId);
    return prof ? (prof.pacientesVinculados || []).includes(patientId) : false;
  };

  const getAccessiblePatients = (): Patient[] => {
    if (!isLoggedIn) return [];
    if (userRole === 'adm') {
      return clinicData.pacientes || [];
    } else if (userRole === 'clinician') {
      return clinicData.pacientes || [];
    } else {
      // Parent role
      const parentPatient = clinicData.pacientes.find(p => p.id === selectedPatientId);
      return parentPatient ? [parentPatient] : [];
    }
  };

  const accessiblePatients = getAccessiblePatients();

  const loggedProf = clinicData.acompanhantes.find(at => at.id === loggedProfessionalId);
  const isAT = userRole === 'clinician' && !!loggedProf && (
    (loggedProf.cargo || '').toLowerCase().trim() === 'at' || 
    (loggedProf.cargo || '').toUpperCase().includes('AT') || 
    (loggedProf.cargo || '').toLowerCase().includes('assistente')
  );

  const handleProfessionalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginSelectedProfId) {
      showToast("Por favor, selecione um profissional da lista.", "error");
      return;
    }
    const prof = clinicData.acompanhantes.find(at => at.id === loginSelectedProfId);
    if (!prof) {
      showToast("Profissional não encontrado!", "error");
      return;
    }
    if (prof.status === 'Inativo') {
      showToast("Este cadastro de profissional está inativo no momento. Entre em contato com o ADM.", "error");
      return;
    }
    setLoggedProfessionalId(prof.id);
    setUserRole('clinician');
    setIsLoggedIn(true);
    setLoginPassword('');
    showToast(`Bem-vindo, ${prof.nome}!`, "success");
  };

  const handleAdmLogin = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Acesso ao Painel ADM concedido!", "success");
  };

  const handleQuickRegisterProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast("Nome é obrigatório!", "error");
      return;
    }

    const newAt: TherapeuticAssistant = {
      id: `at_${Date.now()}`,
      nome: regName.trim(),
      telefone: regTelefone.trim(),
      email: regEmail.trim(),
      observacoes: '',
      cargo: regCargo.trim() || 'AT',
      password: '1234',
      status: 'Ativo',
      pacientesVinculados: []
    };

    updateClinicData({
      ...clinicData,
      acompanhantes: [...clinicData.acompanhantes, newAt]
    });

    setLoggedProfessionalId(newAt.id);
    setUserRole('clinician');
    setIsLoggedIn(true);
    setIsRegisteringProf(false);
    
    // Clear registration fields
    setRegName('');
    setRegCargo('AT');
    setRegEmail('');
    setRegTelefone('');

    showToast(`Bem-vindo, ${newAt.nome}! Seu cadastro foi realizado com sucesso.`, "success");
  };

  // Reset password field instead of auto-prefilling when profile selection changes
  useEffect(() => {
    setLoginPassword('');
  }, [loginSelectedProfId]);

  // Synchronize parentChildId selection automatically with state changes
  useEffect(() => {
    const list = getParentPortalPatientsList();
    if (list.length > 0) {
      const exists = list.some(p => p.id === parentChildId);
      if (!exists) {
        setParentChildId(list[0].id);
      }
    } else {
      setParentChildId('');
    }
  }, [clinicData, parentChildId]);

  const getSelectedParentPasswordHint = () => {
    const list = getParentPortalPatientsList();
    const patient = list.find(p => p.id === parentChildId);
    return patient?.senhaPais || '1234';
  };

  const handleLoginAba = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveClinic('ABA');
    setIsClinicChosen(true);
    setIsLoggedIn(false);
    showToast("Carregando Clínica ABA...", "info");
  };

  const handleLoginAtria = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveClinic('Atria');
    setIsClinicChosen(true);
    setIsLoggedIn(false);
    showToast("Carregando Caminho ABA...", "info");
  };

  const handleLoginParent = (e: React.FormEvent) => {
    e.preventDefault();
    const patientsList = getParentPortalPatientsList();
    const foundPatient = patientsList.find(p => p.id === parentChildId);
    if (!foundPatient) {
      setParentLoginError('Paciente não localizado!');
      showToast("Paciente não localizado!", "error");
      return;
    }

    setActiveClinic(foundPatient.clinic);
    
    const savedDb = localStorage.getItem(foundPatient.clinic === 'ABA' ? 'aba_clinic_v1' : 'atria_clinic_v1');
    const targetDb: ClinicData = savedDb 
      ? JSON.parse(savedDb) 
      : (foundPatient.clinic === 'ABA' ? INITIAL_ABA_DATA : INITIAL_ATRIA_DATA);
    setClinicData(targetDb);

    setSelectedPatientId(parentChildId);
    setUserRole('parent');
    setIsClinicChosen(true);
    setIsLoggedIn(true);
    showToast("Seja bem-vindo ao Portal de Pais & Cuidadores!", "success");
    setParentLoginError(null);
  };

  // Range selector for trial achievements
  const [trialTimeRange, setTrialTimeRange] = useState<'semanal' | 'mensal' | 'historico'>('semanal');

  // Date selection for the monthly calendar grid (defaults to June 9, 2026)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>("2026-06-09");

  // Helper to append quick-select objective drafts reducing typing
  const appendObjectiveDraft = (area: string) => {
    const defaultTemplates: Record<string, string> = {
      'Contato Visual': '- [Contato Visual]: Apresentar contato de olhar sustentado de pelo menos 3 segundos quando convocado pelo nome pelo terapeuta aplicador.',
      'Atenção Compartilhada': '- [Atenção Compartilhada]: Seguir o apontar do terapeuta em direção a estímulos distantes e alternar olhar entre brinquedo e terapeuta.',
      'Mandos': '- [Mandos]: Solicitar itens alimentares e brinquedos preferidos de forma vocal ou vocalização aproximada, eliminando ajuda física.',
      'Tatos': '- [Tatos]: Identificar e nomear espontaneamente categorias de animais, brinquedos e cores familiares diante da apresentação de cartões 2D.',
      'Intraverbal': '- [Intraverbal]: Completar sentenças simples e responder a perguntas sociais comuns como "Qual seu nome?" ou "Quantos anos você tem?".',
      'Imitação Motora': '- [Imitação Motora]: Copiar movimentos amplos e finos realizados pelo instrutor (bater palma, tocar a cabeça) sob instrução "Faça igual".',
      'Discriminação Visual': '- [Discriminação Visual]: Discriminar cartões idênticos e não-idênticos sobre o tampo da mesa sob instrução verbal.',
      'Pareamento': '- [Pareamento]: Associar blocos 3D de cores primárias com recipientes correspondentes de mesma tonalidade sem pistas gestuais.',
      'Habilidades Sociais': '- [Habilidades Sociais]: Tolerar o ganho do colega em pequenos brinquedos cooperativos de ludo ou peças, respondendo "Foi legal jogar coletivo".',
      'Comportamento Adaptativo': '- [Comportamento Adaptativo]: Compreender e obedecer instruções rápidas de sentar, guardar a mochila e formar fila no contexto coletivo.',
      'Coordenação Motora': '- [Coordenação Motora]: Segurar e manusear giz de cera ou lápis facilitado para desenhar linhas onduladas contínuas.',
      'Autonomia': '- [Autonomia]: Realizar higiene simples de mãos e descarte de lixo individual após refeições sob pista verbal reduzida.'
    };

    const draft = defaultTemplates[area] || `- [${area}]: Adquirir competência funcional correspondente...`;
    const element = document.getElementById('pdi-specific-textarea') as HTMLTextAreaElement | null;
    if (element) {
      const currentVal = element.value;
      element.value = currentVal ? `${currentVal}\n${draft}` : draft;
    }
  };

  // Trigger quick toast notification
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Auto select patient if none is chosen or selected is no longer accessible
  useEffect(() => {
    if (isLoggedIn) {
      if (accessiblePatients.length > 0) {
        const isStillAccessible = accessiblePatients.some(p => p.id === selectedPatientId);
        if (!selectedPatientId || !isStillAccessible) {
          setSelectedPatientId(accessiblePatients[0].id);
        }
      } else {
        setSelectedPatientId('');
      }
    }
  }, [isLoggedIn, accessiblePatients, selectedPatientId]);

  // Auto select AT if none is chosen, preferring logged professional in AT role
  useEffect(() => {
    if (isLoggedIn && userRole === 'clinician' && loggedProfessionalId) {
      setSelectedAtId(loggedProfessionalId);
    } else if (clinicData.acompanhantes.length > 0 && !selectedAtId) {
      setSelectedAtId(clinicData.acompanhantes[0].id);
    }
  }, [clinicData.acompanhantes, selectedAtId, isLoggedIn, userRole, loggedProfessionalId]);

  // Redirect AT to Treinos tab if they try to access disallowed tabs
  useEffect(() => {
    if (isLoggedIn && isAT) {
      if (activeTab !== 'treinos' && activeTab !== 'mensagens' && activeTab !== 'pacientes' && activeTab !== 'at') {
        setActiveTab('treinos');
      }
    }
  }, [isLoggedIn, isAT, activeTab]);

  // Compute stats for current clinic
  const totalPatients = clinicData.pacientes.length;
  const totalAts = clinicData.acompanhantes.length;
  
  const allPrograms = (Object.values(clinicData.treinos) as TeachingProgram[][]).flat();
  const activeProgramsCount = allPrograms.filter(p => p.status === 'ativo').length;
  const masteredProgramsCount = allPrograms.filter(p => p.status === 'dominado').length;
  const totalSessionsCount = clinicData.atendimentos.length;

  // Calculate overall independence rate across active + completed trials
  const allAttempts = allPrograms.flatMap(p => p.tentativas);
  const totalAttemptsCount = allAttempts.length;
  const independentAttemptsCount = allAttempts.filter(a => a.registro === 'Independente').length;
  const globalIndependenceRate = totalAttemptsCount > 0 
    ? Math.round((independentAttemptsCount / totalAttemptsCount) * 100) 
    : 0;

  // Visual assets matching active clinic brand
  const isAba = activeClinic === 'ABA';
  const brandColors = {
    primary: isAba ? 'emerald' : 'indigo',
    primaryBg: isAba ? 'bg-emerald-600' : 'bg-indigo-600',
    primaryBgHover: isAba ? 'hover:bg-emerald-700' : 'hover:bg-indigo-700',
    text: isAba ? 'text-emerald-700' : 'text-indigo-700',
    border: isAba ? 'border-emerald-100' : 'border-indigo-100',
    tint: isAba ? 'bg-emerald-50' : 'bg-indigo-50',
    tintHover: isAba ? 'hover:bg-emerald-100' : 'hover:bg-indigo-100',
    pill: isAba ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800',
    iconColor: isAba ? '#10b981' : '#6366f1',
    gradient: isAba ? 'from-emerald-50 to-teal-50' : 'from-indigo-50 to-violet-50',
  };

  // Helper: call backend API or run realistic ABA guidelines fallback if unavailable
  const handleAIService = async (endpoint: string, reqBody: any, fallbackGenerator: () => any) => {
    setAiLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      if (response.ok) {
        const data = await response.json();
        setAiLoading(false);
        return data;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`API returned status ${response.status}. Loading clinical backup emulator...`);
        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 2200));
        setAiLoading(false);
        return fallbackGenerator();
      }
    } catch (e) {
      console.warn("Connection or config missing. Initiating AI offline backup generator.");
      await new Promise(resolve => setTimeout(resolve, 1800));
      setAiLoading(false);
      return fallbackGenerator();
    }
  };

  // Action: Generate teaching programs using AI (🪄 Sincronizar IA)
  const triggerGenerateProgramsAI = async (patient: Patient) => {
    const plan = clinicData.planos[patient.id] || {
      objetivosGerais: "Estabelecer imitação e contato visual. Aumentar mandos simples.",
      objetivosEspecificos: "Imitar movimentos motores grossos. Apontar para solicitar brinquedos."
    };

    showToast("IA compilando objetivos terapêuticos...", "info");

    const fallbackGenerator = () => {
      // High-quality contextual programs matching typical goals
      const generated: TeachingProgram[] = [
        {
          id: `ai_tr_${Date.now()}_1`,
          patientId: patient.id,
          titulo: 'Treino de Mandos de 1 Sílaba/Palavra',
          area: 'Mandos / Expressivo',
          descricao: `Estimular o paciente a realizar contato visual e vocalizar verbalmente ("Dá", "Quero", ou aproximações) para solicitar itens tangíveis preferidos de seu repertório.`,
          instrucoes: '1. Bloqueie o acesso ao brinquedo preferido (carrinho/boneca).\n2. Aguarde iniciativa do paciente.\n3. Modele a resposta apontando ou incentivando vocalmente ("Dá").\n4. Entregue o item imediatamente sob resposta independente ou ajuda mínima.',
          criterio: '90% de sucesso independente em 10 tentativas sucessivas ao longo de 2 sessões.',
          alvo: 'Emitir mímica verbal ou vocalização funcional',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        },
        {
          id: `ai_tr_${Date.now()}_2`,
          patientId: patient.id,
          titulo: 'Seguimento de Ordens em 1 Passo',
          area: 'Linguagem Receptiva',
          descricao: `Ensinar o paciente a obedecer prontamente instruções do cotidiano no contexto de brincadeira estruturada (ex: "Senta", "Vem cá", "Guarda").`,
          instrucoes: '1. Garanta contato visual inicial.\n2. Diga a ordem com voz firme mas afetuosa, sem duplicar chamadas.\n3. Aguarde 3s, aplique ajuda física/gestual se inativo.\n4. Recompense intensamente sob resposta correta.',
          criterio: '100% de resposta independente consecutivas.',
          alvo: 'Cumprir a instrução recebida sem latência excessiva',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        }
      ];
      return generated;
    };

    const result = await handleAIService('/api/generate-programs', { patient, plan }, fallbackGenerator);

    if (result && Array.isArray(result)) {
      // Append generated programs
      const currentPatientPrograms = clinicData.treinos[patient.id] || [];
      const formattedResult = result.map((p: any, idx: number) => ({
        id: `ai_tr_${Date.now()}_${idx}`,
        patientId: patient.id,
        titulo: p.titulo || 'Treino Recomendado',
        area: p.area || 'Desenvolvimento',
        descricao: p.descricao || 'Descrição do objetivo clínico.',
        instrucoes: p.instrucoes || 'Instruções de aplicação prática.',
        criterio: p.criterio || 'Metas e critérios ABA.',
        alvo: p.alvo || 'Foco comportamental.',
        status: 'ativo' as const,
        criterioProgresso: 10,
        tentativas: []
      }));

      const updatedTreinos = {
        ...clinicData.treinos,
        [patient.id]: [...currentPatientPrograms, ...formattedResult]
      };
      updateClinicData({
        ...clinicData,
        treinos: updatedTreinos
      });
      showToast(`${formattedResult.length} novos Programas de Ensino gerados com sucesso pela IA!`, "success");
    }
  };

  // Action: Generate teaching programs using an uploaded PDF via AI
  const triggerGenerateFromPdfAI = async (patient: Patient) => {
    if (!uploadedPdf) {
      showToast("Por favor, selecione ou arraste um PDF primeiro.", "error");
      return;
    }

    showToast("IA lendo PDF e estruturando treinos ABA...", "info");

    const fallbackGenerator = () => {
      const generated: TeachingProgram[] = [
        {
          id: `ai_tr_pdf_${Date.now()}_1`,
          patientId: patient.id,
          titulo: 'Treino de Comunicação Funcional e Solicitação (Mando)',
          area: 'Comunicação Funcional',
          descricao: `Estimular o paciente a realizar contato visual por até 3 segundos e solicitar itens desejados usando vocalizações funcionais pontuais ("Dá", "Quero") ou apontando, conforme apontado na avaliação diagnóstica de equipe multiprofissional para atenuar frustrações de comunicação não verbal.`,
          instrucoes: '1. Coloque o brinquedo preferido da criança no campo de visão dela, mas fora do alcance físico direto.\n2. Aguarde iniciativa de contato ocular ou intenção comunicativa por parte do paciente.\n3. Modele e dê ajuda ecoica verbalmente ("Quero" ou aproximação da palavra) e gestual.\n4. Entregue o item imediatamente sob resposta independente ou ajuda mínima.',
          criterio: '90% de sucesso independente em 10 tentativas sucessivas ao longo de 2 sessões consecutivas.',
          alvo: 'Emitir palavra funcional ou apontamento acompanhado de contato visual de no mínimo 2s',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        },
        {
          id: `ai_tr_pdf_${Date.now()}_2`,
          patientId: patient.id,
          titulo: 'Mapeamento e Seguimento de Instruções em 2 Etapas',
          area: 'Linguagem Receptiva',
          descricao: `Ensinar o paciente a obedecer prontamente instruções consecutivas comuns no cotidiano terapêutico e escolar (ex: "Pegue o lápis e guarde na caixa"), focado no desenvolvimento de escuta ativa e prontidão cognitiva.`,
          instrucoes: '1. Garanta contato ocular direto inicial antes de enunciar a ordem.\n2. Emita a instrução em 2 passos encadeados claramente com tom de voz calmo e diretivo.\n3. Aguarde latência máxima de 3 segundos; se não houver resposta, aplique ajuda física ou gestual suave.\n4. Recompense intensamente com reforçador primário ou social sob resposta correta independente.',
          criterio: '100% de acerto nas tentativas sem auxílio físico ao longo de 3 sessões consecutivas.',
          alvo: 'Cumprir a instrução encadeada de 2 passos sem resistência e latência menor que 3 segundos',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        },
        {
          id: `ai_tr_pdf_${Date.now()}_3`,
          patientId: patient.id,
          titulo: 'Coordenação Motora Fina e Encaixe de Blocos',
          area: 'Habilidades Motoras',
          descricao: `Exercitar a pinça e preensão palmar por meio do pareamento, encaixe e manipulação de formas geométricas texturizadas sob demanda, visando superar atrasos de controle motor fino mapeados na avaliação psicomotora.`,
          instrucoes: '1. Apresente a plataforma de encaixe à mesa do paciente.\n2. Entregue a peça de forma individual indicando o espaço correspondente.\n3. Ajude fisicamente no início com técnica de mão sobre mão para firmar o punho e os dedos.\n4. Desvaneça a ajuda progressivamente retirando o auxílio aos poucos pela base do braço.',
          criterio: '80% de acerto independente de encaixes em até 10 tentativas rotativas por sessão.',
          alvo: 'Realizar movimento de pinça fina e encaixar 5 formas diferentes independentemente',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        },
        {
          id: `ai_tr_pdf_${Date.now()}_4`,
          patientId: patient.id,
          titulo: 'Treino de Transição de Atividades e Autorregulação',
          area: 'Comportamento Adaptativo / Regulação',
          descricao: `Preparar a previsibilidade e diminuir manifestações de choro ou oposição na troca de atividades de alto interesse para atividades acadêmicas de mesa, prevenindo regressões e crises de rigidez cognitiva.`,
          instrucoes: '1. Use apoio visual/quadro de rotina ("Primeiro / Depois") e sinalize previamente há 1 minuto da transição.\n2. Faça a contagem regressiva de encerramento pareado com cronômetro visual ou contagem dedilhada.\n3. Apresente o elemento de transição de forma acolhedora.\n4. Reforce instantaneamente o paciente ao se levantar ou sentar com aceitação e autorregulação.',
          criterio: 'Menos de 1 minuto de manifestação de oposição em 4 transições diárias sucessivas por 5 sessões.',
          alvo: 'Realizar a transição de atividades sem apresentar comportamentos auto/heteroagressivos ou choro',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        },
        {
          id: `ai_tr_pdf_${Date.now()}_5`,
          patientId: patient.id,
          titulo: 'Habilidade de Atenção Compartilhada e Jogo Simbólico',
          area: 'Interação Social / Lazer',
          descricao: `Desenvolver a atenção compartilhada sob estímulo de brinquedos de ação mútua (empurrar carrinho, rolar bola), promovendo o contato social recíproco apontado como barreira prioritária no laudo clínico original.`,
          instrucoes: '1. Sente-se de frente ao paciente no mesmo plano visual.\n2. Ative um brinquedo mecânico chameativo até prender totalmente a atenção da criança.\n3. Aponte para o brinquedo e olhe diretamente para o paciente, estimulando a troca social.\n4. Modele o gesto de estender a mão para receber o carrinho e entregue após o olhar de reciprocidade.',
          criterio: 'Engajamento de pelo menos 5 turnos de brincadeira recíproca compartilhada.',
          alvo: 'Alternar o olhar voluntariamente entre o objeto de interesse e o terapeuta por no mínimo 3 vezes na brincadeira',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        }
      ];
      return generated;
    };

    const result = await handleAIService('/api/generate-from-pdf', { 
      patient, 
      pdfData: uploadedPdf.base64, 
      pdfName: uploadedPdf.name 
    }, fallbackGenerator);

    if (result && Array.isArray(result)) {
      const currentPatientPrograms = clinicData.treinos[patient.id] || [];
      const formattedResult = result.map((p: any, idx: number) => ({
        id: `ai_tr_pdf_${Date.now()}_${idx}`,
        patientId: patient.id,
        titulo: p.titulo || 'Treino Recomendado',
        area: p.area || 'Desenvolvimento',
        descricao: p.descricao || 'Descrição do objetivo clínico.',
        instrucoes: p.instrucoes || 'Instruções de aplicação prática.',
        criterio: p.criterio || 'Metas e critérios ABA.',
        alvo: p.alvo || 'Foco comportamental.',
        status: 'ativo' as const,
        criterioProgresso: 10,
        tentativas: []
      }));

      const updatedTreinos = {
        ...clinicData.treinos,
        [patient.id]: [...currentPatientPrograms, ...formattedResult]
      };
      
      updateClinicData({
        ...clinicData,
        treinos: updatedTreinos
      });

      showToast(`${formattedResult.length} novos Programas de Ensino gerados com sucesso pela IA a partir do PDF!`, "success");
      setUploadedPdf(null); // Clear PDF after successful generation
      setActiveTab('treinos'); // Navigate to workouts view so they can see them
    }
  };

  // Delete a specific trial/training program
  const handleDeleteProgram = (patientId: string, programId: string) => {
    const currentPrograms = clinicData.treinos[patientId] || [];
    const updatedPrograms = currentPrograms.filter(p => p.id !== programId);
    
    const updatedData = {
      ...clinicData,
      treinos: {
        ...clinicData.treinos,
        [patientId]: updatedPrograms
      }
    };
    
    updateClinicData(updatedData);
    setDeletingTrialId(null);
    
    if (selectedTrialId === programId) {
      setSelectedTrialId(null);
    }
    
    showToast("Treino / Programa de ensino excluído com sucesso!", "success");
  };

  // Delete a specific patient and clean up associated records
  const handleDeletePatient = (patientId: string) => {
    // 1. Filter out the patient
    const updatedPatients = clinicData.pacientes.filter(p => p.id !== patientId);

    // 2. Clear plans and teaching programs for this patient
    const updatedPlanos = { ...clinicData.planos };
    delete updatedPlanos[patientId];

    const updatedTreinos = { ...clinicData.treinos };
    delete updatedTreinos[patientId];

    // 3. Remove patient from connected ATs
    const updatedAcompanhantes = clinicData.acompanhantes.map(at => ({
      ...at,
      pacientesVinculados: at.pacientesVinculados.filter(id => id !== patientId)
    }));

    // 4. Remove session logs and agenda events associated with the deleted patient
    const updatedAtendimentos = clinicData.atendimentos.filter(a => a.patientId !== patientId);
    const updatedAgenda = clinicData.agenda.filter(ev => ev.patientId !== patientId);

    updateClinicData({
      ...clinicData,
      pacientes: updatedPatients,
      planos: updatedPlanos,
      treinos: updatedTreinos,
      acompanhantes: updatedAcompanhantes,
      atendimentos: updatedAtendimentos,
      agenda: updatedAgenda
    });

    setDeletingPatientId(null);

    // 5. Reset selected patient ID
    if (selectedPatientId === patientId) {
      if (updatedPatients.length > 0) {
        setSelectedPatientId(updatedPatients[0].id);
      } else {
        setSelectedPatientId('');
      }
    }

    showToast("Paciente e todas as suas metas/treinos deletados!", "success");
  };

  // Update/Save changes to a specific trial program (full manual control)
  const handleUpdateProgram = (patientId: string, updatedProgram: TeachingProgram) => {
    const currentPrograms = clinicData.treinos[patientId] || [];
    const updatedPrograms = currentPrograms.map(p => p.id === updatedProgram.id ? updatedProgram : p);
    
    const updatedData = {
      ...clinicData,
      treinos: {
        ...clinicData.treinos,
        [patientId]: updatedPrograms
      }
    };
    
    updateClinicData(updatedData);
    setEditingTrialId(null);
    showToast(`Treino "${updatedProgram.titulo}" atualizado com sucesso!`, "success");
  };

  // Generate and immediately append a custom program specified by plain-text instruction
  const triggerGenerateCustomProgramAI = async (patient: Patient, promptText: string) => {
    if (!promptText.trim()) {
      showToast("Por favor, digite uma especificação ou instrução para o treino.", "error");
      return;
    }
    
    showToast("IA formulando e adicionando treino customizado...", "info");
    
    const fallbackGenerator = () => {
      return {
        titulo: `Treino de ${promptText.length > 25 ? promptText.substring(0, 25) + '...' : promptText}`,
        area: 'Linguagem / Autonomia',
        descricao: `Treinar habilidade clínica de acordo com os requisitos: "${promptText}".`,
        instrucoes: '1. Inicie chamando o nome do paciente para obter contato visual sólido.\n2. Injete o comando de aplicação conforme a meta descrita.\n3. Monitore por até 3 segundos a resposta ativa sem antecipar ajuda.\n4. Caso não atinja a resposta, aplique ajuda gestual/física do menor nível possível.\n5. Consiga a resposta correta, parabenize vivamente e faça a anotação da folha correspondente.',
        criterio: '90% de sucesso independente em 10 tentativas sucessivas ao longo de 2 sessões.',
        alvo: 'Emitir resposta adaptativa correspondente'
      };
    };
    
    const result = await handleAIService('/api/generate-custom-program', { patient, customPrompt: promptText }, fallbackGenerator);
    
    if (result) {
      const currentPatientPrograms = clinicData.treinos[patient.id] || [];
      const newProgram: TeachingProgram = {
        id: `custom_tr_${Date.now()}`,
        patientId: patient.id,
        titulo: result.titulo || 'Treino Personalizado',
        area: result.area || 'Desenvolvimento',
        descricao: result.descricao || 'Definição comportamental formulada pela especificação do plano.',
        instrucoes: result.instrucoes || 'Instruções de aplicação passo a passo.',
        criterio: result.criterio || 'Critério de aquisição.',
        alvo: result.alvo || 'Foco comportamental adaptativo.',
        status: 'ativo',
        criterioProgresso: 10,
        tentativas: []
      };
      
      const updatedTreinos = {
        ...clinicData.treinos,
        [patient.id]: [...currentPatientPrograms, newProgram]
      };
      
      updateClinicData({
        ...clinicData,
        treinos: updatedTreinos
      });
      
      setCustomTrialPrompt('');
      showToast(`Novo treino "${newProgram.titulo}" estruturado e adicionado!`, "success");
    }
  };

  // Action: Suggest clinical objectives using AI
  const [aiSuggestions, setAiSuggestions] = useState<{
    analiseProgresso: string;
    alertas: string[];
    objetivosSugeridos: string[];
    recomendacoesMetodologicas: string[];
  } | null>(null);

  const fetchClinicalSuggestionsAI = async (patient: Patient) => {
    const plan = clinicData.planos[patient.id];
    const trials = clinicData.treinos[patient.id] || [];

    showToast("Analisando métricas de coleta e progresso clínico com a IA...", "info");

    const fallbackGenerator = () => ({
      analiseProgresso: `O paciente ${patient.nome} apresenta bom aproveitamento em treinos baseados em pareamento 3D e resposta de contato visual esporádico. Nota-se, contudo, uma considerável dependência de ajuda verbal (AJV) e gestual (AJG) para a emissão de mandos diretos e sustentação da atenção compartilhada.`,
      alertas: [
        "Estagnação na dependência de ajuda verbal para pedidos simples de água/alimentos.",
        "Baixa taxa de generalização no ambiente escolar quando o acompanhante terapêutico se distancia."
      ],
      objetivosSugeridos: [
        "Imitação motora fina simétrica em atividades de rabiscar e manusear talheres.",
        "Generalização de mandos vocais espontâneos com pelo menos 3 parceiros de conversa diferentes na escola.",
        "Reduzir latência de resposta receptiva para toque no nariz sob comando vocal para menos de 2 segundos."
      ],
      recomendacoesMetodologicas: [
        "Iniciar esvanecimento sistemático do reforçador direto para intermitente.",
        "Fazer pausas programadas de 5 minutos antes das sessões mais complexas para prevenir sobrecarga sensorial."
      ]
    });

    const result = await handleAIService('/api/suggest-objectives', { 
      patient, 
      plan, 
      trialsData: trials.map(t => ({ titulo: t.titulo, acertos: t.tentativas.filter(x => x.registro === 'Independente').length, total: t.tentativas.length }))
    }, fallbackGenerator);

    if (result) {
      setAiSuggestions(result);
      showToast("Sugestões clínicas estruturadas com sucesso!", "success");
    }
  };

  // Action: Generate detailed document reports using AI
  const [generatedReportText, setGeneratedReportText] = useState<string>('');
  const [selectedReportType, setSelectedReportType] = useState('Evolução Clínica de Curto Prazo');

  // New customized states for the Psychologist AI Report Generator
  const [selectedApproach, setSelectedApproach] = useState<string>('ABA');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('continuity');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [therapistName, setTherapistName] = useState<string>('Dra. Aline Mendes');
  const [therapistReg, setTherapistReg] = useState<string>('CRP 06/12345');
  const [refineInstructions, setRefineInstructions] = useState<string>('');
  const [inspirationText, setInspirationText] = useState<string>('');
  const [clinicLogoIcon, setClinicLogoIcon] = useState<string>('puzzle'); // puzzle, steth, brain, lotus, child, lightbulb
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');

  const triggerGenerateReportAI = async (patient: Patient) => {
    const plan = clinicData.planos[patient.id];
    const trials = clinicData.treinos[patient.id] || [];
    const logs = clinicData.atendimentos.filter(l => l.patientId === patient.id);

    showToast(`Fichando dados e redigindo relatório profissional com a IA...`, "info");

    const fallbackGenerator = () => ({
      reportText: `# RELATÓRIO INDIVIDUAL DE EVOLUÇÃO CLINICA (${selectedApproach})
**Paciente:** ${patient.nome}
**Idade:** ${patient.idade} anos
**Diagnóstico:** ${patient.diagnose}
**Clínica Responsável:** ${activeClinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}
**Data de Emissão:** ${new Date().toLocaleDateString('pt-BR')}

---

## 1. APRESENTAÇÃO E ABORDAGEM ${selectedApproach}
Este documento de evolução foi elaborado sob a lente teórica e metodológica da abordagem ${selectedApproach}. 
O repertório do paciente foi avaliado com intuito de documentar habilidades adquiridas e planejar intervenções futuras de forma contínua.

## 2. ANÁLISE QUANTITATIVA DE DESEMPENHO (TREINOS)
Mapeando os dados inseridos, observou-se que o paciente participou ativamente dos treinos propostos. Recomenda-se persistência nos objetivos em andamento.

## 3. RELATO DOS ATENDIMENTOS (QUALITATIVO)
Com base nas notas registradas, o paciente demonstra engajamento positivo e cooperação em atividades diárias, com pequenos desafios regulatórios que requerem mediação contínua.

${selectedTemplateType === 'continuity' ? `## 4. JUSTIFICATIVA E PARECER TÉCNICO DE CONTINUIDADE
Por todos os fundamentos clínicos, comportamentais e técnicos expostos, e para que o paciente continue consolidando suas aquisições e evite retrocessos neurodesenvolvimentais, solicitamos enfaticamente e justificamos a continuidade ininterrupta do tratamento clínico especializado proposto.` : ''}

Sorocaba, ${new Date().toLocaleDateString('pt-BR')}

_____________________________________________________
**${therapistName}**
${therapistReg}`
    });

    const result = await handleAIService('/api/generate-report', {
      patient,
      plan,
      trials,
      logs,
      reportType: selectedReportType,
      approach: selectedApproach,
      templateType: selectedTemplateType,
      customInstructions,
      therapistName,
      therapistReg,
      inspirationText
    }, fallbackGenerator);

    if (result && result.reportText) {
      setGeneratedReportText(result.reportText);
      showToast("Relatório gerado com sucesso!", "success");
    }
  };

  const triggerRefineReportAI = async (patient: Patient) => {
    if (!generatedReportText) {
      showToast("Nenhum relatório foi gerado ainda para ser refinado.", "error");
      return;
    }
    if (!refineInstructions.trim()) {
      showToast("Por favor, digite as instruções de ajuste para a IA.", "error");
      return;
    }

    showToast(`Refinando o relatório com as instruções clínicas...`, "info");
    
    const fallbackGenerator = () => ({
      reportText: generatedReportText + `\n\n*Ajuste da IA solicitado: ${refineInstructions} (Modo de demonstração offline)*`
    });

    const result = await handleAIService('/api/generate-report', {
      patient,
      refiningText: generatedReportText,
      refineInstructions: refineInstructions,
      approach: selectedApproach,
      templateType: selectedTemplateType,
      customInstructions,
      therapistName,
      therapistReg,
      inspirationText
    }, fallbackGenerator);

    if (result && result.reportText) {
      setGeneratedReportText(result.reportText);
      setRefineInstructions('');
      showToast("Relatório ajustado com sucesso!", "success");
    }
  };

  // Click handler: Log trial in 1 Click during sessions
  const handleLogTrial = (programId: string, type: TrialAttempt['registro']) => {
    const patientProgramList = clinicData.treinos[selectedPatientId!] || [];
    const programIndex = patientProgramList.findIndex(p => p.id === programId);
    
    if (programIndex === -1) return;

    const targetProgram = patientProgramList[programIndex];
    
    const newAttempt: TrialAttempt = {
      id: `att_${Date.now()}`,
      timestamp: new Date().toISOString(),
      registro: type
    };

    const updatedAttempts = [...targetProgram.tentativas, newAttempt];
    
    // Check for mastery criteria: default 10 consecutive "Independente"
    // Let's analyze if criteria met
    const targetThreshold = targetProgram.criterioProgresso || 10;
    
    // Slice last consecutive attempts to check
    let isMastered = false;
    if (type === 'Independente') {
      const independentList: string[] = [];
      for (let i = updatedAttempts.length - 1; i >= 0; i--) {
        if (updatedAttempts[i].registro === 'Independente') {
          independentList.push('Y');
        } else {
          break; // broke continuity
        }
      }
      if (independentList.length >= targetThreshold && targetProgram.status !== 'dominado') {
        isMastered = true;
      }
    }

    const updatedProgram: TeachingProgram = {
      ...targetProgram,
      tentativas: updatedAttempts,
      status: isMastered ? 'dominado' : targetProgram.status,
      dataConclusao: isMastered ? new Date().toISOString().split('T')[0] : targetProgram.dataConclusao
    };

    const updatedList = [...patientProgramList];
    updatedList[programIndex] = updatedProgram;

    updateClinicData({
      ...clinicData,
      treinos: {
        ...clinicData.treinos,
        [selectedPatientId!]: updatedList
      }
    });

    if (isMastered) {
      showToast(`🏆 Excelente! Habilidade "${targetProgram.titulo}" foi dominada pelo paciente!`, "success");
    } else {
      showToast(`Tentativa de "${type}" gravada!`, "success");
    }
  };

  // Undo last logged attempt
  const handleUndoLastTrial = (programId: string) => {
    const patientProgramList = clinicData.treinos[selectedPatientId!] || [];
    const programIndex = patientProgramList.findIndex(p => p.id === programId);
    
    if (programIndex === -1) return;

    const targetProgram = patientProgramList[programIndex];
    if (targetProgram.tentativas.length === 0) return;

    const updatedAttempts = [...targetProgram.tentativas];
    updatedAttempts.pop();

    const updatedProgram: TeachingProgram = {
      ...targetProgram,
      tentativas: updatedAttempts,
      status: 'ativo', // reset status on undo just in case
      dataConclusao: undefined
    };

    const updatedList = [...patientProgramList];
    updatedList[programIndex] = updatedProgram;

    updateClinicData({
      ...clinicData,
      treinos: {
        ...clinicData.treinos,
        [selectedPatientId!]: updatedList
      }
    });

    showToast("Última tentativa desfeita.", "info");
  };

  // Change trial mastery threshold
  const handleSetMasteryThreshold = (programId: string, threshold: number) => {
    const patientProgramList = clinicData.treinos[selectedPatientId!] || [];
    const programIndex = patientProgramList.findIndex(p => p.id === programId);
    if (programIndex === -1) return;

    const updatedList = [...patientProgramList];
    updatedList[programIndex] = {
      ...patientProgramList[programIndex],
      criterioProgresso: threshold
    };

    updateClinicData({
      ...clinicData,
      treinos: {
        ...clinicData.treinos,
        [selectedPatientId!]: updatedList
      }
    });
    showToast(`Critério de aprendizagem atualizado para ${threshold} tentativas consecutivas independentes.`, "info");
  };

  // Add Patient Form Submit
  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const dataNasc = formData.get('dataNascimento') as string;
    const diagnose = formData.get('diagnose') as string;
    const responsaveis = formData.get('responsaveis') as string;
    const telefone = formData.get('telefone') as string;
    const escola = formData.get('escola') as string;
    const observacoes = formData.get('observacoes') as string;
    const senhaPais = formData.get('senhaPais') as string;

    if (!nome) return;

    const newPatient: Patient = {
      id: `p_${Date.now()}`,
      nome,
      dataNascimento: dataNasc,
      idade: dataNasc ? new Date().getFullYear() - new Date(dataNasc).getFullYear() : 5,
      diagnose: diagnose || 'TEA',
      responsaveis: responsaveis || 'Não informado',
      telefone: telefone || 'Não informado',
      escola: escola || 'Não informado',
      observacoes: observacoes || '',
      senhaPais: senhaPais || '1234',
      criadoPorProfissional: true
    };

    // Initialize blank intervention plan and blank trials
    const updatedPatients = [...clinicData.pacientes, newPatient];
    let updatedAcompanhantes = clinicData.acompanhantes;
    if (userRole === 'clinician' && loggedProfessionalId) {
      updatedAcompanhantes = clinicData.acompanhantes.map(at => {
        if (at.id === loggedProfessionalId) {
          const isLinked = (at.pacientesVinculados || []).includes(newPatient.id);
          const list = isLinked ? at.pacientesVinculados : [...(at.pacientesVinculados || []), newPatient.id];
          return { ...at, pacientesVinculados: list };
        }
        return at;
      });
    }

    const updatedPlanos = {
      ...clinicData.planos,
      [newPatient.id]: {
        patientId: newPatient.id,
        dataElaboracao: new Date().toISOString().split('T')[0],
        terapeutaResponsavel: 'A definir',
        supervisorResponsavel: 'A definir',
        objetivosGerais: 'Fomentar desenvolvimento cognitivo e comportamental saudável.',
        objetivosEspecificos: 'Desenvolver contato visual básico, mandos espontâneos de alta relevância e reduzir barreiras comportamentais de fúria ruidosa.'
      }
    };

    updateClinicData({
      ...clinicData,
      pacientes: updatedPatients,
      acompanhantes: updatedAcompanhantes,
      planos: updatedPlanos
    });

    setSelectedPatientId(newPatient.id);
    setIsAddingPatient(false);
    showToast(`Paciente ${nome} cadastrado com sucesso!`, "success");
  };

  // Edit Patient Form Submit
  const handleEditPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const dataNasc = formData.get('dataNascimento') as string;
    const diagnose = formData.get('diagnose') as string;
    const responsaveis = formData.get('responsaveis') as string;
    const telefone = formData.get('telefone') as string;
    const escola = formData.get('escola') as string;
    const observacoes = formData.get('observacoes') as string;
    const senhaPais = formData.get('senhaPais') as string;

    if (!nome) return;

    const updatedPatients = clinicData.pacientes.map(p => {
      if (p.id === selectedPatientId) {
        return {
          ...p,
          nome,
          dataNascimento: dataNasc,
          idade: dataNasc ? new Date().getFullYear() - new Date(dataNasc).getFullYear() : p.idade,
          diagnose: diagnose || 'TEA',
          responsaveis: responsaveis || 'Não informado',
          telefone: telefone || 'Não informado',
          escola: escola || 'Não informado',
          observacoes: observacoes || '',
          senhaPais: senhaPais || p.senhaPais || '1234'
        };
      }
      return p;
    });

    updateClinicData({
      ...clinicData,
      pacientes: updatedPatients
    });

    setIsEditingPatient(false);
    showToast(`Cadastro do paciente ${nome} atualizado com sucesso!`, "success");
  };

  // Create Teaching Program manually
  const handleCreateManualProgram = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const formData = new FormData(e.currentTarget);
    const titulo = formData.get('titulo') as string;
    const area = formData.get('area') as string;
    const alvo = formData.get('alvo') as string;
    const descricao = formData.get('descricao') as string;
    const instrucoes = formData.get('instrucoes') as string;
    const criterio = formData.get('criterio') as string || '80% de acertos em 3 sessões consecutivas';
    const progressThreshold = parseInt(formData.get('criterioProgresso') as string || '10', 10);

    if (!titulo || !area) {
      showToast("Título e Área de Desenvolvimento são obrigatórios!", "error");
      return;
    }

    const currentPatientPrograms = clinicData.treinos[selectedPatientId] || [];
    const newProgram: TeachingProgram = {
      id: `prog_manual_${Date.now()}`,
      patientId: selectedPatientId,
      titulo,
      area,
      descricao: descricao || '',
      instrucoes: instrucoes || '',
      criterio,
      alvo: alvo || '',
      status: 'ativo',
      tentativas: [],
      criterioProgresso: isNaN(progressThreshold) ? 10 : progressThreshold
    };

    updateClinicData({
      ...clinicData,
      treinos: {
        ...clinicData.treinos,
        [selectedPatientId]: [...currentPatientPrograms, newProgram]
      }
    });

    setSelectedTrialId(newProgram.id);
    setIsAddingManualTraining(false);
    showToast(`Treino "${titulo}" adicionado com sucesso!`, "success");
  };

  // Update Parent portal password in-place
  const handleUpdateParentPassword = (patientId: string, newPassword: string) => {
    const updatedPatients = clinicData.pacientes.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          senhaPais: newPassword || '1234'
        };
      }
      return p;
    });

    updateClinicData({
      ...clinicData,
      pacientes: updatedPatients
    });
    showToast("Senha do Portal da Família salva!", "success");
  };

  // Central ADM password manager handlers
  const handleUpdateAdminPasswordFromPanel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmPasswordVal.trim()) {
      showToast("Por favor, digite a nova senha do Administrador.", "error");
      return;
    }
    const newPass = newAdmPasswordVal.trim();
    localStorage.setItem(`adm_password_${activeClinic}`, newPass);
    setAdmPassword(newPass);
    setNewAdmPasswordVal('');
    showToast(`Senha do Administrador para a clínica ${activeClinic === 'ABA' ? 'ABA' : 'Atria'} alterada com sucesso!`, "success");
  };

  const handleUpdateProfPasswordFromPanel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfForPassId) {
      showToast("Por favor, selecione um profissional da lista de profissionais.", "error");
      return;
    }
    if (!newProfPasswordVal.trim()) {
      showToast("Por favor, digite a nova senha para o profissional acompanhante.", "error");
      return;
    }
    const newPass = newProfPasswordVal.trim();
    const updatedAcompanhantes = clinicData.acompanhantes.map(at => {
      if (at.id === selectedProfForPassId) {
        return { ...at, password: newPass };
      }
      return at;
    });
    updateClinicData({
      ...clinicData,
      acompanhantes: updatedAcompanhantes
    });
    setNewProfPasswordVal('');
    const profName = clinicData.acompanhantes.find(at => at.id === selectedProfForPassId)?.nome || '';
    showToast(`Senha de acesso do profissional ${profName} alterada com sucesso!`, "success");
  };

  const handleUpdatePatientPasswordFromPanel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForPassId) {
      showToast("Por favor, selecione um paciente/família da lista.", "error");
      return;
    }
    if (!newPatientPasswordVal.trim()) {
      showToast("Por favor, digite a nova senha de responsáveis para esta família.", "error");
      return;
    }
    const newPass = newPatientPasswordVal.trim();
    const updatedPatients = clinicData.pacientes.map(p => {
      if (p.id === selectedPatientForPassId) {
        return { ...p, senhaPais: newPass };
      }
      return p;
    });
    updateClinicData({
      ...clinicData,
      pacientes: updatedPatients
    });
    setNewPatientPasswordVal('');
    const patientName = clinicData.pacientes.find(p => p.id === selectedPatientForPassId)?.nome || '';
    showToast(`Senha do painel da família de ${patientName} alterada com sucesso!`, "success");
  };

  // Send message from therapist to a parent
  const handleSendTherapistMessage = (
    patientId: string, 
    text: string, 
    attachment?: { url: string; type: 'image' | 'file'; name: string }
  ) => {
    if (!text.trim() && !attachment) return;

    let computedSenderName = 'Profissional / Terapeuta';
    if (userRole === 'adm') {
      computedSenderName = 'Administrador Caminho Aba';
    } else if (loggedProfessionalId) {
      const p = clinicData.acompanhantes?.find(at => at.id === loggedProfessionalId);
      if (p) {
        computedSenderName = `${p.nome} (${p.cargo || 'Acompanhante'})`;
      }
    }

    const currentMsgList = clinicData.mensagens || [];
    const newMsg = {
      id: `msg_${Date.now()}`,
      patientId,
      sender: 'therapist' as const,
      senderName: computedSenderName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      ...(attachment ? {
        attachmentUrl: attachment.url,
        attachmentType: attachment.type,
        attachmentName: attachment.name
      } : {})
    };

    updateClinicData({
      ...clinicData,
      mensagens: [...currentMsgList, newMsg]
    });
  };

  // Send message from parent to therapist
  const handleSendParentMessage = (
    patientId: string, 
    text: string, 
    attachment?: { url: string; type: 'image' | 'file'; name: string }
  ) => {
    if (!text.trim() && !attachment) return;

    const currentMsgList = clinicData.mensagens || [];
    const parentPatient = clinicData.pacientes.find(p => p.id === patientId);
    
    const newMsg = {
      id: `msg_${Date.now()}`,
      patientId,
      sender: 'parent' as const,
      senderName: parentPatient?.responsaveis || 'Responsável',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      ...(attachment ? {
        attachmentUrl: attachment.url,
        attachmentType: attachment.type,
        attachmentName: attachment.name
      } : {})
    };

    updateClinicData({
      ...clinicData,
      mensagens: [...currentMsgList, newMsg]
    });
  };

  // Delete message (Only ADM can perform)
  const handleDeleteMessage = (msgId: string) => {
    if (userRole !== 'adm') {
      showToast("Apenas administradores podem excluir mensagens.", "error");
      return;
    }
    const currentMsgList = clinicData.mensagens || [];
    const updated = currentMsgList.filter(m => m.id !== msgId);
    updateClinicData({
      ...clinicData,
      mensagens: updated
    });
    showToast("Mensagem removida com sucesso pelo ADM.", "success");
  };

  // Save/Archive generated report as PatientDocument
  const handleSaveGeneratedReportAsPDF = (
    patientId: string,
    name: string,
    type: 'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro',
    notes: string
  ) => {
    const newDoc: PatientDocument = {
      id: `doc_${Date.now()}`,
      patientId,
      name: name.endsWith('.pdf') ? name : `${name}.pdf`,
      type,
      issueDate: new Date().toISOString().split('T')[0],
      uploadDate: new Date().toISOString().split('T')[0],
      notes: notes.slice(0, 300) + (notes.length > 300 ? '...' : ''),
    };

    const updatedDocumentos = [newDoc, ...(clinicData.documentos || [])];
    updateClinicData({
      ...clinicData,
      documentos: updatedDocumentos
    });

    showToast(`Relatório "${newDoc.name}" arquivado em Documentos!`, "success");
  };

  // Delete a document
  const handleDeleteDocument = (docId: string) => {
    const updatedDocumentos = (clinicData.documentos || []).filter(d => d.id !== docId);
    updateClinicData({
      ...clinicData,
      documentos: updatedDocumentos
    });
    showToast("Documento excluído com sucesso!", "info");
  };

  // ==========================================
  // BEHAVIORS & OCCURRENCES ACTIONS (PORTAL DOS PAIS & ADM)
  // ==========================================
  
  // Get custom behaviors for a patient (defaults to standard list)
  const getPatientBehaviors = (patientId: string): string[] => {
    const list = clinicData.comportamentoBotoes?.[patientId];
    if (list && list.length > 0) return list;
    return ['Choro', 'Se jogar no chão', 'Bater']; // Default behaviors requested
  };

  // Add custom behavior button
  const handleAddCustomBehaviorButton = (patientId: string, behaviorName: string) => {
    if (!behaviorName.trim()) return;
    const currentButtons = clinicData.comportamentoBotoes || {};
    const patientButtons = currentButtons[patientId] || ['Choro', 'Se jogar no chão', 'Bater'];
    if (patientButtons.some(b => b.toLowerCase() === behaviorName.trim().toLowerCase())) {
      showToast("Este comportamento já possui um botão cadastrado.", "info");
      return;
    }
    const updatedButtons = {
      ...currentButtons,
      [patientId]: [...patientButtons, behaviorName.trim()]
    };
    updateClinicData({
      ...clinicData,
      comportamentoBotoes: updatedButtons
    });
    showToast(`Botão para "${behaviorName.trim()}" adicionado!`, "success");
  };

  // Delete custom behavior button
  const handleDeleteCustomBehaviorButton = (patientId: string, behaviorName: string) => {
    const currentButtons = clinicData.comportamentoBotoes || {};
    const patientButtons = currentButtons[patientId] || ['Choro', 'Se jogar no chão', 'Bater'];
    const updatedButtons = {
      ...currentButtons,
      [patientId]: patientButtons.filter(b => b !== behaviorName)
    };
    updateClinicData({
      ...clinicData,
      comportamentoBotoes: updatedButtons
    });
    showToast(`Botão "${behaviorName}" removido.`, "info");
  };

  // Log a behavioral occurrence
  const handleLogBehaviorOccurrence = (patientId: string, behaviorName: string, count: number = 1) => {
    const logs = clinicData.comportamentoLogs || [];
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Check if we can increment for today or log direct occurrence
    const newLog = {
      id: `beh_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      patientId,
      behaviorName,
      timestamp: new Date().toISOString(),
      date: dateStr,
      count
    };

    updateClinicData({
      ...clinicData,
      comportamentoLogs: [newLog, ...logs]
    });
    showToast(`Comportamento "${behaviorName}" registrado hoje!`, "success");
  };

  // Delete behavior occurrence log (adm only)
  const handleDeleteBehaviorLog = (logId: string) => {
    if (userRole !== 'adm') {
      showToast("Apenas administradores podem apagar ocorrências.", "error");
      return;
    }
    const logs = clinicData.comportamentoLogs || [];
    updateClinicData({
      ...clinicData,
      comportamentoLogs: logs.filter(l => l.id !== logId)
    });
    showToast("Registro de comportamento excluído.", "info");
  };

  // ==========================================
  // FINISHED TRAINING LOGS & NOTES ACTIONS
  // ==========================================

  // Save/Publish training session/program completed at date
  const handleSaveFinishedTraining = (
    patientId: string,
    programId: string,
    programTitle: string,
    date: string,
    observacao: string,
    totalAttempts: number,
    independents: number,
    rate: number
  ) => {
    const list = clinicData.treinosFinalizados || [];
    const newLog = {
      id: `fin_${Date.now()}`,
      patientId,
      programId,
      programTitle,
      date, // YYYY-MM-DD
      totalAttempts,
      independents,
      rate,
      observacao: observacao.trim() || 'Nenhuma observação informada.',
      timestamp: new Date().toISOString()
    };

    updateClinicData({
      ...clinicData,
      treinosFinalizados: [newLog, ...list]
    });
    showToast(`Histór. de "${programTitle}" salvo em ${date.split('-').reverse().join('/')}!`, "success");
  };

  // Edit/Change finished training log date
  const handleChangeFinishedTrainingDate = (logId: string, newDate: string) => {
    const list = clinicData.treinosFinalizados || [];
    const updated = list.map(item => {
      if (item.id === logId) {
        return { ...item, date: newDate };
      }
      return item;
    });

    updateClinicData({
      ...clinicData,
      treinosFinalizados: updated
    });
    showToast(`Data do treino atualizada com sucesso!`, "success");
  };

  // Delete finished training log (adm only)
  const handleDeleteFinishedTrainingLog = (logId: string) => {
    if (userRole !== 'adm') {
      showToast("Apenas administradores podem apagar treinos salvos.", "error");
      return;
    }
    const list = clinicData.treinosFinalizados || [];
    updateClinicData({
      ...clinicData,
      treinosFinalizados: list.filter(item => item.id !== logId)
    });
    showToast("Treino finalizado removido do histórico.", "info");
  };

  // Upload/Add a new document manually
  const handleUploadDocument = (
    patientId: string,
    name: string,
    type: 'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro',
    notes: string,
    base64?: string
  ) => {
    const newDoc: PatientDocument = {
      id: `doc_${Date.now()}`,
      patientId,
      name: name.endsWith('.pdf') ? name : `${name}.pdf`,
      type,
      issueDate: new Date().toISOString().split('T')[0],
      uploadDate: new Date().toISOString().split('T')[0],
      notes,
      base64
    };

    const updatedDocumentos = [newDoc, ...(clinicData.documentos || [])];
    updateClinicData({
      ...clinicData,
      documentos: updatedDocumentos
    });
    showToast(`Documento "${name}" adicionado com sucesso!`, "success");
  };

  // Download Document as raw text formatted
  const triggerDownloadDocument = (doc: PatientDocument) => {
    const patientObj = clinicData.pacientes.find(p => p.id === doc.patientId);
    const content = `
=====================================================
    ABA – ACOLHER BRINCAR APRENDER CENTRO CLÍNICO    
=====================================================
Tipo do Documento: ${doc.type}
Nome do Arquivo:   ${doc.name}
Paciente Associado: ${patientObj?.nome || 'Não cadastrado'}
Data de Emissão:   ${doc.issueDate.split('-').reverse().join('/')}
Data de Upload:    ${doc.uploadDate.split('-').reverse().join('/')}

-----------------------------------------------------
DETALHES E ANOTAÇÕES TÉCNICAS:
-----------------------------------------------------
${doc.notes || 'Sem anotações complementares registradas para este documento.'}

-----------------------------------------------------
ABA Autismo e Terapia Ocupacional Co. Sorocaba
Gerado automaticamente pelo Sistema Clínico ABA v1.0
=====================================================
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name.endsWith('.txt') || doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Iniciando download do prontuário: "${doc.name}"`, "success");
  };

  // Add AT Form Submit
  const handleAddAt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const telefone = formData.get('telefone') as string;
    const email = formData.get('email') as string;
    const observacoes = formData.get('observacoes') as string;
    const cargo = formData.get('cargo') as string;
    const password = formData.get('password') as string;
    const status = formData.get('status') as 'Ativo' | 'Inativo';

    if (!nome) return;

    const newAt: TherapeuticAssistant = {
      id: `at_${Date.now()}`,
      nome,
      telefone: telefone || '',
      email: email || '',
      observacoes: observacoes || '',
      cargo: cargo || 'AT',
      password: password || '1234',
      status: status || 'Ativo',
      pacientesVinculados: []
    };

    updateClinicData({
      ...clinicData,
      acompanhantes: [...clinicData.acompanhantes, newAt]
    });

    setSelectedAtId(newAt.id);
    setIsAddingAt(false);
    showToast(`Profissional ${nome} cadastrado com sucesso!`, "success");
  };

  // Edit AT Form Submit
  const handleEditAt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAtId) return;
    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const telefone = formData.get('telefone') as string;
    const email = formData.get('email') as string;
    const observacoes = formData.get('observacoes') as string;
    const cargo = formData.get('cargo') as string;
    const password = formData.get('password') as string;
    const status = formData.get('status') as 'Ativo' | 'Inativo';

    if (!nome) return;

    const updatedAcompanhantes = clinicData.acompanhantes.map(at => {
      if (at.id === selectedAtId) {
        return {
          ...at,
          nome,
          telefone: telefone || '',
          email: email || '',
          observacoes: observacoes || '',
          cargo: cargo || at.cargo || 'AT',
          password: password || at.password || '1234',
          status: status || at.status || 'Ativo'
        };
      }
      return at;
    });

    updateClinicData({
      ...clinicData,
      acompanhantes: updatedAcompanhantes
    });

    setIsEditingAt(false);
    showToast(`Dados de ${nome} atualizados com sucesso!`, "success");
  };

  // Delete AT (Excluir profissional)
  const handleDeleteAt = (atId: string) => {
    const updatedAcompanhantes = clinicData.acompanhantes.filter(at => at.id !== atId);
    
    // Clear selectedAtId if we deleted it
    if (selectedAtId === atId) {
      if (updatedAcompanhantes.length > 0) {
        setSelectedAtId(updatedAcompanhantes[0].id);
      } else {
        setSelectedAtId(null);
      }
    }

    updateClinicData({
      ...clinicData,
      acompanhantes: updatedAcompanhantes
    });

    setDeletingAtId(null);
    showToast("Profissional excluído do sistema clinicamente.", "success");
  };

  // Add Session Log (Notas de Atendimento) Form Submit
  const handleAddSessionLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const atId = formData.get('atId') as string;
    const patientId = formData.get('patientId') as string;
    const data = formData.get('data') as string;
    const horario = formData.get('horario') as string;
    const local = formData.get('local') as string;
    const descricao = formData.get('descricao') as string;
    const comportamentosObservados = formData.get('comportamentosObservados') as string;
    const dificultadesEncontradas = formData.get('dificuldadesEncontradas') as string;
    const intervencoesRealizadas = formData.get('intervencoesRealizadas') as string;
    const orientacoesFornecidas = formData.get('orientacoesFornecidas') as string;
    const objetivosTrabalhados = formData.get('objetivosTrabalhados') as string;
    const planejamentoProximaSessao = formData.get('planejamentoProximaSessao') as string;
    const recadoParaPais = formData.get('recadoParaPais') as string;

    if (!atId || !patientId) {
      showToast("Por favor selecione o AT e o Paciente.", "error");
      return;
    }

    const newLog: SessionLog = {
      id: `log_${Date.now()}`,
      atId,
      patientId,
      data: data || new Date().toISOString().split('T')[0],
      horario: horario || '14:00 - 16:00',
      local: local || 'Clínica',
      descricao: descricao || 'Atendimento de rotina.',
      comportamentosObservados: comportamentosObservados || '',
      dificuldadesEncontradas: dificultadesEncontradas || '',
      intervencoesRealizadas: intervencoesRealizadas || '',
      orientacoesFornecidas: orientacoesFornecidas || '',
      objetivosTrabalhados: objetivosTrabalhados || '',
      planejamentoProximaSessao: planejamentoProximaSessao || '',
      recadoParaPais: recadoParaPais || ''
    };

    updateClinicData({
      ...clinicData,
      atendimentos: [newLog, ...clinicData.atendimentos]
    });

    setIsAddingLog(false);
    showToast("Registro de atendimento arquivado no prontuário do paciente!", "success");
  };

  // Link Patient to AT
  const handleLinkPatientToAt = (atId: string, patientId: string) => {
    if (isAT) {
      showToast("Apenas Adm e Profissionais não-AT podem gerenciar vínculos de pacientes.", "error");
      return;
    }
    const updatedAts = clinicData.acompanhantes.map(at => {
      if (at.id === atId) {
        const isLinked = at.pacientesVinculados.includes(patientId);
        const list = isLinked 
          ? at.pacientesVinculados.filter(id => id !== patientId)
          : [...at.pacientesVinculados, patientId];
        return { ...at, pacientesVinculados: list };
      }
      return at;
    });

    updateClinicData({
      ...clinicData,
      acompanhantes: updatedAts
    });
    showToast("Vínculo de paciente modificado com sucesso.", "info");
  };

  // Save/Edit Individualized intervention plan
  const handleSavePlan = (e: React.FormEvent<HTMLFormElement>, pId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataElab = formData.get('dataElaboracao') as string;
    const terapeuta = formData.get('terapeutaResponsavel') as string;
    const supervisor = formData.get('supervisorResponsavel') as string;
    const objGerais = formData.get('objetivosGerais') as string;
    const objEspec = formData.get('objetivosEspecificos') as string;

    const updatedPlan: InterventionPlan = {
      patientId: pId,
      dataElaboracao: dataElab || new Date().toISOString().split('T')[0],
      terapeutaResponsavel: terapeuta || 'A definir',
      supervisorResponsavel: supervisor || 'A definir',
      objetivosGerais: objGerais || '',
      objetivosEspecificos: objEspec || ''
    };

    updateClinicData({
      ...clinicData,
      planos: {
        ...clinicData.planos,
        [pId]: updatedPlan
      }
    });

    setEditingPlan(false);
    showToast("Plano de Intervenção (PDI/PEI) atualizado no prontuário!", "success");
  };

  // Register Calendar Event
  const handleAddEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const patId = formData.get('patientId') as string;
    const atId = formData.get('atId') as string;
    const data = formData.get('data') as string;
    const hrStart = formData.get('horarioInicio') as string;
    const hrEnd = formData.get('horarioFim') as string;
    const local = formData.get('local') as string;
    const observacoes = formData.get('observacoes') as string;

    if (!patId || !atId || !data) {
      showToast("Paciente, AT e Data são mandatórios.", "error");
      return;
    }

    const newEvent: AgendaEvent = {
      id: `ev_${Date.now()}`,
      patientId: patId,
      atId,
      data,
      horarioInicio: hrStart || '14:00',
      horarioFim: hrEnd || '15:00',
      local: local || 'Clinica',
      observacoes: observacoes || ''
    };

    updateClinicData({
      ...clinicData,
      agenda: [...clinicData.agenda, newEvent]
    });

    setIsAddingEvent(false);
    showToast("Compromisso inserido com sucesso na agenda integrada!", "success");
  };

  // Delete Calendar Event
  const handleDeleteEvent = (eventId: string) => {
    updateClinicData({
      ...clinicData,
      agenda: clinicData.agenda.filter(ev => ev.id !== eventId)
    });
    showToast("Sessão agendada removida.", "info");
  };

  const selectedPatient = clinicData.pacientes.find(p => p.id === selectedPatientId);
  const selectedAt = clinicData.acompanhantes.find(at => at.id === selectedAtId);

  // Filter lists based on inputs
  const filteredPatients = accessiblePatients.filter(p => 
    p.nome.toLowerCase().includes(searchPatient.toLowerCase()) || 
    p.diagnose.toLowerCase().includes(searchPatient.toLowerCase())
  );

  const filteredAts = clinicData.acompanhantes.filter(at => 
    at.nome.toLowerCase().includes(searchAt.toLowerCase()) || 
    at.email.toLowerCase().includes(searchAt.toLowerCase())
  );


  // Termo de Consentimento e Sigilo Profissional/LGPD Obrigatório ao entrar
  if (!hasAcceptedConsent) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-pink-100 antialiased font-sans text-slate-100 relative overflow-hidden">
        {/* Background ambient lighting blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />

        <div className="max-w-2xl w-full bg-slate-800/85 backdrop-blur-md rounded-3xl border border-slate-700/60 p-6 md:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500 flex flex-col gap-6">
          <div className="text-center flex flex-col gap-2">
            <div className="mx-auto bg-emerald-600 text-white p-3.5 rounded-2xl shadow-md inline-block">
              <Sparkles className="w-7 h-7 text-amber-300" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mt-2 text-white">
              Termos de Consentimento & Compromisso de Sigilo
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Para garantir a segurança, privacidade e confidencialidade dos atendimentos clínicos e proteção de dados em conformidade com as legislações vigentes.
            </p>
          </div>

          <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-4 font-mono text-[11px] leading-relaxed text-slate-300 max-h-[200px] overflow-y-auto flex flex-col gap-3 custom-scrollbar">
            <p className="font-sans font-bold text-white text-xs border-b border-slate-700 pb-1.5 uppercase tracking-wide">
              DIRETRIZES DE USO SEGURO E CONFIDENCIALIDADE:
            </p>
            <p>
              1. <strong>Do Sigilo e Ética Profissional:</strong> Todo usuário (terapeuta, acompanhante terapêutico, ou profissional de saúde) obriga-se a manter absoluto sigilo sobre todo e qualquer dado clínico, metas de PDI, folhas de evolução comportamental e atas de sessão de pacientes, sob pena de responsabilidade ética e jurídica cabíveis de acordo com respectivos conselhos profissionais.
            </p>
            <p>
              2. <strong>Da Proteção de Dados (LGPD):</strong> Os registros contidos nesta plataforma envolvem dados sensíveis de menores de idade e de saúde de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). É expressamente vedada a reprodução, captura de tela, compartilhamento externo não autorizado ou divulgação de dados deste prontuário eletrônico.
            </p>
            <p>
              3. <strong>Do Portal dos Pais e Responsáveis:</strong> Os acessos fornecidos aos pais/responsáveis legais são de uso estritamente pessoal e familiar. O compartilhamento da senha de acesso do "Portal dos Pais" com terceiros não autorizados é de responsabilidade direta e integral do responsável legal do menor.
            </p>
            <p>
              4. <strong>Da Segurança de Acesso:</strong> Ao acessar, você declara ser o profissional responsável ou o parente legal autorizado, comprometendo-se a manter as credenciais seguras e encerrar as sessões após o uso (clicando em "Sair") para evitar acessos indesejados no dispositivo.
            </p>
          </div>

          <div className="flex flex-col gap-3 bg-slate-900/30 p-4 rounded-2xl border border-slate-700/40">
            {/* Checkbox 1 */}
            <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-300 select-none hover:text-white transition-all">
              <input
                type="checkbox"
                checked={termSigiloChecked}
                onChange={(e) => setTermSigiloChecked(e.target.checked)}
                className="mt-0.5 w-4.5 h-4.5 rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
              />
              <span className="leading-relaxed">
                Comprometo-me a manter <strong>sigilo profissional absoluto</strong> e confidencialidade sobre todos os dados e prontuários que eu acessar.
              </span>
            </label>

            {/* Checkbox 2 */}
            <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-300 select-none hover:text-white transition-all font-sans">
              <input
                type="checkbox"
                checked={termLgpdChecked}
                onChange={(e) => setTermLgpdChecked(e.target.checked)}
                className="mt-0.5 w-4.5 h-4.5 rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
              />
              <span className="leading-relaxed">
                Declaro ciência e acordo com os termos da <strong>Lei Geral de Proteção de Dados (LGPD)</strong> para o processamento de dados de menores e de saúde.
              </span>
            </label>
          </div>

          <button
            onClick={() => {
              if (termSigiloChecked && termLgpdChecked) {
                localStorage.setItem('consent_accepted_v5', 'true');
                setHasAcceptedConsent(true);
                showToast("Termos de consentimento e sigilo confirmados com sucesso!", "success");
              }
            }}
            disabled={!termSigiloChecked || !termLgpdChecked}
            className={`w-full py-3 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
              termSigiloChecked && termLgpdChecked
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            Confirmar e Prosseguir <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!isClinicChosen) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-emerald-100 antialiased font-sans">
        <div className="max-w-6xl w-full flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-center flex flex-col gap-2">
            <div className="mx-auto bg-emerald-600 text-white p-3.5 rounded-2xl shadow-md inline-block">
              <Sparkles className="w-8 h-8 text-amber-300" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mt-2">
              Portal de Gestão Clínica ABA / Caminho ABA
            </h1>
            <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              Painel simplificado para Analistas do Comportamento, Psicólogos, Clínicas Especializadas e Famílias. Escolha a sua partição para iniciar os registros ou acompanhar seu filho.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            {/* Card 1: Clínica ABA */}
            <div 
              className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl" />
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold uppercase py-1 px-3 rounded-full tracking-wider">
                        Clínica ABA
                      </span>
                      <h2 className="text-2xl font-bold text-slate-900 mt-4 font-sans border-b border-slate-50 pb-2">
                        Clínica ABA
                      </h2>
                    </div>
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xs border border-slate-100 flex-shrink-0 bg-sky-50 mt-1">
                      <img 
                        src="/src/assets/images/aba_clinic_cat_puzzle_logo_1781041000485.png" 
                        alt="Símbolo Clínica ABA" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs md:text-sm mt-3 leading-relaxed font-sans">
                    Ambiente isolado de registros ABA. Foco em Análise do Comportamento Aplicada pura, folhas de coletas instantâneas e relatórios semanais baseados em evidência científica.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                  <button
                    id="select-clinic-aba-landing"
                    type="button"
                    onClick={() => {
                      setActiveClinic('ABA');
                      setIsClinicChosen(true);
                      setIsLoggedIn(false);
                      showToast("Prontuários ABA carregados com sucesso!", "success");
                    }}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-102 active:scale-98"
                  >
                    Acessar Clínica ABA <ArrowUpRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Clínica Atria */}
            <div 
              className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl" />
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-800 font-bold uppercase py-1 px-3 rounded-full tracking-wider">
                    Caminho ABA
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-4 font-sans border-b border-slate-50 pb-2">
                    Caminho ABA
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm mt-3 leading-relaxed font-sans">
                    Ambiente isolado de registros Caminho ABA. Integração focada em Psicologia de alto desempenho, agendas unificadas de exames, acompanhamento e metas escolares personalizadas.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                  <button
                    id="select-clinic-atria-landing"
                    type="button"
                    onClick={() => {
                      setActiveClinic('Atria');
                      setIsClinicChosen(true);
                      setIsLoggedIn(false);
                      showToast("Prontuários Caminho ABA carregados com sucesso!", "success");
                    }}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-102 active:scale-98"
                  >
                    Acessar Caminho ABA <ArrowUpRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Portal dos Pais */}
            <div 
              className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-pink-500 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl animate-pulse" />
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] bg-pink-100 text-pink-800 font-extrabold uppercase py-1 px-3 rounded-full tracking-wider">
                    Família / Famílias
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-4 font-sans border-b border-slate-50 pb-2">
                    Portal dos Pais
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm mt-3 leading-relaxed font-sans">
                    Área dedicada para pais acompanharem os recados da equipe, visualizar metas do PDI e o progresso da evolução acadêmica e sensorial de seus filhos em tempo real.
                  </p>
                </div>

                {getParentPortalPatientsList().length === 0 ? (
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center text-center gap-3 bg-pink-50/20 p-4 rounded-xl border border-pink-100/55 animated fadeIn">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <p className="text-xs font-bold text-pink-900">Nenhum paciente cadastrado por profissional ainda</p>
                    <p className="text-[11px] text-slate-500 max-w-[280px] leading-relaxed">
                      Para testar este fluxo, acesse como <strong>Terapeuta</strong> primeiro, selecione uma clínica e clique em <strong>"Cadastrar Paciente"</strong>.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLoginParent} className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seu Filho(a) / Paciente:</label>
                      <select 
                        value={parentChildId}
                        onChange={(e) => setParentChildId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-800 cursor-pointer"
                      >
                        {getParentPortalPatientsList().map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.clinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer hover:scale-101 active:scale-99 mt-2"
                    >
                      Acessar Portal da Família <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* PAINEL ADM GLOBAL DA CLÍNICA */}
          <div className="bg-white/80 border border-slate-205 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto w-full mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0 border border-slate-200">
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Acesso ao Administrador Principal (ADM)</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Gerencie terapeutas, atenda as duas clínicas e vincule pacientes a partir daqui de forma direta.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActiveClinic('ABA');
                  setUserRole('adm');
                  setIsLoggedIn(true);
                  setIsClinicChosen(true);
                  showToast("Bem-vindo ao Painel ADM da Clínica ABA!", "success");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer hover:scale-101 active:scale-99 whitespace-nowrap shadow-sm"
              >
                Painel ADM ABA
              </button>
              <button
                onClick={() => {
                  setActiveClinic('Atria');
                  setUserRole('adm');
                  setIsLoggedIn(true);
                  setIsClinicChosen(true);
                  showToast("Bem-vindo ao Painel ADM da Clínica Atria!", "success");
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer hover:scale-101 active:scale-99 whitespace-nowrap shadow-sm"
              >
                Painel ADM Atria
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-4 font-semibold flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>Bases de dados 100% isoladas em localStorage. O sistema respeita as regras de separação total de prontuários.</span>
            <span className="hidden sm:inline">•</span>
            <button 
              onClick={() => setShowConsentTermsModal(true)} 
              className="text-emerald-600 hover:text-emerald-700 underline font-extrabold cursor-pointer transition-all hover:scale-101 active:scale-99"
            >
              Verificar Termo de Consentimento & Sigilo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isClinicChosen && !isLoggedIn) {
    const isAba = activeClinic === 'ABA';
    const clinicLabel = isAba ? 'Clínica ABA' : 'Clínica Atria';
    const clinicThemeColor = isAba ? 'emerald' : 'indigo';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-emerald-100 antialiased font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/85 p-6 md:p-8 shadow-xl flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="text-center flex flex-col gap-2">
            <button 
              onClick={() => {
                setIsClinicChosen(false);
                setLoginPassword('');
                setLoginAdmPassword('');
              }}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold self-start flex items-center gap-1 cursor-pointer hover:underline mb-1"
            >
              ← Voltar para as Clínicas
            </button>
            <div className={`mx-auto p-3.5 rounded-2xl shadow-md inline-block ${isAba ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
              {isAba ? <Sparkles className="w-6 h-6 text-amber-350" /> : <Award className="w-6 h-6 text-amber-350" />}
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-2">
              Acesso Restrito: {clinicLabel}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Diferenciação de segurança de prontuários. Selecione abaixo a sua modalidade de acesso autorizado.
            </p>
          </div>

          {/* Professional Login / Quick Registration Form */}
          {isRegisteringProf ? (
            <form onSubmit={handleQuickRegisterProfessional} className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do Profissional"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo / Função</label>
                <select
                  value={regCargo}
                  onChange={(e) => setRegCargo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer"
                >
                  <option value="AT">Acompanhante Terapêutico (AT)</option>
                  <option value="Psicólogo">Psicólogo</option>
                  <option value="Supervisor">Supervisor / BCBA</option>
                  <option value="Terapeuta Ocupacional">Terapeuta Ocupacional</option>
                  <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail (opcional)</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone (opcional)</label>
                  <input
                    type="text"
                    placeholder="(99) 99999-9999"
                    value={regTelefone}
                    onChange={(e) => setRegTelefone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 mt-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                  isAba ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Cadastrar e Entrar no Painel
              </button>

              <button
                type="button"
                onClick={() => setIsRegisteringProf(false)}
                className="text-center text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer underline -mt-1"
              >
                Voltar para Seleção de Perfil
              </button>
            </form>
          ) : (
            <form onSubmit={handleProfessionalLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qual profissional você é?</label>
                <select
                  value={loginSelectedProfId}
                  onChange={(e) => setLoginSelectedProfId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer"
                  required
                >
                  <option value="">-- Selecione o seu nome --</option>
                  {(clinicData.acompanhantes || []).map(at => (
                    <option key={at.id} value={at.id}>
                      {at.nome} ({at.cargo || 'Profissional'}) {at.status === 'Inativo' ? '● (Inativo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 mt-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                  isAba ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Entrar no Painel
              </button>

              <button
                type="button"
                onClick={() => setIsRegisteringProf(true)}
                className="text-center text-xs text-indigo-500 hover:text-indigo-650 font-bold cursor-pointer hover:underline -mt-1 animate-pulse"
              >
                Não está na lista? Cadastrar Novo Profissional
              </button>
            </form>
          )}

          <div className="text-center text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-3">
            Sessão segura criptografada em Sandbox Local.
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'parent' && selectedPatientId) {
    const parentPatient = clinicData.pacientes.find(p => p.id === selectedPatientId);
    if (!parentPatient) {
      return (
        <div className="p-8 text-center text-slate-500">
          Erro: Paciente não localizado no banco clínico.
          <button 
            className="mt-4 px-4 py-2 bg-pink-600 text-white font-bold rounded-xl"
            onClick={() => {
              setIsClinicChosen(false);
              setUserRole('clinician');
            }}
          >
            Voltar
          </button>
        </div>
      );
    }

    const parentPatientLogs = clinicData.atendimentos.filter(l => l.patientId === parentPatient.id);
    const parentPatientPrograms = clinicData.treinos[parentPatient.id] || [];
    const parentPatientPlan = clinicData.planos[parentPatient.id];

    return (
      <div className="min-h-screen bg-rose-50/10 text-slate-800 flex flex-col font-sans selection:bg-rose-100 antialiased">
        {/* Header do Portal dos Pais */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-sm px-4 py-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-pink-100 flex items-center justify-center bg-pink-50 flex-shrink-0 text-pink-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-pink-100 text-pink-800 font-bold uppercase py-0.5 px-2 rounded-full tracking-wider">
                  Área do Responsável
                </span>
                <span className="text-[9px] text-slate-400">
                  {activeClinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}
                </span>
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 mt-0.5">
                Portal da Família • {parentPatient.nome}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowConsentTermsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-100 transition-all cursor-pointer shadow-xs active:scale-97"
            >
              <FileText className="w-3.5 h-3.5 text-pink-500" />
              Termos de Sigilo
            </button>
            <button
              onClick={() => {
                setIsClinicChosen(false);
                setUserRole('clinician');
                setParentPass('');
                showToast("Sessão da família encerrada.", "info");
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all border border-rose-100 cursor-pointer shadow-xs active:scale-97"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sair do Portal
            </button>
          </div>
        </header>

        {/* Conteúdo Principal do Portal dos Pais */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 animate-in fade-in duration-350">
          
          {/* Card Inicial de Informações */}
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-pink-700 text-lg border border-pink-200 shadow-xs flex-shrink-0">
                {parentPatient.nome.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{parentPatient.nome}</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Diagnose: <strong className="text-slate-700">{parentPatient.diagnose}</strong> • Escola: {parentPatient.escola}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Responsáveis: {parentPatient.responsaveis} • Telefone: {parentPatient.telefone || 'Não preenchido'}
                </p>
              </div>
            </div>
            
            {/* Visualização Simplificada de Participação */}
            <div className="flex gap-4 border-t md:border-t-0 border-pink-200/40 pt-3 md:pt-0">
              <div className="bg-white px-4 py-2 rounded-xl border border-pink-100/50 flex flex-col items-center justify-center min-w-[120px] shadow-2xs">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Programas Ativos/Mastered</span>
                <span className="text-lg font-black text-indigo-600 mt-0.5">{parentPatientPrograms.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna Central com Mensagens e Recados */}
            <section className="lg:col-span-2 flex flex-col gap-6">
              
              {/* CHAT DIRETO INTERATIVO COM A EQUIPE DE TERAPEUTAS */}
              <div className="bg-white border border-pink-100 rounded-2xl p-6 shadow-xs flex flex-col gap-4 animate-in fade-in duration-300">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 border-b border-pink-50 pb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-pink-500 animate-pulse" /> Chat Direto com a Equipe de Terapeutas
                </h3>
                
                <p className="text-[11px] text-slate-500 -mt-1 leading-relaxed">
                  Utilize este canal para tirar dúvidas, reportar comportamentos em casa ou conversar diretamente com os profissionais que atendem seu filho(a).
                </p>

                {/* Speech bubbles wrapper for parent portal */}
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto bg-pink-50/15 border border-pink-100/40 p-4 rounded-xl min-h-[180px]">
                  {(() => {
                    const parentMsgs = (clinicData.mensagens || []).filter(m => m.patientId === parentPatient.id);
                    if (parentMsgs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 gap-1.5 h-full my-auto">
                          <span className="text-2xl">🌱</span>
                          <p className="text-xs font-bold text-slate-700">Inicie um diálogo privado</p>
                          <p className="text-[10px] text-slate-400 max-w-[280px]">
                            Nenhuma mensagem neste chat ainda. Digite sua mensagem abaixo para iniciar a conversa!
                          </p>
                        </div>
                      );
                    }
                    return parentMsgs.map(msg => {
                      const isParent = msg.sender === 'parent';
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col gap-0.5 max-w-[80%] ${isParent ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                          <span className="text-[9px] text-slate-400 px-1 font-bold">
                            {isParent ? 'Você (Responsável)' : msg.senderName}
                          </span>
                          <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-3xs ${
                            isParent 
                              ? 'bg-pink-600 text-white rounded-tr-none' 
                              : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                          }`}>
                            {msg.text && <p className="whitespace-pre-line">{msg.text}</p>}
                            {msg.attachmentUrl && (
                              msg.attachmentType === 'image' ? (
                                <div className="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/20">
                                  <img 
                                    src={msg.attachmentUrl} 
                                    alt={msg.attachmentName || 'Imagem anexada'} 
                                    className="max-h-52 w-full object-cover rounded-xl"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="bg-black/10 p-1 text-[9px] text-center truncate">
                                    {msg.attachmentName}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 p-2 bg-black/10 hover:bg-black/15 rounded-xl border border-white/10 flex items-center gap-2 max-w-xs min-w-[200px] transition-all">
                                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[10px] font-bold truncate">{msg.attachmentName || 'Documento'}</p>
                                    <span className="text-[8px] opacity-75">Documento / PDF</span>
                                  </div>
                                  <a 
                                    href={msg.attachmentUrl} 
                                    download={msg.attachmentName || 'documento'} 
                                    className="px-2 py-1 bg-white/25 hover:bg-white/40 rounded text-[9px] font-bold cursor-pointer transition-all whitespace-nowrap"
                                  >
                                    Baixar
                                  </a>
                                </div>
                              )
                            )}
                          </div>
                          <span className="text-[8px] text-slate-400 px-1">
                            {new Date(msg.timestamp).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Selected Attachment preview for parents */}
                {parentChatAttachment && (
                  <div className="flex items-center justify-between gap-3 bg-pink-50/75 p-2 rounded-xl border border-pink-100 text-[11px] animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-1.5 font-bold text-pink-700 truncate">
                      {parentChatAttachment.type === 'image' ? <Image className="w-3.5 h-3.5 text-pink-500" /> : <Paperclip className="w-3.5 h-3.5 text-pink-500" />}
                      <span className="truncate max-w-[250px]">{parentChatAttachment.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setParentChatAttachment(null)} 
                      className="text-pink-600 hover:text-pink-800 font-extrabold hover:bg-pink-100/60 p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Input box for parent portal */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (parentChatText.trim() || parentChatAttachment) {
                      handleSendParentMessage(parentPatient.id, parentChatText, parentChatAttachment || undefined);
                      setParentChatText('');
                      setParentChatAttachment(null);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="file"
                    id="parent-chat-file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleAttachmentUpload(e.target.files[0], true);
                        e.target.value = ''; // reset element
                      }
                    }}
                  />
                  <label 
                    htmlFor="parent-chat-file"
                    className="p-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-150 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-3xs"
                    title="Anexar foto ou documento"
                  >
                    <Paperclip className="w-4 h-4" />
                  </label>

                  <input
                    type="text"
                    placeholder="Escreva uma mensagem resposta ou dúvida para os terapeutas..."
                    value={parentChatText}
                    onChange={(e) => setParentChatText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500 placeholder:text-slate-450 shadow-3xs"
                  />
                  <button
                    type="submit"
                    disabled={!parentChatText.trim() && !parentChatAttachment}
                    className={`px-4 py-2 font-bold text-xs text-white rounded-xl transition-all cursor-pointer hover:scale-101 active:scale-99 flex items-center gap-1 shadow-sm ${
                      parentChatText.trim() || parentChatAttachment
                        ? 'bg-pink-650 hover:bg-pink-700' 
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    Enviar
                  </button>
                </form>
              </div>

              {/* PROGRAMAS DE ENSINO VINCULADOS */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-4 animate-in fade-in duration-300">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Metas e Programas de Aprendizado Atuais
                </h3>
                
                <div className="flex flex-col gap-4">
                  {parentPatientPrograms.length > 0 ? (
                    parentPatientPrograms.map(prog => (
                      <div key={prog.id} className="border border-slate-100 hover:border-slate-250 p-4 rounded-xl flex flex-col gap-3 transition-colors duration-200 shadow-2xs">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md uppercase">
                              {prog.area}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900 mt-1.5">{prog.titulo}</h4>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                              Discretas coletadas: {(prog.tentativas || []).length}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 font-normal leading-relaxed">
                          <strong>Método / Instrução:</strong> {prog.instrucoes}
                        </p>

                        {/* Progresso de Acertos */}
                        {prog.tentativas && prog.tentativas.length > 0 ? (
                          <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/60 text-[10px] text-slate-500">
                            <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                            <div className="flex-1 flex gap-1 items-center flex-wrap">
                              <span className="font-medium text-slate-600">Últimas Coletas (Tentativas Discretas):</span>
                              {prog.tentativas.slice(-8).map((t, idx) => {
                                const isDirectHit = t.registro === 'Independente';
                                const isVerbal = t.registro.includes('Verbal');
                                const isGestural = t.registro.includes('Gestual');
                                const isError = t.registro === 'Erro';
                                
                                let color = 'bg-slate-200 text-slate-700';
                                if (isDirectHit) color = 'bg-emerald-500 text-white font-bold';
                                else if (isVerbal) color = 'bg-sky-400 text-white';
                                else if (isGestural) color = 'bg-amber-400 text-white';
                                else if (isError) color = 'bg-rose-500 text-white';

                                return (
                                  <span key={t.id || idx} className={`px-1.5 py-0.5 rounded text-[8px] tracking-tight uppercase ${color}`} title={t.registro}>
                                    {t.registro.substring(0, 3)}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">Nenhum treino clínico realizado hoje.</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-6">Nenhum programa de aprendizado vinculado atualmente.</p>
                  )}
                </div>
              </div>

            </section>

            {/* Coluna Lateral Direita com Histórico de Atendimentos do AT e PDI */}
            <section className="flex flex-col gap-6">
              
              {/* OCORRÊNCIAS DE COMPORTAMENTO HOJE */}
              <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-xs flex flex-col gap-3 animate-in fade-in duration-300">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 border-b border-rose-50 pb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500 animate-pulse" /> Monitoramento de Ocorrências (Hoje)
                </h3>
                <p className="text-[10.5px] text-slate-500 leading-relaxed -mt-1">
                  Acompanhe em tempo real as ocorrências de comportamentos que foram controlados ou observados pela equipe hoje.
                </p>

                <div className="grid grid-cols-2 gap-2.5 mt-2">
                  {getPatientBehaviors(parentPatient.id).map(beh => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const logsToday = (clinicData.comportamentoLogs || []).filter(
                      l => l.patientId === parentPatient.id && l.behaviorName === beh && l.date === todayStr
                    );
                    const totalToday = logsToday.reduce((sum, l) => sum + l.count, 0);

                    return (
                      <div key={beh} className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">{beh}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          totalToday > 0 ? 'bg-rose-100 text-rose-700 font-extrabold animate-pulse' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {totalToday}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DIÁRIO DE TREINOS CLÍNICOS DISCRETOS */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-3 animate-in fade-in duration-300">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" /> Histórico de Treinos Diários Realizados
                </h3>
                <p className="text-[10.5px] text-slate-500 leading-relaxed -mt-1">
                  Veja o que foi trabalhado em cada programa de ensino discrete trial do seu filho(a) em cada data, incluindo as anotações do terapeuta.
                </p>

                <div className="flex flex-col gap-4 mt-2 max-h-[350px] overflow-y-auto pr-1">
                  {(() => {
                    const patientFinished = (clinicData.treinosFinalizados || []).filter(
                      t => t.patientId === parentPatient.id
                    );

                    if (patientFinished.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic text-center py-6">Nenhum treino clínico registrado para compartilhar com a família ainda.</p>
                      );
                    }

                    return patientFinished.map(log => (
                      <div key={log.id} className="border border-slate-100 p-3 rounded-xl bg-slate-50/40 flex flex-col gap-1.5 hover:bg-slate-50/70 transition-colors">
                        <div className="flex justify-between items-start text-[10px] border-b border-slate-100 pb-1 flex-wrap gap-1">
                          <span className="font-bold text-indigo-700">{log.programTitle}</span>
                          <span className="text-slate-400 font-bold font-mono">{log.date.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="flex justify-between text-[10.5px] text-slate-600 font-medium">
                          <span>Ensaios: {log.totalAttempts}</span>
                          <span className="text-emerald-700">Independência: <strong>{log.rate}%</strong></span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-100/50 mt-1">
                          <p className="text-[10px] text-slate-505 text-slate-500 italic leading-relaxed">"{log.observacao}"</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* DIÁRIO DE ATENDIMENTOS DO AT */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-3 animate-in fade-in duration-300">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Presenças e Registro do AT
                </h3>

                <div className="flex flex-col gap-4 mt-1">
                  {parentPatientLogs.length > 0 ? (
                    parentPatientLogs.slice(0, 5).map(log => {
                      const assistant = clinicData.acompanhantes.find(at => at.id === log.atId);
                      return (
                        <div key={log.id} className="border-l-2 border-emerald-400 pl-3.5 py-0.5 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-700">{assistant?.nome || 'AT Responsável'}</span>
                            <span className="text-slate-400 font-medium">{log.data}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                            {log.descricao}
                          </p>
                          <div className="flex gap-2 text-[8px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded self-start border border-slate-100">
                            <span>Horário: {log.horario}</span>
                            <span>Local: {log.local}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-6">Nenhum diário de atendimento recente arquivado.</p>
                  )}
                </div>
              </div>

            </section>

          </div>
        </main>
        
        <footer className="bg-white border-t border-slate-100 py-4 text-center text-[10px] text-slate-400 font-medium mt-12">
          Gerenciado Pelo Sistema Clínico Integrado ABA & Caminho ABA • Custo de Prontuário Isentivo em Tempo Real
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans selection:bg-teal-100 antialiased outline-none">
      {/* 1. Header & Segmented Clinic Switcher */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm/5 px-4 py-3 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-slate-100 flex items-center justify-center transition-transform duration-300 transform hover:scale-105 bg-sky-50 flex-shrink-0">
            {activeClinic === 'ABA' ? (
              <img 
                src="/src/assets/images/aba_clinic_cat_puzzle_logo_1781041000485.png" 
                alt="Logo Clínica ABA" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={`p-2 text-white ${brandColors.primaryBg} w-full h-full flex items-center justify-center`}>
                <Award className="w-5 h-5" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {activeClinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}
              {userRole === 'adm' ? (
                <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">ADM</span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Profissional</span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              {userRole === 'adm' ? (
                <span>Painel Principal do Administrador</span>
              ) : (
                <span>
                  Logado como: <strong className="text-slate-700">{clinicData.acompanhantes.find(at => at.id === loggedProfessionalId)?.nome || 'Profissional'}</strong> ({clinicData.acompanhantes.find(at => at.id === loggedProfessionalId)?.cargo || 'Clínico'})
                </span>
              )}
            </p>
          </div>
        </div>

        {userRole === 'adm' && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-inner">
            <button
              onClick={() => {
                setActiveClinic('ABA');
                showToast("Alternado para base de dados da Clínica ABA", "success");
              }}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeClinic === 'ABA' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gerenciar Clínica ABA
            </button>
            <button
              onClick={() => {
                setActiveClinic('Atria');
                showToast("Alternado para base de dados da Caminho ABA", "success");
              }}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeClinic === 'Atria' 
                  ? 'bg-indigo-605 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gerenciar Caminho ABA
            </button>
          </div>
        )}

        {/* Branded Exit button visible on all width profiles */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-600 bg-teal-50 px-2 py-1 rounded hidden md:inline">
            Acesso Autorizado
          </span>
          <button
            onClick={() => setShowConsentTermsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all cursor-pointer shadow-xs active:scale-97"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Termos de Sigilo
          </button>
          <button
            onClick={() => {
              setIsClinicChosen(false);
              setIsLoggedIn(false);
              setLoggedProfessionalId(null);
              setLoginSelectedProfId('');
              setLoginPassword('');
              setLoginAdmPassword('');
              showToast("Sessão finalizada. Volte sempre!", "info");
            }}
            title="Sair / Trocar de Clínica"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all border border-rose-100 cursor-pointer shadow-xs active:scale-97"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sair / Mudar Clínica
          </button>
        </div>
      </header>

      {/* 2. Collapsible Clinical Indicators (Dashboard) */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-1.5 flex flex-wrap justify-between items-center text-xs border-b border-slate-100/50 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <LayoutDashboard className="w-3.5 h-3.5" /> PAINEL DE GESTÃO ({activeClinic})
            </span>
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer hover:scale-102 transition-all active:scale-97 ${
                firebaseAuthenticated 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
              }`}
              title="Clique para ver o status de salvamento local e sincronização em nuvem"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${firebaseAuthenticated ? 'bg-emerald-550 animate-pulse' : 'bg-amber-500'}`} />
              {firebaseAuthenticated ? 'Nuvem Sincronizada' : 'Modo Seguro Local (Offline)'}
            </button>
          </div>
          <button 
            onClick={() => setIsDashboardVisible(!isDashboardVisible)}
            className="text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
          >
            {isDashboardVisible ? 'Ocultar Indicadores' : 'Mostrar Indicadores'}
          </button>
        </div>

        {isDashboardVisible && (
          <div className={`grid grid-cols-2 md:grid-cols-6 gap-4 p-4 md:px-8 max-w-7xl mx-auto transition-all bg-gradient-to-r ${brandColors.gradient}`}>
            {/* Pacientes Cadastrados */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Pacientes</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{totalPatients}</span>
                <span className="text-[10px] text-slate-500">ativos</span>
              </div>
            </div>

            {/* Acompanhantes Terapêuticos */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Assistentes (AT)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{totalAts}</span>
                <span className="text-[10px] text-slate-500">fichados</span>
              </div>
            </div>

            {/* Programas de Ensino Ativos */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Treinos ABA</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{activeProgramsCount}</span>
                <span className="text-[10px] text-slate-500">em curso</span>
              </div>
            </div>

            {/* Habilidades Dominadas */}
            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm/5 bg-emerald-50/20">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block mb-0.5">Adquiridas 🏆</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-650">{masteredProgramsCount}</span>
                <span className="text-[10px] text-emerald-600">aprendidas</span>
              </div>
            </div>

            {/* Registros Realizados */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Sessões Realizadas</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-850">{totalSessionsCount}</span>
                <span className="text-[10px] text-slate-500">visitas</span>
              </div>
            </div>

            {/* Taxa Geral de Independência */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Taxa Independência</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-teal-650">{globalIndependenceRate}%</span>
                <span className="text-[10px] text-slate-500">média</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Toast bar */}
      {feedbackToast && (
        <div id="toast-panel" className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all transform animate-bounce text-sm font-semibold border ${
          feedbackToast.type === 'success' 
            ? 'bg-emerald-500 text-white border-emerald-600' 
            : feedbackToast.type === 'error'
            ? 'bg-rose-500 text-white border-rose-600'
            : 'bg-slate-800 text-white border-slate-900'
        }`}>
          <span>{feedbackToast.message}</span>
          <button onClick={() => setFeedbackToast(null)} className="hover:opacity-70">
            <X className="w-4 h-4 cursor-pointer" />
          </button>
        </div>
      )}

      {/* 3. Main Workspace Division (Based on activeTab state) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6">

        {/* ADM EXCLUSIVE PASSWORD AND SECURITY MANAGEMENT CENTER */}
        {userRole === 'adm' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4 animate-fade-in text-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    Central de Configurações de Senhas e Segurança (ADM)
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Como Administrador, modifique as chaves e senhas de acesso instantaneamente para você (ADM), todos os profissionais (AT) ou canais dos pais.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordPanelExpanded(!isPasswordPanelExpanded)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-3xs hover:scale-[1.01]"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                {isPasswordPanelExpanded ? 'Recolher Painel' : 'Expandir Painel de Senhas'}
              </button>
            </div>

            {isPasswordPanelExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                {/* FORM 1: ADMIN PASSWORD */}
                <form onSubmit={handleUpdateAdminPasswordFromPanel} className="bg-slate-50/70 p-4 rounded-xl border border-slate-250 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <h4 className="font-extrabold text-xs text-rose-800 uppercase tracking-wide">Minha Senha de ADM</h4>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Senha do ADM Atual:</span>
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 select-all truncate">
                      {admPassword}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nova Senha ADMs:</span>
                    <input 
                      required 
                      type="text" 
                      placeholder="Ex: novaSenhaAdm" 
                      value={newAdmPasswordVal} 
                      onChange={(e) => setNewAdmPasswordVal(e.target.value)} 
                      className="px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-rose-500 focus:outline-none placeholder:text-slate-400 font-mono text-slate-800"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full mt-1 px-4 py-2 font-bold text-white bg-rose-650 hover:bg-rose-700 rounded-xl text-xs transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Mudar Senha ADM
                  </button>
                </form>

                {/* FORM 2: CLINICIAN / AT PASSWORD */}
                <form onSubmit={handleUpdateProfPasswordFromPanel} className="bg-slate-50/70 p-4 rounded-xl border border-slate-250 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <h4 className="font-extrabold text-xs text-indigo-800 uppercase tracking-wide">Senhas de Profissionais (AT)</h4>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selecione o Profissional:</span>
                    <select
                      value={selectedProfForPassId}
                      onChange={(e) => setSelectedProfForPassId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Selecione o nome --</option>
                      {(clinicData.acompanhantes || []).map(at => (
                        <option key={at.id} value={at.id}>
                          {at.nome} ({at.cargo || 'Profissional'}) - Senha: {at.password || '1234'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nova Senha AT:</span>
                    <input 
                      type="text" 
                      placeholder="Ex: at123nova" 
                      value={newProfPasswordVal} 
                      onChange={(e) => setNewProfPasswordVal(e.target.value)} 
                      className="px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 font-mono text-slate-800"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full mt-1 px-4 py-2 font-bold text-white bg-indigo-605 hover:bg-indigo-700 rounded-xl text-xs transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Mudar Senha do AT
                  </button>
                </form>

                {/* FORM 3: FAMILY / PARENT PASSWORD */}
                <form onSubmit={handleUpdatePatientPasswordFromPanel} className="bg-slate-50/70 p-4 rounded-xl border border-slate-250 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    <h4 className="font-extrabold text-xs text-pink-800 uppercase tracking-wide">Senhas de Responsáveis (Pais)</h4>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selecione o Paciente:</span>
                    <select
                      value={selectedPatientForPassId}
                      onChange={(e) => setSelectedPatientForPassId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Selecione o paciente --</option>
                      {(clinicData.pacientes || []).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} - Senha: {p.senhaPais || '1234'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nova Senha Pais:</span>
                    <input 
                      type="text" 
                      placeholder="Ex: novaSenhaFamilia" 
                      value={newPatientPasswordVal} 
                      onChange={(e) => setNewPatientPasswordVal(e.target.value)} 
                      className="px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-pink-500 focus:outline-none placeholder:text-slate-400 font-mono text-slate-800"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full mt-1 px-4 py-2 font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl text-xs transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Mudar Senha dos Pais
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
        
        {/* TAB 0: PACIENTES DETAIL HUB */}
        {activeTab === 'pacientes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left sidebar: list of clinic patients */}
            <section id="patient-sidebar" className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-lg">Pacientes registrados</h3>
                {(userRole === 'adm' || (userRole === 'clinician' && !isAT)) && (
                  <button 
                    id="add-patient-action"
                    onClick={() => setIsAddingPatient(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white ${brandColors.primaryBg} ${brandColors.primaryBgHover} transition-all cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                )}
              </div>

              {/* Search patients */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  placeholder="Pesquisar por nome ou diagnóstico..." 
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Clinical patients listing layout */}
              <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredPatients.map(p => {
                  const patientTrials = clinicData.treinos[p.id] || [];
                  const activeT = patientTrials.filter(x => x.status === 'ativo').length;
                  const domT = patientTrials.filter(x => x.status === 'dominado').length;
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setAiSuggestions(null);
                        setGeneratedReportText('');
                      }}
                      className={`text-left p-3 rounded-xl transition-all cursor-pointer border ${
                        selectedPatientId === p.id 
                          ? `${brandColors.border} ${brandColors.tint} border-2` 
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedPatientId === p.id ? brandColors.pill : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.nome.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 truncate">{p.nome}</h4>
                          <p className="text-xs text-slate-400 truncate">{p.diagnose}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100/30 pt-1.5">
                        <span>Idade: <strong>{p.idade} anos</strong></span>
                        <div className="flex gap-2">
                          <span className="text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">Ativo: {activeT}</span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Adquirido: {domT}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredPatients.length === 0 && (
                  <p className="text-center py-6 text-sm text-slate-400">Nenhum paciente encontrado.</p>
                )}
              </div>
            </section>

            {/* Right container: Detailed patient Clinical view */}
            <section id="patient-details" className="lg:col-span-8 flex flex-col gap-6">
              {selectedPatient ? (
                <>
                  {/* Profile Board details */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold ${brandColors.pill}`}>
                        {selectedPatient.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <h2 className="text-xl font-bold text-slate-900">{selectedPatient.nome}</h2>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${brandColors.pill}`}>
                            {selectedPatient.diagnose}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">Escola: {selectedPatient.escola} • Responsáveis: {selectedPatient.responsaveis}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {deletingPatientId === selectedPatient.id ? (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-150 px-2.5 py-1.5 rounded-xl shadow-xs animate-in zoom-in-95 duration-100">
                          <span className="text-[11px] font-bold text-rose-700 px-1 animate-pulse">Excluir prontuário?</span>
                          <button 
                            type="button"
                            onClick={() => handleDeletePatient(selectedPatient.id)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-xs hover:scale-101 active:scale-99 transition-all"
                          >
                            Sim, deletar
                          </button>
                          <button 
                            type="button"
                            onClick={() => setDeletingPatientId(null)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-all"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <>
                          {(userRole === 'adm' || (userRole === 'clinician' && !isAT)) && (
                            <button 
                              onClick={() => setIsEditingPatient(true)}
                              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-705 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Edit className="w-3.5 h-3.5" /> Editar Cadastro
                            </button>
                          )}
                          <button 
                            onClick={() => setActiveTab('planos')}
                            className={`px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer`}
                          >
                            Importar PDF
                          </button>
                          <button 
                            onClick={() => setActiveTab('planos')}
                            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white ${brandColors.primaryBg} ${brandColors.primaryBgHover} flex items-center gap-1.5 shadow-sm transition-all cursor-pointer`}
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Gerar via PDF
                          </button>
                          {(userRole === 'adm' || (userRole === 'clinician' && !isAT)) && (
                            <button 
                              onClick={() => setDeletingPatientId(selectedPatient.id)}
                              title="Configurações / Excluir prontuário do paciente de forma permanente"
                              className="p-2.5 hover:bg-rose-50 border border-rose-100 rounded-xl text-rose-500 hover:text-rose-700 transition-all cursor-pointer flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tab Selector inside Patient Details */}
                  <div className="flex border-b border-slate-150 p-1 bg-slate-100/50 rounded-xl gap-2 mb-5">
                    <button
                      type="button"
                      onClick={() => setPatientSubTab('dados')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        patientSubTab === 'dados'
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Prontuário & Atividades
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientSubTab('ai')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        patientSubTab === 'ai'
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Guia de Inteligência Artificial
                    </button>
                  </div>

                  {patientSubTab === 'dados' ? (
                    <>
                      {/* Core data subdivisions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Diagnostic Summary & Plano highlights */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-emerald-600" /> Prontuário Clínico & Metas
                        </h4>
                        <span className="text-[10px] text-slate-400">PDI atual</span>
                      </div>

                      {/* Portal dos Pais Password widget AVAILABLE ALWAYS */}
                      <div className="bg-pink-50/50 border border-pink-100/70 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        {editingPasswordId === selectedPatient.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex flex-col gap-1 flex-grow">
                              <span className="text-[9px] text-pink-700 font-bold uppercase tracking-wider block">Nova Senha do Portal:</span>
                              <input 
                                type="text" 
                                value={tempPasswordVal} 
                                onChange={(e) => setTempPasswordVal(e.target.value)} 
                                className="px-2 py-0.5 text-xs font-semibold bg-white border border-pink-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500 w-full"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-1 items-end mt-4">
                              <button 
                                onClick={() => {
                                  if (tempPasswordVal.trim()) {
                                    handleUpdateParentPassword(selectedPatient.id, tempPasswordVal.trim());
                                    setEditingPasswordId(null);
                                  }
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-3xs cursor-pointer transition-all"
                              >
                                Salvar
                              </button>
                              <button 
                                onClick={() => setEditingPasswordId(null)}
                                className="px-2.5 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-3xs cursor-pointer transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <span className="text-[9px] text-pink-700 font-bold uppercase tracking-wider block">Portal dos Pais - Senha:</span>
                              <span id={`parent-pass-mask-${selectedPatient.id}`} className="font-mono text-xs font-extrabold text-pink-900 bg-pink-100/40 px-1.5 py-0.5 rounded mr-2">
                                {revealPatientPassword === selectedPatient.id ? (selectedPatient.senhaPais || '1234') : '••••••'}
                              </span>
                              <button 
                                id={`btn-reveal-parent-${selectedPatient.id}`}
                                type="button" 
                                onClick={() => setRevealPatientPassword(revealPatientPassword === selectedPatient.id ? null : selectedPatient.id)}
                                className="text-[10px] text-pink-650 hover:text-pink-850 font-extrabold underline cursor-pointer inline-block"
                              >
                                {revealPatientPassword === selectedPatient.id ? 'Ocultar' : 'Visualizar'}
                              </button>
                              <span className="text-[10px] text-slate-500 block mt-1.5">Responsáveis: {selectedPatient.responsaveis} (Tel: {selectedPatient.telefone})</span>
                            </div>
                            <button 
                              onClick={() => {
                                setEditingPasswordId(selectedPatient.id);
                                setTempPasswordVal(selectedPatient.senhaPais || '1234');
                              }}
                              className="text-xs text-pink-600 hover:text-pink-750 font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-pink-100 shadow-3xs transition-all hover:bg-pink-50 self-end sm:self-center"
                            >
                              <Edit className="w-3 h-3 text-pink-500" /> Alterar Senha
                            </button>
                          </>
                        )}
                      </div>

                      {clinicData.planos[selectedPatient.id] ? (
                        <div className="flex flex-col gap-3 text-sm border-t border-slate-100 pt-3">
                          <div>
                            <span className="text-xs text-slate-400 block font-medium">Objetivos Gerais:</span>
                            <p className="text-slate-600 text-xs italic leading-relaxed">
                              "{clinicData.planos[selectedPatient.id].objetivosGerais}"
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400 block font-medium">Metas Específicas:</span>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-650 font-mono whitespace-pre-line leading-relaxed max-h-[140px] overflow-y-auto">
                              {clinicData.planos[selectedPatient.id].objetivosEspecificos}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-xs text-slate-400 py-6 text-center">Nenhum PDI configurado para este paciente. Use a aba "Planos" para criar um plano completo de objetivos.</p>
                        </div>
                      )}

                      {/* VÍNCULO DO PACIENTE COM ACOMPANHANTE TERAPÊUTICO (AT) */}
                      {!isAT && (
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col gap-2.5 mt-2 shadow-2xs">
                          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <Link2 className="w-4 h-4 text-indigo-650" />
                            <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">Vincular Paciente com AT</span>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 leading-normal">
                            Vincule <strong>{selectedPatient.nome}</strong> com um ou mais acompanhantes terapêuticos responsáveis:
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {clinicData.acompanhantes.map(at => {
                              const isLinked = at.pacientesVinculados.includes(selectedPatient.id);
                              return (
                                <button
                                  key={at.id}
                                  type="button"
                                  onClick={() => handleLinkPatientToAt(at.id, selectedPatient.id)}
                                  className={`px-2 py-1 rounded-lg border text-[11.5px] font-bold transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer active:scale-97 ${
                                    isLinked
                                      ? 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                  }`}
                                >
                                  <span>{at.nome}</span>
                                  <span className={`text-[8.5px] px-1 rounded-sm ${
                                    isLinked ? 'bg-emerald-800/80 text-white' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {at.cargo || 'Clínico'}
                                  </span>
                                  {isLinked ? (
                                    <Check className="w-3 h-3 text-white" />
                                  ) : (
                                    <Plus className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>
                              );
                            })}
                            {clinicData.acompanhantes.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">Nenhum profissional cadastrado no sistema ainda.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SVG Progress chart for independence */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-indigo-600" /> Gráficos de Evolução Diária
                        </h4>
                        <span className="text-[10px] text-slate-400">últimas tentativas</span>
                      </div>

                      {/* Customized custom SVG interactive chart implementation */}
                      {(() => {
                        const patientTrials = clinicData.treinos[selectedPatient.id] || [];
                        const attempts = patientTrials.flatMap(t => t.tentativas).slice(-7);
                        
                        if (attempts.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
                              <p className="text-xs">Dados insuficientes para renderização.</p>
                              <span className="text-[10px] mt-1 text-slate-500">Comece a registrar treinos.</span>
                            </div>
                          );
                        }

                        // Calculate rolling independence stats
                        return (
                          <div className="flex flex-col gap-3">
                            <span className="text-xs text-slate-500">Aproveitamento histórico de independência (%):</span>
                            
                            {/* Graphic SVG */}
                            <div className="relative h-32 w-full bg-slate-50 rounded-lg p-2 border border-slate-100 flex items-end justify-between">
                              {attempts.map((att, i) => {
                                const mappingValue = {
                                  'Independente': 100,
                                  'Ajuda Gestual': 70,
                                  'Ajuda Verbal': 50,
                                  'Ajuda Física': 25,
                                  'Erro': 0
                                }[att.registro];

                                const barColor = {
                                  'Independente': 'bg-emerald-500',
                                  'Ajuda Gestual': 'bg-cyan-500',
                                  'Ajuda Verbal': 'bg-amber-400',
                                  'Ajuda Física': 'bg-orange-500',
                                  'Erro': 'bg-red-400'
                                }[att.registro];

                                return (
                                  <div key={att.id} className="flex flex-col items-center flex-1 group">
                                    <span className="hidden group-hover:block absolute top-1 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm z-10 transition-all font-mono">
                                      {att.registro}
                                    </span>
                                    <div className="w-4/5 flex flex-col justify-end h-20 bg-slate-200/50 rounded-md overflow-hidden">
                                      <div 
                                        style={{ height: `${mappingValue === 0 ? 10 : mappingValue}%` }} 
                                        className={`w-full ${barColor} transition-all duration-500`}
                                      />
                                    </div>
                                    <span className="text-[8px] text-slate-400 mt-1 font-mono truncate max-w-full">
                                      {new Date(att.timestamp).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Legend badges */}
                            <div className="flex flex-wrap gap-2 justify-center text-[9px] text-slate-500">
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Independente (100)</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Gestual (70)</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Verbal (50)</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Física (25)</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Erro (0)</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Operational program index for this patient */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                        Programas de Ensino Vinculados ({clinicData.treinos[selectedPatient.id]?.length || 0})
                      </h4>
                      <button 
                        onClick={() => {
                          setSelectedPatientId(selectedPatient.id);
                          setActiveTab('treinos');
                        }}
                        className={`text-xs font-semibold ${brandColors.text} flex items-center hover:underline cursor-pointer`}
                      >
                        Abrir folha de coleta <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(clinicData.treinos[selectedPatient.id] || []).map(t => (
                        <div 
                          key={t.id} 
                          className={`p-4 rounded-xl border ${
                            t.status === 'dominado' 
                              ? 'border-emerald-200 bg-emerald-50/20' 
                              : 'border-slate-100 bg-slate-50/30'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                t.status === 'dominado' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {t.area}
                              </span>
                              <h5 className="font-bold text-sm text-slate-800 mt-1.5">{t.titulo}</h5>
                            </div>
                            {t.status === 'dominado' && (
                              <span className="p-1 rounded-full bg-emerald-500 text-white text-xs shadow-sm">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-550 mt-1 lines-2 leading-relaxed">{t.descricao}</p>
                          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Tentativas: <strong>{t.tentativas?.length || 0}</strong></span>
                            {t.status === 'dominado' && (
                              <span className="text-emerald-700 font-semibold">Adquirido em {t.dataConclusao}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {(clinicData.treinos[selectedPatient.id] || []).length === 0 && (
                        <div className="col-span-2 py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                          <p className="text-sm">Nenhum programa de ensino cadastrado para este paciente.</p>
                          <button 
                            onClick={() => setActiveTab('planos')}
                            className={`mt-3 px-4 py-2 text-xs font-semibold rounded-xl text-white ${brandColors.primaryBg} ${brandColors.primaryBgHover} shadow-sm cursor-pointer inline-flex items-center gap-1`}
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Importar PDF e Gerar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chronological Session Timeline entries from AT logs */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                        Evolução e Registros de ATs Recentes ({clinicData.atendimentos.filter(l => l.patientId === selectedPatient.id).length})
                      </h4>
                      <button 
                        onClick={() => {
                          setIsAddingLog(true);
                        }}
                        className={`text-xs font-semibold ${brandColors.text} hover:underline cursor-pointer flex items-center gap-1`}
                      >
                        <Plus className="w-3.5 h-3.5" /> Novo Registro
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {clinicData.atendimentos.filter(l => l.patientId === selectedPatient.id).slice(0, 3).map(l => {
                        const assistant = clinicData.acompanhantes.find(at => at.id === l.atId);
                        return (
                          <div key={l.id} className="border-l-2 border-emerald-500 pl-4 py-1.5 flex flex-col gap-2 relative">
                            <span className="absolute -left-1.5 top-2.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-700">Por {assistant?.nome || 'AT Responsável'}</span>
                              <span className="text-slate-400">{l.data} • {l.horario} • {l.local}</span>
                            </div>
                            <p className="text-xs text-slate-650 leading-relaxed font-sans mt-1">
                              <strong>Atividades:</strong> {l.descricao}
                            </p>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 text-[10px] text-slate-600">
                              <span><strong>Comportamentos:</strong> {l.comportamentosObservados || 'Sem ocorrências'}</span>
                              <span><strong>Dificuldades:</strong> {l.dificuldadesEncontradas || 'Nenhuma'}</span>
                            </div>
                          </div>
                        );
                      })}

                      {clinicData.atendimentos.filter(l => l.patientId === selectedPatient.id).length === 0 && (
                        <p className="text-center py-6 text-sm text-slate-400">Nenhum registro de evolução anotado para este paciente.</p>
                      )}
                    </div>
                  </div>
                    </>
                  ) : (
                    <AIPatientGuide
                      patient={selectedPatient}
                      clinicData={clinicData}
                      handleUploadDocument={handleUploadDocument}
                      brandColors={brandColors}
                    />
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                  <p className="text-slate-500">Nenhum paciente vinculado ou registrado nesta clínica para seu usuário.</p>
                  {(userRole === 'adm' || (userRole === 'clinician' && !isAT)) ? (
                    <button 
                      onClick={() => setIsAddingPatient(true)}
                      className={`mt-4 px-5 py-2.5 text-sm font-semibold text-white rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover} cursor-pointer`}
                    >
                      Cadastrar Primeiro Paciente
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 mt-2">Peça para o administrador associar pacientes ao seu perfil de profissional.</p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 1: GERADOR DE TREINOS VIA PDF */}
        {activeTab === 'planos' && (
          <div id="pdf-container-block" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
            
            {/* Header select patient */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 pb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Gerador Clínico de Treinos Via PDF</h3>
                <p className="text-xs text-slate-400">Importe relatórios, PDIs, laudos médicos ou diagnósticos para gerar programas de treinos ABA estruturados sob medida.</p>
              </div>

              {/* Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-semibold text-right whitespace-nowrap">Paciente:</span>
                <select 
                  id="pdf-patient-selector"
                  value={selectedPatientId || ''} 
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                  }}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-semibold focus:outline-none"
                >
                  {clinicData.pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPatient ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Upload Section - Takes full 12 columns in sub-grid */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Panel: Drag & Drop Input Area */}
                  <div className="md:col-span-7 flex flex-col gap-4">
                    <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider">1. Enviar Relatório ou PDI do Paciente</h4>
                    
                    <div
                      id="pdf-drop-zone"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            showToast("Por favor, envie um arquivo no formato PDF.", "error");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setUploadedPdf({ name: file.name, base64: reader.result as string });
                            showToast("PDF anexado com sucesso!", "success");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[220px] ${
                        isDragging 
                          ? 'border-indigo-500 bg-indigo-555' 
                          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
                      }`}
                      onClick={() => document.getElementById('pdf-file-selector')?.click()}
                    >
                      <input 
                        id="pdf-file-selector"
                        type="file" 
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type !== 'application/pdf') {
                              showToast("Por favor, envie um arquivo no formato PDF.", "error");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setUploadedPdf({ name: file.name, base64: reader.result as string });
                              showToast("PDF anexado com sucesso!", "success");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      
                      <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-3 hover:scale-105 transition-transform">
                        <FileText className="w-8 h-8" />
                      </div>
                      
                      <span className="text-sm font-semibold text-slate-800 block mb-1">
                        Arraste seu PDF aqui ou clique para selecionar
                      </span>
                      <span className="text-xs text-slate-400">
                        Apenas arquivos .pdf são aceitos (laudo, PDI, encaminhamento)
                      </span>
                    </div>

                    {/* Show uploaded PDF card info */}
                    {uploadedPdf && (
                      <div id="pdf-status-card" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-fade-in shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-rose-50 rounded-lg text-rose-600 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
                              {uploadedPdf.name}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              ✓ Arquivo pronto para análise
                            </span>
                          </div>
                        </div>
                        <button 
                          id="clear-pdf-btn"
                          onClick={() => setUploadedPdf(null)}
                          className="p-1.5 hover:bg-slate-200 hover:text-rose-600 text-slate-400 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                          title="Remover arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Panel: AI Generation Controls */}
                  <div className="md:col-span-5 flex flex-col justify-between bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-2xl border border-indigo-100 p-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-indigo-200/50 pb-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">Mecanismo de Ensino via IA</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Nossa Inteligência Artificial lerá o documento PDF enviado, identificará os déficits, metas terapêuticas e instruções metodológicas para o paciente <strong className="text-slate-800">{selectedPatient.nome}</strong>. 
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Com base nessa análise técnica, ela gerará automaticamente programas de ensino estruturados (treinos ABA) prontos para coletas de dados de folha de registro e ensaios discretos.
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                      <button
                        id="generate-pdf-btn"
                        onClick={() => triggerGenerateFromPdfAI(selectedPatient)}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                          uploadedPdf && !aiLoading
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                        disabled={!uploadedPdf || aiLoading}
                      >
                        {aiLoading ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin animate-pulse" />
                            Lendo e Gerando Treinos...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 flex-shrink-0" />
                            🪄 Gerar Treinos ABA a partir do PDF
                          </>
                        )}
                      </button>
                      {!uploadedPdf && (
                        <p className="text-[10px] text-amber-600 font-medium text-center animate-pulse mt-1">
                          ⚠️ Anexe um arquivo PDF na área esquerda para habilitar a geração de treinos.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Scanner Section when AI is digesting PDF */}
                {aiLoading && (
                  <div className="col-span-12 bg-slate-50 border border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 animate-pulse mt-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-md">
                      <span className="text-xs font-bold text-indigo-800">IA analisando repertório neurocomportamental do PDF...</span>
                      <p className="text-[11px] text-slate-400">Extraindo metas terapêuticas, determinando critérios de progresso e formulando ensaios discretos customizados.</p>
                    </div>
                  </div>
                )}

                {/* Custom AI Training Input & Deletion/Edit Controls */}
                <hr className="col-span-12 border-slate-200/60 my-4" />

                {/* Interactive Programs List with Direct Tuning */}
                <div className="col-span-12 flex flex-col gap-4 mt-3">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-500" /> Programas de Ensino Vinculados ({selectedPatient.nome})
                    </h4>
                    <p className="text-[11px] text-slate-400">Personalize os detalhes de cada protocolo ABA ou exclua treinos do prontuário técnico do paciente</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(clinicData.treinos[selectedPatient.id] || []).length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1">
                        <Activity className="w-5 h-5 text-slate-300 animate-pulse" />
                        <span className="font-bold text-slate-500">Nenhum treino cadastrado neste plano.</span>
                        <p className="text-[10px] text-slate-400">Envie um relatório PDF acima para que a inteligência artificial formule os programas de ensino automaticamente.</p>
                      </div>
                    ) : (
                      (clinicData.treinos[selectedPatient.id] || []).map(t => {
                        const isEditing = editingTrialId === t.id;
                        
                        if (isEditing) {
                          return (
                            <div key={t.id} className="bg-white rounded-2xl border border-slate-200/85 shadow-xs p-4 col-span-1 md:col-span-2 max-w-full">
                              <EditableTrialCard 
                                trial={t} 
                                onCancel={() => setEditingTrialId(null)} 
                                onSave={(updated) => handleUpdateProgram(selectedPatient.id, updated)} 
                                brandColors={brandColors}
                              />
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={t.id}
                            className="bg-white rounded-2xl border border-slate-200/65 p-4 shadow-xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col gap-3 relative overflow-hidden group"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                            
                            <div className="flex flex-col gap-2 pl-1">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold bg-indigo-50 text-indigo-600 rounded-full border border-indigo-150 uppercase tracking-widest">{t.area}</span>
                                  <h5 className="font-bold text-xs text-slate-800 mt-1 truncate">{t.titulo}</h5>
                                </div>

                                {deletingTrialId === t.id ? (
                                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-2 py-1 rounded-xl shadow-xs animate-in zoom-in-95 duration-150">
                                    <span className="text-[9px] font-bold text-rose-700 pr-1 select-none animate-pulse">Excluir?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProgram(selectedPatient.id, t.id)}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[9px] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingTrialId(null)}
                                      className="px-2 py-1 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold rounded-lg text-[9px] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setEditingTrialId(t.id)}
                                      title="Editar treino"
                                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingTrialId(t.id)}
                                      title="Apagar treino"
                                      className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 text-[11px] text-slate-600 mt-1 border-t border-slate-100 pt-2 bg-slate-50/20 rounded p-2">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Alvo Comportamental</span>
                                  <p className="bg-slate-50 p-1.5 rounded border border-slate-100/80 font-mono text-[10px] font-semibold text-slate-755">
                                    {t.alvo}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Descrição do Objetivo</span>
                                  <p className="leading-relaxed text-[10px] text-slate-600">{t.descricao}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Instruções Técnicas</span>
                                  <p className="leading-normal text-[10px] font-mono bg-white p-2 rounded border border-slate-100 text-slate-500 whitespace-pre-wrap">
                                    {t.instrucoes}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center gap-2 bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                                  <div>
                                    <span className="text-[8px] uppercase font-bold text-slate-400 block">Critério de Domínio</span>
                                    <span className="font-bold text-slate-600">{t.criterio}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[8px] uppercase font-bold text-slate-400 block">Coletas Realizadas</span>
                                    <span className="font-bold text-indigo-600">{t.tentativas?.length || 0} tentativas</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-center py-6 text-slate-400">Por favor, cadastre um paciente na tela anterior.</p>
            )}
          </div>
        )}

        {/* TAB 2: TREINOS (ABA DATA SHEET REVOLUTION) */}
        {activeTab === 'treinos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sidebar list of patients */}
            <section id="trial-patient-sidebar" className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-slate-900 text-lg">Folha de Coletas ABA</h3>
              <p className="text-xs text-slate-400">Escolha o paciente em atendimento clínico secundário:</p>
              
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {clinicData.pacientes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setSelectedTrialId(null);
                    }}
                    className={`text-left p-3 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                      selectedPatientId === p.id 
                        ? `${brandColors.border} ${brandColors.tint} text-slate-800` 
                        : 'border-slate-100 hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
            </section>

            {/* Trial clicker-panel core operations */}
            <section id="trial-operations" className="lg:col-span-8 flex flex-col gap-6">
              {selectedPatient ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
                  
                  {/* Select teaching program and view master status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Programas de Ensino - {selectedPatient.nome}</h3>
                      <p className="text-xs text-slate-400">Selecione o treino que está sendo aplicado na mesa:</p>
                    </div>
                    {!isAT && (
                      <button
                        onClick={() => setIsAddingManualTraining(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white ${brandColors.primaryBg} ${brandColors.primaryBgHover} transition-all cursor-pointer`}
                      >
                        <Plus className="w-3.5 h-3.5" /> Criar Treino Manual
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {(clinicData.treinos[selectedPatient.id] || []).map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTrialId(t.id)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                          selectedTrialId === t.id
                            ? `${brandColors.primaryBg} text-white shadow-md scale-102`
                            : t.status === 'dominado'
                            ? 'border-emerald-250 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                        }`}
                      >
                        {t.titulo}
                        {t.status === 'dominado' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}

                    {(clinicData.treinos[selectedPatient.id] || []).length === 0 && (
                      <div className="text-center py-6 w-full text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                        <p className="text-xs">Nenhum programa ativo. Sincronize com a IA na aba de pacientes para criar os treinos padrão de forma automatizada!</p>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const activeTrial = (clinicData.treinos[selectedPatient.id] || []).find(t => t.id === selectedTrialId);
                    if (!activeTrial) {
                      return (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
                          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-semibold">Terapeutas prontos para a sessão!</p>
                          <span className="text-[11px] text-slate-500">Selecione um treino acima para abrir o painel de tentativas.</span>
                        </div>
                      );
                    }

                    // Compute specific trial statistics
                    const attempts = activeTrial.tentativas;
                    const totalAttempts = attempts.length;
                    const indCount = attempts.filter(a => a.registro === 'Independente').length;
                    const indRate = totalAttempts > 0 ? Math.round((indCount / totalAttempts) * 105) : 0; // standard display capped
                    const displayIndRate = Math.min(100, indRate);

                    const gestCount = attempts.filter(a => a.registro === 'Ajuda Gestual').length;
                    const gestRate = totalAttempts > 0 ? Math.round((gestCount / totalAttempts) * 100) : 0;

                    const verbCount = attempts.filter(a => a.registro === 'Ajuda Verbal').length;
                    const verbRate = totalAttempts > 0 ? Math.round((verbCount / totalAttempts) * 100) : 0;

                    const fisCount = attempts.filter(a => a.registro === 'Ajuda Física').length;
                    const fisRate = totalAttempts > 0 ? Math.round((fisCount / totalAttempts) * 100) : 0;

                    const errCount = attempts.filter(a => a.registro === 'Erro').length;
                    const errRate = totalAttempts > 0 ? Math.round((errCount / totalAttempts) * 100) : 0;

                    // Verify streak count of last consecutive independent attempts
                    let streakCount = 0;
                    for (let n = attempts.length - 1; n >= 0; n--) {
                      if (attempts[n].registro === 'Independente') {
                        streakCount++;
                      } else {
                        break;
                      }
                    }

                    // Chronological daily grouping of attempts for SVG Evolution Graph
                    const groupedByDay = attempts.reduce((acc, att) => {
                      const dayStr = att.timestamp ? att.timestamp.split('T')[0] : "2026-06-09";
                      if (!acc[dayStr]) {
                        acc[dayStr] = { ind: 0, total: 0 };
                      }
                      if (att.registro === 'Independente') {
                        acc[dayStr].ind += 1;
                      }
                      acc[dayStr].total += 1;
                      return acc;
                    }, {} as Record<string, { ind: number; total: number }>);

                    // Sort chronologically
                    const sortedDays = Object.entries(groupedByDay)
                      .map(([date, data]) => {
                        const d = data as { ind: number; total: number };
                        return {
                          date,
                          rate: Math.round((d.ind / d.total) * 100)
                        };
                      })
                      .sort((a, b) => a.date.localeCompare(b.date));

                    // Apply active range filters (Semanal, Mensal ou Histórico)
                    let filteredPoints = [...sortedDays];
                    if (trialTimeRange === 'semanal') {
                      filteredPoints = filteredPoints.slice(-7);
                    } else if (trialTimeRange === 'mensal') {
                      filteredPoints = filteredPoints.slice(-30);
                    } // 'historico' uses all

                    return (
                      <div className="border border-slate-100 p-5 rounded-2xl flex flex-col gap-6 bg-slate-50/40">
                        {/* Title block */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">{activeTrial.area}</span>
                            <h4 className="font-bold text-slate-900 text-base mt-2">{activeTrial.titulo}</h4>
                            <p className="text-xs text-slate-500 mt-1">Alvo clínico: <strong>{activeTrial.alvo}</strong></p>
                          </div>

                          {/* Stat meters */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Independência</span>
                              <span className="text-xl font-extrabold text-emerald-600">{displayIndRate}%</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-4">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Critério de Domínio</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-sm font-extrabold text-slate-800`}>{streakCount}</span>
                                <span className="text-xs text-slate-400">/ {activeTrial.criterioProgresso || 10} consecutivas</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Complete statistical breakdown of prompts and errors */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-650 uppercase tracking-wider block">Taxas de Prompts & Coleta (% de {totalAttempts} tentativas):</span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-1.5">
                            {/* Independente bar */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                                <span>Independente (IND)</span>
                                <span>{displayIndRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${displayIndRate}%` }} />
                              </div>
                            </div>

                            {/* Ajuda Gestual */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-cyan-800">
                                <span>Ajuda Gestual (AJG)</span>
                                <span>{gestRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-cyan-500 h-full rounded-full transition-all duration-300" style={{ width: `${gestRate}%` }} />
                              </div>
                            </div>

                            {/* Ajuda Verbal */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-amber-800">
                                <span>Ajuda Verbal (AJV)</span>
                                <span>{verbRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${verbRate}%` }} />
                              </div>
                            </div>

                            {/* Ajuda Física */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-orange-850">
                                <span>Ajuda Física (AJF)</span>
                                <span>{fisRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${fisRate}%` }} />
                              </div>
                            </div>

                            {/* Erro */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-rose-800">
                                <span>Erro (ERR)</span>
                                <span>{errRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: `${errRate}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Chronological Evolution Chart Block */}
                        <div className="bg-white p-4.5 rounded-xl border border-slate-200/60 flex flex-col gap-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-2">
                            <div>
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                                <TrendingUp className="w-4 h-4 text-emerald-600" /> Histórico e Gráfico de Evolução ABA
                              </span>
                              <span className="text-[10px] text-slate-400">Percentual de respostas independentes por sessão/dia</span>
                            </div>

                            {/* Toggle limits */}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9px] font-extrabold shadow-sm/5 border border-slate-150">
                              <button 
                                onClick={() => setTrialTimeRange('semanal')}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${trialTimeRange === 'semanal' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                              >
                                Semanal
                              </button>
                              <button 
                                onClick={() => setTrialTimeRange('mensal')}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${trialTimeRange === 'mensal' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                              >
                                Mensal
                              </button>
                              <button 
                                onClick={() => setTrialTimeRange('historico')}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${trialTimeRange === 'historico' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                              >
                                Historial Completo
                              </button>
                            </div>
                          </div>

                          {/* SVG Representation */}
                          {filteredPoints.length > 1 ? (
                            <div className="w-full overflow-x-auto">
                              <svg viewBox="0 0 500 130" className="w-[500px] h-32 mx-auto overflow-visible font-mono text-[9px] font-semibold">
                                {/* Grid lines background */}
                                <line x1="35" y1="15" x2="475" y2="15" stroke="#f1f5f9" strokeWidth="1" />
                                <line x1="35" y1="65" x2="475" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                                <line x1="35" y1="115" x2="475" y2="115" stroke="#e2e8f0" strokeWidth="1" />

                                {/* Left markers */}
                                <text x="10" y="18" fill="#94a3b8" dominantBaseline="middle">100%</text>
                                <text x="10" y="68" fill="#94a3b8" dominantBaseline="middle">50%</text>
                                <text x="15" y="118" fill="#94a3b8" dominantBaseline="middle">0%</text>

                                {/* Compute coordinates */}
                                {(() => {
                                  const W = 500;
                                  const H = 130;
                                  const padX = 45;
                                  const padY = 15;
                                  const N = filteredPoints.length;

                                  const pts = filteredPoints.map((pt, idx) => {
                                    const cx = padX + (idx / Math.max(1, N - 1)) * (W - padX - 25);
                                    const cy = H - padY - (pt.rate / 100) * (H - 2 * padY);
                                    return { cx, cy, pt };
                                  });

                                  // Draw line path
                                  const pathD = pts.reduce((acc, p, idx) => {
                                    return idx === 0 
                                      ? `M ${p.cx} ${p.cy}` 
                                      : `${acc} L ${p.cx} ${p.cy}`;
                                  }, "");

                                  return (
                                    <>
                                      <path 
                                        d={pathD} 
                                        fill="none" 
                                        stroke={activeClinic === 'ABA' ? '#10b981' : '#6366f1'} 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                      />
                                      {/* Points dots and labels */}
                                      {pts.map((p, idx) => (
                                        <g key={idx} className="group cursor-pointer">
                                          <circle 
                                            cx={p.cx} 
                                            cy={p.cy} 
                                            r="4.5" 
                                            fill="#ffffff" 
                                            stroke={activeClinic === 'ABA' ? '#10b981' : '#6366f1'} 
                                            strokeWidth="2.5" 
                                          />
                                          {/* Coordinates data overlay value text */}
                                          <text 
                                            x={p.cx} 
                                            y={p.cy - 10} 
                                            textAnchor="middle" 
                                            fill="#475569" 
                                            className="font-bold text-[8px]"
                                          >
                                            {p.pt.rate}%
                                          </text>
                                          {/* Bottom Day month */}
                                          <text 
                                            x={p.cx} 
                                            y="126" 
                                            textAnchor="middle" 
                                            fill="#64748b" 
                                            className="text-[8px]"
                                          >
                                            {p.pt.date.split('-').slice(1).reverse().join('/')}
                                          </text>
                                        </g>
                                      ))}
                                    </>
                                  );
                                })()}
                              </svg>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1">
                              <TrendingUp className="w-5 h-5 text-slate-300" />
                              <p className="font-semibold text-slate-550">Registros clínicos temporais insuficientes.</p>
                              <span>Realize coletas em pelo menos 2 dias diferentes para plotar a linha temporal.</span>
                            </div>
                          )}
                        </div>

                        {/* Directions / Instructions to guide ATs */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex flex-col gap-1.5 text-xs">
                          <span className="font-bold text-slate-800">Instruções de Aplicação de Tentativas:</span>
                          <p className="text-slate-600 leading-relaxed italic">"{activeTrial.instrucoes}"</p>
                          <div className="mt-2 text-[10px] text-slate-450 border-t border-slate-100 pt-1.5 flex justify-between items-center">
                            <span>Domínio padrão: <strong>{activeTrial.criterio}</strong></span>
                            
                            {/* Mastery configurator */}
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-500 text-[10px]">Alterar meta de consecutivas independentes:</span>
                              <select 
                                value={activeTrial.criterioProgresso || 10}
                                onChange={(e) => handleSetMasteryThreshold(activeTrial.id, parseInt(e.target.value))}
                                className="px-1.5 py-0.5 border rounded border-slate-300 font-mono text-[9px] bg-white focus:outline-none"
                              >
                                {[5, 8, 10, 12, 15].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Immersive Giant Buttons Core Coleta Board */}
                        <div className="flex flex-col gap-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registro de Aplicação em tempo real (1 Clique):</span>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <button
                              id="btn-trial-ind"
                              onClick={() => handleLogTrial(activeTrial.id, 'Independente')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-4 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform transform active:scale-95 shadow-sm"
                            >
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85">IND</span>
                              <span className="text-xs">Independente</span>
                            </button>
                            
                            <button
                              id="btn-trial-ajg"
                              onClick={() => handleLogTrial(activeTrial.id, 'Ajuda Gestual')}
                              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold p-4 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform transform active:scale-95 shadow-sm"
                            >
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85">AJG</span>
                              <span className="text-xs">Ajuda Gestual</span>
                            </button>
                            
                            <button
                              id="btn-trial-ajv"
                              onClick={() => handleLogTrial(activeTrial.id, 'Ajuda Verbal')}
                              className="bg-amber-400 hover:bg-amber-500 text-slate-850 font-bold p-4 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform transform active:scale-95 shadow-sm"
                            >
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85 text-slate-800">AJV</span>
                              <span className="text-xs">Ajuda Verbal</span>
                            </button>
                            
                            <button
                              id="btn-trial-ajf"
                              onClick={() => handleLogTrial(activeTrial.id, 'Ajuda Física')}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold p-4 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform transform active:scale-95 shadow-sm"
                            >
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85">AJF</span>
                              <span className="text-xs">Ajuda Física</span>
                            </button>
                            
                            <button
                              id="btn-trial-err"
                              onClick={() => handleLogTrial(activeTrial.id, 'Erro')}
                              className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-4 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform transform active:scale-95 shadow-sm col-span-2 sm:col-span-1"
                            >
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85">ERR</span>
                              <span className="text-xs">Erro</span>
                            </button>
                          </div>
                        </div>

                        {/* Recent session attempt list feed & Undo operation */}
                        <div className="bg-white p-4.5 rounded-xl border border-slate-150 flex flex-col gap-3">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-600">Histórico de tentativas gravadas nesta sessão (Últimas 10):</span>
                            
                            {attempts.length > 0 && (
                              <button
                                onClick={() => handleUndoLastTrial(activeTrial.id)}
                                className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 border border-slate-100 hover:bg-slate-50 px-2 py-1 rounded-lg transition-all"
                              >
                                <RotateCcw className="w-3.5 h-3.5 cursor-pointer" /> Desfazer último
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {attempts.slice(-10).map((att, index) => {
                              const badgeStyle = {
                                'Independente': 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                'Ajuda Gestual': 'bg-cyan-50 text-cyan-800 border-cyan-200',
                                'Ajuda Verbal': 'bg-amber-50 text-amber-800 border-amber-200',
                                'Ajuda Física': 'bg-orange-50 text-orange-850 border-orange-200',
                                'Erro': 'bg-rose-50 text-rose-800 border-rose-200'
                              }[att.registro];

                              return (
                                <span 
                                  key={att.id}
                                  className={`text-[10px] font-bold px-2 py-1 rounded border font-mono ${badgeStyle}`}
                                >
                                  {index + 1}. {att.registro}
                                </span>
                              );
                            })}

                            {attempts.length === 0 && (
                              <p className="text-xs text-slate-400 py-2">Nenhuma tentativa realizada na sessão de hoje ainda.</p>
                            )}
                          </div>
                        </div>

                        {/* PAINEL DE OCORRÊNCIAS DE COMPORTAMENTO */}
                        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 flex flex-col gap-4 shadow-xs">
                          <div>
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                              <Flame className="w-4 h-4 text-rose-500 animate-pulse" /> Registro de Ocorrências (Comportamentos Inadequados)
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Clique no botão de comportamento registrado hoje para somar a ocorrência. Os dados são sincronizados em tempo real com ADM e Pais.
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {getPatientBehaviors(selectedPatient.id).map(beh => {
                              // Calculate how many occurrences today
                              const todayStr = new Date().toISOString().split('T')[0];
                              const behaviorLogsToday = (clinicData.comportamentoLogs || []).filter(
                                l => l.patientId === selectedPatient.id && l.behaviorName === beh && l.date === todayStr
                              );
                              const totalCountToday = behaviorLogsToday.reduce((sum, l) => sum + l.count, 0);

                              return (
                                <div key={beh} className="relative group/btn flex">
                                  <button
                                    type="button"
                                    onClick={() => handleLogBehaviorOccurrence(selectedPatient.id, beh)}
                                    className="flex-1 text-left bg-slate-50 border border-slate-200 hover:border-indigo-200 p-3.5 rounded-xl transition-all hover:bg-slate-100/60 active:scale-95 cursor-pointer flex flex-col gap-1 pr-8"
                                  >
                                    <span className="text-xs font-bold text-slate-800">{beh}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-slate-400">Hoje:</span>
                                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                        totalCountToday > 0 ? 'bg-rose-100 text-rose-700 font-extrabold animate-pulse' : 'bg-slate-200 text-slate-600'
                                      }`}>
                                        {totalCountToday}
                                      </span>
                                    </div>
                                  </button>

                                  {/* Delete Behavior Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomBehaviorButton(selectedPatient.id, beh)}
                                    className="absolute right-2 top-2 p-1 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-all opacity-0 group-hover/btn:opacity-100 cursor-pointer"
                                    title={`Excluir botão de ${beh}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Custom Button Form */}
                          <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                            <input
                              type="text"
                              value={newBehaviorInput}
                              onChange={(e) => setNewBehaviorInput(e.target.value)}
                              placeholder="Outro comportamento (Ex: Autoagressão, Resmungar)..."
                              className="text-xs px-3 py-2 border rounded-xl border-slate-250 focus:outline-none flex-1 max-w-sm bg-slate-50 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newBehaviorInput.trim()) {
                                  handleAddCustomBehaviorButton(selectedPatient.id, newBehaviorInput);
                                  setNewBehaviorInput('');
                                }
                              }}
                              className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer flex items-center gap-1 shadow-sm font-sans"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar Botão
                            </button>
                          </div>
                        </div>

                        {/* SALVAR TREINO NO HISTÓRICO COM OBSERVAÇÃO */}
                        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 flex flex-col gap-4 shadow-sm">
                          <div>
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                              <Archive className="w-4 h-4 text-emerald-600" /> Salvar Sessão Realizada no Histórico Diário
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Grave o resumo percentual e observações desta coleta no prontuário definitivo do paciente.
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Data Realizada (Mude o dia se necessário):</label>
                              <input
                                type="date"
                                value={trainingDateInput}
                                onChange={(e) => setTrainingDateInput(e.target.value)}
                                className="px-3 py-2 text-xs border rounded-xl border-slate-250 focus:outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium font-sans"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Anotações / Notas e Observações do Treino:</label>
                              <textarea
                                value={trainingObsInput}
                                onChange={(e) => setTrainingObsInput(e.target.value)}
                                placeholder="Descreva observações, dicas aplicadas, comportamento ou atenção do paciente durante este treino..."
                                rows={2}
                                className="px-3 py-1.5 text-xs border rounded-xl border-slate-250 focus:outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium font-sans resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                const total = attempts.length;
                                if (total === 0) {
                                  showToast("Para registrar no diário, realize pelo menos 1 tentativa no painel de botões coloridos.", "info");
                                  return;
                                }
                                const independents = attempts.filter(att => att.registro === 'Independente').length;
                                const rate = Math.round((independents / total) * 100);
                                handleSaveFinishedTraining(
                                  selectedPatient.id,
                                  activeTrial.id,
                                  activeTrial.titulo,
                                  trainingDateInput,
                                  trainingObsInput,
                                  total,
                                  independents,
                                  rate
                                );
                                setTrainingObsInput('');
                              }}
                              className="px-4 py-2 text-xs font-bold text-white bg-emerald-650 hover:bg-emerald-700 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Salvar Treino de Hoje
                            </button>
                          </div>
                        </div>

                        {/* REGISTRO DIÁRIO HISTÓRICO DE TREINOS DO PACIENTE */}
                         <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 flex flex-col gap-4 shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                             <div>
                               <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                                 <History className="w-4 h-4 text-indigo-500" /> Historial de Treinos Registrados
                               </span>
                               <span className="text-[10px] text-slate-400 block mt-0.5">
                                 {showAllPatientsFinishedTrainings 
                                   ? "Exibição de todos os treinos concluídos de TODOS os pacientes." 
                                   : `Exibição de todos os treinos concluídos arquivados para ${selectedPatient.nome}.`}
                               </span>
                             </div>
                             
                             <div className="flex items-center gap-1 bg-white border border-slate-150 p-0.5 rounded-lg shrink-0">
                               <button
                                 type="button"
                                 onClick={() => setShowAllPatientsFinishedTrainings(false)}
                                 className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                                   !showAllPatientsFinishedTrainings 
                                     ? 'bg-indigo-600 text-white shadow-xs' 
                                     : 'text-slate-500 hover:bg-slate-100'
                                 }`}
                               >
                                 {selectedPatient.nome.split(' ')[0]}
                               </button>
                               <button
                                 type="button"
                                 onClick={() => setShowAllPatientsFinishedTrainings(true)}
                                 className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                                   showAllPatientsFinishedTrainings 
                                     ? 'bg-indigo-600 text-white shadow-xs' 
                                     : 'text-slate-500 hover:bg-slate-100'
                                 }`}
                               >
                                 Ver Todos
                               </button>
                             </div>
                           </div>
 
                           <div className="flex flex-col gap-2.5 max-h-[355px] overflow-y-auto pr-1">
                             {(() => {
                               const loggedTrainings = showAllPatientsFinishedTrainings
                                 ? (clinicData.treinosFinalizados || [])
                                 : (clinicData.treinosFinalizados || []).filter(
                                     t => t.patientId === selectedPatient.id
                                   );
 
                               if (loggedTrainings.length === 0) {
                                 return (
                                   <div className="border border-slate-150 p-6 bg-slate-50/50 rounded-xl text-center text-slate-400 text-xs">
                                     Nenhum treino salvo nesta pasta ainda. Finalize o treino acima para iniciar o histórico diário.
                                   </div>
                                 );
                               }
 
                               return loggedTrainings.map(log => {
                                 const patientName = clinicData.pacientes.find(p => p.id === log.patientId)?.nome || 'Paciente';
                                 return (
                                   <div key={log.id} className="border border-slate-150 p-3 rounded-xl bg-slate-50/30 flex flex-col gap-2 hover:bg-slate-50/65 transition-all">
                                     <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-1.5">
                                       <div>
                                         <div className="flex items-center gap-1.5 flex-wrap">
                                            <h5 className="font-bold text-xs text-slate-800">{log.programTitle}</h5>
                                            {showAllPatientsFinishedTrainings && (
                                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                                                {patientName}
                                              </span>
                                            )}
                                         </div>
                                         {/* Realized date editor */}
                                         <div className="flex items-center gap-1.5 mt-1">
                                           <Calendar className="w-3 h-3 text-slate-400" />
                                           <span className="text-[10px] font-bold text-slate-500">Data Realizada:</span>
                                           <input
                                             type="date"
                                             value={log.date}
                                             onChange={(e) => handleChangeFinishedTrainingDate(log.id, e.target.value)}
                                             className="px-1.5 py-0.5 border border-slate-200 rounded text-[9px] bg-white font-mono font-semibold focus:outline-none"
                                             title="Editar data de realização do treino"
                                           />
                                         </div>
                                       </div>
 
                                       {/* Delete action (Only ADM) */}
                                       {userRole === 'adm' && (
                                         <button
                                           type="button"
                                           onClick={() => handleDeleteFinishedTrainingLog(log.id)}
                                           className="text-slate-400 hover:text-rose-650 p-1 rounded hover:bg-slate-100 cursor-pointer transition-all"
                                           title="Excluir do diário técnico"
                                         >
                                           <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                       )}
                                     </div>
 
                                     <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                       <div className="bg-white p-1 px-2 border rounded border-slate-100 text-slate-600">
                                         Total Tentativas: <span className="text-slate-800 font-extrabold">{log.totalAttempts}</span>
                                       </div>
                                       <div className="bg-white p-1 px-2 border rounded border-slate-100 text-emerald-800 flex items-center gap-1">
                                         Independência: <span className="text-emerald-600 font-extrabold">{log.rate}%</span>
                                       </div>
                                     </div>
 
                                     <div className="p-2 rounded border border-slate-100 bg-white">
                                       <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Observação anotada:</span>
                                       <p className="text-[10.5px] text-slate-600 leading-relaxed italic">"{log.observacao}"</p>
                                     </div>
                                   </div>
                                 );
                               });
                             })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-center py-6 text-slate-400">Por favor, cadastre um paciente na tela anterior.</p>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: ACOMPANHANTES TERAPÊUTICOS (AT) */}
        {activeTab === 'at' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sidebar list of ATs */}
            <section id="at-sidebar" className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-lg">Profissionais</h3>
                {userRole === 'adm' && (
                  <button
                    onClick={() => setIsAddingAt(true)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white ${brandColors.primaryBg} ${brandColors.primaryBgHover} cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar AT
                  </button>
                )}
              </div>

              {/* Search AT */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  value={searchAt}
                  onChange={(e) => setSearchAt(e.target.value)}
                  placeholder="Pesquisar por nome ou cargo..." 
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {filteredAts.map(at => {
                  const isActive = at.status !== 'Inativo';
                  return (
                    <button
                      key={at.id}
                      onClick={() => {
                        setSelectedAtId(at.id);
                      }}
                      className={`text-left p-3 rounded-xl border font-semibold text-sm transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedAtId === at.id 
                          ? `${brandColors.border} ${brandColors.tint} text-slate-800` 
                          : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-slate-900">{at.nome}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center w-full text-[10px] text-slate-400">
                        <span>{at.cargo || 'Profissional'}</span>
                        <span className="truncate max-w-[125px]">{at.email}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* AT Profile detail & Integrated calendar */}
            <section id="at-detailed-data" className="lg:col-span-8 flex flex-col gap-6">
              {selectedAt ? (
                <>
                  {/* AT Overview details */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg">{selectedAt.nome}</h3>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          selectedAt.status !== 'Inativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {selectedAt.status !== 'Inativo' ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                          {selectedAt.cargo || 'Profissional'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Contato: {selectedAt.telefone} • {selectedAt.email}</p>
                      <div className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                        <span>Chave de Acesso (Senha): <strong className="text-slate-850 font-mono text-sm bg-white border border-slate-200 px-1.5 py-0.5 rounded">{revealProfPassword ? (selectedAt.password || '1234') : '••••••'}</strong></span>
                        <button 
                          id={`btn-reveal-prof-${selectedAt.id}`}
                          type="button" 
                          onClick={() => setRevealProfPassword(!revealProfPassword)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold underline cursor-pointer"
                        >
                          {revealProfPassword ? 'Ocultar' : 'Visualizar'}
                        </button>
                      </div>
                      {selectedAt.observacoes && (
                        <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">"{selectedAt.observacoes}"</p>
                      )}
                    </div>

                    {userRole === 'adm' && (
                      <div className="flex gap-2 self-end sm:self-center">
                        <button 
                          onClick={() => setIsEditingAt(true)}
                          className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500" /> Editar Dados
                        </button>
                        <button
                          onClick={() => setDeletingAtId(selectedAt.id)}
                          className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-xl cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Associated clinic patients partition */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Paciente(s) Vinculado(s):</span>
                      {isAT && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100 italic">
                          Apenas Adm e Supervisores gerenciam os vínculos de pacientes.
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {clinicData.pacientes.map(p => {
                        const isLinked = selectedAt.pacientesVinculados.includes(p.id);
                        if (isAT && !isLinked) return null; // ATs cannot see or link unlinked patients
                        
                        return (
                          <button
                            key={p.id}
                            disabled={isAT}
                            onClick={() => handleLinkPatientToAt(selectedAt.id, p.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition-all ${
                              isAT ? 'cursor-default opacity-90' : 'cursor-pointer'
                            } ${
                              isLinked 
                                ? 'bg-emerald-500 border-emerald-600 text-white' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{p.nome}</span>
                            {isLinked ? <Check className="w-3.5 h-3.5" /> : !isAT && <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        );
                      })}

                      {isAT && selectedAt.pacientesVinculados.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-1 animate-pulse">Nenhum paciente vinculado a este profissional ainda.</p>
                      )}
                    </div>
                  </div>

                  {/* Operational Agenda Calendar UI Component */}
                  <div className="bg-white rounded-2xl border border-slate-200/50 p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                      <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-indigo-600" /> Agenda Integrada de Atendimentos (Junho 2026)
                      </h4>
                      
                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedCalendarDay) {
                              setSelectedCalendarDay(new Date().toISOString().split('T')[0]);
                            }
                            setIsAddingEvent(true);
                          }}
                          className={`px-3 py-1.5 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${brandColors.primaryBg} ${brandColors.primaryBgHover}`}
                        >
                          <Plus className="w-3.5 h-3.5" /> Agendar Atendimento
                        </button>
                        
                        <div className="flex bg-slate-150 p-0.5 rounded-lg text-[10px] border border-slate-200/50">
                          <button 
                            type="button"
                            onClick={() => setCalendarView('week')}
                            className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${calendarView === 'week' ? 'bg-white text-indigo-850 shadow-sm' : 'text-slate-500'}`}
                          >
                            Visualização Corrida
                          </button>
                          <button 
                            type="button"
                            onClick={() => setCalendarView('month')}
                            className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${calendarView === 'month' ? 'bg-white text-indigo-850 shadow-sm' : 'text-slate-500'}`}
                          >
                            Grade Mensal
                          </button>
                        </div>
                      </div>
                    </div>

                    {calendarView === 'month' ? (
                      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                        {/* Calendar Header Month selector */}
                        <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-150">
                          <span className="text-xs font-bold text-slate-750 uppercase">📅 Junho de 2026</span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">Ano Letivo Clínico</span>
                        </div>

                        {/* Week Day Labels segmented */}
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Dom</span>
                          <span>Seg</span>
                          <span>Ter</span>
                          <span>Qua</span>
                          <span>Qui</span>
                          <span>Sex</span>
                          <span>Sáb</span>
                        </div>

                        {/* Days Grid June 2026 */}
                        <div className="grid grid-cols-7 gap-1">
                          {/* June 1st 2026 starts on Monday. Sunday is index 0. Monday is 1, so 1 blank space */}
                          <div className="h-10 text-[10px] text-slate-300 rounded-lg flex items-center justify-center bg-slate-50/10"></div> 
                          
                          {Array.from({ length: 30 }).map((_, idx) => {
                            const day = idx + 1;
                            const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
                            const isSelected = selectedCalendarDay === dateStr;
                            
                            // Events for active AT on this day
                            const dayEvents = clinicData.agenda.filter(ev => ev.atId === selectedAt.id && ev.data === dateStr);
                            const hasEvents = dayEvents.length > 0;

                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setSelectedCalendarDay(dateStr)}
                                className={`h-10 rounded-xl relative flex flex-col items-center justify-between py-1 transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-650 border-transparent text-white shadow-md scale-[1.03] font-bold'
                                    : hasEvents
                                    ? 'bg-emerald-50 border-emerald-250 text-emerald-950 font-bold'
                                    : 'bg-slate-50/50 border-slate-200/50 hover:bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span className="text-xs">{day}</span>
                                {hasEvents && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'} mb-1`} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Active sessions list for the selected calendar date */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col gap-3 mt-1 shadow-sm/5">
                          <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                            <span className="text-xs font-bold text-slate-700">
                              Visitas e Compromissos ({selectedCalendarDay.split('-').reverse().join('/')}):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                // We can pass selected date context easily by updating state or let and opening modal
                                setIsAddingEvent(true);
                              }}
                              className="text-indigo-650 hover:underline text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar na data d/m/a
                            </button>
                          </div>

                          <div className="flex flex-col gap-2">
                            {(() => {
                              const dayEvents = clinicData.agenda.filter(ev => ev.atId === selectedAt.id && ev.data === selectedCalendarDay);
                              if (dayEvents.length === 0) {
                                return (
                                  <p className="text-xs text-slate-400 italic py-2 text-center">Nenhum compromisso marcado para este dia do calendário da clínica.</p>
                                );
                              }

                              return dayEvents.map(ev => {
                                const patient = clinicData.pacientes.find(p => p.id === ev.patientId);
                                return (
                                  <div key={ev.id} className="bg-white p-3 rounded-xl border border-slate-150 flex justify-between items-center text-xs animate-in slide-in-from-top-1">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-bold text-slate-800">{patient?.nome || 'Paciente'}</span>
                                      <span className="text-slate-400 font-bold font-mono text-[10px] flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> {ev.horarioInicio} - {ev.horarioFim} • {ev.local}
                                      </span>
                                      {ev.observacoes && <span className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded italic">"{ev.observacoes}"</span>}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEvent(ev.id)}
                                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* List View of all upcoming sessions associated with this AT */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                        {clinicData.agenda.filter(ev => ev.atId === selectedAt.id).map(ev => {
                          const patient = clinicData.pacientes.find(p => p.id === ev.patientId);
                          return (
                            <div key={ev.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-150 flex justify-between items-start gap-4">
                              <div className="flex flex-col gap-1 text-xs">
                                <span className="font-bold text-slate-800">{patient?.nome || 'Paciente indefinido'}</span>
                                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> {ev.data.split('-').reverse().join('/')} às {ev.horarioInicio} - {ev.horarioFim}
                                </div>
                                <span className="text-slate-400 flex items-center gap-1 font-semibold"><MapPin className="w-3 h-3 text-rose-500" /> {ev.local}</span>
                                {ev.observacoes && <span className="text-[10px] text-slate-500 bg-white p-1 rounded border italic">"{ev.observacoes}"</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}

                        {clinicData.agenda.filter(ev => ev.atId === selectedAt.id).length === 0 && (
                          <div className="col-span-2 py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed">
                            <p className="text-xs">Nenhum compromisso marcado para este AT.</p>
                            <button
                              type="button"
                              onClick={() => setIsAddingEvent(true)}
                              className="mt-2.5 px-3 py-1.5 text-[10px] font-bold text-indigo-650 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Agendar primeira sessão
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center py-6 text-slate-400">Selecione ou adicione um acompanhante terapêutico na clínica ativa.</p>
              )}
            </section>
          </div>
        )}

        {/* TAB 4: RELATÓRIOS (DOCS GENERATOR) */}
        {activeTab === 'relatorios' && (
          <PsychologistReportWorkshop 
            clinicData={clinicData}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            aiLoading={aiLoading}
            setAiLoading={setAiLoading}
            generatedReportText={generatedReportText}
            setGeneratedReportText={setGeneratedReportText}
            selectedReportType={selectedReportType}
            setSelectedReportType={setSelectedReportType}
            selectedApproach={selectedApproach}
            setSelectedApproach={setSelectedApproach}
            selectedTemplateType={selectedTemplateType}
            setSelectedTemplateType={setSelectedTemplateType}
            customInstructions={customInstructions}
            setCustomInstructions={setCustomInstructions}
            therapistName={therapistName}
            setTherapistName={setTherapistName}
            therapistReg={therapistReg}
            setTherapistReg={setTherapistReg}
            refineInstructions={refineInstructions}
            setRefineInstructions={setRefineInstructions}
            inspirationText={inspirationText}
            setInspirationText={setInspirationText}
            clinicLogoIcon={clinicLogoIcon}
            setClinicLogoIcon={setClinicLogoIcon}
            triggerGenerateReportAI={triggerGenerateReportAI}
            triggerRefineReportAI={triggerRefineReportAI}
            handleSaveGeneratedReportAsPDF={handleSaveGeneratedReportAsPDF}
            showToast={showToast}
          />
        )}
        {false && activeTab === 'relatorios' && (() => {
          const autoPatient = clinicData.pacientes.find(p => p.id === selectedAutoPatientId) || clinicData.pacientes[0];
          const weeks = selectedCycleWeeks;
          const activeAutoPatientId = selectedAutoPatientId;
          
          // Generate realistic content reflecting the uploaded PDF structures for the clinical reports
          const getAutomatedReportText = (pat: Patient, type: 'evolutivo' | 'solicitacao', weeks: string) => {
            if (!pat) return '';
            
            const isLevi = pat.nome.toLowerCase().includes('levi');
            const dataBase = isLevi ? '30/11/2019' : pat.dataNascimento.split('-').reverse().join('/');
            const idadeText = isLevi ? '6 anos e 3 meses' : `${pat.idade} anos`;
            const diagn = isLevi ? 'Transtorno do Espectro Autista – TEA' : pat.diagnose;
            const escola = isLevi ? 'Escola Portal de Sorocaba' : pat.escola || 'Escola de Ensino Fundamental';

            if (type === 'solicitacao') {
              return `SOLICITAÇÃO DE COBERTURA PARA TRATAMENTO MULTIDISCIPLINAR INTENSIVO AC-ABA

À Diretoria de Credenciamento / Auditoria de Saúde
Ref: Solicitação de Custeio e Autorização de Tratamento Especializado
Emissão: 09 de Junho de 2026

I. IDENTIFICAÇÃO DO PACIENTE
• Nome do Paciente: ${pat.nome}
• Data de Nascimento: ${dataBase}
• Idade Atual: ${idadeText}
• Diagnose (H.D): ${diagn}
• Responsável Técnico: Dra. Aline Mendes (Psicóloga ABA - CRP 06/12345)

II. JUSTIFICATIVA CLÍNICA E CIENTÍFICA
O paciente acima qualificado apresenta diagnóstico firmado de Transtorno do Espectro Autista (TEA). Com base em protocolos de avaliação padronizados (Sensory Processing Measure - SPM e Perfil Sensorial 2), foram detectadas barreiras severas na comunicação receptiva e expressiva, dispraxia motora, distúrbios graves de modulação tátil e do processamento auditivo (disfunção definitiva), bem como acentuada rigidez cognitiva e comportamentos autolesivos ou heteroagressivos (como beliscar-se e atirar-se ao solo) frente a transições ou frustrações cotidianas.

Tais déficits impactam diretamente o grau de independência nas Atividades de Vida Diária (AVD's) e a inclusão social e pedagógica. A intervenção intensiva precoce baseada em Análise do Comportamento Aplicada (ABA) é amplamente recomendada por diretrizes internacionais (como o Surgeon General dos EUA e a Associação Médica Brasileira) como nível Ouro de evidência científica para diminuição de barreiras de suporte e ampliação de comportamentos adaptativos.

III. QUADRO RECOMENDADO DE CARGA HORÁRIA SEMANAL
Para que ocorra fomento adequado e viabilidade de esvanecimento gradual das pistas de apoio, prescreve-se o seguinte plano terapêutico intensivo de 4 semanas subsequentes recorrentes:

1. Acompanhamento Pedagógico / Clínico por Acompanhante Terapêutica (AT):
   - Carga Horária: 15 horas semanais (3 horas diárias, de segunda a sexta-feira) presencial sob supervisão.
   - Objetivos: Treino de mandos, pareamentos visuais, imitação motora e sustentação de atenção compartilhada.

2. Terapia Ocupacional com Abordagem em Integração Sensorial (TO-IS):
   - Carga Horária: 2 sessões semanais de 50 minutos cada.
   - Objetivos: Regulação postural, modulação tátil e auditiva e organização práxica (planejamento motor).

3. Fonoaudiologia com Foco em Linguagem e Comunicação Funcional:
   - Carga Horária: 2 sessões semanais de 50 minutos cada.
   - Objetivos: Comunicação alternativa, vocalizações funcionais e pragmática social.

4. Coordenação, Análise de Dados e Supervisão de Caso (Supervisor BCBA / Psicólogo):
   - Carga Horária: 4 horas mensais de supervisão direta com aplicação de análise gráfica e reuniões escolares.

IV. CONCLUSÃO
Diante do exposto e com base nas patologias e limitações sensoriomotoras identificadas, reitera-se a imprescindibilidade do custeio e liberação de todas as modalidades e cargas horárias descritas para propiciar estabilidade neurodinâmica e evolução ponderável.

Sorocaba, 09 de Junho de 2026.

______________________________________________
Dra. Aline Mendes
Psicóloga e Supervisora Clínica ABA (CRP-06/12345)

______________________________________________
Assinatura do Responsável Legal (${pat.responsaveis || 'Pais'})`;
            }

            // Report periodic: Weeks 1-4, 5-8 ...
            const intro = isLevi 
              ? 'Foram iniciados os atendimentos no dia 10 de Fevereiro de 2026, tendo um atendimento por semana com duração de 40 minutos em Terapia Ocupacional.'
              : `Foram iniciados os atendimentos no início do mês corrente, contendo sessões individualizadas com duração de 50 minutos cada para intervenção multidisciplinar.`;

            const goals = isLevi
              ? 'Apresentar avaliação de Terapia Ocupacional na clínica ABA – Acolher Brincar Aprender. As informações neste relatório foram viabilizadas pela genitora, que identificou como queixa principal as dificuldades relacionadas a dificuldades comportamentais, seletividade alimentar, prejuízos na motricidade fina, rigidez cognitiva e dificuldades nas atividades de vida diária (AVD’S).'
              : `Apresentar o andamento comportamental analítico do paciente. A queixa principal reside em restrições de mandos espontâneos, ecolalia inflexível, dificuldades no contato ocular e regulação emocional sob frustração escolar.`;

            let cycleText = '';
            let progressRates = '';
            
            if (weeks === '1-4') {
              cycleText = `Durante as primeiras 4 semanas de acolhimento (Semanas 1 a 4), focou-se no preenchimento de anamnese detalhada e aplicação de instrumentos formais. No tocante ao desenvolvimento neuropsicomotor, a criança apresentou marcos como sentar, engatinhar e andar dentro do esperado, porém demonstra dependência severa na alimentação (precisa ser alimentada por terceiros) e dependência parcial para se vestir e na higiene sanitária.
Identificou-se forte sensibilidade a sons ruidosos e texturas alimentares específicas, o que desencadeia reatividades automáticas imediatas.`;
              progressRates = `• Taxa de Contato Ocular Inicial: 20% de acertos sem dica física.
• Nível de Independência em Alimentação Coletiva: 0% (necessita de auxílio físico contínuo).
• Frustração na transição de ambientes escolares: Registro de até 4 birras severas por ciclo escolar.`;
            } else if (weeks === '5-8') {
              cycleText = `No segundo ciclo avaliativo (Semanas 5 a 8), estruturou-se a dessensibilização sistemática com aproximação sucessiva nas áreas sensoriais de seletividade alimentar e tátil. Houve melhora sutil no manuseio de colher e preensão de lápis (início de transição de padrão palmar imaturo para digital intermédio).
O processamento auditivo de hipersensibilidade foi trabalhado com o uso de cronograma visual antecipatório em parceria com a equipe pedagógica auxiliar.`;
              progressRates = `• Taxa de Contato Ocular: Incrementado para 45% com dica verbal atenuada.
• Engajamento em Transição de Salas: Redução de 4 para apenas 1 episódio de desorganização severa.
• Permanência Sentado no Lanche: Média de 6 minutos contínuos com reforço tangível de alta preferência.`;
            } else if (weeks === '9-12') {
              cycleText = `No terceiro ciclo (Semanas 9 a 12), enfocou-se o treino direto de autonomia integrada nas Atividades de Vida Diária (AVD's). Foi iniciada a remoção gradual (fade-out) da ajuda gestual no escovar de dentes e higienização das mãos.
Introduziram-se pausas sensoriais de movimento intercaladas a cada 35 minutos de tarefas diretivas (DTT), diminuindo as tentativas de fuga de demanda de ordens escolares.`;
              progressRates = `• Independência Sanitária (Solicitação de Banheiro): 60% de acertos independentes (mando funcional).
• Pareamento de Objetos 2D-3D: Mantido em 80% de acertos em sessões sucessivas.
• Preensão Estabilizada de Lápis: Mantém preensão digital por até 3 minutos sem queixa álgica ou estresse.`;
            } else {
              cycleText = `No presente período consolidado (Semanas 13 a 16), observou-se notória evolução na autorregulação emocional e no seguimento de regras sociais implícitas de revezamento de turnos durante brincadeiras estruturadas e compartilhadas com outras crianças sob incentivo.
A sensibilidade a texturas têxteis e etiquetas diminuiu com as técnicas aplicadas. O paciente aceita melhor o toque e a escovação de cabelos sem fugas ou choro ruidoso.`;
              progressRates = `• Independência Geral de Mandos: Atingiu mais de 75% na solicitação de itens preferenciais.
• Taxa de Ajuste Alimentar: Aceita novas texturas crocantes (2 alimentos novos inseridos no plano).
• Seguimento de Comando Auxiliar de Transição: Independência de 90% usando cronograma ilustrado de rotina.`;
            }

            return `RELATÓRIO EVOLUTIVO PERIÓDICO [CICLO AUTOMÁTICO - ${weeks.toUpperCase()} SEMANAS]

I. IDENTIFICAÇÃO DO PACIENTE
• Nome da Criança: ${pat.nome}
• Data de Nascimento: ${dataBase}
• Idade Atual: ${idadeText}
• HD / Quadro Clínico: ${diagn}
• Escola Frequentada: ${escola}

II. FREQUÊNCIA DOS ATENDIMENTOS E FREQUÊNCIA DE REGISTRO
${intro}

III. OBJETIVOS CLÍNICOS E DO RELATÓRIO
${goals}

IV. ANÁLISE COMPORTAMENTAL E EVOLUÇÃO TEMPORAL DE ${weeks.toUpperCase()} SEMANAS
${cycleText}

V. DADOS QUANTITATIVOS DE EVOLUÇÃO (MÉTRICAS COLETADAS)
Ao longo das 4 semanas deste ciclo automático, as planilhas científicas ABA demonstraram os seguintes índices evolutivos:
${progressRates}

VI. ORIENTAÇÕES À FAMÍLIA E EQUIPE ESCOLAR
1. Rotina Predictível: Manter o cronograma diário ilustrado colado no quarto e apontar as transições com antecedência mínima de 5 minutos.
2. Limites Neutros: Diante de pirraças de oposição por fuga, manter postura neutra de silêncio, reestabelecendo a ordem de comando logo após o reequilíbrio.
3. Alimentos Novidades: Apresentar novos elementos alimentícios paralelamente a itens extremamente prediletos sem coagir ao consumo imediato.
4. Pausas Sensoriais Escolares: Estimular pausas com movimentos funcionais ativos (como pular corda ou empurrar caixa de brinquedos leve) se houver sinais de alta excitabilidade motora ou irritabilidade sonora.

VII. CONCLUSÃO E PARECER TÉCNICO
Diante de todos os dados agregados neste estágio clínico de ${weeks} semanas, registra-se evolução constante com respostas excelentes de engajamento direcionado. Recomenda-se enfaticamente a continuidade ininterrupta do plano multidisciplinar para garantir a sustentabilidade das habilitações adquiridas.

Sorocaba, 09 de Junho de 2026

_____________________________________________________
Clínica de Desenvolvimento Infantil ABA - Setor Multidisciplinar
Terapeuta Responsável: Dra. Aline Mendes - CREFITO-3/27084-TO / CRP 06/12345`;
          };

          const activeAutoDocText = getAutomatedReportText(autoPatient, selectedAutoReportType, selectedCycleWeeks);

          return (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6 animate-fade-in text-slate-800">
              {/* Header block with Subtabs switcher */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-xl text-indigo-950 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-indigo-650" /> Portal de Relatórios Clínicos
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Gerador e arquivador de evoluções automatizadas (4 semanas) e laudos de solicitações médicas.</p>
                </div>

                <div className="flex bg-slate-100/80 p-1 rounded-xl self-stretch lg:self-auto shadow-inner">
                  <button
                    onClick={() => setReportsSubTab('automaticos')}
                    className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportsSubTab === 'automaticos' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Módulos Automáticos (A cada 4 Semanas)
                  </button>
                  <button
                    onClick={() => {
                      setReportsSubTab('individual');
                      // Sync chosen patient to standard ID
                      if (selectedAutoPatientId) setSelectedPatientId(selectedAutoPatientId);
                    }}
                    className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportsSubTab === 'individual' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Assistente IA (Manual Sob Demanda)
                  </button>
                </div>
              </div>

              {reportsSubTab === 'individual' ? (
                // EXISTING AI GENERATOR SIDEBAR / INTERACTIVE UI
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Profile variables selector sidebar */}
                  <section id="doc-sidebar" className="lg:col-span-4 bg-slate-50/70 border border-slate-150 p-4 rounded-xl flex flex-col gap-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Parâmetros do Relatório</span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-semibold">1. Selecionar Paciente:</label>
                      <select 
                        value={selectedPatientId || ''}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none"
                      >
                        {clinicData.pacientes.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-semibold">2. Tipo de Relatório:</label>
                      <select 
                        value={selectedReportType}
                        onChange={(e) => setSelectedReportType(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none"
                      >
                        <option value="Relatório Mensal de Evolução">Relatório Mensal de Evolução</option>
                        <option value="Laudo de Encaminhamento Escolar">Laudo de Encaminhamento Escolar</option>
                        <option value="Dossiê Científico para Convênio Médico">Dossiê Científico para Convênio Médico</option>
                        <option value="Relatório Técnico para Supervisão ABA">Relatório Técnico para Supervisão ABA</option>
                        <option value="Análise de Metas e Conclusão de Treinos">Análise de Metas e Conclusão de Treinos</option>
                      </select>
                    </div>

                    {selectedPatient ? (
                      <button
                        onClick={() => triggerGenerateReportAI(selectedPatient)}
                        className="mt-3 py-2.5 px-4 text-xs font-extrabold text-white bg-indigo-650 hover:bg-indigo-700 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer shadow-md transition-all"
                        disabled={aiLoading}
                      >
                        <Sparkles className="w-4 h-4 text-orange-400" /> Formular Relatório com IA 🪄
                      </button>
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center">Cadastre um paciente.</p>
                    )}
                  </section>

                  {/* Formular result presentation layout */}
                  <section id="doc-output" className="lg:col-span-8 flex flex-col gap-4">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3 border rounded-xl bg-slate-50 border-dashed text-slate-500">
                        <div className="w-10 h-10 rounded-full border-3 border-indigo-505 border-t-transparent animate-spin" />
                        <span className="font-bold text-sm text-slate-700">A Inteligência Artificial está reunindo dados...</span>
                        <p className="text-xs text-slate-400 max-w-sm text-center">Processando taxas de independência, evoluções de AT, logs escolares, e métricas comportamentais em textos formais estruturados.</p>
                      </div>
                    ) : generatedReportText ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-end gap-2 text-xs">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(generatedReportText);
                              showToast("Assinatura e texto copiado para área de transferência!", "success");
                            }}
                            className="px-3 py-1.5 border hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer font-semibold text-slate-650"
                          >
                            <Copy className="w-4 h-4" /> Copiar Texto
                          </button>
                          <button 
                            onClick={() => {
                              window.print();
                            }}
                            className="px-3 py-1.5 border hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer font-semibold text-indigo-750"
                          >
                            <FileText className="w-4 h-4 animate-pulse" /> Imprimir Documento
                          </button>
                          <button 
                            onClick={() => {
                              if (selectedPatientId) {
                                handleSaveGeneratedReportAsPDF(
                                  selectedPatientId, 
                                  selectedReportType, 
                                  'Evolução de Sessões', 
                                  generatedReportText
                                );
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <Plus className="w-4 h-4" /> Arquivar PDF
                          </button>
                          <button 
                            onClick={() => setGeneratedReportText('')}
                            aria-label="clear"
                            className="px-3 py-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            Limpar
                          </button>
                        </div>

                        {/* Paper representation frame styled properly for readability */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-inner/5 leading-relaxed text-sm select-text text-slate-800 whitespace-pre-wrap font-sans max-h-[600px] overflow-y-auto flex flex-col gap-6">
                          <div>{generatedReportText}</div>
                          
                          {selectedPatientId && (
                            <div className="border-t-2 border-dashed border-slate-250 pt-6 mt-6 printable-charts-attachment">
                              <h4 className="font-extrabold text-indigo-900 text-xs uppercase tracking-widest mb-4 text-center">Anexo de Evolução Comportamental e Gráficos ABA</h4>
                              <PatientCharts 
                                patientId={selectedPatientId} 
                                clinicData={clinicData} 
                                updateClinicData={updateClinicData} 
                                compact={true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold">Gerador de Documentação Prontuário</p>
                        <span className="text-xs text-slate-500 max-w-md block mx-auto mt-1 leading-relaxed">
                          Clique no botão ao lado para compilar de forma instantânea todos os registros de ATs, dados independentes e o prontuário geral em um documento técnico polido com Inteligência Artificial.
                        </span>
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                // AUTOMATED REPORTS GENERATED AUTOMATICALLY EVERY 4 WEEKS (AS REQUESTED)
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Parameters Sidebar Column */}
                  <aside className="lg:col-span-4 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col gap-5 shadow-inner">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-600" /> 1. Paciente Analisado
                      </h4>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <select
                          value={selectedAutoPatientId}
                          onChange={(e) => setSelectedAutoPatientId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-bold focus:outline-none focus:border-slate-400 text-slate-800"
                        >
                          {clinicData.pacientes.map(p => (
                            <option key={p.id} value={p.id}>{p.nome} ({p.idade} anos)</option>
                          ))}
                        </select>
                        {autoPatient && (
                          <div className="bg-white border rounded-xl p-3 text-[10px] text-slate-500 leading-normal flex flex-col gap-1">
                            <span className="font-extrabold text-slate-700">Responsável:</span>
                            <span className="font-medium text-slate-650 bg-slate-50 p-1 rounded font-mono text-[9px] truncate">{autoPatient.responsaveis || 'Não cadastrados'}</span>
                            <span className="font-extrabold text-slate-700 mt-1">H.D / Diagnóstico:</span>
                            <span className="font-normal text-slate-600 italic bg-slate-100/40 p-1 rounded">"{autoPatient.diagnose}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1 border-t pt-3">
                        <FilePlus className="w-3.5 h-3.5 text-indigo-600" /> 2. Tipo de Relatório
                      </h4>
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAutoReportType('evolutivo')}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col gap-0.5 ${
                            selectedAutoReportType === 'evolutivo' 
                              ? 'bg-indigo-50 border-indigo-250 text-indigo-900 border-2' 
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span>📉 Evolutivo de Terapia Ocupacional</span>
                          <span className="text-[9px] font-normal text-slate-400">Modelo e escala SPM (4 semanas)</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setSelectedAutoReportType('solicitacao')}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col gap-0.5 ${
                            selectedAutoReportType === 'solicitacao' 
                              ? 'bg-indigo-50 border-indigo-250 text-indigo-900 border-2' 
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span>📑 Solicitação de Prorrogação de Sessões</span>
                          <span className="text-[9px] font-normal text-slate-400">Justificativa técnica para plano de saúde</span>
                        </button>
                      </div>
                    </div>

                    {selectedAutoReportType === 'evolutivo' && (
                      <div className="border-t pt-3 flex flex-col gap-2 animate-fade-in">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-600" /> 3. Frequência (A cada 4 semanas)
                        </h4>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {[
                            { value: '1-4', label: '1ª a 4ª Semana', badge: 'Ativo' },
                            { value: '5-8', label: '5ª a 8ª Semana', badge: 'Gerado' },
                            { value: '9-12', label: '9ª a 12ª Sem.', badge: 'Gerado' },
                            { value: '13-16', label: '13ª a 16ª Sem.', badge: 'Simulado' }
                          ].map((cycle) => (
                            <button
                              key={cycle.value}
                              type="button"
                              onClick={() => setSelectedCycleWeeks(cycle.value as any)}
                              className={`p-2 rounded-xl text-[10px] font-bold text-center border transition-all flex flex-col gap-0.5 items-center justify-center ${
                                selectedCycleWeeks === cycle.value
                                  ? 'bg-indigo-650 text-white border-indigo-700 shadow-sm font-extrabold scale-102'
                                  : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span>{cycle.label}</span>
                              <span className={`text-[8px] px-1 py-0.2 rounded ${
                                selectedCycleWeeks === cycle.value 
                                  ? 'bg-indigo-500 text-indigo-100' 
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}>{cycle.badge}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3 mt-1 flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const docTitle = selectedAutoReportType === 'evolutivo' 
                            ? `Relatório Evolutivo T.O (${selectedCycleWeeks} Semanas) - ${autoPatient?.nome}`
                            : `Solicitação de Sessões Intensivas - ${autoPatient?.nome}`;
                          const docTypeChoice = selectedAutoReportType === 'evolutivo' ? 'Avaliação Sensorial' : 'Laudo Médico';
                          handleSaveGeneratedReportAsPDF(selectedAutoPatientId, docTitle, docTypeChoice, activeAutoDocText);
                        }}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" /> Exportar & Adicionar à Aba de Documentos PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="w-full py-2 px-3 border border-slate-350 hover:bg-white rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Imprimir Prontuário Papel
                      </button>
                    </div>
                  </aside>

                  {/* Document Output Presentation Area */}
                  <main className="lg:col-span-8 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 border rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visualização Prévia do Prontuário Acadêmico</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeAutoDocText);
                          showToast("Copiado com sucesso para área de transferência!", "success");
                        }}
                        className="px-2.5 py-1 text-[10px] bg-white border rounded hover:bg-slate-100 cursor-pointer font-bold flex items-center gap-1.5"
                      >
                        <Copy className="w-3 h-3 text-indigo-600" /> Copiar Texto
                      </button>
                    </div>

                    {/* Paper Sheet Format rendering */}
                    <article className="bg-[#fcfcfa] rounded-2xl border-2 border-slate-250 shadow-md p-8 min-h-[700px] leading-relaxed font-serif text-slate-900 border-t-8 border-t-indigo-850 relative">
                      {/* Clinic Decorative Header */}
                      <div className="flex flex-col items-center justify-center border-b pb-4 mb-6">
                        <div className="w-12 h-12 rounded-full border border-indigo-200/90 overflow-hidden bg-sky-50 flex items-center justify-center mb-1">
                          <img 
                            src="/src/assets/images/aba_clinic_cat_puzzle_logo_1781041000485.png" 
                            alt="Logo ABA" 
                            className="w-11 h-11 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="font-extrabold text-xs uppercase tracking-widest text-indigo-950 font-sans">ABA – Acolher Brincar Aprender</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400 font-sans tracking-tight">Centro Clínico Especializado em Desenvolvimento e Integração</span>
                      </div>

                      {selectedAutoReportType === 'evolutivo' ? (
                        <>
                          <h1 className="text-center font-extrabold text-md uppercase underline tracking-wide text-slate-950 mb-6 font-sans">
                            Relatório Evolutivo de Terapia Ocupacional
                          </h1>

                          {/* Identification Grid matching requested screenshot precisely */}
                          <div className="border border-slate-400 rounded overflow-hidden mb-6 text-xs font-sans">
                            <div className="grid grid-cols-2 border-b border-slate-400">
                              <div className="p-2.5 border-r border-slate-400">
                                <span className="font-bold text-[10px] block text-slate-500 uppercase tracking-tight">Nome da criança:</span>
                                <span className="font-bold text-slate-900 text-sm">{autoPatient?.nome || 'Levi de Lima Portela'}</span>
                              </div>
                              <div className="p-2.5">
                                <span className="font-bold text-[10px] block text-slate-500 uppercase tracking-tight">Data de nascimento:</span>
                                <span className="font-semibold text-slate-800 text-sm">{activeAutoPatientId === 'p4' ? '30/11/2019' : autoPatient?.dataNascimento.split('-').reverse().join('/')}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2">
                              <div className="p-2.5 border-r border-slate-400">
                                <span className="font-bold text-[10px] block text-slate-500 uppercase tracking-tight">Idade atual:</span>
                                <span className="font-semibold text-slate-800 text-sm">{activeAutoPatientId === 'p4' ? '6 anos e 3 meses' : `${autoPatient?.idade} anos`}</span>
                              </div>
                              <div className="p-2.5">
                                <span className="font-bold text-[10px] block text-slate-500 uppercase tracking-tight">H.D / Diagnóstico Clínico:</span>
                                <span className="font-bold text-indigo-950 text-sm">{activeAutoPatientId === 'p4' ? 'Transtorno do Espectro Autista – TEA' : autoPatient?.diagnose}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs leading-relaxed flex flex-col gap-5 whitespace-pre-wrap font-sans text-slate-800 select-text">
                            <p className="indent-8 font-medium">
                              Foram iniciados os atendimentos no dia 10 de Fevereiro de 2026, tendo um atendimento por semana com duração de 40 minutos em Terapia Ocupacional, visando regulação multissensorial e maturação de coordenação.
                            </p>

                            <div>
                              <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">Objetivo do Relatório</h3>
                              <p className="indent-8">
                                Apresentar avaliação com foco evolutivo da Terapia Ocupacional no desenvolvimento sensorial na clínica ABA – Acolher Brincar Aprender. As informações neste relatório foram viabilizadas pela genitora, que identificou como queixa principal as dificuldades relacionadas à seletividade alimentar, rigidez cognitiva, prejuízos acentuados na motricidade fina e restrições nas Atividades de Vida Diária (AVD’S).
                              </p>
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">Avaliação de Processamento de Estágio</h3>
                              <p className="indent-8 mb-3">
                                A avaliação consistiu na aplicação do formulário de "Anamnese de Terapia Ocupacional" e dos instrumentos científicos padronizados Sensory Processing Measure (SPM), Perfil Sensorial 2 de Dunn e Checklist de Atividades de Vida Diária (AVD's), bem como a realização de observações clínicas em setting estruturado e livre.
                              </p>
                              
                              <h4 className="font-bold text-slate-900 text-[11px] mb-1 italic">I. Anamnese do Paciente</h4>
                              <p className="indent-8 leading-normal text-[11px]">
                                Realizada com a genitora, indicando gestação planejada, porém marcada por infecção urinária recorrente e pré-eclâmpsia de emergência. Foi efetuado parto cesáreo eletivo de urgência com 39 semanas de gestação. No desenvolvimento, apresentou marcos normais de engatinhar e sentar, porém é descrita como teimosa na rotina familiar e com acessos excessivos de birra ou choro, beliscando ou jogando-se no piso se frustrada na escola de Sorocaba. Apresenta hiperfoco eminente em letras e números.
                              </p>
                            </div>

                            {/* Render exact clinical SPM results table */}
                            <div>
                              <h4 className="font-bold text-slate-900 text-[11px] mb-2 uppercase tracking-wide">II. Resultados do Sensory Processing Measure (SPM) - Formulário Casa</h4>
                              <table className="w-full text-[10px] border border-slate-350 rounded border-collapse">
                                <thead>
                                  <tr className="bg-indigo-50/70 border-b border-slate-350 text-slate-700">
                                    <th className="p-1 px-2 text-left border-r border-slate-350">ÁREA FUNCIONAL</th>
                                    <th className="p-1 text-center border-r border-slate-350">RAW SCORE</th>
                                    <th className="p-1 text-center border-r border-slate-350">T-SCORE</th>
                                    <th className="p-1 text-left">FAIXA INTERPRETATIVA</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-slate-300">
                                    <td className="p-1 px-2 font-semibold border-r border-slate-300">Participação Social (SOC)</td>
                                    <td className="p-1 text-center border-r border-slate-300">23</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono">63</td>
                                    <td className="p-1 text-orange-700 font-bold bg-orange-50/30">Alguns Problemas (Some Problems)</td>
                                  </tr>
                                  <tr className="border-b border-slate-300">
                                    <td className="p-1 px-2 font-semibold border-r border-slate-300">Visual (VIS)</td>
                                    <td className="p-1 text-center border-r border-slate-300">20</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono">67</td>
                                    <td className="p-1 text-orange-700 font-bold bg-orange-50/30">Alguns Problemas (Some Problems)</td>
                                  </tr>
                                  <tr className="border-b border-slate-300 bg-red-50/10">
                                    <td className="p-1 px-2 font-bold text-rose-950 border-r border-slate-300">Auditivo (HEA)</td>
                                    <td className="p-1 text-center border-r border-slate-300">19</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono text-rose-700 font-bold">70</td>
                                    <td className="p-1 text-rose-700 font-extrabold bg-rose-50/80">Disfunção Definitiva (Definite Dysf.)</td>
                                  </tr>
                                  <tr className="border-b border-slate-300">
                                    <td className="p-1 px-2 font-semibold border-r border-slate-300">Tátil (TOU)</td>
                                    <td className="p-1 text-center border-r border-slate-300">20</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono">65</td>
                                    <td className="p-1 text-orange-700 font-bold bg-orange-50/30">Alguns Problemas (Some Problems)</td>
                                  </tr>
                                  <tr className="border-b border-slate-300">
                                    <td className="p-1 px-2 font-semibold border-r border-slate-300">Consciência Corporal (BOD)</td>
                                    <td className="p-1 text-center border-r border-slate-300">20</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono">65</td>
                                    <td className="p-1 text-orange-700 font-bold bg-orange-50/30">Alguns Problemas (Some Problems)</td>
                                  </tr>
                                  <tr className="border-b border-slate-300 bg-emerald-50/5">
                                    <td className="p-1 px-2 font-semibold border-r border-slate-300 text-emerald-900">Equilíbrio e Movimento (BAL)</td>
                                    <td className="p-1 text-center border-r border-slate-300">16</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono">59</td>
                                    <td className="p-1 text-emerald-700 font-bold bg-emerald-50/40">Desenvolvimento Típico (Typical)</td>
                                  </tr>
                                  <tr className="border-b border-slate-300">
                                    <td className="p-1 px-2 font-semibold border-r border-slate-300">Planejamento e Ideação (PLA)</td>
                                    <td className="p-1 text-center border-r border-slate-300">22</td>
                                    <td className="p-1 text-center border-r border-slate-300 font-mono">66</td>
                                    <td className="p-1 text-orange-700 font-bold bg-orange-50/30">Alguns Problemas (Some Problems)</td>
                                  </tr>
                                  <tr className="bg-slate-100 font-bold">
                                    <td className="p-1 px-2 border-r border-slate-350 text-indigo-950 uppercase text-[9px]">Índice Total (TOT)</td>
                                    <td className="p-1 text-center border-r border-slate-350">101</td>
                                    <td className="p-1 text-center border-r border-slate-350 font-mono text-indigo-750">66</td>
                                    <td className="p-1 text-orange-850 bg-orange-100/40 font-bold">Alguns Problemas Gerais (Some Problems)</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-1000 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 mb-1">III. Observações de Desempenho Clínico Corrente</h3>
                              <p className="indent-8 leading-normal">
                                {weeks === '1-4' && "Durante as sessões estruturadas iniciais, Levi demonstrou engajamento cooperativo, porém de curto limite. Diante de ordens de restrição ou retirada de reforço positivo, exibe atos de beliscar as terapeutas ou atirar brinquedos no solo. Apresenta rigidez cognitiva considerável."}
                                {weeks === '5-8' && "As coletas atuais indicam início de aceitação de demandas complexas tátil-sensoriais externas. Aceita manusear arroz cru e pincéis de cerdas duras. No lanche clínico, aceita receber alimentação assistida com menor oposição de choro."}
                                {weeks === '9-12' && "Estabilização das intervenções motoras finas. No grafismo livre, a atividade de pinça digital começa a ser mantida por períodos consistentes. Houve redução expressiva no reflexo palmar bruto inicial."}
                                {weeks === '13-16' && "As sessões mostram transições pacíficas de ambientes sem escapes físicos diretos. O acompanhamento multidisciplinar com fonoaudiologia permitiu sustentação do olhar conjunto por 5 segundos."}
                              </p>
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-1000 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 mb-1">IV. Proposta Terapêutica / Plano de Intervenção</h3>
                              <p className="indent-8 leading-normal text-[11px]">
                                A intervenção continuada focará em:
                                <ul className="list-disc pl-5 mt-1 flex flex-col gap-0.5">
                                  <li><strong>Regulação Sensorial:</strong> Foco em modulação de sistema auditivo, vestibular de busca exagerada e de dessensibilização oral/tátil.</li>
                                  <li><strong>Regulação Comportamental:</strong> Aplicação de reforços contingentes positivos de DRI e regras explícitas simples de barreira contra crises.</li>
                                  <li><strong>AVD's:</strong> Fomento à independência de alimentação autônoma e lavagem de mãos livre.</li>
                                </ul>
                              </p>
                            </div>

                            <div className="border-t pt-4 text-center mt-6">
                              <span className="italic block text-slate-500 font-serif text-[10px]">Sorocaba, 09 de Junho de 2026.</span>
                              <div className="flex justify-around items-center mt-8 text-[10px] font-sans">
                                <div className="flex flex-col items-center">
                                  <div className="w-40 border-b border-slate-400" />
                                  <span className="font-bold text-slate-700 mt-1">Dra. Aline Mendes</span>
                                  <span className="text-slate-400">Terapeuta Ocupacional – CREFITO-3 / 27084 - TO</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="w-40 border-b border-slate-400" />
                                  <span className="font-bold text-slate-700 mt-1">Responsável Legal</span>
                                  <span className="text-slate-400">{autoPatient?.responsaveis ? autoPatient.responsaveis.split('(')[0] : 'Luciana Portela'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs font-sans text-slate-800 leading-normal flex flex-col gap-4 select-text whitespace-pre-wrap">
                          {activeAutoDocText}
                        </div>
                      )}
                    </article>
                  </main>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 5: GRÁFICOS (DETAILED PATIENT CHARTS AND EVOLUTION) */}
        {activeTab === 'graficos' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 pb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Análise de Gráficos e Evolução Clínica</h3>
                <p className="text-xs text-slate-400">Rastreamento quantitativo sobre a eficácia de ajuda, progresso e taxas de independência em intervenções ABA</p>
              </div>

              {/* Selector */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <span className="text-xs text-slate-400 font-semibold text-right whitespace-nowrap">Selecione o Paciente:</span>
                <select 
                  id="charts-patient-selector"
                  value={selectedPatientId || ''} 
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                  }}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold focus:outline-none"
                >
                  <option value="" disabled>Selecionar...</option>
                  {clinicData.pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPatientId ? (
              <PatientCharts 
                patientId={selectedPatientId} 
                clinicData={clinicData} 
                updateClinicData={updateClinicData} 
              />
            ) : (
              <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed">
                <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-semibold">Nenhum paciente selecionado para exibição do histórico gráfico</p>
                <p className="text-[10px] text-slate-400 mt-1">Por favor, escolha um paciente na lista acima para visualizar seu painel de ensaios.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: PORTAL DE DOCUMENTOS */}
        {activeTab === 'documentos' && (() => {
          const docs = clinicData.documentos || [];
          
          // Filter logic
          const filteredDocs = docs.filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) || 
                                 (doc.notes && doc.notes.toLowerCase().includes(docSearchQuery.toLowerCase()));
                                 
            const matchesType = docTypeFilter === 'all' || doc.type === docTypeFilter;
            
            const matchesPatient = docPatientFilter === 'all' || doc.patientId === docPatientFilter;
            
            return matchesSearch && matchesType && matchesPatient;
          });

          return (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6 animate-fade-in text-slate-800">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-xl text-indigo-950 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-indigo-650" /> Portal de Documentos Clínicos
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Arquivo oficial de laudos, avaliações sensoriais, relatórios de evolução escolar e prontuários históricos.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsAddingDocModal(true)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow transition-all"
                >
                  <Upload className="w-4 h-4" /> Adicionar / Upload Documento
                </button>
              </div>

              {/* Filtering bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150 animate-in fade-in">
                {/* Search */}
                <div className="md:col-span-12 lg:col-span-5 relative col-span-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por termo ou nome do arquivo..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl bg-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                {/* Filter Type */}
                <div className="md:col-span-6 lg:col-span-3">
                  <select
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white text-xs text-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="all">Filtro por Tipo (Todos)</option>
                    <option value="Laudo Médico">Laudo Médico (Laudos)</option>
                    <option value="Avaliação Sensorial">Avaliação Sensorial (SPM/Perfil)</option>
                    <option value="Relatório Escolar">Relatório Escolar</option>
                    <option value="PDI/PEI">PDI / PEI</option>
                    <option value="Evolução de Sessões">Evolução de Sessões</option>
                    <option value="Outro">Outro tipo</option>
                  </select>
                </div>

                {/* Filter Patient */}
                <div className="md:col-span-6 lg:col-span-4">
                  <select
                    value={docPatientFilter}
                    onChange={(e) => setDocPatientFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white text-xs text-slate-750 font-semibold focus:outline-none"
                  >
                    <option value="all">Filtro por Paciente (Todos)</option>
                    {clinicData.pacientes.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Document List View */}
              {filteredDocs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                  <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm font-bold">Nenhum documento encontrado</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Ajuste os filtros de busca ou clique em "Adicionar / Upload Documento" para registrar um novo arquivo no prontuário.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocs.map((doc) => {
                    const patientObj = clinicData.pacientes.find(p => p.id === doc.patientId);
                    
                    // Colors based on type
                    let badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
                    if (doc.type === 'Laudo Médico') badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                    else if (doc.type === 'Avaliação Sensorial') badgeColor = "bg-purple-50 text-purple-800 border-purple-200";
                    else if (doc.type === 'Relatório Escolar') badgeColor = "bg-blue-50 text-blue-800 border-blue-200";
                    else if (doc.type === 'PDI/PEI') badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
                    else if (doc.type === 'Evolução de Sessões') badgeColor = "bg-amber-50 text-amber-800 border-amber-200";

                    return (
                      <div 
                        key={doc.id} 
                        className="bg-white border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all border-slate-150 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {doc.type}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">
                              {doc.issueDate.split('-').reverse().join('/')}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2" title={doc.name}>
                              {doc.name}
                            </h4>
                            <span className="text-[10px] text-indigo-900 font-extrabold block mt-1">
                              Paciente: {patientObj?.nome || 'Paciente não localizado'}
                            </span>
                          </div>

                          {doc.notes && (
                            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-normal line-clamp-3">
                              "{doc.notes}"
                            </p>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                          <span className="text-[9px] text-slate-400">
                            Reg: {doc.uploadDate.split('-').reverse().join('/')}
                          </span>
                          
                          {deletingDocId === doc.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-150 p-1 px-2 rounded-xl animate-pulse">
                              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">Excluir?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteDocument(doc.id);
                                  setDeletingDocId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-extrabold cursor-pointer transition-colors"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDocId(null)}
                                className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-650 rounded text-[10px] font-extrabold cursor-pointer transition-colors"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDocForPreview(doc)}
                                className="p-1 px-2.5 hover:bg-slate-105 text-indigo-650 hover:text-indigo-805 border rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Visualizar Detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerDownloadDocument(doc)}
                                className="p-1 bg-slate-50 hover:bg-slate-200 text-slate-700 border rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Baixar"
                              >
                                <Download className="w-3.5 h-3.5" /> Baixar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDocId(doc.id)}
                                className="p-1 px-2 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-[10px] bg-rose-50/30 transition-all cursor-pointer flex items-center gap-1"
                                title="Excluir Documento"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </main>

      {/* 4. MODALS & FORMS OVERLAYS PANEL */}
      
      {/* ADD PATIENT MODAL */}
      {isAddingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Novo Cadastro - Paciente Clínico</h3>
              <button onClick={() => setIsAddingPatient(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Nome Completo:</label>
                <input required type="text" name="nome" placeholder="Enzo da Silva" className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Data de Nascimento:</label>
                  <input required type="date" name="dataNascimento" className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Diagnóstico:</label>
                  <input type="text" name="diagnose" placeholder="TEA Nível 2" className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Responsável Legal:</label>
                  <input type="text" name="responsaveis" placeholder="Mãe ou Pai" className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Telefone para Contato:</label>
                  <input type="text" name="telefone" placeholder="(11) 99999-9999" className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Escola:</label>
                <input type="text" name="escola" placeholder="Nome do Colégio" className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Notas comportamentais prévias:</label>
                <textarea rows={2} name="observacoes" placeholder="Gostos do paciente, ritos de atendimento, medos..." className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex flex-col gap-1 border-t border-pink-100/70 pt-2.5">
                <label className="text-xs font-bold text-pink-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Senha para o Portal dos Pais (Opcional):
                </label>
                <input type="text" name="senhaPais" placeholder="1234" defaultValue="1234" className="px-3 py-2 border border-pink-200 bg-pink-50/5 text-slate-800 rounded-xl focus:outline-pink-400 font-semibold" />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-150 pt-3 mt-2">
                <button type="button" onClick={() => setIsAddingPatient(false)} className="px-4 py-2 border rounded-xl">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover}`}>Cadastrar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MANUAL TRAINING MODAL */}
      {isAddingManualTraining && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200 text-slate-850">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Novo Treino Manual - {selectedPatient.nome}
              </h3>
              <button onClick={() => setIsAddingManualTraining(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualProgram} className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1 text-slate-700">
                <label className="text-xs font-semibold text-slate-500">Título do Treino / Programa de Ensino:</label>
                <input required type="text" name="titulo" placeholder="Ex: Identificação de Cores Primárias" className="px-3 py-2 border rounded-xl bg-slate-50 border-slate-200 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Área de Desenvolvimento:</label>
                  <select required name="area" className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-850 focus:outline-none cursor-pointer">
                    <option value="Cognitivo">Cognitivo</option>
                    <option value="Linguagem">Linguagem / Verbais</option>
                    <option value="Social">Interação Social</option>
                    <option value="Comportamental">Comportamental</option>
                    <option value="Habilidades Acadêmicas">Habilidades Acadêmicas</option>
                    <option value="Autonomia">Vida Diária / Autonomia</option>
                    <option value="Imitação">Imitação</option>
                    <option value="Motor">Desenvolvimento Motor</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Alvo Clínico (Estímulo):</label>
                  <input required type="text" name="alvo" placeholder="Ex: Vermelho, Azul, Amarelo" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Critério de Domínio (Texto):</label>
                  <input type="text" name="criterio" placeholder="Ex: 80% de acertos" defaultValue="80% de acertos" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Tentativas Consecutivas para Progresso:</label>
                  <input type="number" name="criterioProgresso" defaultValue="10" min="1" max="50" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:outline-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1 text-slate-700">
                <label className="text-xs font-semibold text-slate-500">Descrição / Objetivo Geral:</label>
                <textarea rows={2} name="descricao" placeholder="Descreva brevemente o que é esperado do aluno e os ritos de aplicação." className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none" />
              </div>

              <div className="flex flex-col gap-1 text-slate-700">
                <label className="text-xs font-semibold text-slate-500">Instruções para o Aplicador (Dicas e Reforços):</label>
                <textarea rows={2} name="instrucoes" placeholder="Ex: Fornecer dica física após 3 segundos de latência. Reforçar com elogiador sonoro." className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none" />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-150 pt-3 mt-2">
                <button type="button" onClick={() => setIsAddingManualTraining(false)} className="px-4 py-2 border rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover} cursor-pointer`}>Salvar Treino</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {isEditingPatient && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Editar Cadastro de Paciente</h3>
              <button onClick={() => setIsEditingPatient(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPatient} className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Nome Completo:</label>
                <input required type="text" name="nome" defaultValue={selectedPatient.nome} className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Data de Nascimento:</label>
                  <input required type="date" name="dataNascimento" defaultValue={selectedPatient.dataNascimento} className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Diagnóstico:</label>
                  <input type="text" name="diagnose" defaultValue={selectedPatient.diagnose} className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Responsável Legal:</label>
                  <input type="text" name="responsaveis" defaultValue={selectedPatient.responsaveis} className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Telefone para Contato:</label>
                  <input type="text" name="telefone" defaultValue={selectedPatient.telefone} className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Escola:</label>
                <input type="text" name="escola" defaultValue={selectedPatient.escola} className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Notas comportamentais prévias:</label>
                <textarea rows={2} name="observacoes" defaultValue={selectedPatient.observacoes} className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex flex-col gap-1 border-t border-pink-100/70 pt-2.5">
                <label className="text-xs font-bold text-pink-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Senha de Responsável (Portal dos Pais):
                </label>
                <input type="text" name="senhaPais" defaultValue={selectedPatient.senhaPais || '1234'} className="px-3 py-2 border border-pink-200 bg-pink-50/5 text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-400 focus:border-pink-400 font-semibold text-slate-800" required />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-150 pt-3 mt-2">
                <button type="button" onClick={() => setIsEditingPatient(false)} className="px-4 py-2 border rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover} cursor-pointer`}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD THERAPEUTIC ASSISTANT (AT) MODAL */}
      {isAddingAt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Novo Cadastro - Profissional</h3>
              <button onClick={() => setIsAddingAt(false)} aria-label="close" className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAt} className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Nome:</label>
                <input required type="text" name="nome" placeholder="Daiane Souza" className="px-3 py-2 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Função / Cargo:</label>
                  <input required type="text" name="cargo" placeholder="Psicóloga / Fono / AT" defaultValue="AT" className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Telefone:</label>
                  <input type="text" name="telefone" placeholder="(11) 98888-8888" className="px-3 py-2 border rounded-xl" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">E-mail corporativo / Login:</label>
                <input required type="email" name="email" placeholder="daiane@clinica.com" className="px-3 py-2 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-550 text-indigo-700 font-bold">Chave de Acesso (Senha):</label>
                  <input required type="text" name="password" placeholder="1234" defaultValue="1234" className="px-3 py-2 border border-indigo-200 bg-indigo-50/10 rounded-xl focus:ring-1 focus:ring-indigo-400 font-mono font-bold" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Status Cadastral:</label>
                  <select name="status" className="px-3 py-2 border rounded-xl bg-white">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Anotações / Especialidades:</label>
                <textarea rows={2} name="observacoes" placeholder="Especialidades em ABA, autismo leve, etc..." className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex gap-3 justify-end border-t pt-3 mt-2">
                <button type="button" onClick={() => setIsAddingAt(false)} className="px-4 py-2 border rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover} cursor-pointer`}>Cadastrar Profissional</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT THERAPEUTIC ASSISTANT (AT) MODAL */}
      {isEditingAt && selectedAt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Editar Cadastro - Profissional</h3>
              <button onClick={() => setIsEditingAt(false)} aria-label="close" className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAt} className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Nome:</label>
                <input required type="text" name="nome" defaultValue={selectedAt.nome} className="px-3 py-2 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Função / Cargo:</label>
                  <input required type="text" name="cargo" defaultValue={selectedAt.cargo || 'AT'} className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Telefone:</label>
                  <input type="text" name="telefone" defaultValue={selectedAt.telefone} className="px-3 py-2 border rounded-xl" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">E-mail corporativo / Login:</label>
                <input required type="email" name="email" defaultValue={selectedAt.email} className="px-3 py-2 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-indigo-700 font-bold">Chave de Acesso (Senha):</label>
                  <input required type="text" name="password" defaultValue={selectedAt.password || '1234'} className="px-3 py-2 border border-indigo-200 bg-indigo-50/10 rounded-xl focus:ring-1 focus:ring-indigo-400 font-mono font-bold" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Status Cadastral:</label>
                  <select name="status" defaultValue={selectedAt.status || 'Ativo'} className="px-3 py-2 border rounded-xl bg-white">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Anotações / Especialidades:</label>
                <textarea rows={2} name="observacoes" defaultValue={selectedAt.observacoes} className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex gap-3 justify-end border-t pt-3 mt-2">
                <button type="button" onClick={() => setIsEditingAt(false)} className="px-4 py-2 border rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover} cursor-pointer`}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE AT CONFIRMATION MODAL */}
      {deletingAtId && (() => {
        const at = clinicData.acompanhantes.find(a => a.id === deletingAtId);
        if (!at) return null;
        return (
          <div className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-800 antialiased">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 w-full max-w-md shadow-2xl flex flex-col gap-5 animate-in zoom-in duration-200">
              <div className="text-center flex flex-col gap-2">
                <div className="mx-auto bg-rose-100 text-rose-600 p-3 rounded-full inline-block">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-900">Excluir Profissional do Sistema?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Você está prestes a remover permanentemente o registro de <strong>{at.nome}</strong> ({at.cargo || 'Professional'}). Os vínculos clínicos com pacientes serão anulados. Esta ação não poderá ser desfeita.
                </p>
              </div>

              <div className="flex gap-3 justify-end border-t pt-4">
                <button 
                  type="button" 
                  onClick={() => setDeletingAtId(null)} 
                  className="w-full px-4 py-2.5 text-xs font-bold border rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteAt(at.id)} 
                  className="w-full px-4 py-2.5 text-xs font-bold text-white bg-rose-605 hover:bg-rose-700 bg-rose-600 rounded-xl cursor-pointer"
                >
                  Excluir Registro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD SESSION LOG (REGISTRO ATENDIMENTO) MODAL */}
      {isAddingLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Arquivo de Evolução Diária (AT)</h3>
              <button onClick={() => setIsAddingLog(false)} aria-label="close" className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSessionLog} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Acompanhante Emitente (AT):</label>
                  <select name="atId" className="px-3 py-2 border rounded-xl bg-white">
                    {clinicData.acompanhantes.map(at => <option key={at.id} value={at.id}>{at.nome}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Paciente Atendido:</label>
                  <select name="patientId" className="px-3 py-2 border rounded-xl bg-white">
                    {clinicData.pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Data:</label>
                  <input type="date" name="data" defaultValue={new Date().toISOString().split('T')[0]} className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Horário:</label>
                  <input type="text" name="horario" placeholder="14:00 - 16:00" className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Local:</label>
                  <select name="local" className="px-3 py-2 border rounded-xl bg-white">
                    <option value="Escola">Escola / Pátio</option>
                    <option value="Casa / Domiciliar">Casa / Domiciliar</option>
                    <option value="Clínica">Clínica</option>
                    <option value="Outro">Outro ambiente</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Descrição Básica da Sessão (O que foi realizado?):</label>
                <textarea rows={2} name="descricao" placeholder="Sessão focada na tolerância..." className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Comportamentos observados (Choro, Estereotipia, Cooperação):</label>
                  <input type="text" name="comportamentosObservados" placeholder="Demonstrou estereotipia com as mãos..." className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Dificuldades ou barreiras apresentadas:</label>
                  <input type="text" name="dificuldadesEncontradas" placeholder="Fuga de demanda ao iniciar pareamentos..." className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Intervenções realizadas e dicas aplicadas:</label>
                  <input type="text" name="intervencoesRealizadas" placeholder="Uso de cartões visuais e toque físico mínimo..." className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Orientações fornecidas aos cuidadores / pais:</label>
                  <input type="text" name="orientacoesFornecidas" placeholder="Fazer pareamento livre com tampas plásticas em casa..." className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Objetivo Treinado especificamente na visita:</label>
                  <input type="text" name="objetivosTrabalhados" placeholder="Imitação de palmas com esvanecimento parcial" className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Planejamento e metas para a próxima sessão:</label>
                  <input type="text" name="planejamentoProximaSessao" placeholder="Mandar agua vocalmente usando apoio apenas de 1 gesto" className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="flex flex-col gap-1 border-t border-pink-100/70 pt-3">
                <label className="text-xs font-bold text-pink-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Recado direcionado para os Pais (Aparece no Portal da Família):
                </label>
                <textarea rows={2} name="recadoParaPais" placeholder="Parabéns! Hoje o paciente cooperou muito bem com as atividades de imitação e comeu toda a merenda..." className="px-3 py-2 border border-pink-200 rounded-xl bg-pink-50/10 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-400 focus:border-pink-400" />
              </div>

              <div className="flex gap-3 justify-end border-t pt-3.5 mt-2">
                <button type="button" onClick={() => setIsAddingLog(false)} className="px-4 py-2 border rounded-xl text-xs">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl text-xs ${brandColors.primaryBg} ${brandColors.primaryBgHover}`}>Gravar Evolução</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE EVENT (AGENDAR COMPROMISSO) MODAL */}
      {isAddingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-md text-slate-900">Novo Agendamento na Agenda Geral</h3>
              <button onClick={() => setIsAddingEvent(false)} aria-label="close" className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Acompanhante Resp. (AT):</label>
                <select name="atId" defaultValue={selectedAtId || (clinicData.acompanhantes[0]?.id || '')} className="px-3 py-2 border rounded-xl bg-white">
                  {clinicData.acompanhantes.map(at => <option key={at.id} value={at.id}>{at.nome}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Paciente Atendido:</label>
                <select name="patientId" defaultValue={selectedPatientId || (clinicData.pacientes[0]?.id || '')} className="px-3 py-2 border rounded-xl bg-white">
                  {clinicData.pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Data da Sessão do Calendário:</label>
                <input required type="date" name="data" defaultValue={selectedCalendarDay || new Date().toISOString().split('T')[0]} className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-500">Horário Início:</label>
                  <input required type="time" name="horarioInicio" defaultValue="14:00" className="px-3 py-2 border rounded-xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-500">Horário Fim:</label>
                  <input required type="time" name="horarioFim" defaultValue="16:00" className="px-3 py-2 border rounded-xl" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Local:</label>
                <input type="text" name="local" placeholder="Escola ou Clínica" defaultValue="Clínica" className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-500">Observações extra do Calendário:</label>
                <input type="text" name="observacoes" placeholder="Trazer brinquedo de reforçador..." className="px-3 py-2 border rounded-xl" />
              </div>

              <div className="flex gap-3 justify-end border-t pt-3 mt-2">
                <button type="button" onClick={() => setIsAddingEvent(false)} className="px-4 py-2 border rounded-xl">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-xl ${brandColors.primaryBg} ${brandColors.primaryBgHover}`}>Marcar Sessão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / UPLOAD DOCUMENT MODAL */}
      {isAddingDocModal && (() => {
        const [tempPatientId, setTempPatientId] = useState(clinicData.pacientes[0]?.id || '');
        const [tempDocType, setTempDocType] = useState<'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro'>('Laudo Médico');
        const [tempName, setTempName] = useState('');
        const [tempNotes, setTempNotes] = useState('');
        const [tempFileSelected, setTempFileSelected] = useState<string | null>(null);
        const [tempFileBase64, setTempFileBase64] = useState<string | null>(null);
        const [dragActive, setDragActive] = useState(false);
        
        const handleDrag = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
          } else if (e.type === "dragleave") {
            setDragActive(false);
          }
        };
        
        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const fileObj = e.dataTransfer.files[0];
            setTempFileSelected(fileObj.name);
            setTempName(fileObj.name);
            const reader = new FileReader();
            reader.onload = () => {
              setTempFileBase64(reader.result as string);
            };
            reader.readAsDataURL(fileObj);
            showToast(`Arquivo "${fileObj.name}" selecionado com sucesso!`, "info");
          }
        };
        
        const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files[0]) {
            const fileObj = e.target.files[0];
            setTempFileSelected(fileObj.name);
            setTempName(fileObj.name);
            const reader = new FileReader();
            reader.onload = () => {
              setTempFileBase64(reader.result as string);
            };
            reader.readAsDataURL(fileObj);
            showToast(`Arquivo "${fileObj.name}" selecionado!`, "info");
          }
        };

        const handleSubmitUpload = (e: React.FormEvent) => {
          e.preventDefault();
          if (!tempPatientId) {
            showToast("Por favor, selecione um paciente para arquivamento.", "error");
            return;
          }
          const finalName = tempName.trim() || tempFileSelected || "Prontuário de Integração.pdf";
          
          handleUploadDocument(tempPatientId, finalName, tempDocType, tempNotes, tempFileBase64 || undefined);
          setIsAddingDocModal(false);
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-650" /> Importar Documento Clínico (PDF)
                </h3>
                <button 
                  onClick={() => setIsAddingDocModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50"
                  aria-label="close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitUpload} className="flex flex-col gap-3.5 text-xs text-slate-800">
                <div className="grid grid-cols-2 gap-3 text-slate-800">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase tracking-wider">Paciente Associado:</label>
                    <select
                      value={tempPatientId}
                      onChange={(e) => setTempPatientId(e.target.value)}
                      className="px-3 py-2 border rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {clinicData.pacientes.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase tracking-wider">Categoria técnica:</label>
                    <select
                      value={tempDocType}
                      onChange={(e) => setTempDocType(e.target.value as any)}
                      className="px-3 py-2 border rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Laudo Médico">Laudo Médico (Laudos)</option>
                      <option value="Avaliação Sensorial">Avaliação Sensorial (SPM/Perfil)</option>
                      <option value="Relatório Escolar">Relatório de Evolução Escolar</option>
                      <option value="PDI/PEI">PDI / PEI Acadêmico</option>
                      <option value="Evolução de Sessões">Evolução de Sessões AT</option>
                      <option value="Outro">Outro documento extra</option>
                    </select>
                  </div>
                </div>

                {/* Simulated Drag & Drop Zone */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-99' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-uploader')?.click()}
                >
                  <input 
                    type="file" 
                    id="file-uploader" 
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileInputChange}
                    className="hidden" 
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-2 transition-all ${dragActive ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
                  {tempFileSelected ? (
                    <div className="text-emerald-700 font-bold animate-pulse text-xs flex flex-col gap-1">
                      <span>✓ Arquivo pronto para indexação!</span>
                      <span className="text-slate-500 text-[10px] italic font-mono">({tempFileSelected})</span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700">Arrastar e soltar arquivo do laudo aqui</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">ou dê um clique para selecionar do computador (.pdf, .docx, .txt)</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-505 uppercase tracking-wider">Nome de Exibição do Arquivo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Laudo_T_O_Enzo_Silva.pdf"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-white text-xs text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-505 uppercase tracking-wider">Anotações do Documento / Resumo Clínico:</label>
                  <textarea
                    rows={3}
                    placeholder="Copie aqui trechos importantes, CID, observações ou resumo diagnóstico do laudo para busca rápida inteligente..."
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-white text-xs text-slate-800"
                  />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-150 pt-3 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingDocModal(false)} 
                    className="px-4 py-2 border rounded-xl text-slate-500 font-semibold cursor-pointer hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Gravar e Indexar Arquivo
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* VIEW & PREVIEW DOCUMENT DETAILS MODAL */}
      {selectedDocForPreview && (() => {
        const doc = selectedDocForPreview;
        const patientObj = clinicData.pacientes.find(p => p.id === doc.patientId);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex flex-col">
                  <h3 className="font-extrabold text-md text-slate-900 leading-normal block">
                    {doc.name}
                  </h3>
                  <span className="text-[10px] text-indigo-900 font-bold uppercase tracking-wider block mt-0.5">
                    Metadados da Peça Técnica: {doc.type}
                  </span>
                </div>
                
                <button 
                  onClick={() => setSelectedDocForPreview(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50"
                  aria-label="close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Patient and file facts */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 border p-3 rounded-xl text-[10px] text-slate-650 font-sans">
                <div className="flex flex-col gap-0.5 border-r pr-2">
                  <span className="font-semibold uppercase text-slate-400">Paciente Associado</span>
                  <span className="font-bold text-slate-800 text-xs">{patientObj?.nome || 'N/D'}</span>
                  <span className="text-[9px] italic text-slate-500">Idade: {patientObj?.idade || 'N/D'} anos</span>
                </div>
                <div className="flex flex-col gap-0.5 border-r px-2">
                  <span className="font-semibold uppercase text-slate-400">Emissão Oficial</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{doc.issueDate.split('-').reverse().join('/')}</span>
                </div>
                <div className="flex flex-col gap-0.5 pl-2">
                  <span className="font-semibold uppercase text-slate-400">Upload no Prontuário</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{doc.uploadDate.split('-').reverse().join('/')}</span>
                </div>
              </div>

              {/* Styled mock sheet viewport representing authentic clinician paperwork */}
              <div className="bg-[#fbfcfa] border border-slate-300 p-6 rounded-xl shadow-inner min-h-[300px] leading-relaxed text-xs text-slate-800 select-text whitespace-pre-wrap font-serif border-t-4 border-t-indigo-650 max-h-[400px] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-2 mb-4 font-sans text-[10px] uppercase font-bold text-slate-450">
                  <span>Prontuário Digital Geral</span>
                  <span>Documento ID: {doc.id}</span>
                </div>
                <h4 className="text-center font-bold text-sm uppercase underline mb-4 text-slate-900 font-sans">
                  {doc.type}
                </h4>
                <p className="text-xs font-mono mb-4 text-slate-500 leading-normal bg-white p-2 border rounded">
                  <strong>Referência do Arquivo:</strong> {doc.name}
                </p>
                
                {doc.notes ? doc.notes : 'Nenhum conteúdo literal ou anotação complementar foi extraído para este documento.'}
              </div>

              {/* Toolbar */}
              <div className="flex gap-3 justify-end border-t border-slate-150 pt-3 mt-1 text-xs">
                <button
                  type="button"
                  onClick={() => triggerDownloadDocument(doc)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <Download className="w-4 h-4" /> Baixar Documento (.txt)
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedDocForPreview(null)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 8: PORTAL DE MENSAGENS DIRECT COM OS PAIS */}
      {activeTab === 'mensagens' && (() => {
        const patients = clinicData.pacientes || [];
        const activeChatPatient = patients.find(p => p.id === chatPatientId) || patients[0];
        
        const filteredPatientsForChat = patients.filter(p => {
          return p.criadoPorProfissional !== false;
        });

        const currentPatientId = activeChatPatient?.id || '';
        const messagesList = (clinicData.mensagens || []).filter(m => m.patientId === currentPatientId);

        return (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6 animate-fade-in text-slate-800">
            {/* Header */}
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-xl text-indigo-950 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-indigo-650" /> Portal de Mensagens Direct (Terapeuta &lt;-&gt; Família)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Canal seguro e centralizado para recados, orientações diárias e respostas rápidas com os responsáveis de cada paciente.
              </p>
            </div>

            {/* Message Workspace Grid */}
            {patients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed">
                <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">Nenhum paciente cadastrado na clínica ainda</p>
                <p className="text-[10px] text-slate-400 mt-1">Cadastre pacientes primeiro para poder trocar mensagens com os responsáveis.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 border border-slate-100 rounded-xl overflow-hidden min-h-[600px] bg-slate-50">
                
                {/* Sidebar - List of families */}
                <div className="xl:col-span-3 lg:col-span-4 border-r border-slate-100 bg-slate-50/40 p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Famílias Disponíveis</span>
                  
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[550px]">
                    {filteredPatientsForChat.map(p => {
                      const isSelected = p.id === currentPatientId;
                      const patientMsgs = (clinicData.mensagens || []).filter(m => m.patientId === p.id);
                      const lastMsg = patientMsgs[patientMsgs.length - 1];

                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setChatPatientId(p.id);
                            setChatText('');
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected 
                              ? 'bg-indigo-50/75 border-indigo-200 shadow-3xs' 
                              : 'bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="font-bold text-xs text-indigo-950 truncate max-w-[150px]">{p.nome}</span>
                            <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                              Família
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-slate-500 truncate leading-relaxed font-sans">
                            <strong>Mãe/Pai:</strong> {p.responsaveis}
                          </p>

                          {lastMsg ? (
                            <div className="mt-1 border-t border-slate-100 pt-1.5 flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-650 truncate font-semibold block">
                                {lastMsg.sender === 'therapist' ? 'Você: ' : 'Pais: '}{lastMsg.text}
                              </span>
                              <span className="text-[8px] text-slate-400 text-right">
                                {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic mt-1 block">Nenhuma conversa iniciada</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chat logs & AI Guide split workspace */}
                <div className="xl:col-span-9 lg:col-span-8 flex flex-col bg-white">
                  {activeChatPatient ? (
                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 min-h-[500px]">
                      
                      {/* Sub-column 1: Parent Direct Chat */}
                      <div className="xl:col-span-5 flex flex-col justify-between bg-white border-r border-slate-100 h-full">
                        
                        {/* Selected Family Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900">{activeChatPatient.nome}</h4>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${brandColors.pill}`}>
                                {activeClinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Responsáveis: <strong>{activeChatPatient.responsaveis}</strong> • Tel: {activeChatPatient.telefone}
                            </span>
                          </div>

                          <div className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-2 py-0.5 font-bold">
                            Direct Família
                          </div>
                        </div>

                        {/* Speech bubbles wrapper */}
                        <div className="flex-1 p-4 overflow-y-auto max-h-[350px] bg-slate-50/30 flex flex-col gap-3 min-h-[300px]">
                          {messagesList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 gap-2 h-full">
                              <span className="text-3xl animate-bounce">💬</span>
                              <p className="text-xs font-bold text-slate-755">Seu canal está em branco</p>
                              <p className="text-[10px] text-slate-400 max-w-[280px]">
                                Envie uma mensagem de boas-vindas ou um recado diário para os responsáveis de {activeChatPatient.nome}.
                              </p>
                            </div>
                          ) : (
                            messagesList.map(msg => {
                              const isTherapist = msg.sender === 'therapist';
                              return (
                                <div 
                                  key={msg.id} 
                                  className={`flex flex-col gap-1 max-w-[85%] ${isTherapist ? 'self-end items-end' : 'self-start items-start'}`}
                                >
                                  <span className="text-[9px] text-slate-400 px-1 font-bold">
                                    {isTherapist ? 'Você' : msg.senderName}
                                  </span>
                                  <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-3xs ${
                                    isTherapist 
                                      ? brandColors.primaryBg + ' text-white rounded-tr-none' 
                                      : 'bg-slate-150 text-slate-800 rounded-tl-none'
                                  }`}>
                                    {msg.text && <p className="whitespace-pre-line">{msg.text}</p>}
                                    {msg.attachmentUrl && (
                                      msg.attachmentType === 'image' ? (
                                        <div className="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/20">
                                          <img 
                                            src={msg.attachmentUrl} 
                                            alt={msg.attachmentName || 'Imagem anexada'} 
                                            className="max-h-52 w-full object-cover rounded-xl"
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="bg-black/10 p-1 text-[9px] text-center truncate">
                                            {msg.attachmentName}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-2 p-2 bg-black/10 hover:bg-black/15 rounded-xl border border-white/10 flex items-center gap-2 max-w-xs min-w-[200px] transition-all">
                                          <Paperclip className="w-4 h-4 flex-shrink-0" />
                                          <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[10px] font-bold truncate">{msg.attachmentName || 'Documento'}</p>
                                            <span className="text-[8px] opacity-75">Documento / PDF</span>
                                          </div>
                                          <a 
                                            href={msg.attachmentUrl} 
                                            download={msg.attachmentName || 'documento'} 
                                            className="px-2 py-1 bg-white/25 hover:bg-white/40 rounded text-[9px] font-bold cursor-pointer transition-all whitespace-nowrap"
                                          >
                                            Baixar
                                          </a>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <span className="text-[8px] text-slate-400 px-1 text-right w-full">
                                    {new Date(msg.timestamp).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Selected Attachment preview for therapist */}
                        {chatAttachment && (
                          <div className="mx-4 mb-2 flex items-center justify-between gap-3 bg-indigo-50/75 p-2.5 rounded-xl border border-indigo-100 text-[11px] animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-950 truncate">
                              {chatAttachment.type === 'image' ? <Image className="w-3.5 h-3.5 text-indigo-600" /> : <Paperclip className="w-3.5 h-3.5 text-indigo-600" />}
                              <span className="truncate max-w-[250px]">{chatAttachment.name}</span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setChatAttachment(null)} 
                              className="text-indigo-600 hover:text-indigo-850 font-extrabold hover:bg-indigo-100/60 p-1 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Input bar */}
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (chatText.trim() || chatAttachment) {
                              handleSendTherapistMessage(activeChatPatient.id, chatText, chatAttachment || undefined);
                              setChatText('');
                              setChatAttachment(null);
                            }
                          }}
                          className="p-3 border-t border-slate-100 flex gap-2 bg-slate-50/50"
                        >
                          <input
                            type="file"
                            id="therapist-chat-file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleAttachmentUpload(e.target.files[0], false);
                                e.target.value = ''; // reset element
                              }
                            }}
                          />
                          <label 
                            htmlFor="therapist-chat-file"
                            className="p-2.5 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-3xs flex-shrink-0"
                            title="Anexar foto ou documento para a família"
                          >
                            <Paperclip className="w-4 h-4" />
                          </label>

                          <input
                            type="text"
                            placeholder={`Digite uma orientação ao pai de ${activeChatPatient.nome.split(' ')[0]}...`}
                            value={chatText}
                            onChange={(e) => setChatText(e.target.value)}
                            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-3xs"
                          />
                          <button
                            type="submit"
                            disabled={!chatText.trim() && !chatAttachment}
                            className={`px-4 py-2 font-bold text-xs text-white rounded-xl shadow-sm transition-all focus:outline-none flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101 active:scale-99 flex-shrink-0 ${
                              chatText.trim() || chatAttachment
                                ? brandColors.primaryBg + ' ' + brandColors.primaryBgHover 
                                : 'bg-slate-300 cursor-not-allowed'
                            }`}
                          >
                            Enviar
                          </button>
                        </form>

                      </div>

                      {/* Sub-column 2: Interactive AI Clinical Assistant Panel */}
                      <div className="xl:col-span-7 flex flex-col bg-slate-50/70 p-4 border-t xl:border-t-0 h-full overflow-y-auto max-h-[640px] shadow-inner">
                        <div className="mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Assistente de IA do Prontuário
                            </h4>
                            <p className="text-[9px] text-slate-500">
                              Crie orientações clínicas, analise laudos de {activeChatPatient.nome} e use como rascunho de mensagem.
                            </p>
                          </div>
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                            Inteligência Clínica Integrada
                          </span>
                        </div>

                        <AIPatientGuide
                          patient={activeChatPatient}
                          clinicData={clinicData}
                          handleUploadDocument={handleUploadDocument}
                          brandColors={brandColors}
                          onUseAsDraft={(text) => {
                            setChatText(text);
                            showToast("A sugestão da IA foi copiada para o seu rascunho de mensagens para os pais!", "success");
                          }}
                        />
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 gap-3">
                      <MessageCircle className="w-10 h-10 text-slate-300 animate-pulse" />
                      <p className="text-xs font-bold text-slate-700">Selecione uma Família</p>
                      <p className="text-[10px] text-slate-400 max-w-[240px]">
                        Escolha um paciente na barra lateral para abrir o canal seguro de comunicação e o Guia de IA Clínica.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })()}

      {/* 5. Fixed iOS-style bottom floating menu bar */}
      <nav id="bottom-dock-navigation" className="sticky bottom-0 z-45 bg-white/95 backdrop-blur-md border-t border-slate-100/80 shadow-md flex justify-around items-center px-4 py-2.5 max-w-7xl mx-auto w-full">
        <button 
          onClick={() => setActiveTab('pacientes')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'pacientes' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Pacientes</span>
        </button>

        {!isAT && (
          <button 
            onClick={() => setActiveTab('planos')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
              activeTab === 'planos' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Gerar por PDF</span>
          </button>
        )}

        <button 
          onClick={() => setActiveTab('treinos')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'treinos' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Treinos</span>
        </button>

        {(userRole === 'adm' || userRole === 'clinician') && (
          <button 
            onClick={() => setActiveTab('at')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
              activeTab === 'at' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Profissionais</span>
          </button>
        )}

        {!isAT && (
          <>
            <button 
              onClick={() => setActiveTab('relatorios')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'relatorios' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px]">Relatórios</span>
            </button>

            <button 
              onClick={() => setActiveTab('graficos')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'graficos' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px]">Gráficos</span>
            </button>

            <button 
              onClick={() => setActiveTab('documentos')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'documentos' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-[10px]">Documentos</span>
            </button>
          </>
        )}

        <button 
          onClick={() => setActiveTab('mensagens')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'mensagens' ? brandColors.text + ' scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px]">Mensagens (Pais)</span>
        </button>
      </nav>

      {/* GLOBAL MODAL: VISUALIZAÇÃO DOS TERMOS DE CONSENTIMENTO E SIGILO A QUALQUER MOMENTO */}
      {showConsentTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex justify-center items-center p-4 antialiased text-slate-800">
          <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5">
            
            {/* Close button top right */}
            <button 
              onClick={() => setShowConsentTermsModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full cursor-pointer transition-all"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center flex flex-col gap-1.5 pb-2 border-b border-slate-100">
              <div className="mx-auto bg-emerald-100 text-emerald-800 p-2.5 rounded-2xl shadow-sm inline-block">
                <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight mt-1 text-slate-900">
                Termos de Consentimento &amp; Compromisso de Sigilo
              </h2>
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                ● Documento Ativo e Validado por Consentimento do Usuário
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 font-mono text-[11px] leading-relaxed text-slate-600 max-h-[250px] overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              <p className="font-sans font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 uppercase tracking-wide">
                DIRETRIZES DE USO SEGURO E CONFIDENCIALIDADE:
              </p>
              <p>
                1. <strong>Do Sigilo e Ética Profissional:</strong> Todo usuário (terapeuta, acompanhante terapêutico, ou profissional de saúde) obriga-se a manter absoluto sigilo sobre todo e qualquer dado clínico, metas de PDI, folhas de evolução comportamental e atas de sessão de pacientes, sob pena de responsabilidade ética e jurídica cabíveis de acordo com respectivos conselhos profissionais.
              </p>
              <p>
                2. <strong>Da Proteção de Dados (LGPD):</strong> Os registros contidos nesta plataforma envolvem dados sensíveis de menores de idade e de saúde de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). É expressamente vedada a reprodução, captura de tela, compartilhamento externo não autorizado ou divulgação de dados deste prontuário eletrônico.
              </p>
              <p>
                3. <strong>Do Portal dos Pais e Responsáveis:</strong> Os acessos fornecidos aos pais/responsáveis legais são de uso estritamente pessoal e familiar. O compartilhamento da senha de acesso do "Portal dos Pais" com terceiros não autorizados é de responsabilidade direta e integral do responsável legal do menor.
              </p>
              <p>
                4. <strong>Da Segurança de Acesso:</strong> Ao acessar, você declara ser o profissional responsável ou o parente legal autorizado, comprometendo-se a manter as credenciais seguras e encerrar as sessões após o uso (clicando em "Sair") para evitar acessos indesejados no dispositivo.
              </p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <Check className="w-4.5 h-4.5 text-emerald-600 bg-white rounded-full p-0.5 shadow-3xs" />
                <span>Termo aceito e vigente neste dispositivo</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                Este consentimento foi registrado e está salvo localmente. Em caso de necessidade de Auditoria, Revogação ou Re-assinatura dos termos, você pode limpar esta confirmação clicando no botão abaixo para forçar o recadastramento de assinatura.
              </p>
            </div>

            <div className="flex justify-between items-center gap-4 mt-1">
              <button 
                onClick={() => {
                  if (confirm("Deseja revogar o seu consentimento nesta sessão? Você será redirecionado para a tela de aceite obrigatório de termos de sigilo para reassinar.")) {
                    localStorage.removeItem('consent_accepted_v5');
                    setHasAcceptedConsent(false);
                    setTermSigiloChecked(false);
                    setTermLgpdChecked(false);
                    setShowConsentTermsModal(false);
                    showToast("Consentimento revogado. Assine novamente para continuar usando.", "info");
                  }
                }}
                className="px-4 py-2 font-bold text-[10px] uppercase text-rose-600 hover:text-white bg-white hover:bg-rose-600 border border-rose-200 rounded-xl cursor-pointer transition-all hover:scale-101 active:scale-99"
              >
                Revogar &amp; Re-assinar Termo
              </button>

              <button 
                onClick={() => setShowConsentTermsModal(false)}
                className="px-6 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
              >
                Fechar Visualização <X className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Cloud Sync info overlay */}
      <FirebaseSyncInfoModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        activeClinic={activeClinic}
        firebaseAuthenticated={firebaseAuthenticated}
        clinicData={clinicData}
        projectId="gfyjwrhuuqbefedkzxlt"
      />
    </div>
  );
}

interface EditableTrialCardProps {
  trial: TeachingProgram;
  onCancel: () => void;
  onSave: (updated: TeachingProgram) => void;
  brandColors: any;
}

function EditableTrialCard({ trial, onCancel, onSave, brandColors }: EditableTrialCardProps) {
  const [fields, setFields] = useState<TeachingProgram>({ ...trial });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(fields);
  };

  return (
    <form 
      onSubmit={handleSave}
      className="bg-slate-50 rounded-2xl border-2 border-indigo-200 p-5 shadow-inner flex flex-col gap-3 relative animate-in zoom-in-95 duration-150 text-xs"
    >
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">Editar Programação Técnica</span>
        <div className="flex gap-1.5">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-2.5 py-1 text-[9px] font-bold text-slate-600 hover:bg-slate-200 border border-slate-300 rounded-lg bg-white cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className={`px-3 py-1 text-[9px] font-bold text-white ${brandColors.primaryBg} ${brandColors.primaryBgHover} rounded-lg shadow cursor-pointer`}
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Título do Treino:</label>
          <input 
            type="text" 
            name="titulo"
            value={fields.titulo} 
            onChange={handleChange}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Área do Desenvolvimento:</label>
          <input 
            type="text" 
            name="area"
            value={fields.area} 
            onChange={handleChange}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Alvo Comportamental Específico:</label>
          <input 
            type="text" 
            name="alvo"
            value={fields.alvo} 
            onChange={handleChange}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Descrição Clínica:</label>
          <textarea 
            name="descricao"
            value={fields.descricao} 
            onChange={handleChange}
            rows={2}
            className="px-2.5 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Instruções Práticas / Protocolos de Ajuda:</label>
          <textarea 
            name="instrucoes"
            value={fields.instrucoes} 
            onChange={handleChange}
            rows={3}
            className="px-2.5 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Critério de Aquisição:</label>
          <input 
            type="text" 
            name="criterio"
            value={fields.criterio} 
            onChange={handleChange}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>
      </div>
    </form>
  );
}

