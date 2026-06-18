import React, { useState } from 'react';
import { 
  FileText, Sparkles, Plus, User, Copy, RotateCcw, CheckCircle2, Trash2, Archive, ClipboardSignature, Star, Bookmark, Award, X 
} from 'lucide-react';
import { Patient, ClinicData } from '../types';
import { PsychologistAnamnesisWorkshop } from './PsychologistAnamnesisWorkshop';

interface PsychologistReportWorkshopProps {
  clinicData: ClinicData;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  aiLoading: boolean;
  setAiLoading: (loading: boolean) => void;
  generatedReportText: string;
  setGeneratedReportText: (text: string) => void;
  selectedReportType: string;
  setSelectedReportType: (type: string) => void;
  selectedApproach: string;
  setSelectedApproach: (approach: string) => void;
  selectedTemplateType: string;
  setSelectedTemplateType: (template: string) => void;
  customInstructions: string;
  setCustomInstructions: (inst: string) => void;
  therapistName: string;
  setTherapistName: (name: string) => void;
  therapistReg: string;
  setTherapistReg: (reg: string) => void;
  refineInstructions: string;
  setRefineInstructions: (inst: string) => void;
  inspirationText: string;
  setInspirationText: (text: string) => void;
  clinicLogoIcon: string;
  setClinicLogoIcon: (icon: string) => void;
  triggerGenerateReportAI: (patient: Patient) => Promise<void>;
  triggerRefineReportAI: (patient: Patient) => Promise<void>;
  handleSaveGeneratedReportAsPDF: (patientId: string, name: string, type: 'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro', notes: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const PsychologistReportWorkshop: React.FC<PsychologistReportWorkshopProps> = ({
  clinicData,
  selectedPatientId,
  setSelectedPatientId,
  aiLoading,
  generatedReportText,
  setGeneratedReportText,
  selectedReportType,
  setSelectedReportType,
  selectedApproach,
  setSelectedApproach,
  selectedTemplateType,
  setSelectedTemplateType,
  customInstructions,
  setCustomInstructions,
  therapistName,
  setTherapistName,
  therapistReg,
  setTherapistReg,
  refineInstructions,
  setRefineInstructions,
  inspirationText,
  setInspirationText,
  clinicLogoIcon,
  setClinicLogoIcon,
  triggerGenerateReportAI,
  triggerRefineReportAI,
  handleSaveGeneratedReportAsPDF,
  showToast
}) => {
  const [workspaceMode, setWorkspaceMode] = useState<'laudos' | 'anamneses'>('laudos');
  const selectedPatient = clinicData.pacientes.find(p => p.id === selectedPatientId) || clinicData.pacientes[0];

  // Customizable brand, header, and stamp state
  const [customHeaderTitle, setCustomHeaderTitle] = useState(() => localStorage.getItem('clinic_custom_header_title') || '');
  const [customHeaderSubtitle, setCustomHeaderSubtitle] = useState(() => localStorage.getItem('clinic_custom_header_subtitle') || '');
  const [customLogoUrl, setCustomLogoUrl] = useState(() => localStorage.getItem('clinic_custom_logo_url') || '');
  const [customStampText, setCustomStampText] = useState(() => localStorage.getItem('clinic_custom_stamp_text') || '');
  const [useCustomAsDefault, setUseCustomAsDefault] = useState(() => localStorage.getItem('clinic_use_custom_as_default') === 'true');

  // Golden Reference Reports Memory State ("Biblioteca de Relatórios de Êxito")
  const [goldenReports, setGoldenReports] = useState<{
    id: string;
    patientName: string;
    reportType: string;
    approach: string;
    title: string;
    text: string;
    date: string;
  }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('clinic_golden_reports') || '[]');
    } catch {
      return [];
    }
  });

  const [savingGoldenModal, setSavingGoldenModal] = useState(false);
  const [newGoldenTitle, setNewGoldenTitle] = useState('');
  const [selectedGoldenViewing, setSelectedGoldenViewing] = useState<{
    id: string;
    patientName: string;
    reportType: string;
    approach: string;
    title: string;
    text: string;
    date: string;
  } | null>(null);

  // Load defaults from localStorage on mount
  React.useEffect(() => {
    const savedUseCustom = localStorage.getItem('clinic_use_custom_as_default');
    if (savedUseCustom === 'true') {
      const savedHeaderTitle = localStorage.getItem('clinic_custom_header_title');
      const savedHeaderSubtitle = localStorage.getItem('clinic_custom_header_subtitle');
      const savedLogoUrl = localStorage.getItem('clinic_custom_logo_url');
      const savedStamp = localStorage.getItem('clinic_custom_stamp_text');
      const savedThName = localStorage.getItem('clinic_custom_therapist_name');
      const savedThReg = localStorage.getItem('clinic_custom_therapist_reg');

      if (savedHeaderTitle) setCustomHeaderTitle(savedHeaderTitle);
      if (savedHeaderSubtitle) setCustomHeaderSubtitle(savedHeaderSubtitle);
      if (savedLogoUrl) setCustomLogoUrl(savedLogoUrl);
      if (savedStamp) setCustomStampText(savedStamp);
      if (savedThName) setTherapistName(savedThName);
      if (savedThReg) setTherapistReg(savedThReg);
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // limit 2MB for safe localStorage
      showToast("Tamanho do arquivo excede 2MB. Selecione uma foto/imagem menor para garantir o armazenamento local.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomLogoUrl(reader.result);
        if (useCustomAsDefault) {
          localStorage.setItem('clinic_custom_logo_url', reader.result);
        }
        showToast("Logotipo / Foto da clínica carregado com sucesso!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomLogo = () => {
    setCustomLogoUrl('');
    if (useCustomAsDefault) {
      localStorage.removeItem('clinic_custom_logo_url');
    }
    showToast("Foto de logotipo removida. Usando preset de ícone.", "info");
  };

  const handleSaveLayoutAsDefault = () => {
    localStorage.setItem('clinic_use_custom_as_default', 'true');
    localStorage.setItem('clinic_custom_header_title', customHeaderTitle);
    localStorage.setItem('clinic_custom_header_subtitle', customHeaderSubtitle);
    localStorage.setItem('clinic_custom_logo_url', customLogoUrl);
    localStorage.setItem('clinic_custom_stamp_text', customStampText);
    localStorage.setItem('clinic_custom_therapist_name', therapistName);
    localStorage.setItem('clinic_custom_therapist_reg', therapistReg);
    setUseCustomAsDefault(true);
    showToast("DADOS SALVOS COMO PADRÃO! Este cabeçalho, logotipo e carimbo serão aplicados a todos os relatórios a partir de agora.", "success");
  };

  const handleToggleUseCustomDefault = (val: boolean) => {
    setUseCustomAsDefault(val);
    localStorage.setItem('clinic_use_custom_as_default', val ? 'true' : 'false');
    if (val) {
      // immediately write what we typed
      localStorage.setItem('clinic_custom_header_title', customHeaderTitle);
      localStorage.setItem('clinic_custom_header_subtitle', customHeaderSubtitle);
      localStorage.setItem('clinic_custom_logo_url', customLogoUrl);
      localStorage.setItem('clinic_custom_stamp_text', customStampText);
      localStorage.setItem('clinic_custom_therapist_name', therapistName);
      localStorage.setItem('clinic_custom_therapist_reg', therapistReg);
      showToast("Usando cabeçalhos e carimbos customizados como padrão!", "success");
    } else {
      showToast("Usando presets padrão pré-definidos para a clínica.", "info");
    }
  };

  const handleSaveToGoldenMemory = () => {
    if (!generatedReportText) {
      showToast("Gere ou redija um texto de relatório primeiro para poder favoritar na memória de êxito.", "warning");
      return;
    }
    setNewGoldenTitle(`${selectedReportType} aprovado - ${selectedPatient?.nome || 'Modelo'}`);
    setSavingGoldenModal(true);
  };

  const confirmSaveToGoldenMemory = () => {
    if (!newGoldenTitle.trim()) {
      showToast("Defina um título identificador para o modelo aprovado.", "warning");
      return;
    }
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      patientName: selectedPatient?.nome || 'Inespecífico',
      reportType: selectedReportType,
      approach: selectedApproach,
      title: newGoldenTitle,
      text: generatedReportText,
      date: new Date().toLocaleDateString('pt-BR'),
    };
    const updated = [newEntry, ...goldenReports];
    setGoldenReports(updated);
    localStorage.setItem('clinic_golden_reports', JSON.stringify(updated));
    setSavingGoldenModal(false);
    setNewGoldenTitle('');
    showToast("✓ Relatório memorizado com êxito! Ele está salvo na sua biblioteca como referência padrão.", "success");
  };

  const handleDeleteGoldenReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = goldenReports.filter(r => r.id !== id);
    setGoldenReports(updated);
    localStorage.setItem('clinic_golden_reports', JSON.stringify(updated));
    showToast("Removido da biblioteca de modelos de êxito.", "info");
    if (selectedGoldenViewing?.id === id) {
      setSelectedGoldenViewing(null);
    }
  };

  const handleApplyGoldenReport = (text: string) => {
    setGeneratedReportText(text);
    setSelectedGoldenViewing(null);
    showToast("✓ Texto do modelo de êxito carregado integralmente na área de edição!", "success");
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Incapaz de abrir popup de impressão. Verifique bloqueador de popups.", "warning");
      return;
    }
    
    const baseClinicName = clinicLogoIcon === 'puzzle' ? 'Clínica ABA – Acolher Brincar Aprender' :
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

    const printClinicName = customHeaderTitle || baseClinicName;
    const printSubtitle = customHeaderSubtitle || 'Laudos e Pareceres Psicológicos Clínicos';

    const logoBlock = customLogoUrl 
      ? `<img src="${customLogoUrl}" style="max-height: 70px; max-width: 160px; object-fit: contain; margin-bottom: 10px; border-radius: 6px;" />`
      : `<div class="logo">${emojiLogo}</div>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Clínico - ${selectedPatient?.nome || 'Paciente'}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 40px; margin-bottom: 10px; }
            .clinic-name { font-size: 22px; font-weight: bold; color: #1e1b4b; }
            .clinic-sub { font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px; }
            .doc-title { font-size: 16px; font-weight: bold; letter-spacing: 1px; color: #4f46e5; margin-top: 12px; text-transform: uppercase; }
            .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
            .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
            .patient-label { font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 10px; }
            .patient-value { font-weight: 600; color: #1e293b; }
            .report-content { font-size: 14px; white-space: pre-wrap; color: #334155; }
            .signature-section { text-align: center; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .signature-line { width: 250px; border-bottom: 1px solid #94a3b8; margin: 0 auto 10px; }
            .therapist-name { font-weight: bold; color: #0f172a; font-size: 14px; }
            .therapist-reg { color: #64748b; font-size: 12px; }
            .stamp-box { display: inline-block; border: 1.5px dashed #4f46e5; border-radius: 6px; padding: 6px 12px; background-color: #f5f3ff; margin-top: 8px; font-size: 10.5px; font-family: monospace; color: #4338ca; font-weight: bold; text-transform: uppercase; max-width: 320px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBlock}
            <div class="clinic-name">${printClinicName}</div>
            <div class="clinic-sub">${printSubtitle}</div>
            <div class="doc-title">${selectedReportType}</div>
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
                <span class="patient-label">Responsáveis:</span>
                <div class="patient-value">${selectedPatient?.responsaveis || 'Não informado'}</div>
              </div>
              <div>
                <span class="patient-label">Escola frequentada:</span>
                <div class="patient-value">${selectedPatient?.escola || 'Não informado'}</div>
              </div>
              <div>
                <span class="patient-label">Data de Emissão:</span>
                <div class="patient-value">${new Date().toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          </div>

          <div class="report-content">${generatedReportText || 'Documento em branco.'}</div>

          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="therapist-name">${therapistName}</div>
            <div class="therapist-reg">${therapistReg}</div>
            ${customStampText ? `<div class="stamp-box">📌 CARIMBO: ${customStampText}</div>` : ''}
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePresetInstruction = (instruction: string) => {
    if (customInstructions.trim()) {
      setCustomInstructions(customInstructions + '\n- ' + instruction);
    } else {
      setCustomInstructions('- ' + instruction);
    }
    showToast("Instrução clínica anexada!", "success");
  };

  const handlePresetRefinement = (refinement: string) => {
    setRefineInstructions(refinement);
  };

  const handleStartBlankModel = () => {
    if (!selectedPatient) return;
    const docHeader = `# RELATÓRIO INDIVIDUAL DE AVALIAÇÃO PSICOLÓGICA
**Clínica:** ${clinicLogoIcon === 'puzzle' ? 'Clínica ABA – Acolher Brincar Aprender' : 'Clínica Caminho ABA Integrada'}
**Abordagem:** ${selectedApproach}

---

## 1. IDENTIFICAÇÃO DO CASO
*   **Nome do Paciente:** ${selectedPatient.nome}
*   **Idade:** ${selectedPatient.idade} anos
*   **Diagnóstico:** ${selectedPatient.diagnose}
*   **Responsáveis:** ${selectedPatient.responsaveis || 'Não informado'}
*   **Escola:** ${selectedPatient.escola || 'Não informado'}

---

## 2. HISTÓRICO E QUEIXA INICIAL
[Escreva aqui o histórico do paciente e queixas que motivaram o início dos atendimentos...]

---

## 3. ANÁLISE CLÍNICA E EVOLUÇÃO
[Descreva os comportamentos observados, evolução de marcos de desenvolvimento e dados das sessões...]

---

## 4. MEDIDAS RECOMENDADAS E FECHAMENTO
*   [ ] Indicar continuidade da intervenção intensiva
*   [ ] Propor acompanhamento escolar dedicado

---

Sorocaba, ${new Date().toLocaleDateString('pt-BR')}

_____________________________________________________
**${therapistName}**
${therapistReg}`;

    setGeneratedReportText(docHeader);
    showToast("Modelo estruturado em branco criado! Comece a escrever abaixo.", "success");
  };

  const emojiLogoSource = () => {
    switch (clinicLogoIcon) {
      case 'puzzle': return '🧩';
      case 'steth': return '🩺';
      case 'brain': return '🧠';
      case 'lotus': return '🌸';
      case 'child': return '🧒';
      case 'lightbulb': return '💡';
      default: return '🧩';
    }
  };

  const clinicNameText = () => {
    switch (clinicLogoIcon) {
      case 'puzzle': return 'Clínica ABA – Acolher Brincar Aprender';
      case 'steth': return 'Clínica Caminho ABA Integrada';
      case 'brain': return 'Instituto de Mente Comportamental';
      case 'lotus': return 'Espaço Alternativo de Desenvolvimento';
      case 'child': return 'Viva Infância Centro de Desenvolvimento';
      case 'lightbulb': return 'Clínica Aprender & Evoluir';
      default: return 'Clínica ABA – Acolher Brincar Aprender';
    }
  };

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm flex flex-col gap-6 animate-fade-in text-slate-800">
      
      {/* Header block */}
      <div className="border-b border-indigo-100/50 pb-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2">
          <div>
            <h3 className="font-extrabold text-2xl text-indigo-950 flex items-center gap-2.5" id="workshop-title">
              <FileText className="w-7 h-7 text-indigo-750" /> Portal de Relatórios & Assistente Clínico
            </h3>
            <p className="text-xs text-slate-500 mt-1">Conecte IA de psicólogo clínico, selecione abordagens teóricas, use modelos de continuidade e imprima relatórios oficiais selados.</p>
          </div>
          
          {/* Select patient quickly */}
          <div className="flex items-center gap-2 w-full lg:w-auto bg-white border border-slate-200 p-2 py-1.5 rounded-xl mt-3 lg:mt-0 shadow-sm">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Paciente Alvo:</span>
            <select
              id="report-patient-selector"
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
            >
              {clinicData.pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.diagnose})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Workspace subtab Toggle */}
      <div className="flex border-b border-indigo-100/30 bg-slate-100/50 p-1 rounded-xl gap-1 shadow-inner my-1">
        <button
          type="button"
          onClick={() => setWorkspaceMode('laudos')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            workspaceMode === 'laudos'
              ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/60'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-750" /> Laudos, Pareceres & Relatórios Clínicos
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceMode('anamneses')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            workspaceMode === 'anamneses'
              ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/60'
          }`}
        >
          <ClipboardSignature className="w-4 h-4 text-indigo-750" /> Anamnese Psicológica & IA Auditiva
        </button>
      </div>

      {workspaceMode === 'laudos' ? (
        /* Main Content Workspace Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 1. LEFT PANEL: CONFIGURATION */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
          
          {/* Clinic Branding */}
          <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-widest block mb-2">1. Identidade & Logotipo da Clínica</span>
              
              {/* Preset Icons Selection */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {[
                  { icon: 'puzzle', emoji: '🧩', label: 'ABA' },
                  { icon: 'steth', emoji: '🩺', label: 'Caminho ABA' },
                  { icon: 'brain', emoji: '🧠', label: 'Mente' },
                  { icon: 'lotus', emoji: '🌸', label: 'Zen' },
                  { icon: 'child', emoji: '🧒', label: 'Kids' },
                  { icon: 'lightbulb', emoji: '💡', label: 'Brainy' }
                ].map((preset) => (
                  <button
                    key={preset.icon}
                    type="button"
                    onClick={() => {
                      setClinicLogoIcon(preset.icon);
                      showToast(`Ícone de branding alterado: ${preset.label}`, "info");
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      clinicLogoIcon === preset.icon && !customLogoUrl
                        ? 'border-indigo-650 bg-indigo-50 scale-[1.03] shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1">{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Photo Upload for Clinic Logo */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-[10px] font-bold text-slate-600 block mb-1.5">Upar Foto Oficial da Clínica (Qualquer Imagem)</span>
                
                {customLogoUrl ? (
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <img 
                      src={customLogoUrl} 
                      className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 p-0.5" 
                      alt="Logo carregado" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-grow">
                      <span className="text-[10px] text-emerald-800 font-extrabold block">✓ Imagem Carregada</span>
                      <span className="text-[9px] text-slate-400 font-medium block">Seguro em LocalStorage</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCustomLogo}
                      className="text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded border border-rose-200 transition-all cursor-pointer"
                    >
                      Remover Foto
                    </button>
                  </div>
                ) : (
                  <label 
                    htmlFor="clinic-logo-file-uploader"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-3 hover:border-indigo-500 hover:bg-indigo-50/10 transition-all cursor-pointer text-center"
                  >
                    <span className="text-xl mb-1">📸</span>
                    <span className="text-[10.5px] font-bold text-slate-700">Clique para selecionar foto/logo</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Formatos JPEG, PNG (Recomendado até 2MB)</span>
                    <input 
                      id="clinic-logo-file-uploader"
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Custom Header Title/City Creation */}
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-widest block mb-1" htmlFor="custom-header-title-input">Nome da Clínica (Para Papel de Impressão)</label>
                <input
                  id="custom-header-title-input"
                  type="text"
                  value={customHeaderTitle}
                  onChange={(e) => {
                    setCustomHeaderTitle(e.target.value);
                    if (useCustomAsDefault) {
                      localStorage.setItem('clinic_custom_header_title', e.target.value);
                    }
                  }}
                  placeholder="Ex: Clínica Integra - Saúde e Desenvolvimento Infantil"
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-widest block mb-1" htmlFor="custom-header-sub-input">Endereço e Contatos do Cabeçalho</label>
                <input
                  id="custom-header-sub-input"
                  type="text"
                  value={customHeaderSubtitle}
                  onChange={(e) => {
                    setCustomHeaderSubtitle(e.target.value);
                    if (useCustomAsDefault) {
                      localStorage.setItem('clinic_custom_header_subtitle', e.target.value);
                    }
                  }}
                  placeholder="Ex: Sorocaba/SP • Av. Paulista 1000 • Fone: (15) 3211-4455"
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Therapist Sign Details & Official Stamp */}
          <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-50/60 flex flex-col gap-3.5">
            <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-widest block mb-0.5">Assinador & Carimbo Oficial</span>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1" htmlFor="therapist-name-input">Nome Completo</label>
                <input
                  id="therapist-name-input"
                  type="text"
                  value={therapistName}
                  onChange={(e) => {
                    setTherapistName(e.target.value);
                    if (useCustomAsDefault) {
                      localStorage.setItem('clinic_custom_therapist_name', e.target.value);
                    }
                  }}
                  placeholder="Ex: Dra. Aline Mendes"
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1" htmlFor="therapist-reg-input">Registro (CRP/CRM/TO)</label>
                <input
                  id="therapist-reg-input"
                  type="text"
                  value={therapistReg}
                  onChange={(e) => {
                    setTherapistReg(e.target.value);
                    if (useCustomAsDefault) {
                      localStorage.setItem('clinic_custom_therapist_reg', e.target.value);
                    }
                  }}
                  placeholder="Ex: CRP SP 06/12345"
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1" htmlFor="custom-stamp-input">Adicionar Carimbo Profissional adicional (Vai sob a Assinatura)</label>
              <input
                id="custom-stamp-input"
                type="text"
                value={customStampText}
                onChange={(e) => {
                  setCustomStampText(e.target.value);
                  if (useCustomAsDefault) {
                     localStorage.setItem('clinic_custom_stamp_text', e.target.value);
                  }
                }}
                placeholder="Ex: PSICOPEDAGOGA CLÍNICA E ESP. EM INTERVENÇÃO ABA NO AUTISMO"
                className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 placeholder:text-slate-300"
              />
            </div>

            {/* "Deixar como Padrão" Toggle Controller */}
            <div className="border-t border-slate-200/60 pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1.5">
                  🛡️ Deixar como padrão permanente
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    title="Definir layout de cabeçalhos e carimbos como padrão"
                    checked={useCustomAsDefault} 
                    onChange={(e) => handleToggleUseCustomDefault(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveLayoutAsDefault}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-850 text-white font-bold text-[10.5px] uppercase p-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                💾 Salvar Template Padrão da Clínica
              </button>
              <p className="text-[9px] text-slate-400 font-medium italic text-center">
                Isto salva a identidade visual e carimbo. Em novos relatórios, apenas o miolo do paciente será trocado.
              </p>
            </div>
          </div>

          {/* Approach selection */}
          <div>
            <label className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider block mb-1.5">2. Abordagem Metodológica de Orientação</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'ABA', name: 'ABA 🧩' },
                { id: 'TCC', name: 'TCC 🧠' },
                { id: 'Comportamental', name: 'Behaviorismo 📈' },
                { id: 'Psicanálise', name: 'Psicanálise 🌀' },
                { id: 'Humanista', name: 'Humanista/Gestalt 🌱' }
              ].map((appr) => (
                <button
                  key={appr.id}
                  type="button"
                  onClick={() => {
                    setSelectedApproach(appr.id);
                    showToast(`Abordagem técnica configurada: ${appr.id}`, "info");
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedApproach === appr.id
                      ? 'bg-indigo-650 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-150 text-slate-700'
                  }`}
                >
                  {appr.name}
                </button>
              ))}
            </div>
          </div>

          {/* Template type selection */}
          <div>
            <label className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider block mb-1.5" htmlFor="report-template-selector">3. Modelo de Relatório Desejado</label>
            <select
              id="report-template-selector"
              value={selectedTemplateType}
              onChange={(e) => {
                setSelectedTemplateType(e.target.value);
                if (e.target.value === 'continuity') {
                  setSelectedReportType('Relatório de Prorrogação e Continuidade Custeada');
                } else if (e.target.value === 'school') {
                  setSelectedReportType('Parecer e Encaminhamento Escolar para PDI');
                } else if (e.target.value === 'evolution') {
                  setSelectedReportType('Relatório de Evolução Clínica Trimestral');
                } else {
                  setSelectedReportType('Relatório Clínico (Modelo Livre)');
                }
              }}
              className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700"
            >
              <option value="continuity">📋 Modelo de Solicitação de Continuidade (Com Cláusula Recomendatória)</option>
              <option value="evolution">📊 Relatório de Evolução Clínica de Rotina</option>
              <option value="school">🏫 Encaminhamento e Parcerias de Adaptação Escolar (PDI)</option>
              <option value="blank">✏️ Modelo Sem Nada (Iniciar com Esqueleto em Branco)</option>
            </select>
          </div>

          {/* Custom Prompt & Instructions */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider flex items-center gap-1" htmlFor="custom-instructions-input">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 4. Instruções e Direcionamento Clínico
              </label>
              <span className="text-[9px] text-slate-400 font-bold">Botão de Pedido Rápido</span>
            </div>
            
            <textarea
              id="custom-instructions-input"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Instruções adicionais específicas para guiar a lógica da Inteligência Artificial... Ex: 'Mencione a melhora nas birras escolares' ou 'Foque na introdução de alimentos secos'."
              className="w-full h-24 p-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/50"
            />

            {/* Pre-set chips representing quick commands to talk to the AI ("botãozinho") */}
            <div className="mt-2.5">
              <span className="text-[9px] font-semibold text-slate-400 block mb-1">Pressione um comando para anexar à sua instrução:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { text: 'Solicitar continuidade dos atendimentos de forma robusta e técnica', label: ' Pedir Continuidade' },
                  { text: "Carga horária de 20h de AT", label: " Carga 20h" },
                  { text: "Foco em Seletividade Alimentar e texturas", label: " Seletividade" },
                  { text: "Recomendar esvanecimento de dicas físicas", label: " Esvanecer Dicas" },
                  { text: "Solicitar inclusão de Fonoaudiologia especializada", label: " Fono" },
                  { text: "Incluir orientações familiares de rotina", label: " Pais" },
                  { text: "Focalizar regulação comportamental na oposição", label: " Comportamental" }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetInstruction(chip.text)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1 px-2 rounded-lg text-[9px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-indigo-600" /> {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Relatório de Inspiração */}
          <div className="border-t border-slate-200/50 pt-4">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-extrabold text-indigo-850 uppercase tracking-wider flex items-center gap-1.5" htmlFor="inspiration-text-input">
                <Bookmark className="w-3.5 h-3.5 text-indigo-650" /> 5. Relatório de Inspiração / Referência (Opcional)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInspirationText(
                      `I. IDENTIFICAÇÃO\nNome: [Nome Exemplo]\nObjetivo: Reavaliação de condutas para subsidiar renovação de carga horária contratual.\n\nIV. ANÁLISE COMPORTAMENTAL\nPaciente apresenta consolidação de repertórios de comunicação ativa através do uso de cartões de comunicação PECS, obtendo independência de 80% nos ensaios diários mais recentes. Notou-se, contudo, barreiras associadas à seletividade alimentar severa...`
                    );
                    showToast("Exemplo de Inspiração carregado!", "info");
                  }}
                  className="text-[9px] font-bold text-indigo-600 hover:text-indigo-850 cursor-pointer"
                >
                  Carregar Exemplo
                </button>
                {inspirationText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspirationText('');
                      showToast("Modelo de inspiração limpo.", "info");
                    }}
                    className="text-[9px] font-bold text-rose-650 hover:text-rose-800 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="inspiration-text-input"
              value={inspirationText}
              onChange={(e) => setInspirationText(e.target.value)}
              placeholder="Cole aqui um laudo ou relatório de um paciente anterior ou modelo padrão para incentivar a IA a imitar a estrutura, tom de escrita e vocabulário técnico acadêmico..."
              className="w-full h-24 p-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Core Action triggers */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => triggerGenerateReportAI(selectedPatient)}
              className="flex-1 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-800 hover:to-indigo-900 text-white p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {aiLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" /> Redigindo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Escrever com IA
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleStartBlankModel}
              className="flex-1 bg-white hover:bg-slate-50 text-indigo-750 border border-indigo-200 p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Iniciar em Branco
            </button>
          </div>

          {/* Approved References Library (Memória de Relatórios de Êxito) */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
              <span className="text-[10px] font-extrabold text-amber-950 uppercase tracking-widest flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600 fill-amber-350" /> 5. Memória de Relatórios de Êxito
              </span>
              <span className="text-[9.5px] bg-amber-200/60 text-amber-900 font-extrabold px-2 py-0.5 rounded-full font-mono">
                {goldenReports.length} {goldenReports.length === 1 ? 'salvo' : 'salvos'}
              </span>
            </div>

            {goldenReports.length === 0 ? (
              <div className="text-center p-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Bookmark className="w-5 h-5 text-slate-350 mx-auto mb-1.5" />
                <span className="text-[10px] font-bold text-slate-400 block p-0.5">Nenhum modelo de êxito salvo!</span>
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-1">
                  Quando gerar um laudo que você ou o paciente gostou muito, clique em <strong className="text-amber-700">"⭐ Salvar de Êxito"</strong> no cabeçalho do documento ativo para guardá-lo de referência.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                {goldenReports.map((report) => (
                  <div
                    key={report.id}
                    className="group bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all text-left"
                  >
                    <div className="flex-grow min-w-0">
                      <span className="text-[10.5px] font-bold text-slate-800 block truncate group-hover:text-indigo-950" title={report.title}>
                        {report.title}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1 text-[8.5px] font-extrabold text-slate-400 uppercase">
                        <span className="bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-100/50">
                          {report.approach}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                          {report.date}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action button triggers */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedGoldenViewing(report)}
                        className="p-1 px-2 bg-white hover:bg-indigo-50 text-indigo-750 hover:text-indigo-900 border border-slate-200 rounded-lg transition-all cursor-pointer text-[10px] font-bold flex items-center gap-1"
                        title="Visualizar modelo de referência completo"
                      >
                        <FileText className="w-3 h-3" /> Ver
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteGoldenReport(report.id, e)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                        title="Deletar este modelo aprovado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. RIGHT PANEL: A4 DYNAMIC DOCUMENT PREVIEW */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Top toolbar over the sheet */}
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-600">Visualizador Editorial</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!generatedReportText}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Imprimir documento oficial em formato profissional"
              >
                <FileText className="w-3.5 h-3.5" /> Imprimir
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!generatedReportText) return;
                  navigator.clipboard.writeText(generatedReportText);
                  showToast("Copiado com sucesso para a área de transferência!", "success");
                }}
                disabled={!generatedReportText}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copiar texto em formato Markdown para colar em outro editor"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Código
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!generatedReportText) return;
                  handleSaveGeneratedReportAsPDF(
                    selectedPatient.id, 
                    selectedReportType, 
                    selectedTemplateType === 'school' ? 'Relatório Escolar' : 'Evolução de Sessões', 
                    generatedReportText
                  );
                  showToast("Guardado no arquivo individual de prontuários do paciente!", "success");
                }}
                disabled={!generatedReportText}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Arquivar uma cópia deste relatório no histórico do paciente"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Arquivar (.pdf)
              </button>

              {/* Save to reference memory button */}
              <button
                type="button"
                onClick={handleSaveToGoldenMemory}
                disabled={!generatedReportText}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Salvar como relatório aprovado de êxito para referências futuras"
              >
                <Star className="w-3.5 h-3.5 fill-amber-100" /> Salvar de Êxito
              </button>

              <button
                type="button"
                onClick={() => {
                  setGeneratedReportText('');
                  showToast("Folha de rascunho limpa.", "info");
                }}
                className="px-2 py-1.5 text-slate-400 hover:text-rose-500 rounded-lg text-xs"
                title="Limpar papel de rascunhos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Generating Loader animation */}
          {aiLoading && (
            <div className="bg-white/90 border border-slate-100 rounded-2xl shadow-md p-12 text-center flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border-4 border-indigo-400 border-t-transparent animate-spin flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-indigo-950 text-sm">Algoritmo Clínico Processando Dados</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mx-auto">
                  Lendo plano PDI, coletas de coletas ABA, logs semanais e aplicando a visão teórica da abordagem {selectedApproach}. Por favor, aguarde alguns segundos.
                </p>
              </div>
            </div>
          )}

          {/* Stationary printable preview */}
          {!aiLoading && (
            <div id="clinical-printable-station" className="bg-[#FAF9F5] aspect-[1/1.41] shadow-lg rounded-2xl border border-slate-250 p-6 md:p-8 flex flex-col relative select-all scrollbar-thin">
              
              {/* Top decorative clinical bar */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-indigo-700 via-indigo-900 to-indigo-850" />
              
              {/* Brand Header */}
              <div className="flex items-center gap-3 border-b border-slate-250 pb-5 mt-3">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                  {customLogoUrl ? (
                    <img src={customLogoUrl} className="w-full h-full object-contain p-1" alt="Logo Clínica" referrerPolicy="no-referrer" />
                  ) : (
                    emojiLogoSource()
                  )}
                </div>
                <div className="text-left">
                  <h4 className="font-extrabold text-indigo-950 text-base leading-tight">
                    {customHeaderTitle || clinicNameText()}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                    {customHeaderSubtitle ? 'Laudos e Relatórios' : 'Laudos e Pareceres Psicológicos Clínicos'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold italic mt-0.5 block">
                    {customHeaderSubtitle || 'Sorocaba, São Paulo'}
                  </span>
                </div>
              </div>

              {/* Header Line Name */}
              <div className="text-center my-4">
                <span className="text-xs font-extrabold text-indigo-750 border-b border-indigo-300 pb-0.5 tracking-wider uppercase">
                  {selectedReportType}
                </span>
              </div>

              {/* Patient metadata identification block cards */}
              <div className="bg-slate-100/90 border border-slate-200/50 rounded-xl p-3.5 mb-5 grid grid-cols-2 md:grid-cols-3 gap-2 text-left text-slate-800 text-[11px] leading-relaxed">
                <div>
                  <strong className="text-[9px] block text-slate-400 uppercase tracking-tight">Paciente:</strong>
                  <span className="font-bold text-slate-900">{selectedPatient?.nome}</span>
                </div>
                <div>
                  <strong className="text-[9px] block text-slate-400 uppercase tracking-tight">Idade:</strong>
                  <span className="font-bold text-slate-900">{selectedPatient?.idade} anos</span>
                </div>
                <div>
                  <strong className="text-[9px] block text-slate-400 uppercase tracking-tight">Diagnóstico principal:</strong>
                  <span className="font-bold text-indigo-950">{selectedPatient?.diagnose}</span>
                </div>
                <div className="col-span-2">
                  <strong className="text-[9px] block text-slate-400 uppercase tracking-tight">Responsável Legal:</strong>
                  <span className="font-semibold text-slate-800">{selectedPatient?.responsaveis || 'Não informado'}</span>
                </div>
                <div>
                  <strong className="text-[9px] block text-slate-400 uppercase tracking-tight">Instituição Escolar:</strong>
                  <span className="font-semibold text-slate-800">{selectedPatient?.escola || 'Não informado'}</span>
                </div>
              </div>

              {/* Paper body editor area - TEXTAREA that expands inside the sheet */}
              <div className="flex-grow flex flex-col">
                <textarea
                  title="Conteúdo do laudo"
                  value={generatedReportText}
                  onChange={(e) => setGeneratedReportText(e.target.value)}
                  placeholder="Os dados clínicos de seu relatório gerado por inteligência artificial aparecerão aqui em formato formal de papel timbrado. Você poderá editá-lo diretamente, apagando ou inserindo novas linhas técnicas para customização ideal antes da impressão final."
                  className="w-full flex-grow text-xs bg-transparent border-none text-slate-800 focus:outline-none resize-none font-sans leading-relaxed select-text min-h-[250px]"
                />
              </div>

              {/* Signature bottom block stamp */}
              <div className="border-t border-slate-250 pt-4 text-center mt-6">
                <span className="italic block text-[9.5px] text-slate-400 mb-6">Feito eletronicamente em conformidade ética profissional.</span>
                <div className="flex justify-center items-center">
                  <div className="flex flex-col items-center">
                    <div className="w-56 border-b border-slate-350 mb-1" />
                    <span className="font-extrabold text-slate-900 text-xs">{therapistName || 'Profissional Clínico'}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{therapistReg || 'Conselho Regional'}</span>
                    {customStampText && (
                      <div className="mt-2 border border-dashed border-indigo-400 rounded-lg p-1.5 px-3 bg-indigo-50/20 text-[9px] text-indigo-800 flex items-center gap-1 font-mono tracking-wider max-w-[280px] truncate" title={customStampText}>
                        <span>📌 CARIMBO:</span>
                        <span className="font-medium uppercase">{customStampText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI INTERACTIVE REFINEMENT BOX ("botãozinho pra falar com a ia") */}
          {generatedReportText && !aiLoading && (
            <div className="bg-indigo-50/50 rounded-2xl border border-indigo-150 p-4 flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">🤖</div>
                <div>
                  <h4 className="font-extrabold text-xs text-indigo-950">Ajuste e Diálogo de Refinamento com a IA</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Use o chat para instruir modificações precisas ao texto atual sob demanda.</p>
                </div>
              </div>

              {/* Input element to refine with IA */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineInstructions}
                  onChange={(e) => setRefineInstructions(e.target.value)}
                  placeholder="Ex: 'Adicione que as sessões ocorrem no setting domiciliar' ou 'Remova o último parágrafo e reescreva o desfecho'."
                  className="flex-grow text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      triggerRefineReportAI(selectedPatient);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => triggerRefineReportAI(selectedPatient)}
                  className="bg-indigo-650 hover:bg-indigo-750 text-white p-2.5 px-4 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer shadow-sm"
                >
                  Refinar Texto
                </button>
              </div>

              {/* Refinement presets for ease of use */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[9px] font-bold text-slate-400 block self-center">Sugestões rápidas de reescrita:</span>
                {[
                  { text: "Tornar o texto inteiro mais acolhedor e explicativo para os pais", label: "Tom Acolhedor" },
                  { text: "Linguagem técnica acadêmica e densa para auditor de convênio médico", label: "Técnico/Auditoria" },
                  { text: "Adicione recomendação formal de fonoaudiologia e integração sensorial", label: "Apoios Multidisciplinares" },
                  { text: "Solicitar o aumento de 15h para 20h semanais sob justificativa clínica", label: "Ampliar Carga AT" }
                ].map((ref, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetRefinement(ref.text)}
                    className="bg-white hover:bg-slate-100 border border-indigo-100 hover:border-indigo-200 text-indigo-850 p-1 px-2 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                  >
                    💬 {ref.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      ) : (
        <PsychologistAnamnesisWorkshop
          clinicData={clinicData}
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
          showToast={showToast}
          handleSaveGeneratedReportAsPDF={handleSaveGeneratedReportAsPDF}
          therapistName={therapistName}
          therapistReg={therapistReg}
          clinicLogoIcon={clinicLogoIcon}
        />
      )}

      {/* Saving to Reference Memory Modal */}
      {savingGoldenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-left" id="save-golden-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xl max-w-md w-full animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5" id="save-golden-modal-title">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Memorizar Relatório de Êxito
              </h4>
              <button 
                type="button" 
                onClick={() => setSavingGoldenModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Fechar diálogo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Dê um título descritivo para salvar como modelo aprovado. Você poderá carregá-lo novamente no editor com um clique para usá-lo como base de novos relatórios.
              </p>
              <label htmlFor="golden-title-input" className="sr-only">Título do Modelo</label>
              <input
                id="golden-title-input"
                type="text"
                value={newGoldenTitle}
                onChange={(e) => setNewGoldenTitle(e.target.value)}
                placeholder="Ex: Prorrogação Unimed - Foco em ABA e Autolesão"
                className="w-full text-xs font-bold p-2.5 mt-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-850"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmSaveToGoldenMemory();
                }}
              />
              <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                Tipo: {selectedReportType} | Abordagem: {selectedApproach}
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSavingGoldenModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSaveToGoldenMemory}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Salvar Modelo de Êxito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Stored Golden Report Modal */}
      {selectedGoldenViewing && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-left" id="view-golden-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xl max-w-2xl w-full animate-fade-in flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <h4 className="font-extrabold text-indigo-950 text-sm truncate" id="view-golden-modal-title">
                  {selectedGoldenViewing.title}
                </h4>
                <p className="text-[10.5px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-50 text-indigo-750 px-1.5 py-0.2 rounded border border-indigo-100/50">{selectedGoldenViewing.approach}</span>
                  <span>Salvo em {selectedGoldenViewing.date}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedGoldenViewing(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0 ml-4 hover:scale-110 transition-all font-bold"
                title="Fechar visualizador"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto bg-[#FAF9F5] border border-slate-200 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-750 whitespace-pre-wrap select-all max-h-[450px]">
              {selectedGoldenViewing.text}
            </div>

            <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedGoldenViewing.text);
                  showToast("Copiado com sucesso para a área de transferência!", "success");
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Texto Completo
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGoldenViewing(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGoldenReport(selectedGoldenViewing.text)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
                >
                  ✓ Carregar no Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
