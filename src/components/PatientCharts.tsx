import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ClinicData, Patient } from '../types';

interface PatientChartsProps {
  patientId: string;
  clinicData: ClinicData;
  updateClinicData: (data: ClinicData) => void;
  compact?: boolean;
}

export function PatientCharts({ patientId, clinicData, updateClinicData, compact = false }: PatientChartsProps) {
  const [groupingMode, setGroupingMode] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const patient = clinicData.pacientes.find(p => p.id === patientId);
  const programs = clinicData.treinos[patientId] || [];

  // Filter attempts based on selected program
  const allAttempts = selectedProgramId === 'all'
    ? programs.flatMap(p => p.tentativas || [])
    : programs.find(p => p.id === selectedProgramId)?.tentativas || [];
  const totalAttempts = allAttempts.length;
  const overallAttemptsCount = programs.flatMap(p => p.tentativas || []).length;
  
  // Calculate specific metrics
  const countByRegistro: Record<string, number> = {
    'Independente': 0,
    'Ajuda Gestual': 0,
    'Ajuda Verbal': 0,
    'Ajuda Física': 0,
    'Erro': 0
  };
  
  allAttempts.forEach(att => {
    if (countByRegistro[att.registro] !== undefined) {
      countByRegistro[att.registro]++;
    }
  });

  const independentRate = totalAttempts > 0 
    ? Math.round((countByRegistro['Independente'] / totalAttempts) * 100) 
    : 0;

  // Group by date/period for line chart evolution
  // Sort attempts by timestamp
  const sortedAttempts = [...allAttempts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const getGroupKey = (timestamp: string): { key: string; label: string } => {
    const d = new Date(timestamp);
    if (groupingMode === 'day') {
      const dateStr = timestamp.substring(0, 10);
      const label = dateStr.substring(8, 10) + '/' + dateStr.substring(5, 7); // DD/MM
      return { key: dateStr, label };
    } else if (groupingMode === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const dateStr = monday.toISOString().substring(0, 10);
      const label = `Sem. ${dateStr.substring(8, 10)}/${dateStr.substring(5, 7)}`;
      return { key: dateStr, label };
    } else if (groupingMode === 'month') {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const label = `${monthNames[monthIndex]}/${String(year).substring(2)}`;
      return { key, label };
    } else {
      const year = d.getFullYear();
      const key = `${year}`;
      const label = `${year}`;
      return { key, label };
    }
  };

  const attemptsByGroup: Record<string, { total: number; ind: number; label: string }> = {};
  const trialsVolumeByGroup: Record<string, { count: number; label: string }> = {};

  sortedAttempts.forEach(att => {
    const { key, label } = getGroupKey(att.timestamp);
    if (!attemptsByGroup[key]) {
      attemptsByGroup[key] = { total: 0, ind: 0, label };
    }
    attemptsByGroup[key].total++;
    if (att.registro === 'Independente') {
      attemptsByGroup[key].ind++;
    }

    if (!trialsVolumeByGroup[key]) {
      trialsVolumeByGroup[key] = { count: 0, label };
    }
    trialsVolumeByGroup[key].count++;
  });

  const lineChartData = Object.keys(attemptsByGroup).map(key => {
    const d = attemptsByGroup[key];
    return {
      date: d.label,
      rate: Math.round((d.ind / d.total) * 100),
      hits: d.ind,
      total: d.total,
      rawDate: key
    };
  }).sort((a,b) => a.rawDate.localeCompare(b.rawDate));

  const volumeChartData = Object.keys(trialsVolumeByGroup).map(key => {
    const d = trialsVolumeByGroup[key];
    return {
      date: d.label,
      count: d.count,
      rawDate: key
    };
  }).sort((a,b) => a.rawDate.localeCompare(b.rawDate));

  // Compute Behavior logs grouped by period (real-time synchronized)
  const behaviorLogs = (clinicData.comportamentoLogs || []).filter(l => l.patientId === patientId);
  const behaviorsByGroup: Record<string, { count: number; label: string }> = {};
  
  behaviorLogs.forEach(log => {
    const { key, label } = getGroupKey(log.timestamp || log.date);
    if (!behaviorsByGroup[key]) {
      behaviorsByGroup[key] = { count: 0, label };
    }
    behaviorsByGroup[key].count += (log.count || 1);
  });

  const behaviorChartData = Object.keys(behaviorsByGroup).map(key => {
    const d = behaviorsByGroup[key];
    return {
      date: d.label,
      count: d.count,
      rawDate: key
    };
  }).sort((a,b) => a.rawDate.localeCompare(b.rawDate));

  // Get distribution of Active and Mastered programs
  const masteredCount = programs.filter(p => p.status === 'dominado').length;
  const activeCount = programs.filter(p => p.status === 'ativo').length;
  const totalPrograms = programs.length;

  const handleCreateMockSampleData = () => {
    let targetPrograms = [...programs];
    if (targetPrograms.length === 0) {
      targetPrograms = [
        {
          id: `tr_${Date.now()}_1`,
          patientId: patientId,
          titulo: 'Rastreio e Contato Visual Pareado',
          area: 'Contato Visual',
          descricao: 'Paciente deve olhar para o aplicador por 3 segundos sob solicitação vocálica.',
          instrucoes: 'Espere que ele desvie o olhar. Chame e dê reforço tangível de imediato.',
          criterio: '90% independente.',
          alvo: 'Olhar por 3 segundos',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        },
        {
          id: `tr_${Date.now()}_2`,
          patientId: patientId,
          titulo: 'Mando Independente de Alimentos',
          area: 'Linguagem Expressiva',
          descricao: 'Instigar o paciente a solicitar vocalmente itens desejados das refeições.',
          instrucoes: 'Pressione com leve atraso e dê incentivo parcial.',
          criterio: '80% independente.',
          alvo: 'Dizer o nome do alimento',
          status: 'ativo',
          criterioProgresso: 10,
          tentativas: []
        }
      ];
    }

    const startDaysAgo = 6;
    const registries: Array<'Independente' | 'Ajuda Gestual' | 'Ajuda Verbal' | 'Ajuda Física' | 'Erro'> = [
      'Independente', 'Independente', 'Ajuda Gestual', 'Ajuda Verbal', 'Independente', 'Erro', 'Ajuda Física'
    ];

    const updated = targetPrograms.map((prog) => {
      const attempts = [];
      for (let i = startDaysAgo; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayCount = 1 + Math.floor(Math.random() * 3);
        for (let t = 0; t < dayCount; t++) {
          let regIndex = Math.floor(Math.random() * registries.length);
          if (i <= 2) {
            regIndex = Math.random() > 0.3 ? 0 : Math.floor(Math.random() * 3);
          }
          const reg = registries[regIndex];
          d.setHours(9 + t, Math.floor(Math.random() * 59), 0);
          attempts.push({
            id: `temp_trial_${prog.id}_${i}_${t}`,
            timestamp: d.toISOString(),
            registro: reg
          });
        }
      }
      return {
        ...prog,
        tentativas: attempts
      };
    });

    const newTreinos = {
      ...clinicData.treinos,
      [patientId]: updated
    };

    const sampleBehaviors = ['Agressão', 'Choro', 'Grito', 'Desatenção'];
    const behaviorLogsToInject = [];
    for (let i = startDaysAgo; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (!isWeekend && Math.random() > 0.4) {
        const eventCount = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < eventCount; j++) {
          const behName = sampleBehaviors[Math.floor(Math.random() * sampleBehaviors.length)];
          d.setHours(10 + j, Math.floor(Math.random() * 59), 0);
          behaviorLogsToInject.push({
            id: `temp_beh_${patientId}_${i}_${j}`,
            patientId,
            behaviorName: behName,
            timestamp: d.toISOString(),
            date: d.toISOString().split('T')[0],
            count: 1 + Math.floor(Math.random() * 2)
          });
        }
      }
    }

    updateClinicData({
      ...clinicData,
      treinos: newTreinos,
      comportamentoLogs: [
        ...behaviorLogsToInject,
        ...(clinicData.comportamentoLogs || []).filter(l => l.patientId !== patientId)
      ]
    });
  };

  if (!patient) {
    return <p className="text-slate-400 text-xs">Paciente inválido.</p>;
  }

  // Visual SVG chart helper values
  const barChartMax = Math.max(...Object.values(countByRegistro).map(v => Number(v)), 1);

  return (
    <div className={`flex flex-col gap-5 ${compact ? 'p-1' : ''}`}>
      {/* Dynamic top controls */}
      {!compact && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Painel Analítico do Paciente</h3>
            <p className="text-[11px] text-slate-400">Análise quantitativa de respostas e evolução clínica do paciente {patient.nome}</p>
          </div>
          {overallAttemptsCount === 0 && (
            <button
              onClick={handleCreateMockSampleData}
              style={{ cursor: 'pointer' }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.01] active:scale-[0.99] shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Alimentar Gráfico com Dados de Exemplo
            </button>
          )}
        </div>
      )}

      {overallAttemptsCount === 0 ? (
        <div className="bg-slate-50/50 border border-dashed border-slate-200 text-center rounded-2xl p-10 flex flex-col items-center justify-center gap-2">
          <TrendingUp className="w-8 h-8 text-indigo-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-700">Sem registros de treino arquivados para gerar estatísticas</span>
          <p className="text-[11px] text-slate-400 max-w-sm">Para ver as métricas de evolução, registre coletas na aba "Treinos" ou use o botão para carregar um histórico realista de simulação.</p>
          <button
            onClick={handleCreateMockSampleData}
            style={{ cursor: 'pointer' }}
            className="mt-3 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all inline-flex items-center gap-1"
          >
            🪄 Carregar Amostra de Simulação de Treino
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Program Selection Filter Bar */}
          {programs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 shadow-xs">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Treino / Programa Analisado:</span>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-950 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 shadow-xs cursor-pointer max-w-full sm:max-w-xs truncate"
                >
                  <option value="all">📊 TODOS OS TREINOS (Evolução Consolidada)</option>
                  {programs.map(prog => (
                    <option key={prog.id} value={prog.id}>🎯 {prog.titulo} ({prog.area})</option>
                  ))}
                </select>
              </div>
              <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-1 rounded border border-indigo-100">
                Exibindo <span className="text-indigo-700">{totalAttempts}</span> de {overallAttemptsCount} tomadas totais.
              </span>
            </div>
          )}

          {totalAttempts === 0 ? (
            <div className="bg-slate-50 border border-slate-150 p-8 rounded-xl text-center flex flex-col items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Nenhum registro para este treino específico</span>
              <p className="text-[10.5px] text-slate-450 max-w-xs">Este programa de ensino não possui tentativas coletadas ou folhas de coletas registradas pelo AT na data selecionada ou no prontuário.</p>
              <button
                onClick={() => setSelectedProgramId('all')}
                className="mt-2 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-150 transition duration-150"
              >
                Voltar para Todos os Treinos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main rate KPI Widget */}
          <div className="md:col-span-4 bg-gradient-to-br from-emerald-50 to-emerald-100/30 border border-emerald-150 p-4 rounded-xl flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">Taxa de Independência</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Meta ABA</span>
            </div>
            
            <div className="my-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-emerald-950 tracking-tight">{independentRate}%</span>
              <span className="text-xs font-semibold text-emerald-700">respostas autônomas</span>
            </div>

            <div className="text-[11px] text-emerald-800/80 leading-relaxed border-t border-emerald-100 pt-2 mt-2">
              O paciente respondeu de forma totalmente independente em <strong>{countByRegistro['Independente']}</strong> de <strong>{totalAttempts}</strong> tentativas registradas.
              {independentRate >= 80 ? (
                <p className="text-emerald-950 font-bold mt-1">✓ Desempenho excelente dentro do padrão de domínio.</p>
              ) : (
                <p className="text-slate-600 mt-1">⚠️ Direcionar treinos para esvair as dicas e instigar comportamento espontâneo.</p>
              )}
            </div>
          </div>

          {/* Program Mastery Card */}
          <div className="md:col-span-4 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Programas de Ensino</span>
            
            <div className="my-3">
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Metas Dominadas: {masteredCount} / {totalPrograms}</span>
                <span>{totalPrograms > 0 ? Math.round((masteredCount / totalPrograms) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${totalPrograms > 0 ? (masteredCount / totalPrograms) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-250">
              <div className="bg-white p-1.5 rounded border border-slate-150 text-center">
                <span className="text-slate-400 block font-bold">Ativos</span>
                <span className="text-xs font-extrabold text-slate-800">{activeCount} programas</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-150 text-center">
                <span className="text-slate-400 block font-bold">Dominados</span>
                <span className="text-xs font-extrabold text-indigo-700">{masteredCount} concluintes</span>
              </div>
            </div>
          </div>

          {/* Total trials counter */}
          <div className="md:col-span-4 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Fidelidade e Amostra</span>
            
            <div className="my-3 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalAttempts}</span>
              <span className="text-xs font-bold text-slate-400">tentativas registradas</span>
            </div>

            <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-200 pt-2">
              <p>O volume coletado de tentativas discretas oferece controle clínico refinado sobre o aprendizado da criança ao longo das sessões.</p>
            </div>
          </div>

          {/* Core SVG Help Distribution Bar Chart */}
          <div className="md:col-span-6 bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-3">Resumo de Níveis de Ajuda Requeridos</span>
            
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Independente', count: countByRegistro['Independente'], colorClass: 'bg-emerald-500' },
                { label: 'Ajuda Gestual', count: countByRegistro['Ajuda Gestual'], colorClass: 'bg-blue-400' },
                { label: 'Ajuda Verbal', count: countByRegistro['Ajuda Verbal'], colorClass: 'bg-indigo-400' },
                { label: 'Ajuda Física', count: countByRegistro['Ajuda Física'], colorClass: 'bg-amber-500' },
                { label: 'Erro', count: countByRegistro['Erro'], colorClass: 'bg-rose-500' }
              ].map(item => {
                const percentage = Math.round((item.count / totalAttempts) * 100);
                const widthPercent = (item.count / barChartMax) * 100;
                
                return (
                  <div key={item.label} className="text-xs">
                    <div className="flex justify-between items-center text-slate-700 font-semibold mb-1">
                      <span className="flex items-center gap-1.5 font-sans">
                        <span className={`w-2 h-2.5 rounded-sm ${item.colorClass}`} />
                        {item.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{item.count} vezes ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-sm h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-sm ${item.colorClass} transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic SVG Independence Bar and Line Combined Chart */}
          <div className="md:col-span-6 bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 block mb-0.5">Evolução do Treino (Coluna de Acertos e Linha)</span>
                <span className="text-[11px] text-slate-400 block">Número de acertos (colunas) e linha de progresso por período</span>
              </div>
              
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9px] font-extrabold shadow-sm/5 border border-slate-150">
                <button 
                  onClick={() => setGroupingMode('day')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${groupingMode === 'day' ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  Dia
                </button>
                <button 
                  onClick={() => setGroupingMode('week')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${groupingMode === 'week' ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  Semana
                </button>
                <button 
                  onClick={() => setGroupingMode('month')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${groupingMode === 'month' ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  Mês
                </button>
                <button 
                  onClick={() => setGroupingMode('year')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${groupingMode === 'year' ? 'bg-white text-indigo-900 shadow-sm font-bold' : 'text-slate-500'}`}
                >
                  Ano
                </button>
              </div>
            </div>

            {lineChartData.length < 2 ? (
               <div className="text-center py-6 text-slate-450 text-xs flex flex-col justify-center items-center gap-1 flex-1">
                 <TrendingUp className="w-5 h-5 text-slate-300" />
                 <span>Dados de evolução insuficientes</span>
                 <span className="text-[10px] text-slate-400">Colete dados em dias diferentes para plotar a curva.</span>
               </div>
            ) : (
              <div className="relative h-[150px] w-full flex items-end">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-l border-slate-200">
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="h-0" />
                </div>

                <svg className="w-full h-full pt-3 pb-1 pl-1 pr-1 overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    {(() => {
                      const count = lineChartData.length;
                      const maxHits = Math.max(...lineChartData.map(d => d.hits), 4);
                      
                      const points = lineChartData.map((d, idx) => {
                        const x = (idx / (count === 1 ? 1 : count - 1)) * 88 + 6;
                        const heightVal = (d.hits / maxHits) * 70; // max height is 70%
                        const y = 90 - heightVal;
                        return { x, y, hits: d.hits, total: d.total, rate: d.rate, date: d.date };
                      });

                      const pathD = points.reduce((acc, p, idx) => {
                        return acc + `${idx === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`;
                      }, '');

                      return (
                        <>
                          <path
                            d={`${pathD} L ${points[points.length-1].x}% 100% L ${points[0].x}% 100% Z`}
                            fill="url(#indigoComboGradient)"
                            stroke="none"
                            opacity="0.08"
                          />
                          
                          {/* Colunas (Gráfico de Bar/Coluna) de acertos */}
                          {points.map((p, idx) => {
                            const barWidth = Math.max(16 / count, 3);
                            return (
                              <rect
                                key={`bar-${idx}`}
                                x={`${p.x - barWidth / 2}%`}
                                y={`${p.y}%`}
                                width={`${barWidth}%`}
                                height={`${100 - p.y}%`}
                                className="fill-indigo-500 hover:fill-indigo-600 transition-all cursor-pointer opacity-30"
                                rx="1.5"
                              />
                            );
                          })}

                          {/* Linha (Gráfico de Linha) conectora no topo das colunas */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          <defs>
                            <linearGradient id="indigoComboGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4f46e5" />
                              <stop offset="100%" stopColor="#ffff" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {points.map((p, pIdx) => (
                            <g key={pIdx}>
                              <circle
                                cx={`${p.x}%`}
                                cy={`${p.y}%`}
                                r="4"
                                className="fill-indigo-600 stroke-white"
                                strokeWidth="1.5"
                              />
                              <text
                                x={`${p.x}%`}
                                y={`${p.y - 7}%`}
                                fontSize="8.5"
                                fontWeight="black"
                                fill="#312e81"
                                textAnchor="middle"
                              >
                                {p.hits} ac.
                              </text>
                              <text
                                x={`${p.x}%`}
                                y="112%"
                                fontSize="7"
                                fill="#64748b"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {p.date}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </g>
                </svg>
              </div>
            )}
          </div>

          {/* NEW CHART 3: Real-time Behavior Occurrences (Bar Chart / Distribution) */}
          <div className="md:col-span-6 bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5">Volumetria de Comportamentos Inadequados</span>
              <span className="text-[11px] text-slate-450 block mb-3">Monitoramento quantitativo de ocorrências indesejadas registradas pelo AT</span>
            </div>

            {behaviorChartData.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs flex flex-col justify-center items-center gap-1 flex-1 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <span className="font-medium text-slate-500">Nenhum comportamento inadequado</span>
                <span className="text-[9.5px] text-slate-400 text-center max-w-xs px-4">Registre eventos no botão de comportamento da Folha de Coletas para plotar a curva.</span>
              </div>
            ) : (
              <div className="relative h-[150px] w-full flex items-end">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-l border-slate-200">
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="h-0" />
                </div>

                <svg className="w-full h-full pt-3 pb-1 pl-1 pr-1 overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    {(() => {
                      const maxVal = Math.max(...behaviorChartData.map(d => d.count), 1);
                      const count = behaviorChartData.length;
                      const points = behaviorChartData.map((d, idx) => {
                        const x = (idx / (count === 1 ? 1 : count - 1)) * 94 + (count === 1 ? 50 : 3);
                        const heightPercent = (d.count / maxVal) * 75; // Scale to max 75% height
                        const y = 90 - heightPercent;
                        return { x, y, count: d.count, date: d.date };
                      });

                      const pathD = points.reduce((acc, p, idx) => {
                        return acc + `${idx === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`;
                      }, '');

                      return (
                        <>
                          {count > 1 && (
                            <>
                              <path
                                d={`${pathD} L ${points[points.length-1].x}% 100% L ${points[0].x}% 100% Z`}
                                fill="url(#roseGradient)"
                                stroke="none"
                                opacity="0.12"
                              />
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </>
                          )}

                          <defs>
                            <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" />
                              <stop offset="100%" stopColor="#ffff" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {points.map((p, pIdx) => (
                            <g key={pIdx}>
                              {/* Draw beautiful bar for single data points or as visual anchor */}
                              <rect
                                x={`${p.x - 2.5}%`}
                                y={`${p.y}%`}
                                width="5%"
                                height={`${100 - p.y}%`}
                                className="fill-rose-100 hover:fill-rose-200 transition-all cursor-pointer opacity-40 rounded-sm"
                              />
                              
                              <circle
                                cx={`${p.x}%`}
                                cy={`${p.y}%`}
                                r="4"
                                className="fill-rose-500 stroke-white"
                                strokeWidth="1.5"
                              />
                              <text
                                x={`${p.x}%`}
                                y={`${p.y - 7}%`}
                                fontSize="8.5"
                                fontWeight="bold"
                                fill="#9f1239"
                                textAnchor="middle"
                              >
                                {p.count}
                              </text>
                              <text
                                x={`${p.x}%`}
                                y="112%"
                                fontSize="7"
                                fill="#64748b"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {p.date}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </g>
                </svg>
              </div>
            )}
          </div>

          {/* NEW CHART 4: Real-time Sessions & Trial Application Volume */}
          <div className="md:col-span-6 bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5">Frequência e Volume de Aplicação</span>
              <span className="text-[11px] text-slate-455 block mb-3">Total de tentativas discretas praticadas nas sessões por período</span>
            </div>

            {volumeChartData.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs flex flex-col justify-center items-center gap-1 flex-1 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <span className="font-medium text-slate-500">Nenhum treino aplicado</span>
                <span className="text-[9.5px] text-slate-400 text-center max-w-xs px-4">Utilize botões rápidos da Mesa de Aplicação de Treinos para alimentar as métricas.</span>
              </div>
            ) : (
              <div className="relative h-[150px] w-full flex items-end">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-l border-slate-200">
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="border-t border-slate-100 border-dashed w-full h-0" />
                  <div className="h-0" />
                </div>

                <svg className="w-full h-full pt-3 pb-1 pl-1 pr-1 overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    {(() => {
                      const maxVal = Math.max(...volumeChartData.map(d => d.count), 1);
                      const count = volumeChartData.length;
                      const points = volumeChartData.map((d, idx) => {
                        const x = (idx / (count === 1 ? 1 : count - 1)) * 94 + (count === 1 ? 50 : 3);
                        const heightPercent = (d.count / maxVal) * 75; // Scale to max 75% height
                        const y = 90 - heightPercent;
                        return { x, y, count: d.count, date: d.date };
                      });

                      const pathD = points.reduce((acc, p, idx) => {
                        return acc + `${idx === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`;
                      }, '');

                      return (
                        <>
                          {count > 1 && (
                            <>
                              <path
                                d={`${pathD} L ${points[points.length-1].x}% 100% L ${points[0].x}% 100% Z`}
                                fill="url(#blueGradient)"
                                stroke="none"
                                opacity="0.1"
                              />
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </>
                          )}

                          <defs>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#ffff" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {points.map((p, pIdx) => (
                            <g key={pIdx}>
                              <circle
                                cx={`${p.x}%`}
                                cy={`${p.y}%`}
                                r="4"
                                className="fill-blue-500 stroke-white"
                                strokeWidth="1.5"
                              />
                              <text
                                x={`${p.x}%`}
                                y={`${p.y - 7}%`}
                                fontSize="8.5"
                                fontWeight="bold"
                                fill="#1e40af"
                                textAnchor="middle"
                              >
                                {p.count}
                              </text>
                              <text
                                x={`${p.x}%`}
                                y="112%"
                                fontSize="7"
                                fill="#64748b"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {p.date}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </g>
                </svg>
              </div>
            )}
          </div>

        </div>
      )}
        </div>
      )}
    </div>
  );
}
