import { useCallback, useEffect, useRef, useState } from "react";
import { FALLBACK_LABS } from "../lib/labCatalog";

const LABS = FALLBACK_LABS.map((lab) => `${lab.name} • ${lab.focus}`);

const CHAR_BURN_DELAY = 28;
const CHAR_BURN_DURATION = 420;
const REVEAL_DELAY = 180;
const PARTICLE_COUNT = 3;

export default function BurningLabCard({ index }) {
  // To avoid cards showing the same labs initially, we offset them.
  const [currentIndex, setCurrentIndex] = useState(index % LABS.length);
  const [phase, setPhase] = useState("idle");
  const [burningChars, setBurningChars] = useState([]);
  const [particles, setParticles] = useState([]);
  const cardRef = useRef(null);
  const timerRefs = useRef([]);
  const hoverRef = useRef(false);
  const particleIdRef = useRef(0);

  const currentText = LABS[currentIndex];

  const clearAllTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  const spawnParticles = useCallback((charIndex, charEl) => {
    if (!charEl || !cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();

    const baseX = charRect.left - cardRect.left + charRect.width / 2;
    const baseY = charRect.top - cardRect.top;

    const newParticles = [];
    for (let p = 0; p < PARTICLE_COUNT; p++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: baseX + (Math.random() - 0.5) * 12,
        y: baseY,
        offsetX: (Math.random() - 0.5) * 20,
        offsetY: -(Math.random() * 30 + 15),
        size: Math.random() * 4 + 2,
        duration: Math.random() * 500 + 400,
        delay: Math.random() * 100,
        color:
          Math.random() > 0.5
            ? "#ff6b35"
            : Math.random() > 0.5
            ? "#ff4500"
            : "#ffb347",
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);

    const maxLife = Math.max(...newParticles.map((p) => p.duration + p.delay)) + 100;
    const cleanupTimer = setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.find((np) => np.id === p.id))
      );
    }, maxLife);
    timerRefs.current.push(cleanupTimer);
  }, []);

  // Using refs for latest state values to avoid stale closures in timeouts
  const stateRef = useRef({ phase: "idle", currentIndex });
  useEffect(() => {
    stateRef.current = { phase, currentIndex };
  }, [phase, currentIndex]);

  const triggerBurnSequence = useCallback(() => {
    if (stateRef.current.phase !== "idle") return;
    setPhase("burning");
    setBurningChars([]);
    setParticles([]);

    const chars = LABS[stateRef.current.currentIndex].split("");

    // Small delay to let React render the elements before we query them
    const initTimer = setTimeout(() => {
      if (!hoverRef.current) return;
      const charEls = cardRef.current?.querySelectorAll(".burn-char");

      chars.forEach((_, i) => {
        const timer = setTimeout(() => {
          if (!hoverRef.current) return;
          setBurningChars((prev) => [...prev, i]);
          if (charEls && charEls[i]) {
            spawnParticles(i, charEls[i]);
          }
        }, i * CHAR_BURN_DELAY);
        timerRefs.current.push(timer);
      });

      const totalBurnTime = chars.length * CHAR_BURN_DELAY + CHAR_BURN_DURATION;
      const revealTimer = setTimeout(() => {
        if (!hoverRef.current) return;
        setPhase("revealing");
        // Jump ahead by 3 so all 3 cards don't end up showing similar labs
        setCurrentIndex((prev) => (prev + 3) % LABS.length);
        
        const idleTimer = setTimeout(() => {
          if (hoverRef.current) {
            setPhase("idle");
          }
        }, 800); // Give user enough time to read the new text
        timerRefs.current.push(idleTimer);

      }, totalBurnTime + REVEAL_DELAY);
      timerRefs.current.push(revealTimer);
      
    }, 50);
    timerRefs.current.push(initTimer);
  }, [spawnParticles]);

  const onMouseEnter = useCallback(() => {
    hoverRef.current = true;
    clearAllTimers();
    setPhase("idle");
    setBurningChars([]);
    setParticles([]);
    triggerBurnSequence();
  }, [clearAllTimers, triggerBurnSequence]);

  const onMouseLeave = useCallback(() => {
    hoverRef.current = false;
    clearAllTimers();
    setPhase("idle");
    setBurningChars([]);
    setParticles([]);
  }, [clearAllTimers]);

  // Continuously cycle if the mouse stays hovered after returning to 'idle'
  useEffect(() => {
    if (phase === "idle" && hoverRef.current) {
      triggerBurnSequence();
    }
  }, [phase, triggerBurnSequence]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const renderBurningText = () => {
    return currentText.split("").map((char, i) => {
      const isBurning = burningChars.includes(i);
      return (
        <span
          key={`burn-${currentIndex}-${i}`}
          className={`burn-char ${isBurning ? "burning" : ""}`}
          style={{
            animationDelay: isBurning ? "0ms" : undefined,
            animationDuration: isBurning ? `${CHAR_BURN_DURATION}ms` : undefined,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      );
    });
  };

  const renderRevealingText = () => {
    return LABS[currentIndex].split("").map((char, i) => (
      <span
        key={`reveal-${currentIndex}-${i}`}
        className="reveal-char"
        style={{
          animationDelay: `${i * 18}ms`,
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  return (
    <div
      ref={cardRef}
      className="burning-lab-card neo-card p-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="particles-layer" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="fire-particle"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              "--px": `${p.offsetX}px`,
              "--py": `${p.offsetY}px`,
              animationDuration: `${p.duration}ms`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>

      <div className="burn-text-container">
        {phase === "revealing" ? renderRevealingText() : renderBurningText()}
      </div>
    </div>
  );
}
