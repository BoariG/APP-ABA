import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Paperclip, Image, FileText, Download, 
  Copy, Plus, Loader2, Check, RefreshCw, FolderOpen, Maximize2, Save, X 
} from 'lucide-react';
import { Patient, ClinicData, PatientDocument } from '../types';

interface AIPatientGuideProps {
  patient: Patient;
  clinicData: ClinicData;
  handleUploadDocument: (
    patientId: string,
    name: string,
    type: 'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro',
    notes: string,
    base64?: string
  ) => void;
  brandColors: {
    primaryBg: string;
    primaryBgHover: string;
    text: string;
    border: string;
    pill: string;
  };
  onUseAsDraft?: (text: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachment?: {
    name: string;
    mimeType: string;
    base64?: string;
  };
  generatedImage?: string; // data URI if assistant generated an image
  isDraftDocument?: boolean; // if response can be saved as a document
}

export const AIPatientGuide: React.FC<AIPatientGuideProps> = ({
  patient,
  clinicData,
  handleUploadDocument,
  brandColors,
  onUseAsDraft
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Olá! Eu sou o **Guia de IA** do prontuário do(a) **${patient.nome}**. \n\nPosso ajudar você a analisar o comportamento dele(a), interpretar laudos médicos, criar novos planos de ensino (programas de ensino ABA), estruturar rotinas visuais e até gerar recursos pedagógicos. \n\n**O que você gostaria de fazer hoje?**\n* 📝 *Gerar rotinas estruturadas ou tarefas para os pais*\n* 📊 *Analisar um laudo médico ou relatório escolar*\n* 🎨 *Criar imagens de apoio visual (PECS ou cartões de incentivo)*`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'chat' | 'imagem'>('chat');
  
  // Image generation options
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageRatio, setImageRatio] = useState<'1:1' | '3:4' | '4:3' | '16:9'>('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Document save modal state
  const [savingDocText, setSavingDocText] = useState<string | null>(null);
  const [docSaveName, setDocSaveName] = useState('');
  const [docSaveType, setDocSaveType] = useState<'Laudo Médico' | 'Avaliação Sensorial' | 'Relatório Escolar' | 'PDI/PEI' | 'Evolução de Sessões' | 'Outro'>('PDI/PEI');
  const [docSaveNotes, setDocSaveNotes] = useState('');
  const [isSavedConfirmation, setIsSavedConfirmation] = useState(false);
  
  // Image zoom modal
  const [zoomImgUrl, setZoomImgUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle local file selection to read
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          mimeType: file.type || 'application/pdf',
          base64: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Attach an existing document from the patient's records
  const handleAttachExistingDoc = (docId: string) => {
    if (!docId) return;
    const documentObj = (clinicData.documentos || []).find(d => d.id === docId);
    if (documentObj) {
      setAttachedFile({
        name: documentObj.name,
        mimeType: 'application/pdf',
        base64: documentObj.base64 || ''
      });
      setSelectedDocId('');
    }
  };

  // Direct clinical summary action for a document
  const handleSummarizeDocument = async (doc: PatientDocument) => {
    setIsLoading(true);

    const userMsg: Message = {
      id: `msg_sum_${Date.now()}`,
      role: 'user',
      text: `📝 **Solicitação de Resumo Clínico para o Documento:** *"${doc.name}"* \n\nPor favor, faça uma análise aprofundada e resuma as principais conclusões clínicas, componentes de diagnóstico, déficits observados, orientações metodológicas e recomendações deste documento (${doc.type}).`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      attachment: doc.base64 ? {
        name: doc.name,
        mimeType: doc.base64.startsWith('data:') ? doc.base64.split(';')[0].split(':')[1] : 'application/pdf',
        base64: doc.base64
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          history: [], 
          message: `Por favor, faça um resumo clínico detalhado e estruturado em seções em português do Brasil com excelente rigor clínico aplicável para o tratamento do paciente para o documento "${doc.name}" (de tipo "${doc.type}"). Se houver um arquivo PDF/Imagem anexado com base64, analise-o atentamente. Caso contrário ou complementarmente, use as seguintes anotações de prontuário: "${doc.notes || 'Nenhuma anotação adicional disponível.'}".`,
          attachedFile: userMsg.attachment
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição para a IA.');
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isDraftDocument: true
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Erro de Processamento:** Não foi possível contactar a inteligência artificial para resumir o documento. Certifique-se de que a sua **GEMINI_API_KEY** foi adicionada em Configurações > Secrets.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct clinical goal extraction action for a document
  const handleExtractGoals = async (doc: PatientDocument) => {
    setIsLoading(true);

    const userMsg: Message = {
      id: `msg_goals_${Date.now()}`,
      role: 'user',
      text: `🎯 **Solicitação de Extração de Metas & Programas ABA para:** *"${doc.name}"* \n\nPor favor, leia atentamente as instruções acadêmicas, comportamentais ou sensoriais do documento (${doc.type}) e extraia uma listagem recomendada de metas clínicas de desenvolvimento, alvos de ensino e propostas de programas estruturados (conforme o modelo de terapia ABA) sob medida para o paciente.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      attachment: doc.base64 ? {
        name: doc.name,
        mimeType: doc.base64.startsWith('data:') ? doc.base64.split(';')[0].split(':')[1] : 'application/pdf',
        base64: doc.base64
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          history: [], 
          message: `Por favor, analise o documento "${doc.name}" (de tipo "${doc.type}") e extraia uma listagem recomendada de metas comportamentais, pedagógicas e clínicas específicas para o paciente. Crie propostas formais de programas de ensino ABA com descrição, área do desenvolvimento e critérios de domínio. Caso haja anotações adicionais, integre-as na formulação: "${doc.notes || 'Sem anotações adicionais'}".`,
          attachedFile: userMsg.attachment
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição para a IA.');
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isDraftDocument: true
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Erro de Processamento:** Não foi possível extrair metas.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy assistant response
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Texto copiado com sucesso!');
  };

  const cleanMarkdownText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>')
      .split('\n').map((para, i) => {
        if (para.trim().startsWith('*') || para.trim().startsWith('-')) {
          return `<li class="ml-4 list-disc mt-1">${para.trim().substring(1).trim()}</li>`;
        }
        return para.trim() ? `<p class="mt-2 text-slate-700 leading-relaxed">${para}</p>` : '<div class="h-1.5"></div>';
      }).join('');
  };

  // Message Send action
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !attachedFile) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      attachment: attachedFile ? { 
        name: attachedFile.name, 
        mimeType: attachedFile.mimeType,
        base64: attachedFile.base64
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      // Call API server endpoint
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          history: chatHistory,
          message: userMsg.text || `Analise o arquivo anexo "${userMsg.attachment?.name}" e extraia as principais recomendações e análises comportamentais.`,
          attachedFile: userMsg.attachment
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição para o servidor de Inteligência Artificial.');
      }

      const data = await response.json();
      
      const isDocDraft = data.text.length > 250; // Offer to save as document if text is detailed

      const assistantMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isDraftDocument: isDocDraft
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Erro de Conexão:** Não foi possível contactar o servidor do Guia de IA. Certifique-se de que a sua **GEMINI_API_KEY** foi adicionada em Configurações > Secrets.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Image from Prompt
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);

    try {
      const response = await fetch('/api/ai-generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageRatio
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao solicitar a criação de imagens educacionais.');
      }

      const data = await response.json();

      const userMsg: Message = {
        id: `msg_img_req_${Date.now()}`,
        role: 'user',
        text: `🎨 *Gere um apoio visual: "${imagePrompt}" (Proporção: ${imageRatio})*`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      const assistantMsg: Message = {
        id: `msg_img_res_${Date.now()}`,
        role: 'assistant',
        text: `Aqui está o recurso de apoio visual gerado para o(a) **${patient.nome}** sob medida:\n\n*Prompt:* "${imagePrompt}"`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        generatedImage: data.imageUrl
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setImagePrompt('');
    } catch (err: any) {
      console.error(err);
      alert('Houve um erro ao gerar a imagem educacional via Gemini API. Por favor, verifique se seu servidor possui uma GEMINI_API_KEY ativa.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Save document to patient documents
  const handleSaveDocToProntuario = () => {
    if (!savingDocText) return;
    handleUploadDocument(
      patient.id,
      docSaveName || `RECURSO_IA_${Date.now()}`,
      docSaveType,
      docSaveNotes || 'Documento elaborado em parceria com o Guia clínico de Inteligência Artificial.',
      savingDocText
    );
    setIsSavedConfirmation(true);
    setTimeout(() => {
      setIsSavedConfirmation(false);
      setSavingDocText(null);
    }, 1800);
  };

  const patientDocs = clinicData.documentos?.filter(d => d.patientId === patient.id) || [];

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-slate-800">
      
      {/* Tab Switcher inside Assistant */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 rounded-xl gap-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMode('chat')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeMode === 'chat'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Chat Clínico Inteligente (ChatGPT)
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('imagem')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeMode === 'imagem'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Image className="w-3.5 h-3.5" /> Criar Apoio Visual / Imagens de Apoio
        </button>
      </div>

      {activeMode === 'chat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-[600px]">
          
          {/* Main Chat Frame */}
          <div className="lg:col-span-8 flex flex-col bg-slate-50 border border-slate-150 rounded-2xl overflow-hidden shadow-xs h-full relative">
            
            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map(m => (
                <div 
                  key={m.id} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-100`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-3xs flex flex-col gap-2 ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-150 text-slate-800 rounded-tl-none'
                  }`}>
                    
                    {/* Header info */}
                    <div className="flex items-center justify-between text-[10px] opacity-60 border-b pb-1 font-semibold border-slate-100/10">
                      <span>{m.role === 'user' ? 'Você (Terapeuta)' : 'Guia de IA'}</span>
                      <span>{m.timestamp}</span>
                    </div>

                    {/* Text block with styled parse */}
                    <div 
                      className={`text-xs ${m.role === 'user' ? 'text-white' : 'text-slate-700'} space-y-1`}
                      dangerouslySetInnerHTML={{ __html: cleanMarkdownText(m.text) }}
                    />

                    {/* Attachment preview if user uploaded a file */}
                    {m.attachment && (
                      <div className={`mt-2 flex items-center gap-2 p-2 rounded-xl text-xs ${
                        m.role === 'user' ? 'bg-indigo-700/60 text-white' : 'bg-slate-50 border'
                      }`}>
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate font-semibold max-w-[150px]">{m.attachment.name}</span>
                        <span className="text-[9px] uppercase font-bold opacity-60">PDF/Img</span>
                      </div>
                    )}

                    {/* Image visual support if AI generated one */}
                    {m.generatedImage && (
                      <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-150 bg-slate-50 group">
                        <img 
                          src={m.generatedImage} 
                          alt="Visual Support Card" 
                          className="w-full h-auto max-h-[220px] object-cover rounded-lg cursor-pointer hover:opacity-95 transition-all"
                          onClick={() => setZoomImgUrl(m.generatedImage || null)}
                        />
                        <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => setZoomImgUrl(m.generatedImage || null)}
                            className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs"
                            title="Expandir Imagem"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <a 
                            href={m.generatedImage} 
                            download={`recurso_visual_${m.id}.png`}
                            className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs flex items-center justify-center"
                            title="Baixar Imagem"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button 
                            type="button"
                            onClick={() => {
                              setSavingDocText(m.generatedImage);
                              setDocSaveName(`PECS_${patient.nome.split(' ')[0].toUpperCase()}_${Date.now().toString().slice(-4)}`);
                              setDocSaveType('Outro');
                              setDocSaveNotes(`Apoio visual PECS: ${m.text}`);
                            }}
                            className="p-1.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs"
                            title="Salvar no Prontuário"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons under responses */}
                    {m.role === 'assistant' && m.id !== 'welcome' && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px] text-slate-500">
                        {onUseAsDraft && (
                          <button
                            type="button"
                            onClick={() => onUseAsDraft(m.text)}
                            className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100/90 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold border border-amber-150"
                            title="Usar essa resposta para o rascunho de mensagem para os pais"
                          >
                            <Send className="w-3 h-3 text-amber-600 animate-pulse" /> Usar Rascunho
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyText(m.text)}
                          className="px-2 py-1 hover:bg-slate-100 hover:text-slate-800 rounded transition-all cursor-pointer flex items-center gap-1 border border-slate-150"
                        >
                          <Copy className="w-3 h-3" /> Copiar Resposta
                        </button>
                        {m.isDraftDocument && (
                          <button
                            type="button"
                            onClick={() => {
                              setSavingDocText(m.text);
                              setDocSaveName(`Plano IA - ${m.text.substring(0, 15)}...`);
                              setDocSaveType('PDI/PEI');
                              setDocSaveNotes('Guia ou plano terapêutico desenvolvido em parceria com o assistente clínico de IA do prontuário.');
                            }}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold border border-indigo-100"
                            title="Grave este roteiro clínico de IA diretamente na ficha do paciente"
                          >
                            <Save className="w-3 h-3" /> Salvar no Prontuário
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border rounded-2xl rounded-tl-none p-4 shadow-3xs flex items-center gap-2 text-slate-500 font-semibold text-xs border-slate-205">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Guia de IA está analisando prontuário e pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Attachments Section */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-150 flex flex-col gap-3">
              
              {/* Active attached file indicator */}
              {attachedFile && (
                <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-between gap-2 shadow-3xs text-xs animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-indigo-800 font-semibold truncate">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate max-w-[280px]">{attachedFile.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setAttachedFile(null)} 
                    className="p-1 hover:bg-indigo-100 text-indigo-600 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                {/* File input click box */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 cursor-pointer transition-all flex items-center justify-center"
                  title="Anexar PDF ou Imagem local para IA ler"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf,image/*" 
                  className="hidden" 
                />

                <input
                  type="text"
                  placeholder={`Pergunte algo sobre ${patient.nome} ou escreva instruções...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border rounded-xl text-xs bg-slate-50 text-slate-800 border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                <button
                  type="submit"
                  disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl text-white flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLoading || (!inputMessage.trim() && !attachedFile)
                      ? 'bg-slate-350 cursor-not-allowed opacity-60'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar: Patient's Documents context reader */}
          <div className="lg:col-span-4 flex flex-col bg-white border border-slate-150 rounded-2xl p-5 shadow-xs h-full justify-between">
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-indigo-650" />
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                  Leitor de Documentos ({patientDocs.length})
                </h4>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-dashed">
                Selecione abaixo um laudo ou relatório escolar ativo do prontuário para que o <strong>Guia de IA</strong> leia e incorpore como base de contexto para suas respostas.
              </p>

              <div className="flex flex-col gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                {patientDocs.map(d => (
                  <div
                    key={d.id}
                    className="p-3 border rounded-xl border-slate-200 bg-white hover:border-indigo-250 transition-all flex flex-col gap-2 shadow-3xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-650 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate" title={d.name}>
                          {d.name}
                        </p>
                        <p className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-1">
                          {d.type}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Upload: {d.uploadDate.split('-').reverse().join('/')}
                        </p>
                        {d.notes && (
                          <div className="text-[9px] text-slate-500 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            Anotações: "{d.notes}"
                          </div>
                        )}
                        {d.base64 && d.base64.length > 100 && (
                          <div className="text-[8px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded-md inline-flex items-center gap-0.5 mt-1.5 font-sans">
                            <Check className="w-2.5 h-2.5" /> Conteúdo Integro Pronto
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons inside each document card */}
                    <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 justify-end">
                      <button
                        type="button"
                        onClick={() => handleAttachExistingDoc(d.id)}
                        className="px-2 py-1 text-[9px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                        title="Anexar este arquivo ao chat como contexto da conversa"
                      >
                        <Paperclip className="w-2.5 h-2.5 text-slate-550" /> Anexar
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSummarizeDocument(d)}
                        disabled={isLoading}
                        className="px-2 py-1 text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-emerald-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Analisar e resumir este laudo/documento clínico integral"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600 animate-pulse" /> Resumir
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleExtractGoals(d)}
                        disabled={isLoading}
                        className="px-2 py-1 text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-850 rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-amber-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Extrair metas comportamentais para Planos PEI/PDI automáticos"
                      >
                        <Plus className="w-2.5 h-2.5 text-amber-600" /> Extrair Metas
                      </button>
                    </div>
                  </div>
                ))}

                {patientDocs.length === 0 && (
                  <div className="py-8 text-center text-[10px] text-slate-400">
                    Nenhum documento arquivado para este paciente. Use a aba "Documentos" do menu principal para carregar PDFs históricas.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200 p-3.5 rounded-2xl flex flex-col gap-2">
              <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                📌 Dica do Analista ABA
              </span>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Você pode anexar um PDF fornecido pela escola ou equipe médica e digitar: <strong>"Quais são os déficits sensoriais descritos? Elabore um programa de treino ABA com base neles."</strong>
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Image generation visual assistant screen */
        <div className="bg-white border rounded-2xl border-slate-150 p-6 flex flex-col gap-6 shadow-xs animate-in fade-in duration-100">
          <div className="flex flex-col md:flex-row items-start justify-between border-b pb-4 border-slate-100 gap-4">
            <div>
              <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-1.5">
                🎨 Gerador de Recursos de Apoio Visual
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Crie cartões ilustrados no padrão PECS, rotinas sensoriais de higiene/alimentação ou folhas de adesivos de reforço lúdicos para o(a) {patient.nome}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Options configuration column */}
            <div className="md:col-span-5 bg-slate-50 p-5 border rounded-2xl flex flex-col gap-5 justify-between">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase font-bold text-slate-600 tracking-wider">
                    Instrução do Card / Apoio Desejado
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ex: Cartão de apoio para Lucas apontando ou selecionando escova de dente, estilo cartoon amigável..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[9px] text-slate-400">
                    Seja específico no que deseja desenhado no cartão terapêutico para ajudar na regulação.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase font-bold text-slate-600 tracking-wider">
                    Proporção do Cartão (Aspect Ratio)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['1:1', '3:4', '4:3', '16:9'] as const).map(ratio => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setImageRatio(ratio)}
                        className={`py-2 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          imageRatio === ratio 
                            ? 'bg-indigo-650 text-white border-indigo-650' 
                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className={`w-full py-3 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isGeneratingImage || !imagePrompt.trim()
                      ? 'bg-slate-350 cursor-not-allowed opacity-60'
                      : 'bg-indigo-650 hover:bg-indigo-750 shadow-sm'
                  }`}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Modelo Gemini está desenhando visual...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Gerar Apoio Visual Clínico
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Display list of visual charts generated */}
            <div className="md:col-span-7 border border-dashed rounded-2xl flex flex-col items-center justify-center p-6 bg-slate-50/20">
              {messages.filter(m => m.generatedImage).length > 0 ? (
                <div className="grid grid-cols-2 gap-4 w-full max-h-[350px] overflow-y-auto">
                  {messages.filter(m => m.generatedImage).map(m => (
                    <div 
                      key={m.id} 
                      className="bg-white border rounded-xl overflow-hidden shadow-3xs hover:shadow-xs hover:border-indigo-205 transition-all relative group"
                    >
                      <img 
                        src={m.generatedImage} 
                        alt="PECS Visual asset" 
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => setZoomImgUrl(m.generatedImage || null)}
                      />
                      <div className="p-2 border-t">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{m.text.substring(0, 30)}...</p>
                        <div className="mt-2 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setZoomImgUrl(m.generatedImage || null)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded"
                            title="Ver Tela Cheia"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                          <a
                            href={m.generatedImage}
                            download={`apoio_visual_${m.id}.png`}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded flex items-center justify-center"
                            title="Baixar PECS"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setSavingDocText(m.generatedImage);
                              setDocSaveName(`PECS_${patient.nome.split(' ')[0].toUpperCase()}`);
                              setDocSaveType('Outro');
                              setDocSaveNotes('Card de incentivo físico gerado por IA para terapia naturalística.');
                            }}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded"
                            title="Gravar no Prontuário"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-slate-400">
                  <Image className="w-10 h-10 stroke-1 text-slate-350" />
                  <p className="text-xs font-semibold">Nenhum apoio visual gerado nesta sessão ainda.</p>
                  <p className="text-[10px] max-w-[280px]">As imagens geradas utilizam o modelo de desenho gemini-2.5-flash-image e podem ser adicionadas diretamente na ficha do paciente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ZOOM ON GENERATED IMAGE */}
      {zoomImgUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700 animate-in zoom-in duration-100">
            <button 
              type="button"
              onClick={() => setZoomImgUrl(null)}
              className="absolute right-4 top-4 p-2 bg-black/60 text-white hover:bg-black/90 rounded-full cursor-pointer z-50"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={zoomImgUrl} 
              alt="PECS zoomed" 
              className="w-full h-auto max-h-[500px] object-contain"
            />
            <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-between items-center text-white">
              <span className="text-xs font-semibold">Apoio Visual Terapêutico para {patient.nome}</span>
              <a 
                href={zoomImgUrl} 
                download={`apoio_visual_${patient.nome.split(' ')[0].toUpperCase()}.png`}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Imagem PNG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAVE DRAFT REWRITE AS OFFICIAL CLINICAL DOCUMENT */}
      {savingDocText && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Save className="w-4 h-4 text-indigo-600" /> Salvar Material no Prontuário Clínico
              </h3>
              <button 
                type="button" 
                onClick={() => setSavingDocText(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-655 uppercase tracking-wide text-[10px]">Nome do Arquivo</label>
                <input 
                  type="text" 
                  value={docSaveName} 
                  onChange={(e) => setDocSaveName(e.target.value)} 
                  className="px-3 py-1.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Roteiro_Inclusao_Lucas"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-655 uppercase tracking-wide text-[10px]">Categoria do Documento</label>
                <select 
                  value={docSaveType} 
                  onChange={(e) => setDocSaveType(e.target.value as any)} 
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-semibold bg-white"
                >
                  <option value="Laudo Médico">Laudo Médico / Parecer</option>
                  <option value="Avaliação Sensorial">Avaliação Sensorial</option>
                  <option value="Relatório Escolar">Relatório de Evolução Escolar</option>
                  <option value="PDI/PEI">Plano de Desenvolvimento Individualizado (PDI)</option>
                  <option value="Evolução de Sessões">Evolução Integral</option>
                  <option value="Outro">Outro Material de Apoio</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-655 uppercase tracking-wide text-[10px]">Notas de Prontuário</label>
                <textarea 
                  rows={2}
                  value={docSaveNotes} 
                  onChange={(e) => setDocSaveNotes(e.target.value)} 
                  className="px-3 py-1.5 border border-slate-200 rounded-xl"
                  placeholder="Anotações administrativas sobre o uso desse material..."
                />
              </div>
            </div>

            {isSavedConfirmation ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 font-bold text-xs text-center flex items-center justify-center gap-1.5 animate-pulse">
                <Check className="w-4 h-4 text-emerald-600" /> Documento gravado e integrado com sucesso!
              </div>
            ) : (
              <div className="flex justify-end gap-2.5 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSavingDocText(null)}
                  className="px-4 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDocToProntuario}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                >
                  Confirmar e Salvar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
