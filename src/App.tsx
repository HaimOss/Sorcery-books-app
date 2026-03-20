/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sword, 
  Shield, 
  Heart, 
  Sparkles, 
  Coins, 
  Apple, 
  Scroll, 
  History, 
  RotateCcw, 
  Plus, 
  Minus, 
  Trash2, 
  Dices, 
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Skull,
  BookOpen,
  Info,
  Save,
  Undo2,
  Zap,
  AlertCircle,
  X,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Map,
  Wind,
  Moon,
  Sun,
  Home
} from 'lucide-react';
import { GameClass, CharacterState, LogEntry, Stats, Monster, GameSession } from './types.ts';
import { SPELLS, WIZARD_NAMES } from './constants.ts';
import { TRANSLATIONS, Language } from './translations.ts';

// --- Utility Functions ---
const rollDie = () => Math.floor(Math.random() * 6) + 1;
const rollDice = (count: number) => Array.from({ length: count }, rollDie).reduce((a, b) => a + b, 0);

const INITIAL_CHARACTER: CharacterState = {
  name: '',
  bookName: '',
  class: null,
  skill: { current: 0, max: 0 },
  stamina: { current: 0, max: 0 },
  luck: { current: 0, max: 0 },
  gold: 20,
  provisions: 2,
  items: [],
  libraUsed: false,
  notes: '',
  day: 1,
};

// --- Components ---
function StatBox({ label, val, max, icon, isLow }: { 
  label: string; 
  val: number; 
  max?: number; 
  icon: React.ReactNode;
  isLow?: boolean;
}) {
  return (
    <div className={`relative flex flex-col items-center p-2 rounded-lg border-2 border-[#8b5e3c] shadow-inner transition-colors duration-500 ${isLow ? 'animate-pulse-red' : 'bg-[#e8d5a7]'}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase font-bold opacity-70 mb-1">
        {icon} {label}
      </div>
      <div className="text-center relative">
        <AnimatePresence mode="popLayout">
          <motion.span 
            key={val}
            initial={{ y: 10, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.5 }}
            className="text-xl font-bold block"
          >
            {val}
          </motion.span>
        </AnimatePresence>
        {max !== undefined && <span className="text-[10px] opacity-50 block">/ {max}</span>}
      </div>
    </div>
  );
}

function StatAdjuster({ label, val, onInc, onDec }: { 
  label: string; 
  val: number;
  onInc: () => void; 
  onDec: () => void;
}) {
  return (
    <div className="flex flex-col items-center bg-white/40 p-1.5 sm:p-2 rounded-lg border border-[#8b5e3c]/30">
      <span className="text-[10px] font-bold opacity-60 mb-1">{label}</span>
      <div className="flex items-center justify-center gap-1 sm:gap-2 w-full" dir="ltr">
        <button 
          onClick={(e) => { e.stopPropagation(); onDec(); }} 
          className="p-1.5 sm:p-2 bg-[#8b5e3c] text-white rounded-lg active:scale-90 shadow-sm"
        >
          <Minus size={14} className="sm:w-4 sm:h-4" />
        </button>
        
        <div className="bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-md px-1.5 sm:px-3 py-0.5 shadow-inner min-w-[36px] sm:min-w-[45px] text-center">
          <span className={`text-base sm:text-xl font-bold leading-none block ${val > 0 ? 'text-green-800' : val < 0 ? 'text-red-800' : ''}`}>
            {val > 0 ? `+${val}` : val}
          </span>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onInc(); }} 
          className="p-1.5 sm:p-2 bg-[#8b5e3c] text-white rounded-lg active:scale-90 shadow-sm"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${active ? 'text-[#8b5e3c] scale-110' : 'text-gray-400'}`}
    >
      <div className={`${active ? 'bg-[#e8d5a7] p-2 rounded-xl' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function DieIcon({ val, size = 32 }: { val: number; size?: number }) {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[val - 1] || Dice1;
  return <Icon size={size} />;
}

// --- Helpers ---
const getSnapshotDiff = (current: CharacterState, previous?: CharacterState) => {
  if (!previous) return null;
  const diffs = [];
  
  if (current.skill.current !== previous.skill.current) {
    diffs.push({ stat: 'skill', diff: current.skill.current - previous.skill.current });
  }
  if (current.stamina.current !== previous.stamina.current) {
    diffs.push({ stat: 'stamina', diff: current.stamina.current - previous.stamina.current });
  }
  if (current.luck.current !== previous.luck.current) {
    diffs.push({ stat: 'luck', diff: current.luck.current - previous.luck.current });
  }
  if (current.gold !== previous.gold) {
    diffs.push({ stat: 'gold', diff: current.gold - previous.gold });
  }
  if (current.provisions !== previous.provisions) {
    diffs.push({ stat: 'provisions', diff: current.provisions - previous.provisions });
  }
  
  const addedItems = current.items.filter(i => !previous.items.includes(i));
  const removedItems = previous.items.filter(i => !current.items.includes(i));
  
  return { diffs, addedItems, removedItems };
};

export default function App() {
  const [view, setView] = useState<'management' | 'new-game' | 'playing'>('management');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  const [character, setCharacter] = useState<CharacterState>(INITIAL_CHARACTER);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [spellInput, setSpellInput] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [paragraphInput, setParagraphInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showSpellList, setShowSpellList] = useState(false);
  const [itemInput, setItemInput] = useState('');
  const [showItemInput, setShowItemInput] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [initialRolls, setInitialRolls] = useState<{ skill: number[]; stamina: number[]; luck: number[] } | null>(null);
  const [diceResult, setDiceResult] = useState<{ values: number[] } | null>(null);
  const [combatRound, setCombatRound] = useState<{ 
    playerRoll: number[]; 
    monsterRoll: number[]; 
    monsterId: string | null;
    result: 'win' | 'loss' | 'draw' | null;
    luckTested: boolean;
  }>({ playerRoll: [], monsterRoll: [], monsterId: null, result: null, luckTested: false });
  const [deltas, setDeltas] = useState({ skill: 0, stamina: 0, luck: 0, gold: 0, provisions: 0 });
  const [floatingDeltas, setFloatingDeltas] = useState<{ id: string; stat: string; delta: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('he');

  const t = TRANSLATIONS[language];
  const isLowStamina = character.stamina.current <= 4;
  const isGameOver = character.stamina.current <= 0;

  // --- Item & Name Translation on Language Change ---
  useEffect(() => {
    const prevLang: Language = language === 'he' ? 'en' : 'he';
    const prevT = TRANSLATIONS[prevLang];
    const currT = TRANSLATIONS[language];

    setCharacter(prev => {
      const updatedItems = prev.items.map(item => {
        if (item === prevT.sword) return currT.sword;
        const specialIdx = prevT.specialItemsList.indexOf(item);
        if (specialIdx !== -1) return currT.specialItemsList[specialIdx];
        return item;
      });

      const wizardIdx = prevT.wizardNames.indexOf(prev.name);
      const updatedName = wizardIdx !== -1 ? currT.wizardNames[wizardIdx] : prev.name;

      return { ...prev, items: updatedItems, name: updatedName };
    });
  }, [language]);

  // --- Persistence ---
  useEffect(() => {
    const savedSessions = localStorage.getItem('sorcery_sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    } else {
      const savedState = localStorage.getItem('sorcery_game_state');
      if (savedState) {
        const { character: savedChar, log: savedLog, isInitialized: savedInit, language: savedLang } = JSON.parse(savedState);
        if (savedInit) {
          const migratedSession: GameSession = {
            id: crypto.randomUUID(),
            bookName: savedChar.bookName || 'Unknown Book',
            startDate: Date.now(),
            lastPlayedDate: Date.now(),
            paragraphsVisited: savedLog.length,
            isFinished: savedChar.stamina.current <= 0,
            character: savedChar,
            log: savedLog
          };
          setSessions([migratedSession]);
        }
        if (savedLang) setLanguage(savedLang);
      }
    }
    
    const savedDarkMode = localStorage.getItem('sorcery_dark_mode');
    if (savedDarkMode) {
      setDarkMode(savedDarkMode === 'true');
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('sorcery_sessions', JSON.stringify(sessions));
    } else {
      localStorage.removeItem('sorcery_sessions');
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('sorcery_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (view === 'playing' && currentSessionId) {
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            character,
            log,
            lastPlayedDate: Date.now(),
            paragraphsVisited: log.length,
            isFinished: character.stamina.current <= 0
          };
        }
        return s;
      }));
    }
  }, [character, log, view, currentSessionId]);

  // --- Actions ---
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const updateStat = (stat: 'skill' | 'stamina' | 'luck', delta: number, ignoreMax = false) => {
    if (delta === 0) return;
    
    setCharacter(prev => {
      const current = prev[stat].current + delta;
      const max = prev[stat].max;
      
      const newValue = ignoreMax ? current : Math.min(current, max);
      
      if (stat === 'stamina' && delta < 0) triggerShake();
      
      return {
        ...prev,
        [stat]: { ...prev[stat], current: Math.max(0, newValue) }
      };
    });

    // Floating delta animation
    const id = Math.random().toString(36).substr(2, 9);
    setFloatingDeltas(prev => [...prev, { id, stat, delta }]);
    setTimeout(() => {
      setFloatingDeltas(prev => prev.filter(d => d.id !== id));
    }, 2000);
  };

  const showMessage = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const adjustWithDelta = (stat: 'skill' | 'stamina' | 'luck' | 'gold' | 'provisions', amount: number, ignoreMax = false) => {
    if (stat === 'gold' || stat === 'provisions') {
      const prevVal = character[stat];
      const newVal = Math.max(0, prevVal + amount);
      if (newVal !== prevVal) {
        setCharacter(p => ({ ...p, [stat]: newVal }));
        setDeltas(d => ({ ...d, [stat]: d[stat] + (newVal - prevVal) }));
        
        // Floating delta animation
        const id = Math.random().toString(36).substr(2, 9);
        setFloatingDeltas(prev => [...prev, { id, stat, delta: amount }]);
        setTimeout(() => {
          setFloatingDeltas(prev => prev.filter(d => d.id !== id));
        }, 2000);
      }
      return;
    }

    const currentVal = character[stat].current;
    const max = character[stat].max;

    if (amount > 0 && !ignoreMax && currentVal >= max) {
      const statName = stat === 'skill' ? t.skill : stat === 'luck' ? t.luck : t.stamina;
      showMessage(t.maxStatError.replace('{max}', max.toString()).replace('{stat}', statName));
      return;
    }

    updateStat(stat, amount, ignoreMax);
    setDeltas(d => ({ ...d, [stat]: d[stat] + amount }));
  };

  const eatProvision = () => {
    if (character.provisions > 0) {
      setCharacter(prev => ({ ...prev, provisions: prev.provisions - 1 }));
      updateStat('stamina', 4);
    }
  };

  const castSpell = () => {
    const code = spellInput.toUpperCase();
    const spell = SPELLS[code];
    if (spell) {
      if (character.stamina.current > spell.cost) {
        updateStat('stamina', -spell.cost);
        setSpellInput('');
      } else {
        showMessage(t.noStaminaSpell);
      }
    } else {
      showMessage(t.spellError);
    }
  };

  const addMonster = () => {
    const newMonster: Monster = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${t.monsterDefaultName} ${monsters.length + 1}`,
      skill: 7,
      stamina: 8,
    };
    setMonsters([...monsters, newMonster]);
  };

  const updateMonster = (id: string, field: 'skill' | 'stamina', delta: number) => {
    setMonsters(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: Math.max(0, m[field] + delta) } : m
    ));
  };

  const removeMonster = (id: string) => {
    setMonsters(prev => prev.filter(m => m.id !== id));
  };

  const saveLogEntry = () => {
    if (!paragraphInput) {
      showMessage(t.paragraphError);
      return;
    }
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      paragraph: paragraphInput,
      note: noteInput,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(character)),
      monsters: monsters.length > 0 ? JSON.parse(JSON.stringify(monsters)) : undefined,
    };
    setLog([newEntry, ...log]);
    setParagraphInput('');
    setNoteInput('');
    setMonsters([]); // Clear monsters for next paragraph
    setDeltas({ skill: 0, stamina: 0, luck: 0, gold: 0, provisions: 0 }); // Reset deltas for next paragraph
    showMessage(t.logSaved);
  };

  const revertToEntry = (entry: LogEntry) => {
    setConfirmModal({
      isOpen: true,
      title: t.revert,
      message: t.revertConfirm,
      onConfirm: () => {
        setCharacter(entry.snapshot);
        const entryIndex = log.findIndex(e => e.id === entry.id);
        setLog(log.slice(entryIndex));
        setActiveTab('current');
        setConfirmModal(p => ({ ...p, isOpen: false }));
      }
    });
  };

  const goHome = () => {
    setCharacter(INITIAL_CHARACTER);
    setLog([]);
    setMonsters([]);
    setDeltas({ skill: 0, stamina: 0, luck: 0, gold: 0, provisions: 0 });
    setCurrentSessionId(null);
    setView('management');
    setActiveTab('current');
  };

  const resetAdventure = () => {
    if (currentSessionId) {
      setSessions(prev => prev.filter(s => s.id !== currentSessionId));
    }
    goHome();
  };

  const saveGameToFile = () => {
    const gameState = {
      character,
      log,
      monsters,
      language,
      version: '1.1'
    };
    const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const bookPrefix = character.bookName ? `${character.bookName.replace(/\\s+/g, '_')}_` : '';
    a.download = `sorcery_save_${bookPrefix}${character.name || 'hero'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadGameFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        if (data.character && data.log) {
          setCharacter(data.character);
          setLog(data.log);
          if (data.monsters) setMonsters(data.monsters);
          if (data.language) setLanguage(data.language);
          
          const newSession: GameSession = {
            id: crypto.randomUUID(),
            bookName: data.character.bookName || t.placeholderBook,
            startDate: Date.now(),
            lastPlayedDate: Date.now(),
            paragraphsVisited: data.log.length,
            isFinished: data.character.stamina.current <= 0,
            character: data.character,
            log: data.log
          };
          
          setSessions(prev => [...prev, newSession]);
          setCurrentSessionId(newSession.id);
          setView('playing');
          showMessage(t.loadSuccess);
        } else {
          showMessage(t.loadError);
        }
      } catch (err) {
        console.error('Error loading save file:', err);
        showMessage(t.loadError);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const useLibra = () => {
    if (!character.libraUsed) {
      setConfirmModal({
        isOpen: true,
        title: t.libra,
        message: t.libraConfirm,
        onConfirm: () => {
          setCharacter(prev => ({
            ...prev,
            skill: { ...prev.skill, current: prev.skill.max },
            stamina: { ...prev.stamina, current: prev.stamina.max },
            luck: { ...prev.luck, current: prev.luck.max },
            libraUsed: true
          }));
          setConfirmModal(p => ({ ...p, isOpen: false }));
        }
      });
    }
  };

  // --- Stats Generation ---
  const generateStats = (gameClass: GameClass) => {
    setIsRolling(true);
    setInitialRolls(null);
    setTimeout(() => {
      const s1 = rollDie();
      const st1 = rollDie();
      const st2 = rollDie();
      const l1 = rollDie();

      const skillRoll = s1;
      const staminaRoll = st1 + st2;
      const luckRoll = l1;

      const skillBase = gameClass === 'Warrior' ? 6 : 4;
      const initialSkill = skillRoll + skillBase;
      const initialStamina = staminaRoll + 12;
      const initialLuck = luckRoll + 6;

      setInitialRolls({
        skill: [s1],
        stamina: [st1, st2],
        luck: [l1]
      });

      setCharacter(prev => ({
        ...INITIAL_CHARACTER,
        name: prev.name,
        bookName: prev.bookName,
        class: gameClass,
        skill: { current: initialSkill, max: initialSkill },
        stamina: { current: initialStamina, max: initialStamina },
        luck: { current: initialLuck, max: initialLuck },
      }));
      setIsRolling(false);
    }, 1500);
  };

  const finalizeCharacter = () => {
    const newChar = {
      ...character,
      items: [t.sword]
    };
    setCharacter(newChar);
    
    const newSession: GameSession = {
      id: crypto.randomUUID(),
      bookName: newChar.bookName || t.placeholderBook,
      startDate: Date.now(),
      lastPlayedDate: Date.now(),
      paragraphsVisited: 0,
      isFinished: false,
      character: newChar,
      log: []
    };
    
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setView('playing');
  };

  // --- Render Helpers ---
  if (view === 'management') {
    return (
      <div className={`min-h-screen bg-[#f4e4bc] text-[#2c1810] font-serif p-4 sm:p-8 flex flex-col items-center ${language === 'he' ? 'text-right' : 'text-left'}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
        <div className="fixed top-4 right-4 flex gap-2 z-50">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-[#8b5e3c] text-white rounded-xl shadow-lg hover:bg-[#6d4a30] transition-all active:scale-95" title={darkMode ? t.lightMode : t.darkMode}>
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button onClick={() => setLanguage(l => l === 'he' ? 'en' : 'he')} className="p-2.5 bg-[#8b5e3c] text-white rounded-xl shadow-lg hover:bg-[#6d4a30] transition-all active:scale-95 font-bold min-w-[48px]">
            {language === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-5xl w-full mt-12 mb-12"
        >
          {currentSessionId && (
            <div className="flex justify-start mb-6">
              <button 
                onClick={() => setView('playing')}
                className="flex items-center gap-2 px-4 py-2 bg-[#3a2210] text-[#f4e4bc] rounded-xl font-bold shadow-lg hover:bg-[#2c1810] transition-all active:scale-95"
              >
                <Undo2 size={20} />
                {t.backToGame}
              </button>
            </div>
          )}
          
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-7xl font-bold mb-4 tracking-tighter text-[#3a2210] drop-shadow-sm">{t.gameManagement}</h1>
            <div className="h-1 w-32 bg-[#8b5e3c] mx-auto rounded-full opacity-50" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            <button 
              onClick={() => {
                setCharacter(INITIAL_CHARACTER);
                setView('new-game');
              }}
              className="group relative overflow-hidden bg-[#8b5e3c] text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-4"
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="bg-white/20 p-4 rounded-full">
                <Plus size={48} />
              </div>
              <span className="text-2xl font-bold">{t.newGame}</span>
            </button>
            
            <label className="group relative overflow-hidden bg-[#fff9eb] border-4 border-[#8b5e3c] text-[#8b5e3c] rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-4 cursor-pointer">
              <div className="absolute inset-0 bg-[#8b5e3c]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="bg-[#8b5e3c]/10 p-4 rounded-full">
                <Upload size={48} />
              </div>
              <span className="text-2xl font-bold">{t.loadFile}</span>
              <input type="file" accept=".json" onChange={loadGameFromFile} className="hidden" />
            </label>
          </div>

          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 opacity-80">
            <History size={24} />
            {t.navHistory}
          </h2>

          {sessions.length === 0 ? (
            <div className="bg-[#fff9eb]/50 border-4 border-dashed border-[#8b5e3c]/20 rounded-3xl py-20 text-center text-[#8b5e3c]/40 italic">
              <History size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-xl">{t.noLogs}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.sort((a, b) => b.lastPlayedDate - a.lastPlayedDate).map(session => (
                <motion.div 
                  key={session.id} 
                  layout
                  className="bg-[#fff9eb] border-4 border-[#8b5e3c] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-[#8b5e3c] opacity-30" />
                  
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-2xl text-[#3a2210] mb-1">{session.bookName}</h3>
                        <p className="text-lg text-[#8b5e3c] font-bold">{session.character.name}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${session.isFinished ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {session.isFinished ? t.finished : t.inProgress}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-[#f4e4bc]/40 p-3 rounded-xl">
                      <div className="flex flex-col">
                        <span className="opacity-50 text-[10px] uppercase font-bold">{t.startDate}</span>
                        <span className="font-bold">{new Date(session.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="opacity-50 text-[10px] uppercase font-bold">{t.paragraphsVisited}</span>
                        <span className="font-bold">{session.paragraphsVisited}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setCharacter(session.character);
                        setLog(session.log);
                        setCurrentSessionId(session.id);
                        setView('playing');
                      }}
                      className="flex-1 py-3 bg-[#8b5e3c] text-white rounded-xl hover:bg-[#6d4a30] transition-all font-bold shadow-md active:scale-95"
                    >
                      {t.continueGame}
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: t.deleteGame,
                          message: t.resetConfirm,
                          onConfirm: () => {
                            setSessions(prev => prev.filter(s => s.id !== session.id));
                            setConfirmModal(p => ({ ...p, isOpen: false }));
                          }
                        });
                      }}
                      className="p-3 bg-red-50 text-red-600 border-2 border-red-100 rounded-xl hover:bg-red-100 transition-all active:scale-95"
                      title={t.deleteGame}
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (view === 'new-game') {
    return (
      <div className={`min-h-screen bg-[#f4e4bc] text-[#2c1810] font-serif p-6 flex flex-col items-center justify-center ${language === 'he' ? 'text-right' : 'text-left'}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#fff9eb] border-4 border-[#8b5e3c] rounded-lg p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-[#8b5e3c]" />
          <div className="flex justify-between items-center mb-6 border-b-2 border-[#8b5e3c] pb-4">
            <h1 className="text-4xl font-bold">{t.title}</h1>
            <div className="flex items-center gap-2">
              <label className="p-1.5 bg-[#8b5e3c] text-white rounded-lg hover:bg-[#6d4a30] transition-colors cursor-pointer" title={t.loadFile}>
                <Upload size={16} />
                <input type="file" accept=".json" onChange={loadGameFromFile} className="hidden" />
              </label>
              <button 
                onClick={() => setLanguage(l => l === 'he' ? 'en' : 'he')}
                className="px-2 py-1 bg-[#8b5e3c] text-white rounded-lg text-xs font-bold"
              >
                {language === 'he' ? 'English' : 'עברית'}
              </button>
            </div>
          </div>
          <p className="text-lg mb-8 text-center italic">{t.subtitle}</p>
          
          {!character.class ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-bold opacity-70">{t.bookName}</label>
                <input 
                  type="text" 
                  value={character.bookName}
                  onChange={(e) => setCharacter(prev => ({ ...prev, bookName: e.target.value }))}
                  placeholder={t.placeholderBook}
                  className="w-full p-3 bg-white border-2 border-[#8b5e3c] rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#8b5e3c]/50"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold opacity-70">{t.characterName}</label>
                <input 
                  type="text" 
                  value={character.name}
                  onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.placeholderName}
                  className="w-full p-3 bg-white border-2 border-[#8b5e3c] rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#8b5e3c]/50"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {t.wizardNames.slice(0, 5).map(name => (
                    <button 
                      key={name}
                      onClick={() => setCharacter(prev => ({ ...prev, name }))}
                      className="px-3 py-1 bg-[#e8d5a7] border border-[#8b5e3c] rounded-full text-xs hover:bg-[#d4c196] transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      const names = t.wizardNames;
                      const randomName = names[Math.floor(Math.random() * names.length)];
                      setCharacter(prev => ({ ...prev, name: randomName }));
                    }}
                    className="px-3 py-1 bg-[#8b5e3c] text-white rounded-full text-xs hover:bg-[#6d4a30] transition-colors"
                  >
                    {t.randomName}
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#8b5e3c]/20">
                <p className="text-center mb-2 font-bold">{t.chooseClass}</p>
                <button 
                  onClick={() => generateStats('Warrior')}
                  disabled={!character.name.trim()}
                  className="w-full py-4 bg-[#8b5e3c] text-white rounded-lg text-xl font-bold hover:bg-[#6d4a30] transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sword size={24} /> {t.warrior}
                </button>
                <button 
                  onClick={() => generateStats('Sorcerer')}
                  disabled={!character.name.trim()}
                  className="w-full py-4 bg-[#4a6d8c] text-white rounded-lg text-xl font-bold hover:bg-[#3a566e] transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={24} /> {t.sorcerer}
                </button>
                {!character.name.trim() && (
                  <p className="text-[10px] text-red-700 text-center animate-pulse">{t.enterNameError}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                {character.bookName && (
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">
                    {character.bookName}
                  </p>
                )}
                <h2 className="text-3xl font-bold text-[#8b5e3c]">{character.name}</h2>
                <p className="text-sm opacity-70 italic">
                  {character.class === 'Warrior' ? t.warrior : t.sorcerer} {t.brave}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-[#e8d5a7] rounded-lg border border-[#8b5e3c] flex flex-col items-center">
                  <p className="text-sm opacity-70">{t.skill}</p>
                  <p className="text-3xl font-bold">{character.skill.max}</p>
                  {initialRolls && (
                    <div className="flex gap-1 mt-1 opacity-60">
                      <DieIcon val={initialRolls.skill[0]} size={14} />
                      <span className="text-[10px]">+{character.class === 'Warrior' ? 6 : 4}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-[#e8d5a7] rounded-lg border border-[#8b5e3c] flex flex-col items-center">
                  <p className="text-sm opacity-70">{t.stamina}</p>
                  <p className="text-3xl font-bold">{character.stamina.max}</p>
                  {initialRolls && (
                    <div className="flex gap-1 mt-1 opacity-60">
                      <DieIcon val={initialRolls.stamina[0]} size={14} />
                      <DieIcon val={initialRolls.stamina[1]} size={14} />
                      <span className="text-[10px]">+12</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-[#e8d5a7] rounded-lg border border-[#8b5e3c] flex flex-col items-center">
                  <p className="text-sm opacity-70">{t.luck}</p>
                  <p className="text-3xl font-bold">{character.luck.max}</p>
                  {initialRolls && (
                    <div className="flex gap-1 mt-1 opacity-60">
                      <DieIcon val={initialRolls.luck[0]} size={14} />
                      <span className="text-[10px]">+6</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-[#e8d5a7] p-4 rounded-lg border border-[#8b5e3c]">
                <p className="font-bold mb-2">{t.startingEquipment}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t.sword}</li>
                  <li>20 {t.gold}</li>
                  <li>2 {t.provisions}</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => character.class && generateStats(character.class)}
                  className="flex-1 py-3 border-2 border-[#8b5e3c] rounded-lg font-bold hover:bg-[#e8d5a7]"
                >
                  {t.rollAgain}
                </button>
                <button 
                  onClick={finalizeCharacter}
                  className="flex-1 py-3 bg-[#8b5e3c] text-white rounded-lg font-bold hover:bg-[#6d4a30]"
                >
                  {t.startAdventure}
                </button>
              </div>
            </div>
          )}

          {isRolling && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
              >
                <Dices size={64} className="text-[#8b5e3c]" />
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className={`min-h-screen bg-black text-red-600 font-serif p-6 flex flex-col items-center justify-center ${language === 'he' ? 'text-right' : 'text-left'}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <Skull size={120} className="mx-auto animate-pulse" />
          <h1 className="text-6xl font-black tracking-tighter uppercase">{t.gameOver}</h1>
          <p className="text-xl font-bold opacity-80">
            {t.diedAt} {log[0]?.paragraph || '??'}
          </p>
          <button 
            onClick={goHome}
            className="px-12 py-4 bg-red-700 text-white rounded-xl text-2xl font-bold hover:bg-red-800 shadow-[0_0_30px_rgba(185,28,28,0.5)] transition-all active:scale-95"
          >
            {t.gameManagement}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f4e4bc] text-[#2c1810] font-serif pb-24 ${language === 'he' ? 'text-right' : 'text-left'} ${shake ? 'animate-shake' : ''}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Floating Deltas */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
        <AnimatePresence>
          {floatingDeltas.map(d => (
            <motion.div
              key={d.id}
              initial={{ y: 50, opacity: 0, scale: 0.5 }}
              animate={{ y: -100, opacity: 1, scale: 1.5 }}
              exit={{ opacity: 0, scale: 2 }}
              className={`font-bold text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center gap-2 ${d.delta > 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              <span dir="ltr">{d.delta > 0 ? `+${d.delta}` : d.delta}</span>
              <span>{
                d.stat === 'skill' ? t.skill : 
                d.stat === 'stamina' ? t.stamina : 
                d.stat === 'luck' ? t.luck : 
                d.stat === 'provisions' ? t.provisions : t.gold
              }</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error Message Overlay */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-red-400 flex items-center gap-2 pointer-events-none"
          >
            <AlertCircle size={20} />
            <span className="font-bold text-sm">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <header className="bg-[#fff9eb] border-b-4 border-[#8b5e3c] p-2 sticky top-0 z-30 shadow-md">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              {character.bookName && (
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-50 -mb-1">
                  {character.bookName}
                </span>
              )}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#8b5e3c]">{character.name}</h1>
                <span className="text-xs opacity-60 font-bold italic">
                  {character.class === 'Warrior' ? t.warrior : t.sorcerer}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('management')} className="p-1.5 bg-[#8b5e3c] text-white rounded-lg hover:bg-[#6d4a30] transition-colors" title={t.gameManagement}>
                <Home size={16} />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 bg-[#8b5e3c] text-white rounded-lg hover:bg-[#6d4a30] transition-colors" title={darkMode ? t.lightMode : t.darkMode}>
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button 
                onClick={saveGameToFile}
                className="p-1.5 bg-[#8b5e3c] text-white rounded-lg hover:bg-[#6d4a30] transition-colors"
                title={t.saveFile}
              >
                <Download size={16} />
              </button>
              <label className="p-1.5 bg-[#8b5e3c] text-white rounded-lg hover:bg-[#6d4a30] transition-colors cursor-pointer" title={t.loadFile}>
                <Upload size={16} />
                <input type="file" accept=".json" onChange={loadGameFromFile} className="hidden" />
              </label>
              <button 
                onClick={() => setLanguage(l => l === 'he' ? 'en' : 'he')}
                className="px-2 py-1 bg-[#8b5e3c] text-white rounded-lg text-xs font-bold"
              >
                {language === 'he' ? 'English' : 'עברית'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <StatBox 
              label={t.skill} 
              val={character.skill.current} 
              max={character.skill.max} 
              icon={<Sword size={14} />} 
            />
          <StatBox 
            label={t.stamina} 
            val={character.stamina.current} 
            max={character.stamina.max} 
            icon={<Heart size={14} />} 
            isLow={isLowStamina}
          />
          <StatBox 
            label={t.luck} 
            val={character.luck.current} 
            max={character.luck.max} 
            icon={<Shield size={14} />} 
          />
          <StatBox 
            label={t.gold} 
            val={character.gold} 
            icon={<Coins size={14} />} 
          />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'current' && (
            <motion.div 
              key="current"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Paragraph Info */}
              <section className="bg-[#fff9eb] border-2 border-[#8b5e3c] rounded-lg p-4 shadow-md">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold mb-1 opacity-70 leading-tight min-h-[24px] flex items-end">{t.currentParagraph}</label>
                    <input 
                      type="number"
                      value={paragraphInput}
                      onChange={(e) => setParagraphInput(e.target.value)}
                      placeholder="#"
                      className="w-full h-11 bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-lg p-2 text-xl font-bold focus:ring-0 text-center"
                    />
                  </div>
                  <div className="flex-[3]">
                    <label className="block text-[10px] font-bold mb-1 opacity-70 leading-tight min-h-[24px] flex items-end">{t.paragraphNote}</label>
                    <input 
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder={t.notePlaceholder}
                      className="w-full h-11 bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-lg p-2 focus:ring-0"
                    />
                  </div>
                </div>
              </section>

              {/* Character Management "The Cube" */}
              <section className="bg-[#fff9eb] border-2 border-[#8b5e3c] rounded-lg p-4 shadow-md space-y-6">
                <h2 className="text-center font-bold border-b border-[#8b5e3c] pb-2 flex items-center justify-center gap-2">
                  <Scroll size={18} /> {t.characterManagement}
                </h2>
                
                {/* Stat Adjustments */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-2 sm:space-y-3">
                    <StatAdjuster label={t.skill} val={deltas.skill} onInc={() => adjustWithDelta('skill', 1)} onDec={() => adjustWithDelta('skill', -1)} />
                    <StatAdjuster label={t.stamina} val={deltas.stamina} onInc={() => adjustWithDelta('stamina', 1)} onDec={() => adjustWithDelta('stamina', -1)} />
                    <StatAdjuster label={t.luck} val={deltas.luck} onInc={() => adjustWithDelta('luck', 1)} onDec={() => adjustWithDelta('luck', -1)} />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <StatAdjuster label={t.gold} val={deltas.gold} onInc={() => adjustWithDelta('gold', 1)} onDec={() => adjustWithDelta('gold', -1)} />
                    <StatAdjuster label={t.provisions} val={deltas.provisions} onInc={() => adjustWithDelta('provisions', 1)} onDec={() => adjustWithDelta('provisions', -1)} />
                  </div>
                </div>

                <div className="border-t border-[#8b5e3c] pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold mb-2 opacity-70">{t.specialItems}</p>
                    <div className="flex flex-wrap gap-2">
                      {t.specialItemsList.map(special => (
                        <button 
                          key={special}
                          onClick={() => {
                            if (character.items.includes(special)) {
                              setCharacter(p => ({ ...p, items: p.items.filter(i => i !== special) }));
                            } else {
                              setCharacter(p => ({ ...p, items: [...p.items, special] }));
                            }
                          }}
                          className={`px-2 py-1 border rounded-full text-[10px] transition-colors ${character.items.includes(special) ? 'bg-[#8b5e3c] text-white border-[#8b5e3c]' : 'border-[#8b5e3c] opacity-50'}`}
                        >
                          {special}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs font-bold opacity-70">{t.inventory}</p>
                    </div>
                    
                    {/* The Satchel */}
                    <div className="relative mt-8 mb-4 max-w-sm mx-auto">
                      {/* Shoulder Strap */}
                      <div className="absolute -top-6 -left-4 -right-4 h-16 border-t-[12px] border-[#4a2e1b] rounded-t-[100px] z-0 opacity-90"></div>
                      
                      {/* Main Bag Body */}
                      <div className="bg-[#8b5a2b] border-4 border-[#3a2210] rounded-b-[40px] rounded-t-[10px] p-4 pt-12 shadow-[0_10px_20px_rgba(58,34,16,0.5)] relative z-10">
                        
                        {/* Bag Flap */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-[#a06b35] border-b-4 border-x-4 border-[#3a2210] rounded-t-[6px] rounded-b-[50%] shadow-[0_4px_8px_rgba(0,0,0,0.3)] z-20 overflow-hidden">
                          {/* Flap Stitching */}
                          <div className="absolute inset-1 border-2 border-dashed border-[#e8d5a7] opacity-40 rounded-t-[4px] rounded-b-[50%] pointer-events-none"></div>
                        </div>
                        
                        {/* Left Strap */}
                        <div className="absolute top-0 left-1/4 w-6 h-32 bg-[#4a2e1b] border-x-2 border-[#3a2210] z-30 flex flex-col items-center justify-end pb-2 shadow-md">
                          {/* Buckle */}
                          <div className="w-8 h-8 border-4 border-[#d4af37] rounded-md bg-transparent flex items-center justify-center shadow-sm">
                            <div className="w-1 h-4 bg-[#d4af37]"></div>
                          </div>
                        </div>

                        {/* Right Strap */}
                        <div className="absolute top-0 right-1/4 w-6 h-32 bg-[#4a2e1b] border-x-2 border-[#3a2210] z-30 flex flex-col items-center justify-end pb-2 shadow-md">
                          {/* Buckle */}
                          <div className="w-8 h-8 border-4 border-[#d4af37] rounded-md bg-transparent flex items-center justify-center shadow-sm">
                            <div className="w-1 h-4 bg-[#d4af37]"></div>
                          </div>
                        </div>

                        {/* Stitching on main body */}
                        <div className="absolute inset-2 border-2 border-dashed border-[#e8d5a7] opacity-30 rounded-b-[32px] rounded-t-[8px] pointer-events-none z-10"></div>
                        
                        {/* Content Area (Inside the bag) */}
                        <div className="relative z-40 mt-16 bg-[#3a2210] rounded-xl p-3 shadow-inner border-2 border-[#2a180b] min-h-[100px] flex flex-col gap-2">
                          {Object.entries(
                          character.items.filter(i => !t.specialItemsList.includes(i)).reduce((acc, item) => {
                            acc[item] = (acc[item] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([item, count], i) => (
                          <div key={i} className="flex items-center justify-between bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-md p-2 shadow-sm">
                            <span className="font-bold text-sm text-[#3a2210]">{item}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-[#5c3a21]">{t.quantity} {count}</span>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => {
                                    const index = character.items.indexOf(item);
                                    if (index > -1) {
                                      setCharacter(p => ({ ...p, items: p.items.filter((_, idx) => idx !== index) }));
                                    }
                                  }}
                                  className="text-[10px] font-bold bg-[#8b5e3c] text-white px-2 py-1 rounded shadow-sm active:scale-95"
                                >
                                  {t.useItem}
                                </button>
                                <button 
                                  onClick={() => setCharacter(p => ({ ...p, items: p.items.filter(i => i !== item) }))}
                                  className="text-[#8b5e3c] hover:text-red-700 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="mt-2">
                          {showItemInput ? (
                            <div className="flex items-center gap-2 bg-[#e8d5a7] p-1 rounded-md border-2 border-[#8b5e3c]">
                              <input 
                                autoFocus
                                value={itemInput}
                                onChange={(e) => setItemInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && itemInput.trim()) {
                                    setCharacter(p => ({ ...p, items: [...p.items, itemInput.trim()] }));
                                    setItemInput('');
                                    setShowItemInput(false);
                                  } else if (e.key === 'Escape') {
                                    setShowItemInput(false);
                                  }
                                }}
                                className="flex-1 bg-transparent text-sm outline-none px-1 text-[#3a2210] min-w-0"
                                placeholder={t.addItem}
                              />
                              <button onClick={() => setShowItemInput(false)} className="text-[#8b5e3c] p-1"><X size={14} /></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setShowItemInput(true)}
                              className="w-full py-2 border-2 border-dashed border-[#e8d5a7] text-[#e8d5a7] rounded-md text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#e8d5a7] hover:text-[#5c3a21] transition-colors"
                            >
                              <Plus size={14} /> {t.add}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions & Spells */}
              <section className="bg-[#fff9eb] border-2 border-[#8b5e3c] rounded-lg p-4 shadow-md space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={eatProvision}
                      disabled={character.provisions === 0}
                      className="flex items-center justify-center gap-2 p-3 bg-[#8b5e3c] text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-transform disabled:opacity-50"
                    >
                      <Apple size={18} /> {t.eatProvision} ({character.provisions})
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: t.endDay,
                          message: t.dayEndConfirm,
                          onConfirm: () => {
                            if (character.provisions > 0) {
                              setCharacter(p => ({ ...p, provisions: p.provisions - 1, day: (p.day || 1) + 1 }));
                              showMessage(t.dayEndProvisionUsed);
                            } else {
                              showMessage(t.dayEndNoFood);
                              updateStat('stamina', -3);
                              setCharacter(p => ({ ...p, day: (p.day || 1) + 1 }));
                            }
                            setConfirmModal(p => ({ ...p, isOpen: false }));
                          }
                        });
                      }}
                      className="flex items-center justify-center gap-2 p-2 bg-[#5c3a21] text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      <Moon size={14} /> {t.endDay}
                    </button>
                  </div>
                  <button 
                    onClick={useLibra}
                    disabled={character.libraUsed}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-transform h-full ${character.libraUsed ? 'bg-gray-400 text-gray-200' : 'bg-[#4a6d8c] text-white'}`}
                  >
                    <Sparkles size={18} /> {t.libra} {character.libraUsed ? t.libraUsed : ''}
                  </button>
                </div>

                {character.class === 'Sorcerer' && (
                  <div className="flex gap-1.5 sm:gap-2">
                    <input 
                      value={spellInput}
                      onChange={(e) => setSpellInput(e.target.value.slice(0, 3).toUpperCase())}
                      placeholder={t.spellCode}
                      className="flex-1 min-w-0 bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-lg p-1.5 sm:p-2 text-center font-bold tracking-widest focus:ring-0 text-sm sm:text-base"
                    />
                    <button 
                      onClick={castSpell}
                      className="bg-[#4a6d8c] text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold flex items-center gap-1 whitespace-nowrap shrink-0 text-sm sm:text-base"
                    >
                      <Zap size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">{t.cast}</span>
                    </button>
                    <button 
                      onClick={() => setShowSpellList(true)}
                      className="bg-[#e8d5a7] border-2 border-[#8b5e3c] p-1.5 sm:p-2 rounded-lg shrink-0"
                    >
                      <BookOpen size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                )}
              </section>

              {/* Dice Roller */}
              <section className="bg-[#fff9eb] border-2 border-[#8b5e3c] rounded-lg p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold flex items-center gap-2"><Dices size={20} /> {t.diceRoll}</h2>
                  {diceResult && (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        {diceResult.values.map((v, i) => (
                          <motion.div
                            key={`${i}-${v}-${Date.now()}`}
                            initial={{ rotate: -180, scale: 0, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="text-[#8b5e3c] bg-white p-1 rounded-lg shadow-sm"
                          >
                            <DieIcon val={v} />
                          </motion.div>
                        ))}
                      </div>
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#8b5e3c] text-white px-3 py-1 rounded-full font-bold text-sm shadow-inner"
                      >
                        {t.total}: {diceResult.values.reduce((a, b) => a + b, 0)}
                      </motion.div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      const res = [rollDie()];
                      setDiceResult({ values: res });
                      setShake(true);
                      setTimeout(() => setShake(false), 500);
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-xl text-sm font-bold shadow-md active:scale-95 transition-transform"
                  >
                    <Dice1 size={18} /> {t.oneDie}
                  </button>
                  <button 
                    onClick={() => {
                      const res = [rollDie(), rollDie()];
                      setDiceResult({ values: res });
                      setShake(true);
                      setTimeout(() => setShake(false), 500);
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-[#e8d5a7] border-2 border-[#8b5e3c] rounded-xl text-sm font-bold shadow-md active:scale-95 transition-transform"
                  >
                    <Dices size={18} className="rotate-12" /> {t.twoDice}
                  </button>
                </div>
              </section>

              {/* Combat Manager */}
              <section className="bg-[#1a1a1a] border-4 border-[#8b5e3c] rounded-xl p-5 shadow-2xl space-y-6 relative overflow-hidden">
                {/* Background Texture/Effect */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                
                <div className="flex justify-between items-center border-b-2 border-[#8b5e3c]/50 pb-3 relative z-10">
                  <h2 className="text-xl font-black text-[#f4e4bc] flex items-center gap-3 tracking-tighter italic">
                    <Skull size={24} className="text-red-600 animate-pulse" /> {t.combatArena}
                  </h2>
                  <button 
                    onClick={addMonster} 
                    className="bg-[#8b5e3c] hover:bg-[#a67c52] text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> {t.addEnemy}
                  </button>
                </div>

                {monsters.length > 0 ? (
                  <div className="space-y-6 relative z-10">
                    {monsters.map(monster => {
                      const isCurrentCombat = combatRound.monsterId === monster.id;
                      const pStrength = combatRound.playerRoll.reduce((a, b) => a + b, 0) + character.skill.current;
                      const mStrength = combatRound.monsterRoll.reduce((a, b) => a + b, 0) + monster.skill;
                      
                      return (
                        <div key={monster.id} className="bg-[#2a2a2a] border-2 border-[#8b5e3c] rounded-xl p-4 shadow-inner relative group">
                          <button 
                            onClick={() => removeMonster(monster.id)} 
                            className="absolute -top-2 -left-2 bg-red-800 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          >
                            <Trash2 size={14} />
                          </button>

                          {/* Monster Header */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-red-900/30 border-2 border-red-700 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(185,28,28,0.3)]">
                              <Skull size={24} />
                            </div>
                            <div className="flex-1">
                              <input 
                                value={monster.name}
                                onChange={(e) => setMonsters(p => p.map(m => m.id === monster.id ? { ...m, name: e.target.value } : m))}
                                placeholder={t.enemy}
                                className="text-lg font-black bg-[#1a1a1a] border border-[#8b5e3c]/30 rounded px-2 py-0.5 focus:ring-1 focus:ring-[#8b5e3c] text-[#f4e4bc] w-full transition-all"
                              />
                              <div className="flex gap-4 mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t.skill}</span>
                                  <div className="flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-md border border-gray-700">
                                    <button onClick={() => updateMonster(monster.id, 'skill', -1)} className="text-gray-500 hover:text-white"><Minus size={12} /></button>
                                    <span className="font-mono font-bold text-white text-sm">{monster.skill}</span>
                                    <button onClick={() => updateMonster(monster.id, 'skill', 1)} className="text-gray-500 hover:text-white"><Plus size={12} /></button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t.stamina}</span>
                                  <div className="flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-md border border-red-900/50">
                                    <button onClick={() => updateMonster(monster.id, 'stamina', -1)} className="text-red-500 hover:text-red-400"><Minus size={12} /></button>
                                    <span className="font-mono font-bold text-red-500 text-sm">{monster.stamina}</span>
                                    <button onClick={() => updateMonster(monster.id, 'stamina', 1)} className="text-red-500 hover:text-red-400"><Plus size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Combat Console */}
                          <div className="bg-black/60 rounded-xl p-4 border border-[#8b5e3c]/30 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              {/* Player Side */}
                              <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.you}</p>
                                <div className="flex justify-center gap-1 h-8 items-center">
                                  {isCurrentCombat && combatRound.playerRoll.map((v, i) => (
                                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-400">
                                      <DieIcon val={v} size={20} />
                                    </motion.div>
                                  ))}
                                </div>
                                <div className="text-2xl font-black text-white font-mono">
                                  {isCurrentCombat ? pStrength : '--'}
                                </div>
                              </div>

                              {/* Monster Side */}
                              <div className="text-center space-y-2 border-r border-gray-800">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t.enemy}</p>
                                <div className="flex justify-center gap-1 h-8 items-center">
                                  {isCurrentCombat && combatRound.monsterRoll.map((v, i) => (
                                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-red-500">
                                      <DieIcon val={v} size={20} />
                                    </motion.div>
                                  ))}
                                </div>
                                <div className="text-2xl font-black text-white font-mono">
                                  {isCurrentCombat ? mStrength : '--'}
                                </div>
                              </div>
                            </div>

                            {/* Result Banner */}
                            <AnimatePresence mode="wait">
                              {isCurrentCombat && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="space-y-2"
                                >
                                  {monster.stamina <= 0 ? (
                                    <div className="bg-yellow-600/20 text-yellow-400 border border-yellow-600 py-3 rounded-lg font-black text-center text-sm animate-bounce">
                                      ✨ {t.victory} {monster.name}! ✨
                                    </div>
                                  ) : character.stamina.current <= 0 ? (
                                    <div className="bg-red-900/60 text-white border-2 border-red-600 py-3 rounded-lg font-black text-center text-sm">
                                      💀 {t.defeat} 💀
                                    </div>
                                  ) : combatRound.result && (
                                    <div className={`text-center py-2 rounded-lg font-black text-sm uppercase tracking-tighter ${
                                      combatRound.result === 'win' ? 'bg-green-900/40 text-green-400 border border-green-700' :
                                      combatRound.result === 'loss' ? 'bg-red-900/40 text-red-400 border border-red-700' :
                                      'bg-gray-800 text-gray-400 border border-gray-600'
                                    }`}>
                                      {combatRound.result === 'win' ? t.hitEnemy : 
                                       combatRound.result === 'loss' ? t.hitYou : t.drawRound}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Combat Actions */}
                            <div className="grid grid-cols-1 gap-2">
                              {monster.stamina > 0 && character.stamina.current > 0 && (
                                <>
                                  <button 
                                    onClick={() => {
                                      const pRoll = [rollDie(), rollDie()];
                                      const mRoll = [rollDie(), rollDie()];
                                      const ps = pRoll.reduce((a, b) => a + b, 0) + character.skill.current;
                                      const ms = mRoll.reduce((a, b) => a + b, 0) + monster.skill;
                                      setCombatRound({
                                        playerRoll: pRoll,
                                        monsterRoll: mRoll,
                                        monsterId: monster.id,
                                        result: ps > ms ? 'win' : ms > ps ? 'loss' : 'draw',
                                        luckTested: false
                                      });
                                      setShake(true);
                                      setTimeout(() => setShake(false), 300);
                                    }}
                                    className="w-full py-3 bg-[#8b5e3c] hover:bg-[#a67c52] text-white rounded-lg font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                                  >
                                    <Zap size={18} /> {t.rollCombatRound}
                                  </button>

                                  <button 
                                    onClick={() => {
                                      updateStat('stamina', -2);
                                      setCombatRound(p => ({ ...p, result: null, monsterId: null }));
                                      showMessage(t.fleeAlert);
                                    }}
                                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-600 rounded-lg text-[10px] font-bold"
                                  >
                                    {t.flee}
                                  </button>
                                </>
                              )}

                              {isCurrentCombat && combatRound.result && monster.stamina > 0 && character.stamina.current > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  <button 
                                    onClick={() => {
                                      updateMonster(monster.id, 'stamina', -2);
                                      setCombatRound(p => ({ ...p, result: null, monsterId: null }));
                                    }}
                                    className="py-2 bg-green-800/40 hover:bg-green-800/60 text-green-400 border border-green-700 rounded-lg text-[10px] font-bold"
                                  >
                                    {t.applyHit}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      updateStat('stamina', -2);
                                      setCombatRound(p => ({ ...p, result: null, monsterId: null }));
                                    }}
                                    className="py-2 bg-red-800/40 hover:bg-red-800/60 text-red-400 border border-red-700 rounded-lg text-[10px] font-bold"
                                  >
                                    {t.takeHit}
                                  </button>
                                  
                                  {!combatRound.luckTested && (
                                    <button 
                                      onClick={() => {
                                        const roll = rollDice(2);
                                        const isLucky = roll <= character.luck.current;
                                        if (isLucky) {
                                          if (combatRound.result === 'win') {
                                            showMessage(t.luckyHit);
                                            updateMonster(monster.id, 'stamina', -4);
                                          } else {
                                            showMessage(t.luckyDodge);
                                            updateStat('stamina', -1);
                                          }
                                        } else {
                                          if (combatRound.result === 'win') {
                                            showMessage(t.unluckyHit);
                                            updateMonster(monster.id, 'stamina', -1);
                                          } else {
                                            showMessage(t.unluckyDodge);
                                            updateStat('stamina', -3);
                                          }
                                        }
                                        updateStat('luck', -1);
                                        setCombatRound(p => ({ ...p, luckTested: true, result: null, monsterId: null }));
                                      }}
                                      className="col-span-2 py-2 bg-[#4a6d8c] hover:bg-[#5a7d9c] text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-2"
                                    >
                                      <Sparkles size={14} /> {t.testLuck}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center opacity-30 space-y-4">
                    <div className="w-16 h-16 border-2 border-dashed border-[#8b5e3c] rounded-full flex items-center justify-center">
                      <Skull size={32} />
                    </div>
                    <p className="text-sm font-bold italic tracking-widest uppercase">{t.noMonsters}</p>
                  </div>
                )}
              </section>

              {/* Save Button */}
              <button 
                onClick={saveLogEntry}
                className="w-full py-4 bg-[#2c1810] text-[#f4e4bc] rounded-xl text-xl font-bold shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
              >
                <Save size={24} /> {t.saveState}
              </button>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold border-b-2 border-[#8b5e3c] pb-2 text-center">{t.journeyLog}</h2>
              
              {/* Statistics Summary */}
              {log.length > 0 && (
                <div className="flex justify-center gap-4 text-sm font-bold text-[#8b5e3c] opacity-80 mb-4">
                  <div className="bg-[#fff9eb] px-3 py-1 rounded-full border border-[#8b5e3c]/20 shadow-sm">
                    {t.day} {character.day || 1}
                  </div>
                  <div className="bg-[#fff9eb] px-3 py-1 rounded-full border border-[#8b5e3c]/20 shadow-sm">
                    {log.length} {t.paragraph}
                  </div>
                </div>
              )}

              <div className="relative py-10 w-full max-w-md mx-auto">
                {log.map((entry, index) => {
                  const previousEntry = log[index + 1];
                  const diff = getSnapshotDiff(entry.snapshot, previousEntry?.snapshot);
                  const isExpanded = expandedLogId === entry.id;
                  const isEven = index % 2 === 0;
                  const isNewest = index === 0;
                  
                  const flavorTextsHe = [
                    "הרוח מלטפת את פניך...",
                    "שקט מתוח באוויר...",
                    "הדרך מתפתלת אל הלא נודע...",
                    "ציוץ ציפורים נשמע מרחוק...",
                    "עלי שלכת נושרים סביבך...",
                    "תחושה של מסתורין באוויר...",
                    "הזמן כאילו עמד מלכת...",
                    "קרני שמש חודרות מבעד לעננים..."
                  ];
                  const flavorTextsEn = [
                    "The wind brushes your face...",
                    "A tense silence in the air...",
                    "The path winds into the unknown...",
                    "Birds chirp in the distance...",
                    "Autumn leaves fall around you...",
                    "A sense of mystery in the air...",
                    "Time seems to stand still...",
                    "Sunbeams pierce through the clouds..."
                  ];
                  const flavorText = (t.day === 'Day' ? flavorTextsEn : flavorTextsHe)[entry.timestamp % flavorTextsHe.length];
                  
                  return (
                    <motion.div 
                      key={entry.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
                      className="relative flex flex-col items-center mb-10 w-full"
                    >
                      {/* Winding Path connecting to next item */}
                      <svg 
                        className="absolute top-5 left-1/2 w-48 h-[calc(100%+2.5rem)] -translate-x-1/2 z-0 overflow-visible" 
                        preserveAspectRatio="none" 
                        viewBox="0 0 100 100"
                      >
                        {/* Thick dirt path */}
                        <path 
                          d={isEven ? "M 50 0 C 50 20, 90 30, 90 50 C 90 70, 50 80, 50 100" : "M 50 0 C 50 20, 10 30, 10 50 C 10 70, 50 80, 50 100"} 
                          stroke="#d4b895" 
                          strokeWidth="24" 
                          strokeLinecap="round"
                          fill="none" 
                          vectorEffect="non-scaling-stroke"
                          className="opacity-80"
                        />
                        {/* Path borders */}
                        <path 
                          d={isEven ? "M 50 0 C 50 20, 90 30, 90 50 C 90 70, 50 80, 50 100" : "M 50 0 C 50 20, 10 30, 10 50 C 10 70, 50 80, 50 100"} 
                          stroke="#8b5e3c" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                          fill="none" 
                          vectorEffect="non-scaling-stroke"
                          className="opacity-60"
                        />
                      </svg>

                      {/* Random stones for this segment */}
                      {isEven ? (
                        <>
                          <div className="absolute top-1/4 start-1/2 ms-20 w-4 h-3 bg-stone-400 rounded-full shadow-sm" style={{ borderRadius: '40% 60% 70% 30%' }}></div>
                          <div className="absolute top-1/2 start-1/2 ms-28 w-2 h-2 bg-stone-500 rounded-full shadow-sm" style={{ borderRadius: '60% 40% 30% 70%' }}></div>
                          <div className="absolute top-3/4 start-1/2 ms-24 w-5 h-4 bg-stone-400 rounded-full shadow-sm" style={{ borderRadius: '50% 50% 40% 60%' }}></div>
                          <div className="absolute top-1/3 start-1/2 ms-4 w-3 h-2 bg-stone-500 rounded-full shadow-sm" style={{ borderRadius: '30% 70% 50% 50%' }}></div>
                          <div className="absolute top-2/3 start-1/2 ms-12 w-4 h-3 bg-stone-400 rounded-full shadow-sm" style={{ borderRadius: '70% 30% 60% 40%' }}></div>
                          {/* Extra decorative stones */}
                          <div className="absolute top-1/5 start-1/2 ms-32 w-2 h-2 bg-stone-300 rounded-full shadow-sm"></div>
                          <div className="absolute top-4/5 start-1/2 ms-16 w-3 h-2 bg-stone-500 rounded-full shadow-sm"></div>
                        </>
                      ) : (
                        <>
                          <div className="absolute top-1/4 end-1/2 me-20 w-4 h-3 bg-stone-400 rounded-full shadow-sm" style={{ borderRadius: '40% 60% 70% 30%' }}></div>
                          <div className="absolute top-1/2 end-1/2 me-28 w-2 h-2 bg-stone-500 rounded-full shadow-sm" style={{ borderRadius: '60% 40% 30% 70%' }}></div>
                          <div className="absolute top-3/4 end-1/2 me-24 w-5 h-4 bg-stone-400 rounded-full shadow-sm" style={{ borderRadius: '50% 50% 40% 60%' }}></div>
                          <div className="absolute top-1/3 end-1/2 me-4 w-3 h-2 bg-stone-500 rounded-full shadow-sm" style={{ borderRadius: '30% 70% 50% 50%' }}></div>
                          <div className="absolute top-2/3 end-1/2 me-12 w-4 h-3 bg-stone-400 rounded-full shadow-sm" style={{ borderRadius: '70% 30% 60% 40%' }}></div>
                          {/* Extra decorative stones */}
                          <div className="absolute top-1/5 end-1/2 me-32 w-2 h-2 bg-stone-300 rounded-full shadow-sm"></div>
                          <div className="absolute top-4/5 end-1/2 me-16 w-3 h-2 bg-stone-500 rounded-full shadow-sm"></div>
                        </>
                      )}

                      {/* The Bubble */}
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                        className={`z-10 relative flex flex-col items-center justify-center w-10 h-10 rounded-full border-[3px] shadow-md transition-colors ${isExpanded ? 'bg-[#8b5e3c] border-[#fff9eb] text-[#fff9eb]' : 'bg-[#fff9eb] border-[#8b5e3c] text-[#2c1810]'} ${isNewest && !isExpanded ? 'ring-4 ring-[#8b5e3c]/30 animate-pulse' : ''}`}
                      >
                        <span className="text-lg font-black leading-none">{entry.paragraph}</span>
                        
                        {/* Mini indicators on the bubble edge */}
                        {!isExpanded && diff && (diff.diffs.length > 0 || diff.addedItems.length > 0 || diff.removedItems.length > 0) && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3 h-3 rounded-full flex items-center justify-center border border-[#fff9eb]">
                            !
                          </div>
                        )}
                      </motion.button>

                      {/* Time and Day labels outside the bubble */}
                      <div className={`absolute top-2 w-32 ${isEven ? 'start-1/2 ms-8 text-start' : 'end-1/2 me-8 text-end'}`}>
                        <div className="text-[10px] font-bold text-[#8b5e3c] bg-[#fff9eb]/80 px-2 py-0.5 rounded-full inline-block shadow-sm border border-[#8b5e3c]/20">
                          {t.day} {entry.snapshot.day || 1} • {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>

                      {/* Expanded Card */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, scale: 0.9 }}
                            animate={{ height: 'auto', opacity: 1, scale: 1 }}
                            exit={{ height: 0, opacity: 0, scale: 0.9 }}
                            className="w-full max-w-sm mt-4 z-20 px-4"
                          >
                            <div className="bg-[#fff9eb] border-2 border-[#8b5e3c] rounded-xl shadow-xl overflow-hidden relative">
                              <div className="p-4 space-y-4">
                                {entry.note && (
                                  <div className="text-sm bg-white p-3 rounded border border-[#8b5e3c]/20 shadow-inner">
                                    {entry.note}
                                  </div>
                                )}
                                
                                {/* Changes */}
                                {diff && (diff.diffs.length > 0 || diff.addedItems.length > 0 || diff.removedItems.length > 0) ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-60">{t.changes}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {diff.diffs.map(d => (
                                        <span key={d.stat} className={`text-xs px-2 py-1 rounded-full font-bold ${d.diff > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {t[d.stat as keyof typeof t]}: {d.diff > 0 ? '+' : ''}{d.diff}
                                        </span>
                                      ))}
                                      {diff.addedItems.map(item => (
                                        <span key={`add-${item}`} className="text-xs px-2 py-1 rounded-full font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                          <Plus size={10} /> {item}
                                        </span>
                                      ))}
                                      {diff.removedItems.map(item => (
                                        <span key={`rem-${item}`} className="text-xs px-2 py-1 rounded-full font-bold bg-orange-100 text-orange-800 flex items-center gap-1">
                                          <Minus size={10} /> {item}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs opacity-70 italic text-[#8b5e3c] bg-white/50 p-2 rounded border border-[#8b5e3c]/10">
                                    <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                                      <Wind size={14} />
                                    </motion.div>
                                    <span>{flavorText}</span>
                                  </div>
                                )}

                                {/* Combat History in Log */}
                                {entry.monsters && entry.monsters.length > 0 && (
                                  <div className="space-y-2 pt-3 border-t border-[#8b5e3c]/10">
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                                      <Skull size={10} /> {t.combatArena}
                                    </p>
                                    <div className="grid gap-2">
                                      {entry.monsters.map((m, i) => (
                                        <div key={i} className="bg-[#3a2210]/5 p-2 rounded-lg border border-[#3a2210]/10 flex justify-between items-center">
                                          <span className="text-xs font-bold text-[#3a2210]">{m.name}</span>
                                          <div className="flex gap-3 text-[10px] font-bold">
                                            <span className="text-[#8b5e3c]">{t.skill}: {m.skill}</span>
                                            <span className="text-red-700">{t.stamina}: {m.stamina}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Current Stats Snapshot */}
                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#8b5e3c]/10">
                                  <div className="text-center bg-white p-1 rounded border border-[#8b5e3c]/20">
                                    <div className="text-[10px] opacity-60">{t.skill}</div>
                                    <div className="font-bold">{entry.snapshot.skill.current}</div>
                                  </div>
                                  <div className="text-center bg-white p-1 rounded border border-[#8b5e3c]/20">
                                    <div className="text-[10px] opacity-60">{t.stamina}</div>
                                    <div className="font-bold">{entry.snapshot.stamina.current}</div>
                                  </div>
                                  <div className="text-center bg-white p-1 rounded border border-[#8b5e3c]/20">
                                    <div className="text-[10px] opacity-60">{t.luck}</div>
                                    <div className="font-bold">{entry.snapshot.luck.current}</div>
                                  </div>
                                  <div className="text-center bg-white p-1 rounded border border-[#8b5e3c]/20">
                                    <div className="text-[10px] opacity-60">{t.gold}</div>
                                    <div className="font-bold">{entry.snapshot.gold}</div>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => revertToEntry(entry)}
                                  className="w-full py-2 mt-2 bg-[#8b5e3c] text-white rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-[#6a462b] transition-colors"
                                >
                                  <Undo2 size={18} /> {t.revert}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                
                {/* Final path segment fading out */}
                {log.length > 0 && (
                  <div className="relative flex flex-col items-center w-full h-32">
                    <svg 
                      className="absolute top-0 left-1/2 w-48 h-full -translate-x-1/2 z-0 overflow-visible" 
                      preserveAspectRatio="none" 
                      viewBox="0 0 100 100"
                    >
                      <defs>
                        <linearGradient id="fadePath" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d4b895" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#d4b895" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="fadeBorder" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5e3c" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#8b5e3c" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={log.length % 2 === 0 ? "M 50 0 C 50 20, 90 30, 90 50 C 90 70, 50 80, 50 100" : "M 50 0 C 50 20, 10 30, 10 50 C 10 70, 50 80, 50 100"} 
                        stroke="url(#fadePath)" 
                        strokeWidth="24" 
                        strokeLinecap="round"
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                      />
                      <path 
                        d={log.length % 2 === 0 ? "M 50 0 C 50 20, 90 30, 90 50 C 90 70, 50 80, 50 100" : "M 50 0 C 50 20, 10 30, 10 50 C 10 70, 50 80, 50 100"} 
                        stroke="url(#fadeBorder)" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                )}

                {log.length === 0 && (
                  <div className="text-center py-12 opacity-50 italic">
                    <History size={48} className="mx-auto mb-4" />
                    <p>{t.noParagraphs}</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: t.resetTitle,
                    message: t.resetMessage,
                    onConfirm: resetAdventure
                  });
                }}
                className="w-full py-3 border-2 border-red-700 text-red-700 rounded-lg font-bold mt-8 hover:bg-red-50 transition-colors"
              >
                {t.resetAdventure}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Footer */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#fff9eb] border-t-4 border-[#8b5e3c] p-2 pb-6 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto flex justify-around">
          <NavButton active={activeTab === 'current'} onClick={() => setActiveTab('current')} icon={<BookOpen />} label={t.navCurrent} />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label={t.navHistory} />
          <NavButton active={false} onClick={() => setView('management')} icon={<Home />} label={t.gameManagement} />
        </div>
      </nav>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#fff9eb] border-4 border-[#8b5e3c] rounded-2xl p-6 shadow-2xl text-center"
            >
              <h3 className="text-xl font-bold text-[#2c1810] mb-2">{confirmModal.title}</h3>
              <p className="text-sm opacity-70 mb-6">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 bg-[#8b5e3c] text-white rounded-xl font-bold hover:bg-[#6d4a30] shadow-lg transition-colors"
                >
                  {t.confirm}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spell List Modal */}
      <AnimatePresence>
        {showSpellList && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowSpellList(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#fff9eb] border-4 border-[#8b5e3c] rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b-2 border-[#8b5e3c] bg-[#e8d5a7] flex justify-between items-center">
                <h3 className="text-xl font-bold">{t.spellBookTitle}</h3>
                <button onClick={() => setShowSpellList(false)} className="text-[#8b5e3c] font-bold">X</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {Object.values(SPELLS).map(spell => (
                  <div key={spell.code} className="flex items-center justify-between p-2 border-b border-[#8b5e3c]/20">
                    <div>
                      <span className="font-bold text-lg tracking-widest">{spell.code}</span>
                      <span className="mr-3 text-sm opacity-80">{(t.spells as any)[spell.code] || spell.description}</span>
                    </div>
                    <span className="text-red-700 font-bold">-{spell.cost} {t.staminaCost}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.1s ease-in-out 0s 5;
        }
        @keyframes pulse-red {
          0%, 100% { background-color: rgba(185, 28, 28, 0.2); }
          50% { background-color: rgba(185, 28, 28, 0.6); }
        }
        .animate-pulse-red {
          animation: pulse-red 1s infinite;
        }
      `}</style>
    </div>
  );
}
