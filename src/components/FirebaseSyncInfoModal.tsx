import React, { useState } from 'react';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Copy, 
  Check, 
  X, 
  Download, 
  ExternalLink,
  Info,
  Layers
} from 'lucide-react';
import { ClinicData } from '../types';

interface FirebaseSyncInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClinic: 'ABA' | 'Atria';
  firebaseAuthenticated: boolean;
  clinicData: ClinicData;
  projectId: string;
}

export function FirebaseSyncInfoModal({
  isOpen,
  onClose,
  activeClinic,
  firebaseAuthenticated,
  clinicData,
  projectId
}: FirebaseSyncInfoModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyBackup = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(clinicData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar dados", err);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clinicData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `prontuario_backup_${activeClinic.toLowerCase()}_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Erro ao baixar backup", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        id="firebase-sync-modal"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-950">Status de Salvamento & Nuvem</h3>
              <p className="text-[10px] text-slate-500 font-medium">Controle de sincronização para todos os dispositivos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          
          {/* Status Panel */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado da Conexão</h4>
            
            {/* Local Storage Indicator - ALWAYS Active */}
            <div className="p-3 bg-emerald-50/75 border border-emerald-100 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-950">Salvamento Local Ativo</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold uppercase">100% SEGURO</span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed mt-1">
                  Todos os prontuários, agendas, planos e registros de atendimento da clínica <strong>{activeClinic === 'ABA' ? 'Clínica ABA' : 'Caminho ABA'}</strong> estão sendo salvos automaticamente no banco interno do seu navegador (LocalStorage) sem riscos de perda.
                </p>
              </div>
            </div>

            {/* Supabase Cloud Sync Indicator */}
            {firebaseAuthenticated ? (
              <div className="p-3 bg-sky-50/75 border border-sky-100 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-sky-500 text-white rounded-xl shadow-xs mt-0.5">
                  <Wifi className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-sky-950">Sincronização em Nuvem Ativa</span>
                    <span className="text-[9px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-extrabold uppercase">ONLINE COMPARTILHADO</span>
                  </div>
                  <p className="text-[10px] text-sky-800 leading-relaxed mt-1">
                    Os dados estão conectados no Supabase PostgreSQL. Qualquer edição feita neste dispositivo será instantaneamente replicada para tablets, celulares ou computadores dos demais acompanhantes de forma automática.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/75 border border-amber-100 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs mt-0.5">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950">Modo Offline / Sem Nuvem Ativo</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-extrabold uppercase">BANDA LOCAL</span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-relaxed mt-1">
                    Sua base está local neste navegador. Para que os dados apareçam em <strong>outros dispositivos em tempo real</strong>, você precisa habilitar o provedor de autenticação no seu Console do Supabase.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Setup tutorial (Conditional: Only show if NOT authenticated) */}
          {!firebaseAuthenticated && (
            <div className="bg-slate-55 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Info className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-xs">Como ativar a Sincronização entre Dispositivos?</h4>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                O Supabase exige que o recurso **Sign-In Anônimo (Anonymous)** esteja habilitado no console para sincronizar os dados sem obrigar que todos os seus pacientes criem contas. É super simples e gratuito:
              </p>
              
              <ol className="text-[10px] text-slate-600 space-y-2 list-decimal list-inside font-semibold leading-relaxed">
                <li>
                  Acesse o seu <a href={`https://supabase.com/dashboard/project/${projectId}/auth/providers`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5">Dashboard do Supabase <ExternalLink className="w-3 h-3" /></a>.
                </li>
                <li>
                  Vá na seção lateral <strong>Authentication</strong> e clique em <strong>Providers</strong>.
                </li>
                <li>
                  Localize o provedor <strong>Anonymous</strong>.
                </li>
                <li>
                  Ative a opção (Enable Anonymous Sign-Ins) e clique em <strong>Save</strong>.
                </li>
                <li>
                  Recarregue esta página do sistema! O sync em tempo real será ativado instantaneamente.
                </li>
              </ol>
            </div>
          )}

          {/* Backup Utilities */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ações de Segurança dos Dados</h4>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Copy data button */}
              <button
                onClick={handleCopyBackup}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer active:scale-98"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
                <span>{copied ? 'Copiado!' : 'Copiar Prontuário'}</span>
              </button>

              {/* Download JSON backup */}
              <button
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 transition-all cursor-pointer inline-flex active:scale-98"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Salvar Backup JSON</span>
              </button>

            </div>
            <p className="text-[9px] text-slate-400 text-center">
              Você pode copiar ou fazer o download dos registros a qualquer momento para ter backups físicos de segurança.
            </p>
          </div>

          {/* Live devices stats mockup info */}
          <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="font-bold text-[11px] text-slate-750 block">Dados da Clínica {activeClinic}:</span>
                <span className="text-[10px] text-slate-400">
                  {clinicData.pacientes.length} Pacientes • {Object.keys(clinicData.planos).length} Planos • {clinicData.atendimentos.length} Atendimentos
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-98 shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
