'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type GameStatus = 'idle' | 'running' | 'ended';

type Obstacle = {
  id: number;
  x: number;
  width: number;
  y: number;
  height: number;
  speed: number;
};

type Particle = {
  x: number;
  y: number;
  radius: number;
  life: number;
  vx: number;
  vy: number;
  hue: number;
};

const BASE_WIDTH = 360;
const BASE_HEIGHT = 640;
const PLAYER_WIDTH = 48;
const PLAYER_HEIGHT = 60;
const MAX_PARTICLES = 40;

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
      <header className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 pt-6 text-center">
        <h1 className="text-3xl font-semibold uppercase tracking-[0.4em] text-indigo-200 sm:text-4xl">
          Neon Glide
        </h1>
        <p className="text-sm text-indigo-200/80 sm:text-base">
          Drag anywhere to guide your hovercraft, snag energy orbs, and outlast
          the storm of neon shards.
        </p>
      </header>
      <main className="mx-auto mt-4 flex w-full max-w-3xl flex-1 flex-col items-center px-3 pb-8">
        <div className="relative w-full flex-1">
          <GameCanvas />
        </div>
      </main>
    </div>
  );
}

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resizeRef = useRef({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const animationRef = useRef<number>();
  const [status, setStatus] = useState<GameStatus>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [flash, setFlash] = useState(false);

  const gameStateRef = useRef({
    playerX: BASE_WIDTH / 2 - PLAYER_WIDTH / 2,
    playerY: BASE_HEIGHT - PLAYER_HEIGHT - 24,
    playerVx: 0,
    touchTargetX: BASE_WIDTH / 2,
    lastSpawn: 0,
    spawnInterval: 1400,
    speed: 120,
    lastTime: 0,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    score: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem('neon-glide-best');
    if (stored) {
      setBestScore(Number(stored));
    }
  }, []);

  const updateBestScore = useCallback((value: number) => {
    setBestScore((prev) => {
      if (value > prev) {
        localStorage.setItem('neon-glide-best', String(value));
        return value;
      }
      return prev;
    });
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const { width } = parent.getBoundingClientRect();
    const height = Math.min(window.innerHeight * 0.8, (width / BASE_WIDTH) * BASE_HEIGHT);

    resizeRef.current = { width, height };
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const spawnObstacle = useCallback((difficultyBoost: number) => {
    const width = 60 + Math.random() * 60;
    const x = Math.random() * (BASE_WIDTH - width);
    const speed = 90 + difficultyBoost + Math.random() * 30;
    const height = 12 + Math.random() * 12;
    const shardCount = 2 + Math.floor(Math.random() * 3);
    const baseHue = 180 + Math.random() * 100;

    const obstacle: Obstacle = {
      id: performance.now(),
      x,
      width,
      y: -height,
      height,
      speed,
    };

    const particles: Particle[] = Array.from({ length: shardCount }).map(() => ({
      x: obstacle.x + obstacle.width / 2,
      y: obstacle.y,
      radius: 2 + Math.random() * 2,
      life: 1,
      vx: (Math.random() - 0.5) * 60,
      vy: -30 - Math.random() * 40,
      hue: baseHue + Math.random() * 40,
    }));

    gameStateRef.current.obstacles.push(obstacle);
    gameStateRef.current.particles.push(...particles);
  }, []);

  const spawnParticles = useCallback((x: number, y: number) => {
    const particles: Particle[] = Array.from({ length: 12 }).map(() => ({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      radius: 3 + Math.random() * 4,
      life: 1,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200,
      hue: 320 + Math.random() * 40,
    }));

    gameStateRef.current.particles.push(...particles);
    gameStateRef.current.particles = gameStateRef.current.particles.slice(-MAX_PARTICLES);
  }, []);

  const resetGame = useCallback(() => {
    const state = gameStateRef.current;
    state.playerX = BASE_WIDTH / 2 - PLAYER_WIDTH / 2;
    state.playerY = BASE_HEIGHT - PLAYER_HEIGHT - 24;
    state.playerVx = 0;
    state.touchTargetX = BASE_WIDTH / 2;
    state.lastSpawn = 0;
    state.spawnInterval = 1400;
    state.speed = 120;
    state.lastTime = 0;
    state.obstacles = [];
    state.particles = [];
    state.score = 0;
    setScore(0);
    setStatus('running');
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
  }, []);

  const updateTouchTarget = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const normalized = ((clientX - rect.left) / rect.width) * BASE_WIDTH;
      gameStateRef.current.touchTargetX = normalized;
    },
    [gameStateRef]
  );

  const pointerHandlers = useMemo(() => {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (status !== 'running') {
          resetGame();
        }
        updateTouchTarget(event.clientX);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.pressure === 0 && event.pointerType === 'mouse') return;
        updateTouchTarget(event.clientX);
      },
      onPointerUp: () => {
        gameStateRef.current.playerVx = 0;
      },
      onPointerLeave: () => {
        gameStateRef.current.playerVx = 0;
      },
    };
  }, [resetGame, status, updateTouchTarget]);

  useEffect(() => {
    if (status !== 'running') {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawRoundedRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number
    ) => {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const drawPlayer = (x: number, y: number, frame: number) => {
      const gradient = ctx.createLinearGradient(x, y, x, y + PLAYER_HEIGHT);
      gradient.addColorStop(0, '#60a5fa');
      gradient.addColorStop(1, '#c084fc');

      ctx.fillStyle = gradient;
      drawRoundedRect(x, y, PLAYER_WIDTH, PLAYER_HEIGHT, 18);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,0.2)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      const glow = Math.sin(frame / 150) * 4 + 6;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = glow;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(x + 12, y + 20, 6, 12);
      ctx.fillRect(x + PLAYER_WIDTH - 18, y + 20, 6, 12);
      ctx.shadowBlur = 0;
    };

    const drawObstacle = (obstacle: Obstacle) => {
      const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y);
      gradient.addColorStop(0, 'rgba(2,132,199,0.9)');
      gradient.addColorStop(1, 'rgba(147,51,234,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.shadowColor = '#bfdbfe';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      ctx.fillRect(obstacle.x, obstacle.y + obstacle.height, obstacle.width, 6);
      ctx.shadowBlur = 0;
    };

    const drawParticles = (particles: Particle[]) => {
      particles.forEach((particle) => {
        ctx.fillStyle = `hsla(${particle.hue}, 90%, 70%, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const step = (timestamp: number) => {
      const state = gameStateRef.current;
      if (!state.lastTime) state.lastTime = timestamp;
      const delta = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const { width, height } = resizeRef.current;
      const deviceScale = devicePixelRatio || 1;
      ctx.scale((width / BASE_WIDTH) * deviceScale, (height / BASE_HEIGHT) * deviceScale);

      const gradientBg = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
      gradientBg.addColorStop(0, 'rgba(12, 19, 38, 0.9)');
      gradientBg.addColorStop(1, 'rgba(23, 7, 45, 0.95)');
      ctx.fillStyle = gradientBg;
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

      ctx.save();
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#1f2937' : '#111827';
        ctx.fillRect((BASE_WIDTH / 8) * i, 0, BASE_WIDTH / 16, BASE_HEIGHT);
      }
      ctx.restore();

      const diff = state.touchTargetX - (state.playerX + PLAYER_WIDTH / 2);
      state.playerVx = state.playerVx * 0.85 + diff * 6 * delta;
      state.playerX += state.playerVx;
      state.playerX = Math.max(12, Math.min(BASE_WIDTH - PLAYER_WIDTH - 12, state.playerX));

      state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < BASE_HEIGHT + 40);
      state.particles = state.particles.filter((particle) => particle.life > 0 && particle.y < BASE_HEIGHT + 20);

      state.obstacles.forEach((obstacle) => {
        obstacle.y += obstacle.speed * delta;
        drawObstacle(obstacle);
      });

      state.particles.forEach((particle) => {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.life -= delta * 0.8;
      });
      drawParticles(state.particles);

      drawPlayer(state.playerX, state.playerY, timestamp);

      const hit = state.obstacles.some((obstacle) => {
        return (
          state.playerX < obstacle.x + obstacle.width &&
          state.playerX + PLAYER_WIDTH > obstacle.x &&
          state.playerY < obstacle.y + obstacle.height &&
          state.playerY + PLAYER_HEIGHT > obstacle.y
        );
      });

      if (hit) {
        spawnParticles(state.playerX + PLAYER_WIDTH / 2, state.playerY + PLAYER_HEIGHT / 2);
        updateBestScore(state.score);
        setStatus('ended');
        setFlash(true);
        setTimeout(() => setFlash(false), 160);
        ctx.restore();
        return;
      }

      const gain = Math.floor((state.speed * delta) / 2);
      if (gain > 0) {
        state.score += gain;
        setScore(state.score);
      }

      if (timestamp - state.lastSpawn > state.spawnInterval) {
        spawnObstacle(state.speed * 0.35);
        state.lastSpawn = timestamp;
        state.spawnInterval = Math.max(450, state.spawnInterval * 0.97);
        state.speed += 6;
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [spawnObstacle, spawnParticles, status, updateBestScore]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="relative my-4 flex aspect-[9/16] w-full max-w-sm select-none justify-center rounded-3xl border border-indigo-400/30 bg-slate-950/60 shadow-[0_0_80px_rgba(79,70,229,0.2)] backdrop-blur-md sm:max-w-md">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-pan-y rounded-3xl outline-none"
        {...pointerHandlers}
      />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-between px-5 text-xs font-medium uppercase tracking-widest text-indigo-200">
        <span>Score {score}</span>
        <span>Best {bestScore}</span>
      </div>
      {status !== 'running' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/70 px-6 text-center">
          <p className="text-xl font-semibold uppercase tracking-[0.3em] text-indigo-200">
            {status === 'idle' ? 'Tap To Launch' : 'Crashed'}
          </p>
          {status === 'ended' && (
            <div className="space-y-1 text-sm text-slate-200/90">
              <p>Score: <span className="font-semibold text-indigo-200">{score}</span></p>
              <p>Best: <span className="font-semibold text-indigo-200">{bestScore}</span></p>
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200/70">
            Hold & drag anywhere
          </p>
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500 px-8 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 focus:outline-none"
            onClick={resetGame}
          >
            {status === 'idle' ? 'Start Run' : 'Try Again'}
          </button>
        </div>
      ) : null}
      <div
        className={`pointer-events-none absolute inset-0 rounded-3xl transition ${
          flash ? 'bg-white/10' : 'bg-transparent'
        }`}
      />
    </div>
  );
}
