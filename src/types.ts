export type ClinicType = 'ABA' | 'Atria';

export interface Patient {
  id: string;
  nome: string;
  dataNascimento: string;
  idade: number;
  diagnose: string;
  responsaveis: string;
  telefone: string;
  escola: string;
  observacoes: string;
  senhaPais?: string;
  criadoPorProfissional?: boolean;
}

export interface InterventionPlan {
  patientId: string;
  dataElaboracao: string;
  terapeutaResponsavel: string;
  supervisorResponsavel: string;
  objetivosGerais: string;
  objetivosEspecificos: string;
}

export interface TrialAttempt {
  id: string;
  timestamp: string;
  registro: 'Independente' | 'Ajuda Gestual' | 'Ajuda Verbal' | 'Ajuda Física' | 'Erro';
}

export interface TeachingProgram {
  id: string;
  patientId: string;
  titulo: string;
  area: string;
  descricao: string;
  instrucoes: string;
  criterio: string; // text description
  alvo: string;
  status: 'ativo' | 'dominado';
  dataConclusao?: string;
  tentativas: TrialAttempt[];
  criterioProgresso: number; // e.g. 10 consecutive independent trials
}

export interface TherapeuticAssistant {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  pacientesVinculados: string[]; // patientIds
  password?: string; // added for authentication
  cargo?: string; // added for role/cargo
  status?: 'Ativo' | 'Inativo'; // added for status (ativo/inativo)
}

export interface SessionLog {
  id: string;
  atId: string;
  patientId: string;
  data: string;
  horario: string;
  local: string; // escola, casa, clinica
  descricao: string;
  comportamentosObservados: string;
  dificuldadesEncontradas: string;
  intervencoesRealizadas: string;
  orientacoesFornecidas: string;
  objetivosTrabalhados: string;
  planejamentoProximaSessao: string;
  recadoParaPais?: string;
}

export interface AgendaEvent {
  id: string;
  atId: string;
  patientId: string;
  data: string; // YYYY-MM-DD
  horarioInicio: string; // HH:MM
  horarioFim: string; // HH:MM
  local: string;
  observacoes: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  name: string;
  type: 'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro';
  issueDate: string;
  uploadDate: string;
  notes?: string;
  base64?: string; // Storing PDF data URL or base64
}

export interface ChatMessage {
  id: string;
  patientId: string;
  sender: 'therapist' | 'parent';
  senderName: string;
  text: string;
  timestamp: string; // ISO string
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  attachmentName?: string;
}

export interface BehaviorLog {
  id: string;
  patientId: string;
  behaviorName: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  count: number;
}

export interface FinishedTrainingLog {
  id: string;
  patientId: string;
  programId: string;
  programTitle: string;
  date: string; // YYYY-MM-DD
  totalAttempts: number;
  independents: number;
  rate: number;
  observacao: string;
  timestamp: string;
}

export interface ClinicData {
  pacientes: Patient[];
  planos: Record<string, InterventionPlan>;
  treinos: Record<string, TeachingProgram[]>;
  acompanhantes: TherapeuticAssistant[];
  atendimentos: SessionLog[];
  agenda: AgendaEvent[];
  documentos?: PatientDocument[];
  mensagens?: ChatMessage[];
  comportamentoBotoes?: Record<string, string[]>; // patientId -> behavior names
  comportamentoLogs?: BehaviorLog[];
  treinosFinalizados?: FinishedTrainingLog[];
}
