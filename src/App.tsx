/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Gamepad2, 
  Music, 
  Terminal, 
  RotateCcw,
  Zap,
  Activity,
  ShieldAlert
} from 'lucide-react';

// --- System_Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 140;

const DATA_PATCHES = [
  {
    title: "SIGNAL_VOID_01",
    artist: "CORE_PROCESSOR",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "var(--color-glitch-cyan)"
  },
  {
    title: "MAGENTA_DECAY",
    artist: "BUFFER_OVERFLOW",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    color: "var(--color-glitch-magenta)"
  },
  {
    title: "STATIC_DRIFT",
    artist: "VERSION_7.4",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    color: "#ffffff"
  }
];

// --- Sub_Entities ---

const GameEntity = ({ onDataUpdate }: { onDataUpdate: (val: number) => void }) => {
  const [segments, setSegments] = useState(INITIAL_SNAKE);
  const [node, setNode] = useState({ x: 5, y: 5 });
  const [vector, setVector] = useState(INITIAL_DIRECTION);
  const [isCrashed, setIsCrashed] = useState(false);
  const [load, setLoad] = useState(0);
  const [isHalted, setIsHalted] = useState(true);
  
  const threadRef = useRef<NodeJS.Timeout | null>(null);
  const lastVectorRef = useRef(INITIAL_DIRECTION);

  const spawnNode = useCallback((currentSegments: {x: number, y: number}[]) => {
    let newNode;
    while (true) {
      newNode = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const overlap = currentSegments.some(s => s.x === newNode?.x && s.y === newNode?.y);
      if (!overlap) break;
    }
    return newNode;
  }, []);

  const initSystem = () => {
    setSegments(INITIAL_SNAKE);
    setVector(INITIAL_DIRECTION);
    lastVectorRef.current = INITIAL_DIRECTION;
    setNode(spawnNode(INITIAL_SNAKE));
    setLoad(0);
    onDataUpdate(0);
    setIsCrashed(false);
    setIsHalted(false);
  };

  const processTick = useCallback(() => {
    if (isCrashed || isHalted) return;

    setSegments(prev => {
      const head = prev[0];
      const nextHead = {
        x: (head.x + vector.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + vector.y + GRID_SIZE) % GRID_SIZE,
      };

      if (prev.some(s => s.x === nextHead.x && s.y === nextHead.y)) {
        setIsCrashed(true);
        return prev;
      }

      const nextSegments = [nextHead, ...prev];

      if (nextHead.x === node.x && nextHead.y === node.y) {
        setLoad(l => {
          const nextLoad = l + 10;
          onDataUpdate(nextLoad);
          return nextLoad;
        });
        setNode(spawnNode(nextSegments));
      } else {
        nextSegments.pop();
      }

      return nextSegments;
    });
  }, [vector, node, isCrashed, isHalted, spawnNode, onDataUpdate]);

  useEffect(() => {
    const handleInput = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (lastVectorRef.current.y !== 1) setVector({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
          if (lastVectorRef.current.y !== -1) setVector({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
          if (lastVectorRef.current.x !== 1) setVector({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
          if (lastVectorRef.current.x !== -1) setVector({ x: 1, y: 0 });
          break;
        case ' ':
          setIsHalted(h => !h);
          break;
      }
    };

    window.addEventListener('keydown', handleInput);
    return () => window.removeEventListener('keydown', handleInput);
  }, []);

  useEffect(() => {
    lastVectorRef.current = vector;
  }, [vector]);

  useEffect(() => {
    const frequency = Math.max(40, BASE_SPEED - load * 0.4);
    threadRef.current = setInterval(processTick, frequency);
    return () => {
      if (threadRef.current) clearInterval(threadRef.current);
    };
  }, [processTick, load]);

  return (
    <div className="relative">
      {/* ERROR_GRID */}
      <div 
        className="grid bg-black border-4 border-glitch-cyan p-1 gap-px shadow-[8px_8px_0_var(--color-glitch-magenta)]"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1.25rem)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1.25rem)` 
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isHead = segments[0].x === x && segments[0].y === y;
          const isBody = segments.slice(1).some(s => s.x === x && s.y === y);
          const isTarget = node.x === x && node.y === y;

          return (
            <div 
              key={i}
              className={`w-5 h-5 ${
                isHead ? 'bg-glitch-cyan glitch-text z-10' :
                isBody ? 'bg-glitch-cyan/60' :
                isTarget ? 'bg-glitch-magenta animate-pulse' :
                'bg-white/5'
              }`}
            />
          );
        })}
      </div>

      {/* SYSTEM_MODALS */}
      <AnimatePresence>
        {(isCrashed || isHalted) && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-grayscale"
          >
            {isCrashed ? (
              <div className="text-center p-4 border-4 border-glitch-magenta bg-black shadow-[10px_10px_0_var(--color-glitch-cyan)]">
                <ShieldAlert className="w-16 h-16 text-glitch-magenta mx-auto mb-4" />
                <h2 className="text-3xl font-pixel glitch-text text-glitch-magenta mb-2">SYSTEM_FATAL</h2>
                <p className="text-sm font-pixel text-glitch-cyan mb-6 tracking-tighter">DATA_LOSS: {load}</p>
                <button 
                  onClick={initSystem}
                  className="button-glitch px-8 py-3 font-pixel text-xs hover:glitch-text"
                >
                  REBOOT_SEQUENCE
                </button>
              </div>
            ) : (
              <div className="text-center p-4 border-4 border-glitch-cyan bg-black shadow-[10px_10px_0_var(--color-glitch-magenta)]">
                <Terminal className="w-16 h-16 text-glitch-cyan mx-auto mb-4" />
                <h2 className="text-3xl font-pixel text-glitch-cyan mb-6">HALTED</h2>
                <button 
                  onClick={() => setIsHalted(false)}
                  className="button-glitch px-8 py-3 font-pixel text-xs"
                >
                  RESUME_THREAD
                </button>
                <p className="mt-4 text-[10px] text-glitch-cyan/50 uppercase">[INPUT_SPACE] TO TOGGLE</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CORE_APPLICATION ---

export default function App() {
  const [dataCount, setDataCount] = useState(0);
  const [peakLoad, setPeakLoad] = useState(0);
  const [patchIndex, setPatchIndex] = useState(0);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [bitProgress, setBitProgress] = useState(0);
  const [hzDuration, setHzDuration] = useState(0);
  
  const audioNodeRef = useRef<HTMLAudioElement | null>(null);
  const patch = DATA_PATCHES[patchIndex];

  useEffect(() => {
    if (dataCount > peakLoad) setPeakLoad(dataCount);
  }, [dataCount, peakLoad]);

  useEffect(() => {
    if (!audioNodeRef.current) return;
    if (isBroadcasting) {
      audioNodeRef.current.play().catch(() => setIsBroadcasting(false));
    } else {
      audioNodeRef.current.pause();
    }
  }, [isBroadcasting, patchIndex]);

  const toggleBroadcast = () => setIsBroadcasting(!isBroadcasting);
  
  const cyclePatch = (dir: number) => {
    setPatchIndex((prev) => (prev + dir + DATA_PATCHES.length) % DATA_PATCHES.length);
    setBitProgress(0);
  };

  const syncBit = () => {
    if (audioNodeRef.current) {
      setBitProgress((audioNodeRef.current.currentTime / audioNodeRef.current.duration) * 100);
    }
  };

  const loadHz = () => {
    if (audioNodeRef.current) setHzDuration(audioNodeRef.current.duration);
  };

  const scrubStream = (e: ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * hzDuration;
    if (audioNodeRef.current) {
      audioNodeRef.current.currentTime = time;
      setBitProgress(parseFloat(e.target.value));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 static-overlay overflow-hidden">
      <div className="scanline" />

      {/* HEADER_SYNC */}
      <header className="w-full max-w-5xl mb-12 flex flex-col lg:flex-row items-center justify-between gap-8 z-10">
        <div className="flex flex-col items-center lg:items-start">
          <div className="flex items-center gap-4 mb-2">
            <Activity className="w-10 h-10 text-glitch-magenta animate-pulse" />
            <h1 className="text-4xl font-pixel glitch-text tracking-tighter text-glitch-cyan">
              VOID_RUNNER<span className="text-glitch-magenta">/0xSNAKE</span>
            </h1>
          </div>
          <p className="text-[10px] font-pixel text-glitch-magenta bg-glitch-cyan/10 px-2 py-1">KERNEL_VER: C_0.77.ALPHA</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
          <div className="pixel-border bg-black p-4 flex flex-col items-center min-w-[160px]">
            <span className="text-[8px] font-pixel text-glitch-cyan mb-2">CURRENT_LOAD</span>
            <span className="text-2xl font-pixel text-glitch-magenta">{dataCount.toString().padStart(4, '0')}</span>
          </div>
          <div className="pixel-border bg-black p-4 flex flex-col items-center min-w-[160px]">
            <span className="text-[8px] font-pixel text-glitch-magenta mb-2">PEAK_STRESS</span>
            <span className="text-2xl font-pixel text-glitch-cyan">{peakLoad.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </header>

      {/* CORE_GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 max-w-6xl w-full z-10">
        
        {/* ENTITY_STREAM */}
        <section className="flex flex-col items-center justify-center bg-black border-4 border-double border-glitch-cyan p-8 shadow-[12px_12px_0_rgba(255,0,255,0.2)]">
          <div className="w-full mb-6 flex justify-between items-center text-[10px] font-pixel text-glitch-cyan/50">
            <span>[BUFFER_STABLE]</span>
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-glitch-cyan animate-ping" />
              <span>LIVE_SYNC</span>
            </div>
          </div>
          
          <GameEntity onDataUpdate={setDataCount} />
          
          <div className="mt-8 text-center text-[8px] font-pixel text-glitch-magenta/60 space-y-2 uppercase leading-relaxed">
            <div>&gt; USE_WASD_TO_NAVIGATE_GRID</div>
            <div>&gt; SPACE_KEY_HALTS_THREAD</div>
            <div>&gt; COLLECT_MAGENTA_NODES_TO_SYNC</div>
          </div>
        </section>

        {/* AUDITORY_PATCHER */}
        <aside className="flex flex-col gap-8">
          
          <div className="pixel-border bg-black p-8 flex flex-col items-center relative overflow-hidden group">
            <div 
              className="absolute top-0 right-0 w-2 h-full bg-glitch-magenta"
              style={{ opacity: isBroadcasting ? 1 : 0.2 }}
            />
            
            <div className="w-56 h-56 bg-static rounded-none mb-8 relative flex items-center justify-center border-2 border-glitch-cyan overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fiber.png')] opacity-20" />
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={patchIndex}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 10, opacity: 0 }}
                  className="relative z-10"
                >
                  <Music className="w-20 h-20 text-glitch-cyan" />
                </motion.div>
              </AnimatePresence>
              
              {/* STATICVISUALIZER */}
              <div className="absolute inset-x-4 bottom-4 flex items-end gap-1 h-12">
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={isBroadcasting ? { height: [2, Math.random() * 40 + 4, 2] } : { height: 2 }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                    className="flex-1 bg-glitch-magenta"
                  />
                ))}
              </div>
            </div>

            <div className="text-center mb-8 w-full">
              <h3 className="text-lg font-pixel text-glitch-cyan mb-2 truncate px-2">{patch.title}</h3>
              <p className="text-[10px] font-pixel text-glitch-magenta">{patch.artist}</p>
            </div>

            {/* BROADCAST_CONTROLS */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <button 
                onClick={() => cyclePatch(-1)}
                className="text-glitch-cyan hover:text-glitch-magenta transition-colors"
                title="PREV_PATCH"
              >
                <SkipBack className="w-8 h-8" />
              </button>
              <button 
                onClick={toggleBroadcast}
                className="w-16 h-16 button-glitch flex items-center justify-center"
              >
                {isBroadcasting ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>
              <button 
                onClick={() => cyclePatch(1)}
                className="text-glitch-cyan hover:text-glitch-magenta transition-colors"
                title="NEXT_PATCH"
              >
                <SkipForward className="w-8 h-8" />
              </button>
            </div>

            <div className="w-full px-2">
              <input 
                type="range" 
                value={bitProgress}
                onChange={scrubStream}
                className="w-full accent-glitch-magenta h-4 border-2 border-glitch-cyan bg-black cursor-none"
              />
              <div className="flex justify-between mt-4 text-[8px] font-pixel text-glitch-cyan/40 uppercase">
                <span>0x{Math.floor(bitProgress).toString(16).padStart(2, '0')}</span>
                <span>STATUS_OK</span>
              </div>
            </div>
          </div>

          {/* SYSTEM_LOG */}
          <div className="pixel-border bg-black border-glitch-magenta p-6 shadow-[-8px_8px_0_var(--color-glitch-cyan)]">
            <div className="flex items-center gap-4 mb-4">
              <Zap className="w-5 h-5 text-glitch-magenta" />
              <h4 className="text-xs font-pixel text-glitch-magenta uppercase tracking-tighter">DAEMON_LOGS</h4>
            </div>
            <div className="text-[8px] font-pixel text-glitch-cyan/60 space-y-4 leading-[1.6]">
              <div className="flex gap-3">
                <span className="text-glitch-magenta">[!!!]</span>
                <span>DATA_NODE_ENCRYPTION_DETECTED. CONSUME_TO_DECRYPT.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-glitch-magenta">[WRN]</span>
                <span>LATENCY_STRESS_INCREASES_WITH_DATA_LOAD.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-glitch-magenta">[INF]</span>
                <span>SIGNAL_VOID_STABLE. NO_RECOVERY_NECESSARY.</span>
              </div>
            </div>
          </div>

        </aside>
      </main>
      
      <audio 
        ref={audioNodeRef}
        src={patch.url}
        onTimeUpdate={syncBit}
        onLoadedMetadata={loadHz}
        onEnded={() => cyclePatch(1)}
      />
    </div>
  );
}
