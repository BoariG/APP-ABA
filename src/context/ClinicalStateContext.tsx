import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClinicType, ClinicData } from '../types';
import { INITIAL_ABA_DATA, INITIAL_ATRIA_DATA } from '../mockData';
import { setupRealtimeListeners, syncLocalStateToSupabase } from '../lib/supabaseSync';
import { supabase } from '../lib/supabase';

interface ClinicalStateContextProps {
  activeClinic: ClinicType;
  setActiveClinic: (clinic: ClinicType) => void;
  clinicData: ClinicData;
  setClinicData: React.Dispatch<React.SetStateAction<ClinicData>>;
  updateClinicData: (newData: ClinicData) => void;
  firebaseAuthenticated: boolean;
  authChecked: boolean;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  connectionError: string | null;
}

const ClinicalStateContext = createContext<ClinicalStateContextProps | undefined>(undefined);

export function ClinicalStateProvider({ children }: { children: React.ReactNode }) {
  const [activeClinic, setActiveClinic] = useState<ClinicType>(() => {
    const saved = localStorage.getItem('active_aba_clinic_type');
    return (saved as ClinicType) || 'ABA';
  });

  const [firebaseAuthenticated, setFirebaseAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [clinicData, setClinicData] = useState<ClinicData>(() => {
    // Try to load from localStorage first for zero-latency, offline-first loading
    const saved = localStorage.getItem(activeClinic === 'ABA' ? 'aba_clinic_v1' : 'atria_clinic_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore parsing errors
      }
    }
    return activeClinic === 'ABA' ? { ...INITIAL_ABA_DATA } : { ...INITIAL_ATRIA_DATA };
  });

  // Track the connectivity and authentication state of the Supabase Client
  useEffect(() => {
    let active = true;
    
    const checkConnection = async () => {
      try {
        // Query a row to check if we can reach the database (since RLS is disabled, this is the most reliable check)
        const { error } = await supabase.from('patients').select('id').limit(1);
        if (!error) {
          if (active) {
            setFirebaseAuthenticated(true);
            setConnectionError(null);
          }
        } else {
          let errDetail = error.message;
          // Fallback to check active session or sign in anonymously
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) errDetail += " | getSession: " + sessionErr.message;
          if (session) {
            if (active) {
              setFirebaseAuthenticated(true);
              setConnectionError(null);
            }
          } else {
            const { error: signInError } = await supabase.auth.signInAnonymously();
            if (signInError) {
              errDetail += " | signInAnon: " + signInError.message;
              if (active) {
                setFirebaseAuthenticated(false);
                setConnectionError(errDetail);
              }
            } else {
              if (active) {
                setFirebaseAuthenticated(true);
                setConnectionError(null);
              }
            }
          }
        }
      } catch (err: any) {
        if (active) {
          setFirebaseAuthenticated(false);
          setConnectionError(err?.message || String(err));
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    };

    checkConnection();

    // Still listen to auth state changes to stay in sync if session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        if (active) {
          setFirebaseAuthenticated(true);
          setConnectionError(null);
        }
      } else {
        // If logged out, recheck if we can still query anonymously
        const { error } = await supabase.from('patients').select('id').limit(1);
        if (active) {
          setFirebaseAuthenticated(!error);
          if (error) {
            setConnectionError("AuthChange Logout - Query error: " + error.message);
          } else {
            setConnectionError(null);
          }
        }
      }
      if (active) setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Persist data and synchronize clinical partition with Supabase in real-time
  useEffect(() => {
    localStorage.setItem('active_aba_clinic_type', activeClinic);
    
    // Switch local storage fallback immediately when clinic changes
    const saved = localStorage.getItem(activeClinic === 'ABA' ? 'aba_clinic_v1' : 'atria_clinic_v1');
    let base = activeClinic === 'ABA' ? INITIAL_ABA_DATA : INITIAL_ATRIA_DATA;
    if (saved) {
      try {
        base = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    setClinicData(base);

    // Setup bidirectional real-time listeners always (using public anon key access)
    console.log(`Setting up real-time synchronized listeners for clinic: ${activeClinic}`);
    const unsubscribe = setupRealtimeListeners(activeClinic, (updater) => {
      setClinicData((prev) => {
        const next = updater(prev);
        // Sync changes down to localStorage to maintain a fallback
        localStorage.setItem(activeClinic === 'ABA' ? 'aba_clinic_v1' : 'atria_clinic_v1', JSON.stringify(next));
        return next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeClinic, firebaseAuthenticated]);

  const updateClinicData = (newData: ClinicData) => {
    const dataWithDocs = {
      ...newData,
      documentos: newData.documentos || [],
      mensagens: newData.mensagens || [],
      comportamentoBotoes: newData.comportamentoBotoes || {},
      comportamentoLogs: newData.comportamentoLogs || [],
      treinosFinalizados: newData.treinosFinalizados || []
    };

    // Propagate changes to Supabase in real-time for multi-device sync
    syncLocalStateToSupabase(activeClinic, clinicData, dataWithDocs)
      .catch((err) => console.error("Supabase synchronizer error during local update", err));

    setClinicData(dataWithDocs);
    localStorage.setItem(activeClinic === 'ABA' ? 'aba_clinic_v1' : 'atria_clinic_v1', JSON.stringify(dataWithDocs));
  };

  return (
    <ClinicalStateContext.Provider value={{
      activeClinic,
      setActiveClinic,
      clinicData,
      setClinicData,
      updateClinicData,
      firebaseAuthenticated,
      authChecked,
      isSyncModalOpen,
      setIsSyncModalOpen,
      connectionError
    }}>
      {children}
    </ClinicalStateContext.Provider>
  );
}

export function useClinicalState() {
  const context = useContext(ClinicalStateContext);
  if (context === undefined) {
    throw new Error('useClinicalState must be used within a ClinicalStateProvider');
  }
  return context;
}
