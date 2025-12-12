import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy, Calendar, User, Users, Play, FastForward, Pause,
  Activity, TrendingUp, ChevronsUp, Award, Shield, Zap,
  Moon, Sun, Volume2, VolumeX, Settings, BarChart2,
  Cpu, Radio, Target, Crosshair, Terminal, X, Minimize2,
  ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown,
  Home, Dumbbell, Briefcase, LayoutGrid, CheckCircle
} from 'lucide-react';

// --- Audio Engine (Web Audio API) ---
class AudioEngine {
  ctx: AudioContext | null = null;
  bgmOscillators: OscillatorNode[] = [];
  bgmGain: GainNode | null = null;
  isPlayingBgm: boolean = false;
  volume: number = 0.3;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.init();
    this.playTone(1200, 'square', 0.05, 0.2);
    setTimeout(() => this.playTone(2000, 'sine', 0.05, 0.1), 50);
  }

  playTick() {
    this.init();
    this.playTone(800 + Math.random() * 200, 'sawtooth', 0.03, 0.1);
  }

  playLevelUp() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880, 1108, 1318].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.2 * this.volume, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.06 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.1);
    });
  }

  toggleBgm(enable: boolean) {
    this.init();
    if (!this.ctx) return;

    if (enable && !this.isPlayingBgm) {
      this.isPlayingBgm = true;
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.05 * this.volume;
      this.bgmGain.connect(this.ctx.destination);

      const freqs = [55, 110.00];
      freqs.forEach(f => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const lfo = this.ctx!.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx!.createGain();
        lfoGain.gain.value = 2;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(this.bgmGain!);
        osc.start();
        this.bgmOscillators.push(osc);
      });
    } else if (!enable && this.isPlayingBgm) {
      this.isPlayingBgm = false;
      this.bgmOscillators.forEach(o => o.stop());
      this.bgmOscillators = [];
      if (this.bgmGain) this.bgmGain.disconnect();
    }
  }
}

const audio = new AudioEngine();

// --- Types & Constants ---
const STANDARD_STAT_CAP = 99;
const VELOCITY_STAT_CAP = 160;

const clampStatIncrease = (current: number, increment: number, cap: number) => {
  const newValue = Math.min(cap, current + increment);
  return { newValue, increased: newValue > current };
};

const TEAMS_CONFIG = [
  { id: 'dragons', name: 'NEO DRAGONS', short: 'NDR', color: 'bg-red-600', neon: 'shadow-[0_0_10px_#ef4444] border-red-500 text-red-400' },
  { id: 'tigers', name: 'CYBER TIGERS', short: 'CTG', color: 'bg-yellow-500', neon: 'shadow-[0_0_10px_#eab308] border-yellow-500 text-yellow-400' },
  { id: 'blues', name: 'WAVE RUNNERS', short: 'WAV', color: 'bg-blue-600', neon: 'shadow-[0_0_10px_#3b82f6] border-blue-500 text-blue-400' },
  { id: 'carps', name: 'RED PHANTOMS', short: 'RPH', color: 'bg-red-500', neon: 'shadow-[0_0_10px_#f43f5e] border-rose-500 text-rose-400' },
  { id: 'stars', name: 'SIRIUS STARS', short: 'STR', color: 'bg-orange-400', neon: 'shadow-[0_0_10px_#f97316] border-orange-500 text-orange-400' },
  { id: 'swallows', name: 'AERO SWALLOWS', short: 'ASW', color: 'bg-green-600', neon: 'shadow-[0_0_10px_#22c55e] border-green-500 text-green-400' },
];

type Condition = 'excellent' | 'good' | 'normal' | 'bad' | 'terrible';

interface Player {
  id: string;
  name: string;
  position: 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF';
  age: number;
  potential: 'S' | 'A' | 'B' | 'C';
  growthExp: number;
  // Abilities
  contact: number;
  power: number;
  speed: number;
  defense: number;
  arm: number;      // 肩力
  catching: number; // 捕球
  control: number;
  stamina: number;
  // State
  condition: Condition;
  // Stats
  games: number;
  atBats: number;
  hits: number;
  homeruns: number;
  rbi: number;
  innings: number;
  earnedRuns: number;
  wins: number;
  losses: number;
  saves: number;
}

interface Team {
  id: string;
  name: string;
  short: string;
  color: string;
  neon: string;
  players: Player[];
  wins: number;
  losses: number;
  draws: number;
  runsScored: number;
  runsAllowed: number;
}

interface GameResult {
  day: number;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  details: string[];
  growthUpdates: string[];
}

// --- Helper Functions ---

const generateRandomName = () => {
  const familyNames = ['KUSANAGI', 'TANAKA', 'SATO', 'SUZUKI', 'YAMADA', 'JONES', 'SMITH', 'LEE', 'WONG', 'BOND', 'STARK', 'WAYNE', 'KENT', 'ALLEN', 'FOX', 'WOLF', 'HAWK', 'SNAKE'];
  const givenNames = ['01', 'X', 'NEO', 'LEO', 'RAY', 'JAY', 'KAI', 'SKY', 'ACE', 'MAX', 'REX', 'ZED', 'CY', 'JAX', 'ASH', 'ROY', 'TY'];
  return `${familyNames[Math.floor(Math.random() * familyNames.length)]}-${givenNames[Math.floor(Math.random() * givenNames.length)]}`;
};

const getRandomCondition = (): Condition => {
  const rand = Math.random();
  if (rand < 0.1) return 'terrible';
  if (rand < 0.3) return 'bad';
  if (rand < 0.7) return 'normal';
  if (rand < 0.9) return 'good';
  return 'excellent';
};

const getConditionIcon = (cond: Condition, size = "sm") => {
  const s = size === "lg" ? "w-8 h-8" : "w-5 h-5";
  const stroke = size === "lg" ? 4 : 3;
  const glow = size === "lg" ? "drop-shadow-[0_0_8px_currentColor]" : "";

  switch (cond) {
    case 'excellent':
      return (
        <div className={`flex items-center justify-center rounded-full bg-pink-500/10 ${size === "lg" ? "p-2 ring-2 ring-pink-500/50" : "p-0.5"}`} title="絶好調">
          <ArrowUp className={`${s} text-pink-500 animate-pulse ${glow}`} strokeWidth={stroke} />
        </div>
      );
    case 'good':
      return (
        <div className={`flex items-center justify-center rounded-full bg-orange-500/10 ${size === "lg" ? "p-2 ring-1 ring-orange-500/30" : "p-0.5"}`} title="好調">
          <ArrowUpRight className={`${s} text-orange-500 ${glow}`} strokeWidth={stroke} />
        </div>
      );
    case 'normal':
      return (
        <div className={`flex items-center justify-center rounded-full bg-yellow-500/10 ${size === "lg" ? "p-2 ring-1 ring-yellow-500/30" : "p-0.5"}`} title="普通">
          <ArrowRight className={`${s} text-yellow-500 ${glow}`} strokeWidth={stroke} />
        </div>
      );
    case 'bad':
      return (
        <div className={`flex items-center justify-center rounded-full bg-cyan-500/10 ${size === "lg" ? "p-2 ring-1 ring-cyan-500/30" : "p-0.5"}`} title="不調">
          <ArrowDownRight className={`${s} text-cyan-500 ${glow}`} strokeWidth={stroke} />
        </div>
      );
    case 'terrible':
      return (
        <div className={`flex items-center justify-center rounded-full bg-purple-500/10 ${size === "lg" ? "p-2 ring-1 ring-purple-500/30" : "p-0.5"}`} title="絶不調">
          <ArrowDown className={`${s} text-purple-500 ${glow}`} strokeWidth={stroke} />
        </div>
      );
  }
};

const getConditionMultiplier = (cond: Condition) => {
  switch (cond) {
    case 'excellent': return 1.2;
    case 'good': return 1.1;
    case 'normal': return 1.0;
    case 'bad': return 0.9;
    case 'terrible': return 0.8;
  }
};

const generatePlayer = (id: string, position: Player['position']): Player => {
  const isPitcher = position === 'P';
  const potentialRoll = Math.random();
  let potential: Player['potential'] = 'C';
  if (potentialRoll > 0.95) potential = 'S';
  else if (potentialRoll > 0.80) potential = 'A';
  else if (potentialRoll > 0.50) potential = 'B';

  const baseMult = potential === 'S' ? 1.3 : potential === 'A' ? 1.15 : potential === 'B' ? 1.05 : 0.9;
  const baseStat = (min: number, max: number) => Math.floor((min + Math.random() * (max - min)) * baseMult);
  const age = Math.floor(18 + (Math.random() * Math.random() * 15));

  return {
    id,
    name: generateRandomName(),
    position,
    age,
    potential,
    growthExp: 0,
    contact: Math.min(99, isPitcher ? baseStat(10, 30) : baseStat(30, 85)),
    power: Math.min(99, isPitcher ? baseStat(10, 40) : baseStat(20, 85)),
    speed: Math.min(99, baseStat(30, 85)),
    defense: Math.min(99, baseStat(30, 85)),
    arm: Math.min(99, baseStat(30, 90)),      // 肩力
    catching: Math.min(99, baseStat(30, 85)), // 捕球
    control: Math.min(99, isPitcher ? baseStat(30, 85) : 0),
    stamina: Math.min(99, isPitcher ? baseStat(30, 90) : 0),
    condition: getRandomCondition(),
    games: 0,
    atBats: 0,
    hits: 0,
    homeruns: 0,
    rbi: 0,
    innings: 0,
    earnedRuns: 0,
    wins: 0,
    losses: 0,
    saves: 0,
  };
};

const createTeam = (config: typeof TEAMS_CONFIG[0]): Team => {
  const players: Player[] = [];
  players.push(generatePlayer(`${config.id}-p1`, 'P'));
  players.push(generatePlayer(`${config.id}-p2`, 'P'));
  players.push(generatePlayer(`${config.id}-p3`, 'P'));
  players.push(generatePlayer(`${config.id}-p4`, 'P'));
  players.push(generatePlayer(`${config.id}-p5`, 'P'));
  const positions: Player['position'][] = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'OF'];
  positions.forEach((pos, idx) => {
    players.push(generatePlayer(`${config.id}-f${idx}`, pos));
  });

  return { ...config, players, wins: 0, losses: 0, draws: 0, runsScored: 0, runsAllowed: 0 };
};

const simulateMatch = (home: Team, away: Team, day: number): { result: GameResult, updatedHome: Team, updatedAway: Team } => {
  const updateCondition = (p: Player): Player => ({
    ...p,
    condition: Math.random() < 0.2 ? getRandomCondition() : p.condition
  });

  const homePlayers = home.players.map(updateCondition);
  const awayPlayers = away.players.map(updateCondition);

  const getTeamPower = (players: Player[]) => {
    let offense = 0;
    let defense = 0;
    players.forEach(p => {
      const mult = getConditionMultiplier(p.condition);
      if (p.position === 'P') {
        defense += (p.control + p.stamina) * mult;
      } else {
        offense += (p.contact + p.power + p.speed) * mult;
      }
    });
    return { offense, defense };
  };

  const hPower = getTeamPower(homePlayers);
  const aPower = getTeamPower(awayPlayers);

  let homeScore = Math.floor(Math.max(0, (Math.random() * 8) + (hPower.offense / 1000) - (aPower.defense / 1200)));
  let awayScore = Math.floor(Math.max(0, (Math.random() * 8) + (aPower.offense / 1000) - (hPower.defense / 1200)));
  if (Math.random() < 0.05) homeScore += Math.floor(Math.random() * 5);
  if (Math.random() < 0.05) awayScore += Math.floor(Math.random() * 5);

  const growthEvents: string[] = [];
  const resolveStatsAndGrowth = (teamPlayers: Player[], teamName: string, ownScore: number, oppScore: number, isWin: boolean, isLoss: boolean): Player[] => {
    return teamPlayers.map(p => {
      let newP = { ...p };
      let xpGained = 10;
      if (p.position === 'P') {
        const isStarter = p.id.endsWith('p1') || p.id.endsWith('p2');
        if (!isStarter) return p;
        const innings = isStarter ? (Math.random() * 3 + 5) : 1;
        const er = Math.floor((oppScore / 9) * innings);
        newP.games += 1; newP.innings += innings; newP.earnedRuns += er;
        if (isWin && isStarter) { newP.wins += 1; xpGained += 50; }
        if (isLoss && isStarter) { newP.losses += 1; xpGained += 10; }
        xpGained += innings * 5;
        if (er === 0) xpGained += 30;
      } else {
        const abs = Math.floor(Math.random() * 2) + 3;
        const successRate = (p.contact * getConditionMultiplier(p.condition)) / 300;
        const hits = Math.random() < successRate ? Math.ceil(Math.random() * 2) : (Math.random() < 0.2 ? 1 : 0);
        let hrs = 0;
        if (hits > 0 && Math.random() < (p.power / 200)) hrs = 1;
        const rbis = hrs + (hits > 0 && Math.random() < 0.3 ? 1 : 0);
        newP.games += 1; newP.atBats += abs; newP.hits += hits; newP.homeruns += hrs; newP.rbi += rbis;
        xpGained += hits * 20; xpGained += hrs * 40; xpGained += rbis * 10;
      }
      if (p.age < 22) xpGained *= 1.5;
      else if (p.age < 26) xpGained *= 1.2;
      else if (p.age > 32) xpGained *= 0.5;

      newP.growthExp += Math.floor(xpGained);

      while (newP.growthExp >= 200) {
        newP.growthExp -= 200;
        const growthAmount = Math.floor(Math.random() * 2) + 1;
        let statGrown = '';
        if (newP.position === 'P') {
          const roll = Math.random();
          if (roll < 0.3 && newP.stamina < 99) { newP.stamina += growthAmount; statGrown = 'スタミナ'; }
          else if (roll < 0.6 && newP.control < 99) { newP.control += growthAmount; statGrown = 'コントロール'; }
          else if (roll < 0.8 && newP.speed < 160) { newP.speed += 1; statGrown = '球速'; }
          else if (roll < 0.9 && newP.arm < 99) { newP.arm += growthAmount; statGrown = '肩力'; } // 投手も肩は上がる
        } else {
          const roll = Math.random();
          if (roll < 0.2 && newP.contact < 99) { newP.contact += growthAmount; statGrown = 'ミート'; }
          else if (roll < 0.4 && newP.power < 99) { newP.power += growthAmount; statGrown = 'パワー'; }
          else if (roll < 0.6 && newP.speed < 99) { newP.speed += growthAmount; statGrown = '走力'; }
          else if (roll < 0.8 && newP.defense < 99) { newP.defense += growthAmount; statGrown = '守備力'; }
          else if (roll < 0.9 && newP.arm < 99) { newP.arm += growthAmount; statGrown = '肩力'; }
          else if (newP.catching < 99) { newP.catching += growthAmount; statGrown = '捕球'; }
        }
        if (statGrown) {
          growthEvents.push(`[SYSTEM] ${newP.name} :: ${statGrown} UPGRADE`);
        }
      }
      return newP;
    });
  };

  const isHomeWin = homeScore > awayScore;
  const isAwayWin = awayScore > homeScore;
  const isDraw = homeScore === awayScore;

  return {
    result: {
      day, homeId: home.id, awayId: away.id, homeScore, awayScore,
      details: [`MATCH LOG: ${home.short} ${homeScore} - ${awayScore} ${away.short}`],
      growthUpdates: growthEvents
    },
    updatedHome: { ...home, players: resolveStatsAndGrowth(homePlayers, home.short, homeScore, awayScore, isHomeWin, isAwayWin), wins: home.wins + (isHomeWin ? 1 : 0), losses: home.losses + (isAwayWin ? 1 : 0), draws: home.draws + (isDraw ? 1 : 0), runsScored: home.runsScored + homeScore, runsAllowed: home.runsAllowed + awayScore },
    updatedAway: { ...away, players: resolveStatsAndGrowth(awayPlayers, away.short, awayScore, homeScore, isAwayWin, isHomeWin), wins: away.wins + (isAwayWin ? 1 : 0), losses: away.losses + (isHomeWin ? 1 : 0), draws: away.draws + (isDraw ? 1 : 0), runsScored: away.runsScored + awayScore, runsAllowed: away.runsAllowed + homeScore }
  };
};

// --- Components ---

export default function CyberPennant() {
  const TOTAL_GAMES = 143;
  const REQUIRED_TEAM_COUNT = 6;
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [view, setView] = useState<'menu' | 'league' | 'schedule' | 'team'>('menu');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [gameSpeed, setGameSpeed] = useState(500);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Game State
  const [hasPracticed, setHasPracticed] = useState(false);

  // Modal States
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [practiceReport, setPracticeReport] = useState<{title: string, lines: string[]} | null>(null);
  const [showTrainingMenu, setShowTrainingMenu] = useState(false);

  useEffect(() => {
    setTeams(TEAMS_CONFIG.map(createTeam));
  }, []);

  useEffect(() => {
    audio.toggleBgm(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    let interval: number;
    if (isPlaying && currentDay <= TOTAL_GAMES) {
      interval = window.setInterval(() => {
        playDay();
        if (soundEnabled) audio.playTick();
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, gameSpeed);
    } else if (currentDay > TOTAL_GAMES) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentDay, teams, gameSpeed, soundEnabled]);

  const playDay = () => {
    if (currentDay > TOTAL_GAMES) return;
    if (teams.length < REQUIRED_TEAM_COUNT) return;

    // Reset daily practice limit
    setHasPracticed(false);

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const matchups = [[shuffled[0], shuffled[1]], [shuffled[2], shuffled[3]], [shuffled[4], shuffled[5]]];
    const dayResults: GameResult[] = [];
    const nextTeamsState = [...teams];
    let hasGrowth = false;

    matchups.forEach(([home, away]) => {
      const hIndex = nextTeamsState.findIndex(t => t.id === home.id);
      const aIndex = nextTeamsState.findIndex(t => t.id === away.id);
      const { result, updatedHome, updatedAway } = simulateMatch(nextTeamsState[hIndex], nextTeamsState[aIndex], currentDay);
      nextTeamsState[hIndex] = updatedHome;
      nextTeamsState[aIndex] = updatedAway;
      dayResults.push(result);
      if (result.growthUpdates.length > 0) hasGrowth = true;
    });

    if (hasGrowth && soundEnabled && gameSpeed > 200) audio.playLevelUp();
    setTeams(nextTeamsState);
    setGameHistory(prev => [...dayResults, ...prev]);
    setCurrentDay(d => d + 1);
  };

  const handlePlayToday = () => {
    if (soundEnabled) audio.playClick();
    playDay();
    setView('schedule');
  };

  const handlePractice = (type: 'batting' | 'speed' | 'defense' | 'pitching') => {
    if (hasPracticed) return;
    if (soundEnabled) audio.playLevelUp();

    const targetTeamId = selectedTeamId || teams[0].id;
    const teamIndex = teams.findIndex(t => t.id === targetTeamId);
    if (teamIndex === -1) return;

    const newTeams = [...teams];
    const team = { ...newTeams[teamIndex] };
    const newPlayers = [...team.players];
    const reportLines: string[] = [];

    // Logic to distribute XP
    let count = 0;
    newPlayers.forEach((p, idx) => {
       let isTarget = false;
       // Target logic: Pitchers for pitching, Fielders for others
       if (type === 'pitching' && p.position === 'P') isTarget = true;
       if (type !== 'pitching' && p.position !== 'P') isTarget = true;

       if (isTarget) {
          // Small XP for everyone in category
          const xpGain = 15 + Math.floor(Math.random() * 15);
          p.growthExp += xpGain;

          // Check level up
          while (p.growthExp >= 200) {
            p.growthExp -= 200;
            // Stat up based on practice type
            let stat = '';
            let statIncreased = false;
            let appliedCap = STANDARD_STAT_CAP;
            if (type === 'batting') {
              if(Math.random() > 0.5) {
                const { newValue, increased } = clampStatIncrease(p.power, 1, STANDARD_STAT_CAP);
                p.power = newValue; stat='パワー'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
              } else {
                const { newValue, increased } = clampStatIncrease(p.contact, 1, STANDARD_STAT_CAP);
                p.contact = newValue; stat='ミート'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
              }
            } else if (type === 'speed') {
              const { newValue, increased } = clampStatIncrease(p.speed, 1, STANDARD_STAT_CAP);
              p.speed = newValue; stat='走力'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
            } else if (type === 'defense') {
              if(Math.random() > 0.5) {
                const { newValue, increased } = clampStatIncrease(p.defense, 1, STANDARD_STAT_CAP);
                p.defense = newValue; stat='守備'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
              } else {
                const { newValue, increased } = clampStatIncrease(p.arm, 1, STANDARD_STAT_CAP);
                p.arm = newValue; stat='肩力'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
              }
            } else if (type === 'pitching') {
              const r = Math.random();
              if(r < 0.3) {
                const { newValue, increased } = clampStatIncrease(p.speed, 1, VELOCITY_STAT_CAP);
                p.speed = newValue; stat='球速'; statIncreased = increased; appliedCap = VELOCITY_STAT_CAP;
              }
              else if(r < 0.6) {
                const { newValue, increased } = clampStatIncrease(p.control, 1, STANDARD_STAT_CAP);
                p.control = newValue; stat='コン'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
              }
              else {
                const { newValue, increased } = clampStatIncrease(p.stamina, 1, STANDARD_STAT_CAP);
                p.stamina = newValue; stat='スタ'; statIncreased = increased; appliedCap = STANDARD_STAT_CAP;
              }
            }
            if (stat) {
              const message = statIncreased
                ? `${p.name} -> ${stat} UP!`
                : `${p.name} -> ${stat} は上限(${appliedCap})に達しています`;
              reportLines.push(message);
            }
          }
          newPlayers[idx] = p;
          count++;
       }
    });

    if (reportLines.length === 0) {
        reportLines.push(`全${count}選手に経験値を付与しました。`);
        reportLines.push("能力アップなし");
    } else {
        reportLines.unshift(`全${count}選手に経験値を付与。`);
    }

    team.players = newPlayers;
    newTeams[teamIndex] = team;

    setTeams(newTeams);
    setHasPracticed(true);
    setShowTrainingMenu(false); // Close menu
    setPracticeReport({
      title: `${type.toUpperCase()} DRILL COMPLETE`,
      lines: reportLines
    });
  };

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const winPctA = (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : 0;
      const winPctB = (b.wins + b.losses) > 0 ? b.wins / (b.wins + b.losses) : 0;
      return winPctB - winPctA;
    });
  }, [teams]);

  const handleSoundToggle = () => {
    if (!soundEnabled) audio.playClick();
    setSoundEnabled(!soundEnabled);
  };

  const handleViewChange = (v: typeof view) => {
    if (soundEnabled) audio.playClick();
    setView(v);
  }

  // --- Render Helpers for Cyber UI ---

  const GlitchText = ({ text, className = "" }: { text: string, className?: string }) => (
    <span className={`relative inline-block ${className} font-mono tracking-widest`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -ml-0.5 text-red-500 opacity-70 animate-pulse z-0">{text}</span>
      <span className="absolute top-0 left-0 ml-0.5 text-cyan-500 opacity-70 animate-pulse delay-75 z-0">{text}</span>
    </span>
  );

  const NeonBox = ({ children, className = "", color = "cyan", onClick }: any) => (
    <div
      onClick={onClick}
      className={`relative bg-black/80 border border-${color}-500/50 backdrop-blur-md p-4 overflow-hidden ${className} ${onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
    >
      <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-${color}-400`}></div>
      <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-${color}-400`}></div>
      <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-${color}-400`}></div>
      <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-${color}-400`}></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
      <div className="relative z-10">{children}</div>
    </div>
  );

  const renderAbilityRank = (val: number, showLabel = false, label = "") => {
    let rank = 'G';
    let color = 'text-gray-600';

    if (val >= 90) { rank = 'S'; color = 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]'; }
    else if (val >= 80) { rank = 'A'; color = 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]'; }
    else if (val >= 70) { rank = 'B'; color = 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]'; }
    else if (val >= 60) { rank = 'C'; color = 'text-orange-500'; }
    else if (val >= 50) { rank = 'D'; color = 'text-yellow-500'; }
    else if (val >= 40) { rank = 'E'; color = 'text-green-500'; }
    else if (val >= 30) { rank = 'F'; color = 'text-blue-500'; }
    else { rank = 'G'; color = 'text-gray-500'; }

    return (
      <div className="flex items-center space-x-2 font-mono">
        {showLabel && <span className="w-16 text-cyan-600 text-xs font-bold text-right mr-2">{label}</span>}
        <span className={`text-lg font-bold ${color} w-6 text-center inline-block`}>{rank}</span>
        <span className="text-[10px] text-gray-600 w-6 text-right">{val}</span>
      </div>
    );
  };

  const PlayerDetailModal = ({ player, onClose }: { player: Player, onClose: () => void }) => {
    const isPitcher = player.position === 'P';
    const team = teams.find(t => t.players.some(p => p.id === player.id));

    // Ability rows config
    const abilityRows = isPitcher ? [
      { label: '球速', val: player.speed, unit: 'km/h', isSpeed: true },
      { label: 'コン', val: player.control },
      { label: 'スタ', val: player.stamina },
      { label: '変化', val: Math.floor((player.arm + player.catching)/20), isRank: false, custom: '総変化量' } // Virtual stat for display
    ] : [
      { label: 'ミート', val: player.contact },
      { label: 'パワー', val: player.power },
      { label: '走力', val: player.speed },
      { label: '肩力', val: player.arm },
      { label: '守備力', val: player.defense },
      { label: '捕球', val: player.catching },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
        <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <NeonBox color="fuchsia" className="shadow-[0_0_50px_rgba(192,38,211,0.2)]">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b border-fuchsia-900/50 pb-4">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-lg ${team?.color.replace('bg-', 'bg-')} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                  {team?.short}
                </div>
                <div>
                  <div className="text-[10px] text-fuchsia-400 font-bold tracking-widest mb-1">{team?.name}</div>
                  <GlitchText text={player.name} className="text-2xl font-bold text-white mb-1" />
                  <div className="flex items-center space-x-3 text-sm font-mono text-gray-400">
                     <span className="px-2 py-0.5 bg-fuchsia-900/30 border border-fuchsia-500/30 text-fuchsia-300 rounded">{player.position}</span>
                     <span>{player.age}歳</span>
                     <span>成長:{player.potential}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <button onClick={onClose} className="text-gray-500 hover:text-white mb-2"><X className="w-6 h-6" /></button>
                <div className="flex flex-col items-center p-2 bg-gray-900/50 rounded border border-gray-700">
                   <span className="text-[10px] text-gray-500 mb-1">CONDITION</span>
                   {getConditionIcon(player.condition, "lg")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Left: Stats */}
              <div>
                <h4 className="text-fuchsia-400 font-bold mb-3 flex items-center text-sm border-l-2 border-fuchsia-500 pl-2">
                   SEASON STATS
                </h4>
                <div className="space-y-3 font-mono text-sm">
                  {isPitcher ? (
                    <>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>防御率</span> <span className="text-white font-bold">{player.innings > 0 ? ((player.earnedRuns * 9) / player.innings).toFixed(2) : '0.00'}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>登板</span> <span className="text-white">{player.games}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>勝利</span> <span className="text-white">{player.wins}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>敗戦</span> <span className="text-white">{player.losses}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>投球回</span> <span className="text-white">{player.innings.toFixed(1)}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>打率</span> <span className="text-white font-bold">{player.atBats > 0 ? (player.hits / player.atBats).toFixed(3) : '.000'}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>試合</span> <span className="text-white">{player.games}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>本塁打</span> <span className="text-white">{player.homeruns}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>打点</span> <span className="text-white">{player.rbi}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-1"><span>安打</span> <span className="text-white">{player.hits}</span></div>
                    </>
                  )}

                  <div className="mt-6">
                    <div className="text-[10px] text-gray-500 mb-1">NEXT LEVEL</div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{width: `${(player.growthExp/200)*100}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Abilities */}
              <div>
                 <h4 className="text-cyan-400 font-bold mb-3 flex items-center text-sm border-l-2 border-cyan-500 pl-2">
                   ABILITIES
                 </h4>
                 <div className="space-y-2">
                   {abilityRows.map((row, idx) => (
                     <div key={idx} className="flex items-center justify-between p-2 bg-gray-900/30 rounded border border-gray-800">
                        <span className="text-xs font-bold text-gray-400 w-12">{row.label}</span>
                        {row.isSpeed ? (
                          <div className="font-mono text-white font-bold">{row.val} <span className="text-[10px] text-gray-600">{row.unit}</span></div>
                        ) : row.custom ? (
                           <div className="font-mono text-white font-bold">{row.val}</div>
                        ) : (
                          renderAbilityRank(row.val)
                        )}
                     </div>
                   ))}
                   {/* Special Abilities Placeholder */}
                   <div className="mt-4 pt-2 border-t border-gray-800">
                     <div className="flex flex-wrap gap-2">
                        {isPitcher ? (
                           <>
                             {player.stamina > 80 && <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-800">尻上がり</span>}
                             {player.control > 80 && <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-800">低め○</span>}
                           </>
                        ) : (
                           <>
                              {player.power > 80 && <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-800">パワーヒッター</span>}
                              {player.contact > 80 && <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-800">アベレージヒッター</span>}
                              {player.speed > 80 && <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-800">盗塁○</span>}
                           </>
                        )}
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </NeonBox>
        </div>
      </div>
    );
  };

  const TrainingMenuModal = ({ onClose, onTrain }: { onClose: () => void, onTrain: (type: any) => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <NeonBox color="green" className="shadow-[0_0_50px_rgba(34,197,94,0.2)]">
          <div className="flex justify-between items-center mb-6 border-b border-green-900/50 pb-2">
            <h3 className="text-green-400 font-bold tracking-widest flex items-center">
              <Dumbbell className="w-5 h-5 mr-2" /> SELECT TRAINING DRILL
            </h3>
            <button onClick={onClose}><X className="w-5 h-5 text-green-600 hover:text-green-400" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <button onClick={() => onTrain('batting')} className="p-4 border border-green-500/30 bg-green-900/10 hover:bg-green-500/20 text-green-100 rounded flex flex-col items-center gap-2 transition-all group">
               <Target className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
               <span className="font-bold">打撃練習</span>
               <span className="text-[10px] text-green-600">ミート / パワー</span>
            </button>
            <button onClick={() => onTrain('speed')} className="p-4 border border-green-500/30 bg-green-900/10 hover:bg-green-500/20 text-green-100 rounded flex flex-col items-center gap-2 transition-all group">
               <FastForward className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
               <span className="font-bold">走塁練習</span>
               <span className="text-[10px] text-green-600">走力</span>
            </button>
            <button onClick={() => onTrain('defense')} className="p-4 border border-green-500/30 bg-green-900/10 hover:bg-green-500/20 text-green-100 rounded flex flex-col items-center gap-2 transition-all group">
               <Shield className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
               <span className="font-bold">守備練習</span>
               <span className="text-[10px] text-green-600">守備 / 肩 / 捕球</span>
            </button>
            <button onClick={() => onTrain('pitching')} className="p-4 border border-green-500/30 bg-green-900/10 hover:bg-green-500/20 text-green-100 rounded flex flex-col items-center gap-2 transition-all group">
               <Zap className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
               <span className="font-bold">投球練習</span>
               <span className="text-[10px] text-green-600">投手全般</span>
            </button>
          </div>

          <div className="text-center text-xs text-green-800">
            * 練習は1日1回のみ実行可能です
          </div>
        </NeonBox>
      </div>
    </div>
  );

  const PracticeResultModal = ({ title, lines, onClose }: { title: string, lines: string[], onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <NeonBox color="green" className="shadow-[0_0_50px_rgba(34,197,94,0.2)]">
          <div className="flex justify-between items-center mb-4 border-b border-green-900/50 pb-2">
            <h3 className="text-green-400 font-bold tracking-widest">{title}</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-green-600 hover:text-green-400" /></button>
          </div>
          <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
            {lines.map((line, i) => (
              <div key={i} className="text-sm font-mono text-green-100 border-l-2 border-green-500 pl-3 py-1 bg-green-900/20">
                {line}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-2 bg-green-900/40 border border-green-500 text-green-400 font-bold hover:bg-green-500 hover:text-black transition-colors">
            ACKNOWLEDGE
          </button>
        </NeonBox>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-cyan-100 font-mono overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      {/* Background Grid & Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none perspective-500">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-top opacity-20 animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      <style>{`
        @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .scanline { position: fixed; top: 0; left: 0; width: 100%; height: 20px; background: linear-gradient(to bottom, transparent, rgba(6,182,212,0.1), transparent); animation: scan 3s linear infinite; pointer-events: none; z-index: 50; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #06b6d4; }
      `}</style>
      <div className="scanline"></div>

      {/* Header */}
      <header className="relative z-20 border-b border-cyan-900/50 bg-black/90 backdrop-blur px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4 cursor-pointer" onClick={() => { if(soundEnabled) audio.playClick(); setView('menu'); }}>
          <Terminal className="w-6 h-6 text-cyan-400 animate-pulse" />
          <div>
            <GlitchText text="TACTICAL PENNANT SYS." className="text-xl font-bold text-white" />
            <div className="text-[10px] text-cyan-600 tracking-[0.3em]">VER. 4.3.0 // CONNECTED</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => { if(soundEnabled) audio.playClick(); setView('menu'); }} className="hidden sm:flex items-center space-x-2 text-cyan-600 hover:text-cyan-400 transition-colors">
             <Home className="w-4 h-4" />
             <span className="text-xs font-bold tracking-widest">HOME</span>
          </button>
          <div className="flex items-center space-x-2 border border-cyan-900 px-4 py-1 bg-cyan-950/20">
             <span className="text-[10px] text-cyan-600">CYCLE</span>
             <span className="text-xl font-bold text-white tracking-widest">
               {String(currentDay).padStart(3, '0')}<span className="text-cyan-700 text-sm mx-1">/</span>{TOTAL_GAMES}
             </span>
          </div>
          <button onClick={handleSoundToggle} className={`p-2 border border-cyan-900 hover:bg-cyan-900/30 transition-colors ${soundEnabled ? 'text-cyan-400' : 'text-gray-700'}`}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6 min-h-[calc(100vh-80px)]">

        {/* --- MAIN MENU --- */}
        {view === 'menu' && (
          <div className="flex flex-col items-center justify-center h-full py-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
               <NeonBox
                 color="cyan"
                 className="flex flex-col items-center justify-center p-10 group"
                 onClick={handlePlayToday}
               >
                 <Play className="w-16 h-16 text-cyan-500 mb-4 group-hover:scale-110 transition-transform" />
                 <h2 className="text-2xl font-bold text-white tracking-widest mb-2">NEXT MATCH</h2>
                 <p className="text-cyan-600 text-xs tracking-widest">INITIATE BATTLE SEQUENCE</p>
               </NeonBox>

               <NeonBox
                 color="green"
                 className={`flex flex-col items-center justify-center p-10 group ${hasPracticed ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                 onClick={() => !hasPracticed && setShowTrainingMenu(true)}
               >
                 {hasPracticed ? (
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                 ) : (
                    <Dumbbell className="w-16 h-16 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
                 )}
                 <h2 className="text-2xl font-bold text-white tracking-widest mb-2">TRAINING</h2>
                 <p className="text-green-600 text-xs tracking-widest">{hasPracticed ? 'DAILY LIMIT REACHED' : 'UNIT UPGRADE PROTOCOL'}</p>
               </NeonBox>

               <NeonBox
                 color="fuchsia"
                 className="flex flex-col items-center justify-center p-10 group"
                 onClick={() => { if(soundEnabled) audio.playClick(); setView('team'); }}
               >
                 <Users className="w-16 h-16 text-fuchsia-500 mb-4 group-hover:scale-110 transition-transform" />
                 <h2 className="text-2xl font-bold text-white tracking-widest mb-2">UNIT DATA</h2>
                 <p className="text-fuchsia-600 text-xs tracking-widest">MANAGE ROSTER & STATS</p>
               </NeonBox>

               <NeonBox
                 color="orange"
                 className="flex flex-col items-center justify-center p-10 group"
                 onClick={() => { if(soundEnabled) audio.playClick(); setView('league'); }}
               >
                 <BarChart2 className="w-16 h-16 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                 <h2 className="text-2xl font-bold text-white tracking-widest mb-2">LEAGUE DB</h2>
                 <p className="text-orange-600 text-xs tracking-widest">GLOBAL RANKING SYSTEM</p>
               </NeonBox>
             </div>

             {/* Sim Control */}
             <div className="mt-12 flex gap-4">
               <button
                  onClick={() => { if(soundEnabled) audio.playClick(); setGameSpeed(500); setIsPlaying(!isPlaying); setView('schedule'); }}
                  className={`px-8 py-3 border font-bold tracking-widest text-sm transition-all hover:shadow-[0_0_15px_currentColor] flex items-center gap-2 ${isPlaying ? 'text-red-500 border-red-500 bg-red-950/20' : 'text-cyan-400 border-cyan-400 bg-cyan-950/20'}`}
                >
                  {isPlaying ? <Pause className="w-4 h-4"/> : <FastForward className="w-4 h-4"/>}
                  {isPlaying ? 'ABORT AUTO-SIM' : 'AUTO SIMULATION'}
                </button>
             </div>
          </div>
        )}

        {/* --- OTHER VIEWS --- */}
        {view !== 'menu' && (
          <div className="animate-fadeIn">
            {/* View Tabs */}
            <div className="flex flex-wrap gap-4 mb-8 justify-between items-end">
              <div className="flex gap-1">
                {[
                  { id: 'league', label: 'RANKING_DB', icon: BarChart2 },
                  { id: 'schedule', label: 'BATTLE_LOG', icon: Activity },
                  { id: 'team', label: 'UNIT_DATA', icon: Users }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleViewChange(tab.id as any)}
                    className={`relative px-6 py-2 border-b-2 text-sm font-bold tracking-wider transition-all hover:text-white ${view === tab.id ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30' : 'border-transparent text-gray-600'}`}
                  >
                    <div className="flex items-center space-x-2">
                      <tab.icon className="w-3 h-3" />
                      <span>{tab.label}</span>
                    </div>
                    {view === tab.id && <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500 animate-ping"></div>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { if(soundEnabled) audio.playClick(); setView('menu'); }}
                className="px-4 py-2 border border-gray-700 text-gray-500 hover:text-white hover:border-white transition-colors flex items-center text-xs tracking-widest"
              >
                <ArrowUpRight className="w-3 h-3 mr-2 rotate-180" /> RETURN
              </button>
            </div>

            {/* --- LEAGUE VIEW --- */}
            {view === 'league' && (
              <NeonBox className="w-full">
                <div className="flex justify-between items-center mb-6 border-b border-cyan-900/50 pb-2">
                  <h2 className="text-lg font-bold text-white flex items-center">
                    <Target className="w-5 h-5 mr-2 text-cyan-500" />
                    SECTOR STANDINGS
                  </h2>
                  <span className="text-[10px] text-cyan-800 animate-pulse">LIVE FEED...</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-cyan-700 border-b border-cyan-900/30">
                        <th className="py-2 text-left w-16">RK</th>
                        <th className="py-2 text-left">UNIT_ID</th>
                        <th className="py-2 text-center">GAMES</th>
                        <th className="py-2 text-center text-red-400">WIN</th>
                        <th className="py-2 text-center text-blue-400">LOSE</th>
                        <th className="py-2 text-center text-gray-500">DRAW</th>
                        <th className="py-2 text-center text-yellow-500">PCT</th>
                        <th className="py-2 text-center text-gray-400">DIFF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-900/20">
                      {sortedTeams.map((team, idx) => {
                        const games = team.wins + team.losses + team.draws;
                        const pct = games > 0 ? (team.wins / (team.wins + team.losses)).toFixed(3).slice(1) : '.---';
                        return (
                          <tr
                            key={team.id}
                            onClick={() => { if(soundEnabled) audio.playClick(); setSelectedTeamId(team.id); setView('team'); }}
                            className="hover:bg-cyan-500/10 cursor-pointer transition-colors group"
                          >
                            <td className="py-3 font-bold text-gray-500 group-hover:text-white">
                              {idx === 0 ? <span className="text-yellow-400">01</span> : String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center space-x-3">
                                <div className={`w-1 h-8 ${team.color.replace('bg-', 'bg-')}`}></div>
                                <div>
                                  <div className="font-bold text-white tracking-wider group-hover:text-cyan-300 transition-colors">{team.name}</div>
                                  <div className="text-[10px] text-gray-600 font-mono">{team.id.toUpperCase()}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-center text-gray-400">{games}</td>
                            <td className="py-3 text-center text-red-400 font-bold bg-red-900/10">{team.wins}</td>
                            <td className="py-3 text-center text-blue-400 bg-blue-900/10">{team.losses}</td>
                            <td className="py-3 text-center text-gray-600">{team.draws}</td>
                            <td className="py-3 text-center text-yellow-400 font-bold">{pct}</td>
                            <td className="py-3 text-center text-gray-500">{idx === 0 ? '-' : ((sortedTeams[0].wins - sortedTeams[0].losses) - (team.wins - team.losses)) / 2}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </NeonBox>
            )}

            {/* --- SCHEDULE VIEW --- */}
            {view === 'schedule' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <NeonBox className="h-[600px] flex flex-col">
                      <div className="flex justify-between items-center mb-4 border-b border-cyan-900/50 pb-2">
                        <h3 className="font-bold text-cyan-400 flex items-center">
                          <Radio className="w-4 h-4 mr-2" />
                          COMBAT LOGS
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2" ref={scrollRef}>
                        {gameHistory.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-cyan-900 animate-pulse">NO DATA RECEIVED</div>
                        ) : (
                          gameHistory.slice(0, 50).map((game, i) => {
                            const home = teams.find(t=>t.id===game.homeId);
                            const away = teams.find(t=>t.id===game.awayId);
                            return (
                              <div key={i} className="bg-black/40 border-l-2 border-cyan-800 p-2 text-xs font-mono hover:border-cyan-400 transition-colors">
                                <div className="flex justify-between text-gray-600 mb-1">
                                  <span>OP_ID: {String(game.day).padStart(3, '0')}</span>
                                  <span>COMPLETE</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="w-24 text-right font-bold text-gray-300">{home?.short}</div>
                                  <div className="px-3 py-0.5 bg-gray-900 border border-gray-700 text-white font-bold">
                                    <span className={game.homeScore > game.awayScore ? 'text-red-400' : ''}>{game.homeScore}</span>
                                    <span className="text-gray-600 mx-2">:</span>
                                    <span className={game.awayScore > game.homeScore ? 'text-red-400' : ''}>{game.awayScore}</span>
                                  </div>
                                  <div className="w-24 font-bold text-gray-300">{away?.short}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                  </NeonBox>
                </div>

                <div className="lg:col-span-5">
                  <NeonBox className="h-[600px] flex flex-col" color="fuchsia">
                    <div className="flex justify-between items-center mb-4 border-b border-fuchsia-900/50 pb-2">
                        <h3 className="font-bold text-fuchsia-400 flex items-center">
                          <ChevronsUp className="w-4 h-4 mr-2" />
                          SYSTEM ALERTS
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                      {gameHistory.map(g => g.growthUpdates).flat().map((msg, i) => (
                        <div key={i} className="text-xs p-2 border border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-200">
                          <span className="text-fuchsia-500 mr-2">›</span>
                          {msg}
                        </div>
                      ))}
                      {gameHistory.length === 0 && <div className="text-center text-fuchsia-900 mt-20">WAITING FOR EVENTS...</div>}
                    </div>
                  </NeonBox>
                </div>
              </div>
            )}

            {/* --- TEAM VIEW --- */}
            {view === 'team' && selectedTeamId && (
              <div className="space-y-6">
                <div className="flex overflow-x-auto space-x-1 pb-2 custom-scrollbar border-b border-gray-800">
                  {teams.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { if(soundEnabled) audio.playClick(); setSelectedTeamId(t.id); }}
                      className={`px-4 py-2 text-xs font-bold tracking-wider transition-all border border-transparent ${selectedTeamId === t.id ? `bg-gray-800 text-white border-b-2 border-b-${t.color.replace('bg-', '')}-500` : 'text-gray-500 hover:text-white'}`}
                    >
                      {t.short}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {['PITCHER', 'FIELDER'].map(role => {
                    const isPitcher = role === 'PITCHER';
                    const unitPlayers = teams.find(t => t.id === selectedTeamId)?.players.filter(p => isPitcher ? p.position === 'P' : p.position !== 'P') || [];

                    return (
                      <NeonBox key={role} color={isPitcher ? 'blue' : 'red'}>
                        <h3 className={`text-sm font-bold mb-4 ${isPitcher ? 'text-blue-400' : 'text-red-400'}`}>
                          UNIT: {role} CLASS
                        </h3>
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-gray-600 border-b border-gray-800">
                              <th className="py-2">調子</th>
                              <th className="py-2">ポジ</th>
                              <th className="py-2">選手名</th>
                              <th className="py-2">年齢</th>
                              {isPitcher ? (
                                <>
                                  <th className="py-2 hidden sm:table-cell">スタ</th>
                                  <th className="py-2 hidden sm:table-cell">コン</th>
                                </>
                              ) : (
                                <>
                                  <th className="py-2 hidden sm:table-cell">ミー</th>
                                  <th className="py-2 hidden sm:table-cell">パワ</th>
                                  <th className="py-2 hidden sm:table-cell">走</th>
                                  <th className="py-2 hidden sm:table-cell">守</th>
                                </>
                              )}
                              <th className="py-2 text-right">{isPitcher ? '防' : '打'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/50">
                            {unitPlayers.map(p => (
                              <tr
                                key={p.id}
                                onClick={() => { if(soundEnabled) audio.playClick(); setSelectedPlayer(p); }}
                                className="hover:bg-white/5 transition-colors cursor-pointer group"
                              >
                                <td className="py-2 group-hover:animate-pulse">{getConditionIcon(p.condition)}</td>
                                <td className="py-2 font-mono text-gray-500">{p.position}</td>
                                <td className="py-2">
                                  <div className="font-bold text-gray-300 group-hover:text-cyan-400">{p.name}</div>
                                  <div className="w-full bg-gray-800 h-0.5 mt-1">
                                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" style={{width: `${(p.growthExp/200)*100}%`}}></div>
                                  </div>
                                </td>
                                <td className="py-2 text-gray-500">{p.age}</td>

                                {isPitcher ? (
                                  <>
                                    <td className="py-2 hidden sm:table-cell">{renderAbilityRank(p.stamina)}</td>
                                    <td className="py-2 hidden sm:table-cell">{renderAbilityRank(p.control)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 hidden sm:table-cell">{renderAbilityRank(p.contact)}</td>
                                    <td className="py-2 hidden sm:table-cell">{renderAbilityRank(p.power)}</td>
                                    <td className="py-2 hidden sm:table-cell">{renderAbilityRank(p.speed)}</td>
                                    <td className="py-2 hidden sm:table-cell">{renderAbilityRank(p.defense)}</td>
                                  </>
                                )}

                                <td className="py-2 text-right font-mono text-white">
                                  {isPitcher
                                    ? (p.innings > 0 ? ((p.earnedRuns * 9) / p.innings).toFixed(2) : '0.00')
                                    : (p.atBats > 0 ? (p.hits / p.atBats).toFixed(3) : '.000')
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </NeonBox>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="fixed bottom-2 right-2 text-[10px] text-gray-700 font-mono">
        SYS_STATUS: OPTIMAL // MEM: {Math.floor(Math.random() * 50) + 20}%
      </div>

      {/* Modals */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          onClose={() => { if(soundEnabled) audio.playClick(); setSelectedPlayer(null); }}
        />
      )}

      {showTrainingMenu && (
        <TrainingMenuModal
          onClose={() => { if(soundEnabled) audio.playClick(); setShowTrainingMenu(false); }}
          onTrain={handlePractice}
        />
      )}

      {practiceReport && (
        <PracticeResultModal
          title={practiceReport.title}
          lines={practiceReport.lines}
          onClose={() => { if(soundEnabled) audio.playClick(); setPracticeReport(null); }}
        />
      )}
    </div>
  );
}
