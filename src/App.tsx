/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Dices, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Menu, 
  Info,
  Calendar,
  ChevronRight,
  PlusCircle,
  RotateCcw,
  Share2,
  Coins,
  TrendingUp,
  TrendingDown,
  Clock,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CategoryDraw {
  extractionNum: number;
  dateStr: string;
  drawnNumbers: number[];
  matchedNumbers: number[];
  prize: number;
}

const formatCurrency = (val: number, includeDecimals = true) => {
  const absVal = Math.abs(val);
  const fixed = absVal.toFixed(includeDecimals ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = val < 0 ? "-" : "";
  return includeDecimals ? `${sign}${formattedInt},${decPart}` : `${sign}${formattedInt}`;
};

export default function App() {
  // App States
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedGridIndices, setSelectedGridIndices] = useState<number[]>([]);
  const [shake, setShake] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gridNumbers, setGridNumbers] = useState<number[]>([]);
  const [isGridShuffled, setIsGridShuffled] = useState(false);
  const [availableSpecials, setAvailableSpecials] = useState<number[]>([4, 8, 34, 50, 60, 89]);
  const [hasFilledSix, setHasFilledSix] = useState(false);
  const [isSpecialMode, setIsSpecialMode] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  const [isChecking, setIsChecking] = useState(false);
  const [checkingStep, setCheckingStep] = useState<string>("");
  const [checkingProgress, setCheckingProgress] = useState<number>(0);
  const [checkResult, setCheckResult] = useState<{
    spent: number;
    winnings: number;
    net: number;
    twoHits: number;
    threeHits: number;
    fourHits: number;
    fiveHits: number;
    sixHits: number;
  } | null>(null);

  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryDraws, setCategoryDraws] = useState<{ [points: number]: CategoryDraw[] }>({});

  // Initialize grid numbers 1-90 on mount
  useEffect(() => {
    setGridNumbers(Array.from({ length: 90 }, (_, i) => i + 1));
  }, []);

  const triggerHaptic = (pattern = 15) => {
    if (typeof window !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore if not supported or disabled
      }
    }
  };

  // Sounds disabled
  const playPopSound = (_pitch?: number, _duration?: number) => {};

  // Show dynamic toast message helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Similarity score calculation between selected number and a special number
  const getSimilarityScore = (x: number, s: number): number => {
    const xStr = x.toString();
    const sStr = s.toString();
    
    const xUnits = x % 10;
    const xTens = Math.floor(x / 10);
    const sUnits = s % 10;
    const sTens = Math.floor(s / 10);
    
    let score = 0;
    if (xUnits === sUnits) score += 5; // strong similarity if units digit matches
    if (xTens === sTens && xTens !== 0) score += 3; // similarity if tens digit matches
    
    for (const char of xStr) {
      if (sStr.includes(char)) {
        score += 1;
      }
    }
    return score;
  };

  // Shuffle grid numbers 1-90
  const handleShuffleGrid = () => {
    if (isGenerating) return;
    playPopSound(550, 0.15);
    
    if (isSpecialMode) {
      // Special Mode: Specials to exclude, duplicates to place twice
      const specials = [34, 60, 89, 50, 4, 8];
      const duplicates = [13, 28, 39, 43, 58, 63];

      // Filter out standard 78 numbers (neither special nor duplicate)
      const remaining: number[] = [];
      for (let i = 1; i <= 90; i++) {
        if (!specials.includes(i) && !duplicates.includes(i)) {
          remaining.push(i);
        }
      }

      // Shuffle the remaining 78 numbers
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      // Prepare grid of size 90 filled with null placeholders
      const arr: (number | null)[] = new Array(90).fill(null);

      // Guaranteed random separation pairs for duplicates
      const usedIndices = new Set<number>();
      const duplicatePairs: { value: number; idx1: number; idx2: number }[] = [];

      for (const val of duplicates) {
        let found = false;
        let attempts = 0;
        while (!found && attempts < 1000) {
          attempts++;
          const idx1 = Math.floor(Math.random() * 50);
          const idx2 = 50 + Math.floor(Math.random() * 40);

          if (usedIndices.has(idx1) || usedIndices.has(idx2)) continue;

          const col1 = idx1 % 10;
          const col2 = idx2 % 10;
          const row1 = Math.floor(idx1 / 10);
          const row2 = Math.floor(idx2 / 10);

          if (col1 !== col2 && row1 !== row2) {
            usedIndices.add(idx1);
            usedIndices.add(idx2);
            duplicatePairs.push({ value: val, idx1, idx2 });
            found = true;
          }
        }
      }

      duplicatePairs.forEach(pair => {
        arr[pair.idx1] = pair.value;
        arr[pair.idx2] = pair.value;
      });

      // Populate remaining cells in grid
      let remainingIdx = 0;
      for (let i = 0; i < 90; i++) {
        if (arr[i] === null) {
          arr[i] = remaining[remainingIdx++];
        }
      }

      setGridNumbers(arr as number[]);
      setIsGridShuffled(true);
      setAvailableSpecials([4, 8, 34, 50, 60, 89]);
      setSelectedNumbers([]);
      setSelectedGridIndices([]);
      setHasFilledSix(false);
    } else {
      // Normal Mode: Pure random shuffle of numbers 1-90 without duplicates or special logic
      const arr = Array.from({ length: 90 }, (_, i) => i + 1);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setGridNumbers(arr);
      setIsGridShuffled(true);
      setSelectedNumbers([]);
      setSelectedGridIndices([]);
      setHasFilledSix(false);
    }
  };

  // Toggle selected numbers
  const handleNumberToggle = (num: number, indexInGrid: number) => {
    if (isGenerating) return; // Prevent action while random generation cascade is active

    if (selectedGridIndices.includes(indexInGrid) || selectedNumbers.includes(num)) {
      // Do nothing (do not deselect from grid click as requested)
      return;
    }

    // Select (max 6)
    if (selectedNumbers.length >= 6) {
      setShake(true);
      playPopSound(180, 0.25); // Lower buzz sound for limit
      showToast("Hai già selezionato 6 numeri! Rimuovine uno per sceglierne un altro.");
      setTimeout(() => setShake(false), 500);
      return;
    }

    const specialList = [4, 8, 34, 50, 60, 89];
    const duplicateList = [13, 28, 39, 43, 58, 63];

    if (isGridShuffled && isSpecialMode && !hasFilledSix) {
      let finalNum = num;

      if (duplicateList.includes(num)) {
        // Rule A: Se scelgo uno dei doppioni, lo sostituisce con uno dei numeri speciali in ordine, a partire dal 4, poi l'8 e via dicendo
        const nextSpecial = [4, 8, 34, 50, 60, 89].find(s => availableSpecials.includes(s));
        if (nextSpecial !== undefined) {
          finalNum = nextSpecial;
          setAvailableSpecials(prev => prev.filter(s => s !== nextSpecial));
          
          // Replace on grid visually
          setGridNumbers(prev => {
            const nextGrid = [...prev];
            nextGrid[indexInGrid] = nextSpecial;
            return nextGrid;
          });
        }
      } else if (!specialList.includes(num)) {
        // Rule B: Se scelgo un altro numero, lo sostituisce con lo speciale che più gli somiglia, o uno speciale casuale se non somiglia a nessuno
        if (availableSpecials.length > 0) {
          let bestSpecial = availableSpecials[0];
          let maxScore = -1;

          availableSpecials.forEach(s => {
            const score = getSimilarityScore(num, s);
            if (score > maxScore) {
              maxScore = score;
              bestSpecial = s;
            }
          });

          // Pick random special if no similarity exists (score is 0)
          if (maxScore === 0) {
            const rIdx = Math.floor(Math.random() * availableSpecials.length);
            bestSpecial = availableSpecials[rIdx];
          }

          finalNum = bestSpecial;
          setAvailableSpecials(prev => prev.filter(s => s !== bestSpecial));

          // Replace on grid visually
          setGridNumbers(prev => {
            const nextGrid = [...prev];
            nextGrid[indexInGrid] = bestSpecial;
            return nextGrid;
          });
        }
      }

      triggerHaptic(15);
      playPopSound(440 + selectedNumbers.length * 80, 0.12);
      setSelectedNumbers(prev => {
        const next = [...prev, finalNum];
        if (next.length === 6) {
          setHasFilledSix(true);
          setIsSpecialMode(false); // Automatically exit Special Mode when 6 numbers chosen
        }
        return next;
      });
      setSelectedGridIndices(prev => [...prev, indexInGrid]);
    } else {
      // Standard click when not in Special Mode or when grid is sequential
      triggerHaptic(15);
      playPopSound(440 + selectedNumbers.length * 80, 0.12);
      setSelectedNumbers(prev => {
        const next = [...prev, num];
        if (next.length === 6) {
          setHasFilledSix(true);
        }
        return next;
      });
      setSelectedGridIndices(prev => [...prev, indexInGrid]);
    }
  };

  // Remove number from active selection
  const handleRemoveNumber = (num: number) => {
    if (isGenerating) return;
    playPopSound(300, 0.08);

    const idxToRemove = selectedNumbers.indexOf(num);
    if (idxToRemove !== -1) {
      setSelectedNumbers(prev => prev.filter((_, i) => i !== idxToRemove));
      setSelectedGridIndices(prev => prev.filter((_, i) => i !== idxToRemove));
    }

    // If it was a special number, make it available again
    const specialList = [4, 8, 34, 50, 60, 89];
    if (specialList.includes(num)) {
      setAvailableSpecials(prev => {
        if (!prev.includes(num)) {
          return [...prev, num].sort((a, b) => a - b);
        }
        return prev;
      });
    }
  };

  // Reset active selection and revert grid to sequential 1-90
  const handleClearSelection = () => {
    if (isGenerating) return;
    playPopSound(250, 0.15);
    setSelectedNumbers([]);
    setSelectedGridIndices([]);
    setGridNumbers(Array.from({ length: 90 }, (_, i) => i + 1));
    setIsGridShuffled(false);
    setAvailableSpecials([4, 8, 34, 50, 60, 89]);
    setCheckResult(null);
    setCheckingProgress(0);
    setHasFilledSix(false);
  };

  // Handlers for press and hold (0.5s) on Ripristina button to enter Special Mode
  const startRipristinaPress = () => {
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      handleClearSelection();
      setIsSpecialMode(true);
      triggerHaptic(50);
    }, 500);
  };

  const cancelRipristinaPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRipristinaClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      e.preventDefault();
      return;
    }
    cancelRipristinaPress();
    handleClearSelection();
  };

  // Cascading automatic generation
  const handleRandomGeneration = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setSelectedNumbers([]);
    setSelectedGridIndices([]);
    setCheckResult(null);
    setCheckingProgress(0);

    // Generate 6 unique random numbers from 1 to 90
    const numbersSet = new Set<number>();
    while (numbersSet.size < 6) {
      numbersSet.add(Math.floor(Math.random() * 90) + 1);
    }
    const numbersArray = Array.from(numbersSet);

    const currentGrid = gridNumbers.length > 0 ? gridNumbers : Array.from({ length: 90 }, (_, i) => i + 1);
    const chosenIndices: number[] = [];
    numbersArray.forEach(num => {
      const gIdx = currentGrid.findIndex((gNum, idx) => gNum === num && !chosenIndices.includes(idx));
      chosenIndices.push(gIdx);
    });

    // Add them to active list with a delightful visual delay and tap sound
    numbersArray.forEach((num, index) => {
      setTimeout(() => {
        setSelectedNumbers(prev => {
          if (prev.includes(num) || prev.length >= 6) return prev;
          playPopSound(500 + index * 60, 0.1);
          return [...prev, num];
        });

        setSelectedGridIndices(prev => {
          if (chosenIndices[index] !== -1 && prev.length < 6) {
            return [...prev, chosenIndices[index]];
          }
          return prev;
        });
        
        // Finalize generating state after the last number
        if (index === 5) {
          setIsGenerating(false);
          setHasFilledSix(true);
          showToast("Numeri fortunati generati!");
        }
      }, index * 150);
    });
  };

  // Generate simulated extractions for a given points category
  const generateDrawsForCategory = (
    points: number,
    countNeeded: number,
    currentCount: number,
    userSelected: number[]
  ): CategoryDraw[] => {
    if (points > 6 || countNeeded <= 0) return [];

    const newDraws: CategoryDraw[] = [];
    let baseExtraction = Math.max(1, 2500 - currentCount * 22);

    for (let i = 0; i < countNeeded; i++) {
      const extNum = Math.max(1, baseExtraction - (i * Math.floor(Math.random() * 12 + 8)) - Math.floor(Math.random() * 4));
      baseExtraction = extNum;

      // Date estimation descending
      const year = Math.max(2011, Math.min(2026, 2026 - Math.floor((2513 - extNum) / 167)));
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const dateStr = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;

      // Matched numbers
      const shuffledUser = [...userSelected].sort(() => 0.5 - Math.random());
      const matched = shuffledUser.slice(0, points).sort((a, b) => a - b);

      // Unmatched numbers
      const pool = Array.from({ length: 90 }, (_, k) => k + 1).filter(n => !userSelected.includes(n));
      const shuffledPool = pool.sort(() => 0.5 - Math.random());
      const unmatched = shuffledPool.slice(0, 6 - points);

      const drawn = [...matched, ...unmatched].sort((a, b) => a - b);

      let prize = 0;
      if (points === 2) {
        prize = Math.round((Math.random() * 7 + 5) * 100) / 100;
      } else if (points === 3) {
        prize = Math.round((Math.random() * 25 + 20) * 100) / 100;
      } else if (points === 4) {
        prize = Math.round((Math.random() * 350 + 200) * 100) / 100;
      } else if (points === 5) {
        prize = Math.round((Math.random() * 15000 + 10000) * 100) / 100;
      } else if (points === 6) {
        prize = Math.round((Math.random() * 5000000 + 1000000) * 100) / 100;
      }

      newDraws.push({
        extractionNum: extNum,
        dateStr,
        drawnNumbers: drawn,
        matchedNumbers: matched,
        prize
      });
    }

    return newDraws;
  };

  const getCategoryHitsCount = (points: number): number => {
    if (!checkResult) return 0;
    switch (points) {
      case 2: return checkResult.twoHits;
      case 3: return checkResult.threeHits;
      case 4: return checkResult.fourHits;
      case 5: return checkResult.fiveHits;
      case 6: return checkResult.sixHits;
      default: return 0;
    }
  };

  const handleCategoryToggle = (points: number) => {
    if (expandedCategory === points) {
      setExpandedCategory(null);
      return;
    }
    setExpandedCategory(points);

    if (!categoryDraws[points]) {
      const hitsCount = getCategoryHitsCount(points);
      if (hitsCount > 0) {
        const countToFetch = Math.min(5, hitsCount);
        const initialDraws = generateDrawsForCategory(points, countToFetch, 0, selectedNumbers);
        setCategoryDraws(prev => ({ ...prev, [points]: initialDraws }));
      } else {
        setCategoryDraws(prev => ({ ...prev, [points]: [] }));
      }
    }
  };

  const handleLoadMoreDraws = (points: number) => {
    const hitsCount = getCategoryHitsCount(points);
    const currentDraws = categoryDraws[points] || [];
    const remaining = hitsCount - currentDraws.length;
    if (remaining <= 0) return;

    const countToFetch = Math.min(5, remaining);
    const additional = generateDrawsForCategory(points, countToFetch, currentDraws.length, selectedNumbers);
    setCategoryDraws(prev => ({
      ...prev,
      [points]: [...currentDraws, ...additional]
    }));
  };

  // Verify numbers with Superenalotto 15-year history
  const handleCheckNumbers = () => {
    if (selectedNumbers.length !== 6) {
      showToast("Seleziona esattamente 6 numeri prima di controllare!");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      playPopSound(180, 0.25);
      return;
    }

    // Instantly replace unselected duplicate numbers on the grid with missing numbers from 1..90
    const currentGrid = gridNumbers.length > 0 ? gridNumbers : Array.from({ length: 90 }, (_, i) => i + 1);
    const missing: number[] = [];
    for (let n = 1; n <= 90; n++) {
      if (!currentGrid.includes(n)) {
        missing.push(n);
      }
    }

    if (missing.length > 0) {
      const valueIndicesMap = new Map<number, number[]>();
      currentGrid.forEach((val, idx) => {
        if (!valueIndicesMap.has(val)) {
          valueIndicesMap.set(val, []);
        }
        valueIndicesMap.get(val)!.push(idx);
      });

      const nextGrid = [...currentGrid];
      let missingIdx = 0;

      valueIndicesMap.forEach((indices) => {
        if (indices.length > 1) {
          let keepIndex = indices.find(idx => selectedGridIndices.includes(idx));
          if (keepIndex === undefined) {
            keepIndex = indices[0];
          }

          indices.forEach(idx => {
            if (idx !== keepIndex && missingIdx < missing.length) {
              nextGrid[idx] = missing[missingIdx];
              missingIdx++;
            }
          });
        }
      });

      setGridNumbers(nextGrid);
    }

    setIsChecking(true);
    setCheckResult(null);
    setExpandedCategory(null);
    setCategoryDraws({});
    setCheckingProgress(0);
    playPopSound(500, 0.1);

    const steps = [
      { text: "Connessione all'archivio storico Superenalotto (2011-2026)...", progress: 20 },
      { text: "Scansione di 2.513 estrazioni storiche in corso...", progress: 50 },
      { text: "Calcolo vincite e riscontri della combinazione...", progress: 80 },
      { text: "Elaborazione bilancio e statistiche finali...", progress: 100 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setCheckingStep(step.text);
        setCheckingProgress(step.progress);
        playPopSound(500 + idx * 100, 0.08);

        if (idx === steps.length - 1) {
          setTimeout(() => {
            const spent = 2513; // 2.513 € spent
            
            const winnings = Math.round((Math.random() * 1250 + 850) * 100) / 100;
            const net = winnings - spent;

            const twoHits = Math.floor(Math.random() * 40) + 70; // 70-110 times
            const threeHits = Math.floor(Math.random() * 10) + 8; // 8-18 times
            const fourHits = Math.floor(Math.random() * 2) + 1; // 1-2 times
            const fiveHits = 0; // Always 0
            const sixHits = 0; // Always 0

            setCheckResult({
              spent,
              winnings,
              net,
              twoHits,
              threeHits,
              fourHits,
              fiveHits,
              sixHits
            });
            setIsChecking(false);
            playPopSound(800, 0.25);
            showToast("Verifica completata con successo! 📊");
          }, 600);
        }
      }, idx * 600);
    });
  };

  // Statistics calculation for selected numbers
  const sumOfNumbers = selectedNumbers.reduce((a, b) => a + b, 0);
  const evenCount = selectedNumbers.filter(n => n % 2 === 0).length;
  const oddCount = selectedNumbers.length - evenCount;
  const lowCount = selectedNumbers.filter(n => n <= 45).length;
  const highCount = selectedNumbers.length - lowCount;

  // Ball background colors (solid red as requested)
  const getBallGradient = (index: number) => {
    return "from-red-500 to-red-700 shadow-red-500/30 border-red-400/40";
  };

  return (
    <div 
      className="min-h-screen flex justify-center items-center p-0 sm:p-4 selection:bg-emerald-500 selection:text-white"
      style={{
        background: "radial-gradient(circle at 20% 20%, #059669 0%, transparent 45%), radial-gradient(circle at 80% 80%, #10b981 0%, transparent 45%), #022c22"
      }}
    >
      {/* Smartphone Outer Container simulating standard device card on desktop, full screen on mobile */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl sm:rounded-[36px] sm:shadow-2xl overflow-hidden min-h-screen sm:min-h-[850px] flex flex-col justify-between border-0 sm:border border-white/20 relative text-white">
        
        {/* Dynamic Warning Toast Banner */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-4 right-4 z-50 bg-slate-900/90 text-white text-sm py-2.5 px-4 rounded-xl shadow-lg border border-white/20 flex items-center justify-between backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <Info size={14} className="text-pink-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-white/60 hover:text-white ml-2 text-base font-semibold">
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Section (Frosted Glass Theme with Pink-Indigo glow accent) */}
        <header className="bg-white/5 border-b border-white/10 px-5 pt-5 pb-5 text-white relative">
          {/* Accent decoration bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div>
                <h1 className="text-2xl font-black tracking-wider text-pink-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] [text-shadow:_1px_1px_0_#000,_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000]" style={{ fontFamily: "var(--font-sans)" }}>
                  SuperEnalotto.net
                </h1>
                <p className="text-xs text-white/60 font-medium tracking-wide uppercase mt-0.5">Scegli i tuoi numeri fortunati</p>
              </div>
            </div>

            {/* Menu Hamburger */}
            <div className="flex items-center gap-2">
              <button
                className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Menu"
              >
                <Menu size={18} />
                {isSpecialMode && (
                  <span className="absolute top-1 right-1 w-[2px] h-[2px] bg-white rounded-full pointer-events-none" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Core Body */}
        <main className="flex-1 overflow-y-auto bg-transparent flex flex-col justify-start">
          
          {/* Verification Heading Text */}
          <div className="px-4 pt-4 pb-1">
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Verifica vincite Superenalotto
            </h2>
            <p className="text-sm text-white/70 mt-0.5 font-medium leading-normal">
              Inserisci in questo verificatore i numeri scelti nella tua schedina e scopri se hai vinto premi
            </p>
          </div>

          {/* Quick Actions (Randomizer & Reset) */}
          <div className="px-4 pt-4 pb-2 flex gap-2">
            <button
              onClick={handleShuffleGrid}
              disabled={isGenerating}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all border cursor-pointer ${
                isGenerating 
                  ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed" 
                  : "bg-white/10 text-white hover:bg-white/20 active:scale-95 border-white/20 shadow-md"
              }`}
            >
              <Dices size={16} className={isGenerating ? "animate-spin" : ""} />
              <span>Mescola</span>
            </button>
            
            <button
              onMouseDown={startRipristinaPress}
              onMouseUp={handleRipristinaClick}
              onMouseLeave={cancelRipristinaPress}
              onTouchStart={startRipristinaPress}
              onTouchEnd={handleRipristinaClick}
              onTouchCancel={cancelRipristinaPress}
              onClick={handleRipristinaClick}
              disabled={(!isGridShuffled && selectedNumbers.length === 0) || isGenerating}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all border cursor-pointer select-none ${
                ((!isGridShuffled && selectedNumbers.length === 0) || isGenerating)
                  ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                  : "bg-white/10 text-white hover:bg-white/20 active:scale-95 border-white/20 shadow-md"
              }`}
              title="Ripristina tabella e selezione"
            >
              <RotateCcw size={14} />
              <span>Ripristina</span>
            </button>
          </div>

          {/* Core Table Grid Area (1-90 Numbers) */}
          <div className="px-3 py-2">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-2.5 border border-white/10 shadow-lg">
              <div className="grid grid-cols-10 gap-1">
                {(gridNumbers.length > 0 ? gridNumbers : Array.from({ length: 90 }, (_, index) => index + 1)).map((num, index) => {
                  const isSelected = selectedGridIndices.includes(index);
                  return (
                    <button
                      key={`${num}-${index}`}
                      onClick={() => handleNumberToggle(num, index)}
                      disabled={isGenerating}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center text-sm font-black transition-all duration-150 cursor-pointer select-none relative
                        ${isSelected
                          ? "bg-red-600 text-white border border-white/30 shadow-[0_0_12px_rgba(220,38,38,0.7)] ring-2 ring-red-400/40 scale-105 z-10"
                          : "bg-white/10 text-white hover:bg-white/25 border border-white/5"
                        }
                        ${isGenerating ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selection row containing 6 circles (as requested, moved right below grid) */}
          <div className="px-4 py-3 mx-4 my-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            {/* Label indicating selection quantity */}
            <div className="flex items-center justify-between mb-3 px-1 text-sm">
              <span className="font-semibold text-white/80 flex items-center gap-1.5">
                La tua combinazione:
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  selectedNumbers.length === 6 
                    ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                    : "bg-white/10 text-white/80"
                }`}>
                  {selectedNumbers.length}/6 numeri scelti
                </span>
              </span>

              {selectedNumbers.length === 6 && (
                <span className="text-xs text-red-400 font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 size={12} />
                  Pronta!
                </span>
              )}
            </div>

            {/* Visual 6 Circles that fill up as numbers are selected */}
            <motion.div
              animate={shake ? { x: [-8, 8, -6, 6, -4, 4, -2, 2, 0] } : {}}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="grid grid-cols-6 gap-2 justify-items-center"
            >
              {Array.from({ length: 6 }).map((_, index) => {
                const num = selectedNumbers[index];
                return (
                  <div key={index} className="w-12 h-12 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {num ? (
                        <motion.button
                          key={`ball-${num}`}
                          initial={{ scale: 0, rotate: -60 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 60 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveNumber(num)}
                          className={`
                            w-12 h-12 rounded-full flex flex-col items-center justify-center text-base font-extrabold text-white shadow-lg border cursor-pointer select-none relative overflow-hidden
                            bg-gradient-to-br ${getBallGradient(index)}
                          `}
                        >
                          {/* 3D Glossy reflection layer */}
                          <span className="absolute top-0.5 left-1 w-8 h-3 rounded-full bg-white/25 blur-[1px]" />
                          <span className="relative z-10">{num}</span>
                          {/* Subtle number underline to specify correct reading orientation (Lotto-style) */}
                          <span className="w-2.5 h-[1.5px] bg-white/40 rounded-full -mt-0.5 relative z-10" />
                        </motion.button>
                      ) : (
                        <motion.div
                          key={`placeholder-${index}`}
                          className="w-11 h-11 rounded-full border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/30 text-sm font-semibold select-none"
                        >
                          {index + 1}°
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Superenalotto History Verification Panel */}
          <div className="px-4 pb-4 flex-1 flex flex-col justify-end">
            <div className="border-t border-white/10 pt-4">
              
              {isChecking && (
                <div className="bg-white/5 border border-white/15 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/70 flex items-center gap-1.5">
                      <Clock size={12} className="text-pink-400 animate-pulse" />
                      Ricerca Storico Superenalotto...
                    </span>
                    <span className="text-sm font-black text-pink-400">{checkingProgress}%</span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-pink-500 to-indigo-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${checkingProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  
                  <p className="text-xs text-white/50 italic select-none">
                    {checkingStep}
                  </p>
                </div>
              )}

              {checkResult && !isChecking && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/15 rounded-2xl p-3.5 flex flex-col gap-3 shadow-md"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-pink-400 flex items-center gap-1.5">
                      <Coins size={11} />
                      ARCHIVIO STORICO 15 ANNI (2011-2026)
                    </span>
                  </div>

                  {/* Financial Metrics Row */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-white p-1.5 px-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <span className="block text-[10px] text-black font-extrabold uppercase leading-tight">PAGATO</span>
                      <span className="text-xs sm:text-sm font-black text-red-600 whitespace-nowrap tracking-tight leading-tight">-{formatCurrency(checkResult.spent, false)} €</span>
                    </div>
                    
                    <div className="bg-white p-1.5 px-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <span className="block text-[10px] text-black font-extrabold uppercase leading-tight">VINCITE</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap tracking-tight leading-tight">+{formatCurrency(checkResult.winnings)} €</span>
                    </div>

                    <div className="bg-white p-1.5 px-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <span className="block text-[10px] text-black font-extrabold uppercase leading-tight">TOTALE</span>
                      <span className="text-xs sm:text-sm font-black text-red-600 whitespace-nowrap tracking-tight leading-tight block">{formatCurrency(checkResult.net)} €</span>
                    </div>
                  </div>

                  {/* Interactive Hit Frequencies with Expandable Details */}
                  <div className="space-y-1 text-sm mt-1">
                    {[2, 3, 4, 5, 6].map((points) => {
                      const count = getCategoryHitsCount(points);
                      const isExpanded = expandedCategory === points;
                      const draws = categoryDraws[points] || [];

                      return (
                        <div key={points} className="flex flex-col border-b border-white/5 last:border-b-0 pb-1 pt-0.5">
                          <button
                            onClick={() => handleCategoryToggle(points)}
                            className="flex justify-between items-center px-2 py-1.5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer text-left w-full"
                          >
                            <span className="flex items-center gap-1.5 text-white/80 font-medium">
                              <ChevronRight size={13} className={`text-pink-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                              Numeri indovinati {points}:
                            </span>
                            <span className={`font-extrabold ${count > 0 ? "text-pink-300" : "text-white/40"}`}>
                              {count} {count === 1 ? "volta" : "volte"}
                            </span>
                          </button>

                          {/* Expanded Details List */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden pl-2 pr-1 py-1.5 flex flex-col gap-2"
                              >
                                {count === 0 || draws.length === 0 ? (
                                  <div className="text-xs text-white/40 italic py-2 px-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                    Nessuna estrazione trovata con {points} numeri indovinati.
                                  </div>
                                ) : (
                                  <>
                                    <div className="space-y-2">
                                      {draws.map((draw, idx) => (
                                        <div
                                          key={`${draw.extractionNum}-${idx}`}
                                          className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm text-xs"
                                        >
                                          <div className="flex justify-between items-center text-pink-300 font-bold border-b border-white/10 pb-1">
                                            <span>Estrazione n. {draw.extractionNum} del {draw.dateStr}</span>
                                          </div>

                                          <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-white/60 font-medium">Numeri estratti:</span>
                                              <div className="flex gap-1 flex-wrap">
                                                {draw.drawnNumbers.map(n => {
                                                  const isMatched = draw.matchedNumbers.includes(n);
                                                  return (
                                                    <span
                                                      key={n}
                                                      className={`px-1.5 py-0.2 rounded font-bold text-xs ${
                                                        isMatched
                                                          ? "bg-pink-500 text-white border border-pink-300/40 shadow-sm"
                                                          : "bg-white/10 text-white/80"
                                                      }`}
                                                    >
                                                      {n}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-white/60 font-medium">Numeri indovinati:</span>
                                              <div className="flex gap-1 flex-wrap">
                                                {draw.matchedNumbers.map(n => (
                                                  <span
                                                    key={n}
                                                    className="px-1.5 py-0.2 rounded font-extrabold text-xs bg-indigo-500 text-white border border-indigo-300/40 shadow-sm"
                                                  >
                                                    {n}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex justify-between items-center mt-2 p-2 rounded-lg bg-gray-600 border border-gray-500 text-white font-bold">
                                            <span>Importo vincita:</span>
                                            <span className="text-sm font-black text-emerald-300">{formatCurrency(draw.prize)} €</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {draws.length < count && (
                                      <button
                                        onClick={() => handleLoadMoreDraws(points)}
                                        className="mt-1 w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 font-bold text-xs border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                      >
                                        <PlusCircle size={13} className="text-pink-400" />
                                        carica successive
                                      </button>
                                    )}
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!isChecking && !checkResult && (
                <div className="border border-dashed border-white/10 rounded-2xl py-6 px-4 text-center text-sm text-white/50 bg-white/5 shadow-sm">
                  <p className="font-bold mb-1 text-white/90">Verifica statistica degli ultimi 15 anni</p>
                  <p className="text-xs mt-1 text-white/40 leading-relaxed">Seleziona 6 numeri e premi Controlla i miei numeri per scoprire se hai vinto dei premi.</p>
                </div>
              )}

            </div>
          </div>
        </main>

        {/* Bottom Verify Action Panel */}
        <section className="bg-white/5 backdrop-blur-2xl border-t border-white/15 px-4 py-4 z-10">
          <div className="flex gap-2.5">
            <button
              onClick={handleCheckNumbers}
              disabled={selectedNumbers.length !== 6 || isGenerating || isChecking}
              className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold tracking-wide transition-all duration-150 shadow-lg cursor-pointer ${
                selectedNumbers.length === 6 && !isGenerating && !isChecking
                  ? "bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white shadow-pink-500/20 active:scale-95"
                  : "bg-white/5 text-white/20 border border-white/10 cursor-not-allowed shadow-none"
              }`}
            >
              <Search size={15} className={isChecking ? "animate-spin" : ""} />
              <span>CONTROLLA I MIEI NUMERI</span>
            </button>
          </div>
        </section>

        {/* Real Portal Footer Section */}
        <footer className="bg-slate-950/80 border-t border-white/10 px-5 py-6 text-white/60 text-xs flex flex-col gap-5 select-none">
          {/* Social Media Links */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Seguici sui Social</span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-white/80">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-pink-400 transition-colors text-xs font-medium">Facebook</a>
              <span className="text-white/20">•</span>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-pink-400 transition-colors text-xs font-medium">Instagram</a>
              <span className="text-white/20">•</span>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-pink-400 transition-colors text-xs font-medium">X (Twitter)</a>
              <span className="text-white/20">•</span>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-pink-400 transition-colors text-xs font-medium">Telegram</a>
              <span className="text-white/20">•</span>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-pink-400 transition-colors text-xs font-medium">YouTube</a>
            </div>
          </div>

          {/* Navigation & Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] text-white/70 font-medium border-t border-b border-white/10 py-3">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Chi Siamo</a>
            <span className="text-white/20">•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Contatti</a>
            <span className="text-white/20">•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Tutela Privacy</a>
            <span className="text-white/20">•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Termini e Condizioni</a>
            <span className="text-white/20">•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Cookie Policy</a>
            <span className="text-white/20">•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Gioco Responsabile</a>
          </div>

          {/* Legal Disclaimer & Copyright */}
          <div className="text-center space-y-2 text-[10px] text-white/40 leading-relaxed">
            <p>
              Il gioco è vietato ai minori e può causare dipendenza patologica. Consulta le probabilità di vincita su www.adm.gov.it.
            </p>
            <p>
              © 2026 SuperEnalotto.net - Tutti i diritti riservati. Marchi e loghi appartengono ai rispettivi proprietari.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
