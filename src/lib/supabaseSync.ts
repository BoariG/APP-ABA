import { supabase } from './supabase';
import { ClinicData, Patient, InterventionPlan, TeachingProgram, TherapeuticAssistant, SessionLog, AgendaEvent, PatientDocument, ChatMessage, BehaviorLog, FinishedTrainingLog, TrialAttempt } from '../types';

// Global flag to avoid loop updates during realtime snapshot loading
let isSyncingFromSupabase = false;

// ==========================================
// MAPPING HELPERS (React <--> Supabase Schema)
// ==========================================

function mapPatient(d: any): Patient {
  return {
    id: d.id,
    nome: d.nome,
    dataNascimento: d.data_nascimento,
    idade: d.idade,
    diagnose: d.diagnose || '',
    responsaveis: d.responsaveis || '',
    telefone: d.telefone || '',
    escola: d.escola || '',
    observacoes: d.observacoes || '',
    senhaPais: d.senha_pais,
    criadoPorProfissional: d.criado_por_profissional,
    updated_at: d.updated_at // Retido em memória para Last-Write-Wins
  } as any;
}

function mapPatientToDB(p: Patient, activeClinic: string) {
  return {
    id: p.id,
    clinic_id: activeClinic,
    nome: p.nome,
    data_nascimento: p.dataNascimento,
    idade: p.idade,
    diagnose: p.diagnose,
    responsaveis: p.responsaveis,
    telefone: p.telefone,
    escola: p.escola,
    observacoes: p.observacoes,
    senha_pais: p.senhaPais,
    criado_por_profissional: p.criadoPorProfissional,
    updated_at: (p as any).updated_at
  };
}

function mapPlan(d: any): InterventionPlan {
  return {
    patientId: d.patient_id,
    dataElaboracao: d.data_elaboracao,
    terapeutaResponsavel: d.terapeuta_responsavel || '',
    supervisorResponsavel: d.supervisor_responsavel || '',
    objetivosGerais: d.objetivos_gerais || '',
    objetivosEspecificos: d.objetivos_especificos || '',
    updated_at: d.updated_at
  } as any;
}

function mapPlanToDB(p: InterventionPlan) {
  return {
    patient_id: p.patientId,
    data_elaboracao: p.dataElaboracao,
    terapeuta_responsavel: p.terapeutaResponsavel,
    supervisor_responsavel: p.supervisorResponsavel,
    objetivos_gerais: p.objetivosGerais,
    objetivos_especificos: p.objetivosEspecificos,
    updated_at: (p as any).updated_at
  };
}

function mapProgram(d: any): TeachingProgram {
  return {
    id: d.id,
    patientId: d.patient_id,
    titulo: d.titulo,
    area: d.area || '',
    descricao: d.descricao || '',
    instrucoes: d.instrucoes || '',
    criterio: d.criterio || '',
    alvo: d.alvo || '',
    status: (d.status || 'ativo') as 'ativo' | 'dominado',
    dataConclusao: d.data_conclusao,
    criterioProgresso: d.criterio_progresso || 10,
    tentativas: (d.tentativas || []).map((t: any) => ({
      id: t.id,
      timestamp: t.timestamp,
      registro: t.registro,
      updated_at: t.updated_at
    })),
    updated_at: d.updated_at
  } as any;
}

function mapProgramToDB(p: TeachingProgram) {
  return {
    id: p.id,
    patient_id: p.patientId,
    titulo: p.titulo,
    area: p.area,
    descricao: p.descricao,
    instrucoes: p.instrucoes,
    criterio: p.criterio,
    alvo: p.alvo,
    status: p.status,
    data_conclusao: p.dataConclusao,
    criterio_progresso: p.criterioProgresso,
    updated_at: (p as any).updated_at
  };
}

function mapAttemptToDB(t: any, programId: string) {
  return {
    id: t.id,
    program_id: programId,
    timestamp: t.timestamp,
    registro: t.registro,
    updated_at: t.updated_at
  };
}

function mapAssistant(d: any): TherapeuticAssistant {
  return {
    id: d.id,
    nome: d.nome,
    telefone: d.telefone || '',
    email: d.email || '',
    observacoes: d.observacoes || '',
    pacientesVinculados: d.pacientes_vinculados || [],
    cargo: d.cargo || '',
    status: d.status || 'Ativo',
    updated_at: d.updated_at
  } as any;
}

function mapAssistantToDB(a: TherapeuticAssistant, activeClinic: string) {
  return {
    id: a.id,
    clinic_id: activeClinic,
    nome: a.nome,
    telefone: a.telefone,
    email: a.email,
    observacoes: a.observacoes,
    pacientes_vinculados: a.pacientesVinculados,
    cargo: a.cargo,
    status: a.status,
    updated_at: (a as any).updated_at
  };
}

function mapLog(d: any): SessionLog {
  return {
    id: d.id,
    atId: d.at_id,
    patientId: d.patient_id,
    data: d.data,
    horario: d.horario || '',
    local: d.local || '',
    descricao: d.descricao || '',
    comportamentosObservados: d.comportamentos_observados || '',
    dificuldadesEncontradas: d.dificuldades_encontradas || '',
    intervencoesRealizadas: d.intervencoes_realizadas || '',
    orientacoesFornecidas: d.orientacoes_fornecidas || '',
    objetivosTrabalhados: d.objetivos_trabalhados || '',
    planejamentoProximaSessao: d.planejamento_proxima_sessao || '',
    recadoParaPais: d.recado_para_pais || '',
    updated_at: d.updated_at
  } as any;
}

function mapLogToDB(l: SessionLog) {
  return {
    id: l.id,
    at_id: l.atId,
    patient_id: l.patientId,
    data: l.data,
    horario: l.horario,
    local: l.local,
    descricao: l.descricao,
    comportamentos_observados: l.comportamentosObservados,
    dificuldades_encontradas: l.dificuldadesEncontradas,
    intervencoes_realizadas: l.intervencoesRealizadas,
    orientacoes_fornecidas: l.orientacoesFornecidas,
    objetivos_trabalhados: l.objetivosTrabalhados,
    planejamento_proxima_sessao: l.planejamentoProximaSessao,
    recado_para_pais: l.recadoParaPais,
    updated_at: (l as any).updated_at
  };
}

function mapEvent(d: any): AgendaEvent {
  return {
    id: d.id,
    atId: d.at_id,
    patientId: d.patient_id,
    data: d.data,
    horarioInicio: d.horario_inicio,
    horarioFim: d.horario_fim,
    local: d.local || '',
    observacoes: d.observacoes || '',
    updated_at: d.updated_at
  } as any;
}

function mapEventToDB(e: AgendaEvent) {
  return {
    id: e.id,
    at_id: e.atId,
    patient_id: e.patientId,
    data: e.data,
    horario_inicio: e.horarioInicio,
    horario_fim: e.horarioFim,
    local: e.local,
    observacoes: e.observacoes,
    updated_at: (e as any).updated_at
  };
}

function mapDocument(d: any): PatientDocument {
  return {
    id: d.id,
    patientId: d.patient_id,
    name: d.name,
    type: d.type,
    issueDate: d.issue_date || '',
    uploadDate: d.upload_date,
    notes: d.notes || '',
    base64: d.base64 || '',
    updated_at: d.updated_at
  } as any;
}

function mapDocumentToDB(doc: PatientDocument) {
  return {
    id: doc.id,
    patient_id: doc.patientId,
    name: doc.name,
    type: doc.type,
    issue_date: doc.issueDate || null,
    upload_date: doc.uploadDate,
    notes: doc.notes,
    base64: doc.base64,
    updated_at: (doc as any).updated_at
  };
}

function mapMessage(d: any): ChatMessage {
  return {
    id: d.id,
    patientId: d.patient_id,
    sender: d.sender,
    senderName: d.sender_name || '',
    text: d.text,
    timestamp: d.timestamp,
    attachmentUrl: d.attachment_url || '',
    attachmentType: d.attachment_type || undefined,
    attachmentName: d.attachment_name || '',
    updated_at: d.updated_at
  } as any;
}

function mapMessageToDB(m: ChatMessage) {
  return {
    id: m.id,
    patient_id: m.patientId,
    sender: m.sender,
    sender_name: m.senderName,
    text: m.text,
    timestamp: m.timestamp,
    attachment_url: m.attachmentUrl,
    attachment_type: m.attachmentType,
    attachment_name: m.attachmentName,
    updated_at: (m as any).updated_at
  };
}

function mapBehavior(d: any): BehaviorLog {
  return {
    id: d.id,
    patientId: d.patient_id,
    behaviorName: d.behavior_name,
    timestamp: d.timestamp,
    date: d.date,
    count: d.count,
    updated_at: d.updated_at
  } as any;
}

function mapBehaviorToDB(b: BehaviorLog) {
  return {
    id: b.id,
    patient_id: b.patientId,
    behavior_name: b.behaviorName,
    timestamp: b.timestamp,
    date: b.date,
    count: b.count,
    updated_at: (b as any).updated_at
  };
}

function mapFinished(d: any): FinishedTrainingLog {
  return {
    id: d.id,
    patientId: d.patient_id,
    programId: d.program_id,
    programTitle: d.program_title,
    date: d.date,
    totalAttempts: d.total_attempts,
    independents: d.independents,
    rate: Number(d.rate),
    observacao: d.observacao || '',
    timestamp: d.timestamp,
    updated_at: d.updated_at
  } as any;
}

function mapFinishedToDB(f: FinishedTrainingLog) {
  return {
    id: f.id,
    patient_id: f.patientId,
    program_id: f.programId,
    program_title: f.programTitle,
    date: f.date,
    total_attempts: f.totalAttempts,
    independents: f.independents,
    rate: f.rate,
    observacao: f.observacao,
    timestamp: f.timestamp,
    updated_at: (f as any).updated_at
  };
}

// ==========================================
// REALTIME DATA HYDRATION AND SUBSCRIPTIONS
// ==========================================

async function loadAllData(
  activeClinic: string,
  onUpdate: (updater: (prev: ClinicData) => ClinicData) => void
) {
  const userResponse = await supabase.auth.getUser();
  if (!userResponse.data.user) return;

  try {
    const [
      { data: pts },
      { data: plans },
      { data: progs },
      { data: ats },
      { data: logs },
      { data: events },
      { data: docs },
      { data: msgs },
      { data: btns },
      { data: bhlogs },
      { data: finished }
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('clinic_id', activeClinic),
      supabase.from('intervention_plans').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('teaching_programs').select('*, tentativas:trial_attempts(*), patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('therapeutic_assistants').select('*').eq('clinic_id', activeClinic),
      supabase.from('session_logs').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('agenda_events').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('patient_documents').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('chat_messages').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('behavior_buttons').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('behavior_logs').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
      supabase.from('finished_training_logs').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic),
    ]);

    isSyncingFromSupabase = true;

    // Map plans record
    const planosRecord: Record<string, InterventionPlan> = {};
    (plans || []).forEach(p => {
      planosRecord[p.patient_id] = mapPlan(p);
    });

    // Map teaching programs record
    const treinosRecord: Record<string, TeachingProgram[]> = {};
    (progs || []).forEach(pr => {
      const prog = mapProgram(pr);
      if (!treinosRecord[prog.patientId]) {
        treinosRecord[prog.patientId] = [];
      }
      treinosRecord[prog.patientId].push(prog);
    });
    Object.keys(treinosRecord).forEach(k => {
      treinosRecord[k].sort((a, b) => a.titulo.localeCompare(b.titulo));
    });

    // Map behavior buttons
    const btnsRecord: Record<string, string[]> = {};
    (btns || []).forEach(b => {
      btnsRecord[b.patient_id] = b.behaviors;
    });

    const parsedData: ClinicData = {
      pacientes: (pts || []).map(mapPatient),
      planos: planosRecord,
      treinos: treinosRecord,
      acompanhantes: (ats || []).map(mapAssistant),
      atendimentos: (logs || []).map(mapLog),
      agenda: (events || []).map(mapEvent),
      documentos: (docs || []).map(mapDocument),
      mensagens: (msgs || []).map(mapMessage),
      comportamentoBotoes: btnsRecord,
      comportamentoLogs: (bhlogs || []).map(mapBehavior),
      treinosFinalizados: (finished || []).map(mapFinished),
    };

    onUpdate(() => parsedData);
    isSyncingFromSupabase = false;
  } catch (err) {
    console.error("Error loading clinical data from Supabase: ", err);
  }
}

async function fetchCollection(
  tableName: string,
  activeClinic: string,
  onUpdate: (updater: (prev: ClinicData) => ClinicData) => void
) {
  try {
    isSyncingFromSupabase = true;
    switch(tableName) {
      case 'patients': {
        const { data } = await supabase.from('patients').select('*').eq('clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, pacientes: data.map(mapPatient) }));
        break;
      }
      case 'intervention_plans': {
        const { data } = await supabase.from('intervention_plans').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) {
          const plansRec: Record<string, InterventionPlan> = {};
          data.forEach(p => { plansRec[p.patient_id] = mapPlan(p); });
          onUpdate(prev => ({ ...prev, planos: plansRec }));
        }
        break;
      }
      case 'teaching_programs': {
        const { data } = await supabase.from('teaching_programs').select('*, tentativas:trial_attempts(*), patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) {
          const progsRec: Record<string, TeachingProgram[]> = {};
          data.forEach(pr => {
            const prog = mapProgram(pr);
            if (!progsRec[prog.patientId]) progsRec[prog.patientId] = [];
            progsRec[prog.patientId].push(prog);
          });
          Object.keys(progsRec).forEach(k => progsRec[k].sort((a, b) => a.titulo.localeCompare(b.titulo)));
          onUpdate(prev => ({ ...prev, treinos: progsRec }));
        }
        break;
      }
      case 'therapeutic_assistants': {
        const { data } = await supabase.from('therapeutic_assistants').select('*').eq('clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, acompanhantes: data.map(mapAssistant) }));
        break;
      }
      case 'session_logs': {
        const { data } = await supabase.from('session_logs').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, atendimentos: data.map(mapLog) }));
        break;
      }
      case 'agenda_events': {
        const { data } = await supabase.from('agenda_events').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, agenda: data.map(mapEvent) }));
        break;
      }
      case 'patient_documents': {
        const { data } = await supabase.from('patient_documents').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, documentos: data.map(mapDocument) }));
        break;
      }
      case 'chat_messages': {
        const { data } = await supabase.from('chat_messages').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, mensagens: data.map(mapMessage) }));
        break;
      }
      case 'behavior_logs': {
        const { data } = await supabase.from('behavior_logs').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, comportamentoLogs: data.map(mapBehavior) }));
        break;
      }
      case 'finished_training_logs': {
        const { data } = await supabase.from('finished_training_logs').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) onUpdate(prev => ({ ...prev, treinosFinalizados: data.map(mapFinished) }));
        break;
      }
      case 'behavior_buttons': {
        const { data } = await supabase.from('behavior_buttons').select('*, patients!inner(clinic_id)').eq('patients.clinic_id', activeClinic);
        if (data) {
          const btnsRec: Record<string, string[]> = {};
          data.forEach(b => { btnsRec[b.patient_id] = b.behaviors; });
          onUpdate(prev => ({ ...prev, comportamentoBotoes: btnsRec }));
        }
        break;
      }
    }
    isSyncingFromSupabase = false;
  } catch (err) {
    console.error(`Error loading table ${tableName} from Supabase: `, err);
  }
}

export function setupRealtimeListeners(
  activeClinic: string,
  onUpdate: (updater: (prev: ClinicData) => ClinicData) => void
) {
  // Inicialização paralela de dados da nuvem
  loadAllData(activeClinic, onUpdate);

  // Iniciar ouvintes em tempo real para sincronismo instantâneo multi-dispositivo
  const channel = supabase.channel(`clinic-${activeClinic}-sync`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => fetchCollection('patients', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'intervention_plans' }, () => fetchCollection('intervention_plans', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teaching_programs' }, () => fetchCollection('teaching_programs', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trial_attempts' }, () => fetchCollection('teaching_programs', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'therapeutic_assistants' }, () => fetchCollection('therapeutic_assistants', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'session_logs' }, () => fetchCollection('session_logs', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_events' }, () => fetchCollection('agenda_events', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_documents' }, () => fetchCollection('patient_documents', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchCollection('chat_messages', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'behavior_logs' }, () => fetchCollection('behavior_logs', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'finished_training_logs' }, () => fetchCollection('finished_training_logs', activeClinic, onUpdate))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'behavior_buttons' }, () => fetchCollection('behavior_buttons', activeClinic, onUpdate))
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// OFFLINE-FIRST BATCH SYNC ENGINE (Last-Write-Wins)
// ==========================================

function getListDiffToSet<T>(oldList: T[], newList: T[], getId: (item: T) => string): T[] {
  const oldMap = new Map<string, T>(oldList.map(item => [getId(item), item]));
  const toSet: T[] = [];
  newList.forEach(item => {
    const id = getId(item);
    const oldItem = oldMap.get(id);
    if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
      toSet.push(item);
    }
  });
  return toSet;
}

function getListDiffToDelete<T>(oldList: T[], newList: T[], getId: (item: T) => string): string[] {
  const newIds = new Set<string>(newList.map(item => getId(item)));
  const toDelete: string[] = [];
  oldList.forEach(item => {
    const id = getId(item);
    if (!newIds.has(id)) {
      toDelete.push(id);
    }
  });
  return toDelete;
}

async function safeUpsert(tableName: string, rows: any[]) {
  if (rows.length === 0) return;

  const keyName = (tableName === 'intervention_plans' || tableName === 'behavior_buttons') ? 'patient_id' : 'id';
  const ids = rows.map(r => r[keyName]);

  // 1. Obter timestamps remotos para fazer a comparação de conflitos (Last-Write-Wins)
  const { data: remoteRows, error } = await supabase
    .from(tableName)
    .select(`${keyName}, updated_at`)
    .in(keyName, ids);

  if (error) {
    console.error(`Error checking timestamps for ${tableName}:`, error.message);
    // Em caso de falha de leitura, tenta upsertar direto como contingência
    await supabase.from(tableName).upsert(rows);
    return;
  }

  const remoteMap = new Map<string, string>(remoteRows?.map(r => [r[keyName], r.updated_at]) || []);

  const toUpsert = rows.filter(localRow => {
    const remoteTimeStr = remoteMap.get(localRow[keyName]);
    if (!remoteTimeStr) return true; // Registro novo, prossegue

    if (!localRow.updated_at) return true; // Se o local não tiver timestamp, força atualização
    const localTime = new Date(localRow.updated_at).getTime();
    const remoteTime = new Date(remoteTimeStr).getTime();
    return localTime > remoteTime; // Apenas se o local for mais novo
  });

  if (toUpsert.length > 0) {
    const nowStr = new Date().toISOString();
    const prepared = toUpsert.map(r => ({
      ...r,
      updated_at: nowStr
    }));
    const { error: upsertError } = await supabase.from(tableName).upsert(prepared);
    if (upsertError) {
      console.error(`Error executing upsert in ${tableName}:`, upsertError.message);
    }
  }
}

async function safeDelete(tableName: string, ids: string[], customKeyName?: string) {
  if (ids.length === 0) return;
  const key = customKeyName || 'id';
  const { error } = await supabase.from(tableName).delete().in(key, ids);
  if (error) {
    console.error(`Error deleting from ${tableName}:`, error.message);
  }
}

export async function syncLocalStateToSupabase(
  activeClinic: string,
  oldState: ClinicData,
  newState: ClinicData
) {
  if (isSyncingFromSupabase) return;
  const sessionResponse = await supabase.auth.getSession();
  if (!sessionResponse.data.session) return; // Só tenta sincronizar com token ativo

  // 1. Sync Patients
  const ptsToSet = getListDiffToSet(oldState.pacientes || [], newState.pacientes || [], p => p.id);
  const ptsToDelete = getListDiffToDelete(oldState.pacientes || [], newState.pacientes || [], p => p.id);
  await safeUpsert('patients', ptsToSet.map(p => mapPatientToDB(p, activeClinic)));
  await safeDelete('patients', ptsToDelete);

  // 2. Sync Planos (Record<string, InterventionPlan>)
  const plansToSet: InterventionPlan[] = [];
  const plansToDelete: string[] = [];
  Object.entries(newState.planos || {}).forEach(([pid, val]) => {
    const oldVal = oldState.planos?.[pid];
    if (!oldVal || JSON.stringify(oldVal) !== JSON.stringify(val)) {
      plansToSet.push(val);
    }
  });
  Object.keys(oldState.planos || {}).forEach(pid => {
    if (!newState.planos?.[pid]) plansToDelete.push(pid);
  });
  await safeUpsert('intervention_plans', plansToSet.map(mapPlanToDB));
  await safeDelete('intervention_plans', plansToDelete, 'patient_id');

  // 3. Sync Programas de Ensino (Teaching Programs)
  const oldProgs = Object.values(oldState.treinos || {}).flat();
  const newProgs = Object.values(newState.treinos || {}).flat();
  const progsToSet = getListDiffToSet(oldProgs, newProgs, p => p.id);
  const progsToDelete = getListDiffToDelete(oldProgs, newProgs, p => p.id);
  await safeUpsert('teaching_programs', progsToSet.map(mapProgramToDB));
  await safeDelete('teaching_programs', progsToDelete);

  // 4. Sync Tentativas de Ensino (Trial Attempts - Tabela Separada)
  const oldAttempts = oldProgs.flatMap(p => (p.tentativas || []).map(t => ({ ...t, programId: p.id })));
  const newAttempts = newProgs.flatMap(p => (p.tentativas || []).map(t => ({ ...t, programId: p.id })));
  const attemptsToSet = getListDiffToSet(oldAttempts, newAttempts, t => t.id);
  const attemptsToDelete = getListDiffToDelete(oldAttempts, newAttempts, t => t.id);
  await safeUpsert('trial_attempts', attemptsToSet.map(t => mapAttemptToDB(t, t.programId)));
  await safeDelete('trial_attempts', attemptsToDelete);

  // 5. Sync Acompanhantes
  const atsToSet = getListDiffToSet(oldState.acompanhantes || [], newState.acompanhantes || [], a => a.id);
  const atsToDelete = getListDiffToDelete(oldState.acompanhantes || [], newState.acompanhantes || [], a => a.id);
  await safeUpsert('therapeutic_assistants', atsToSet.map(a => mapAssistantToDB(a, activeClinic)));
  await safeDelete('therapeutic_assistants', atsToDelete);

  // 6. Sync Atendimentos (Session Logs)
  const logsToSet = getListDiffToSet(oldState.atendimentos || [], newState.atendimentos || [], l => l.id);
  const logsToDelete = getListDiffToDelete(oldState.atendimentos || [], newState.atendimentos || [], l => l.id);
  await safeUpsert('session_logs', logsToSet.map(mapLogToDB));
  await safeDelete('session_logs', logsToDelete);

  // 7. Sync Agenda
  const eventsToSet = getListDiffToSet(oldState.agenda || [], newState.agenda || [], e => e.id);
  const eventsToDelete = getListDiffToDelete(oldState.agenda || [], newState.agenda || [], e => e.id);
  await safeUpsert('agenda_events', eventsToSet.map(mapEventToDB));
  await safeDelete('agenda_events', eventsToDelete);

  // 8. Sync Documentos
  const docsToSet = getListDiffToSet(oldState.documentos || [], newState.documentos || [], d => d.id);
  const docsToDelete = getListDiffToDelete(oldState.documentos || [], newState.documentos || [], d => d.id);
  await safeUpsert('patient_documents', docsToSet.map(mapDocumentToDB));
  await safeDelete('patient_documents', docsToDelete);

  // 9. Sync Mensagens de Chat
  const msgsToSet = getListDiffToSet(oldState.mensagens || [], newState.mensagens || [], m => m.id);
  const msgsToDelete = getListDiffToDelete(oldState.mensagens || [], newState.mensagens || [], m => m.id);
  await safeUpsert('chat_messages', msgsToSet.map(mapMessageToDB));
  await safeDelete('chat_messages', msgsToDelete);

  // 10. Sync Comportamento Logs
  const bhLogsToSet = getListDiffToSet(oldState.comportamentoLogs || [], newState.comportamentoLogs || [], b => b.id);
  const bhLogsToDelete = getListDiffToDelete(oldState.comportamentoLogs || [], newState.comportamentoLogs || [], b => b.id);
  await safeUpsert('behavior_logs', bhLogsToSet.map(mapBehaviorToDB));
  await safeDelete('behavior_logs', bhLogsToDelete);

  // 11. Sync Treinos Finalizados
  const finToSet = getListDiffToSet(oldState.treinosFinalizados || [], newState.treinosFinalizados || [], f => f.id);
  const finToDelete = getListDiffToDelete(oldState.treinosFinalizados || [], newState.treinosFinalizados || [], f => f.id);
  await safeUpsert('finished_training_logs', finToSet.map(mapFinishedToDB));
  await safeDelete('finished_training_logs', finToDelete);

  // 12. Sync Configurações de Botões de Comportamento (Record<string, string[]>)
  const btnsToSet: any[] = [];
  const btnsToDelete: string[] = [];
  Object.entries(newState.comportamentoBotoes || {}).forEach(([pid, val]) => {
    const oldVal = oldState.comportamentoBotoes?.[pid];
    if (!oldVal || JSON.stringify(oldVal) !== JSON.stringify(val)) {
      btnsToSet.push({ patient_id: pid, behaviors: val });
    }
  });
  Object.keys(oldState.comportamentoBotoes || {}).forEach(pid => {
    if (!newState.comportamentoBotoes?.[pid]) btnsToDelete.push(pid);
  });
  await safeUpsert('behavior_buttons', btnsToSet);
  await safeDelete('behavior_buttons', btnsToDelete, 'patient_id');
}
