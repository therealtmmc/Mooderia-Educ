import React from "react";
import { FolderCabinet, QuizDeck, QuizAttempt } from "../types";
import { sound } from "../utils/sound";
import { 
  BarChart2, Trophy, Clock, BrainCircuit, Target, Sparkles, Library, 
  Flame, CheckCircle2, AlertTriangle, Calendar, Award, Zap
} from "lucide-react";
import { motion } from "motion/react";

interface AnalyticsViewProps {
  attempts: QuizAttempt[];
  folders: FolderCabinet[];
  quizzes: QuizDeck[];
}

export default function AnalyticsView({ attempts, folders, quizzes }: AnalyticsViewProps) {
  const handlePop = () => sound.playPop();

  // Summary Metrics Calculates
  const totalDrillRuns = attempts.length;
  
  // Avg score percentage
  const averageAccuracy = totalDrillRuns > 0 
    ? Math.round((attempts.reduce((sum, a) => sum + (a.score / a.totalQuestions), 0) / totalDrillRuns) * 100)
    : 0;

  // Recall mastery index (overall flashcard strengths)
  const totalCards = quizzes.reduce((sum, q) => sum + q.cards.length, 0);
  const totalStrength = quizzes.reduce((sum, q) => sum + q.cards.reduce((sSum, c) => sSum + c.strength, 0), 0);
  const maxStrengthScore = totalCards * 5;
  const overallRecallRate = maxStrengthScore > 0 ? Math.round((totalStrength / maxStrengthScore) * 100) : 0;

  // Study hours (simulating 1.5 - 2 minutes per quiz)
  const estimatedStudyTimeMins = Math.round(attempts.reduce((sum, a) => sum + a.timeInSeconds, 0) / 60);

  // Group Flashcards by Spaced repetition strength levels
  let weakCount = 0;   // 0 - 1 strength
  let mediumCount = 0; // 2 - 3 strength
  let masteredCount = 0; // 4 - 5 strength

  quizzes.forEach(q => {
    q.cards.forEach(c => {
      if (c.strength <= 1) weakCount++;
      else if (c.strength <= 3) mediumCount++;
      else masteredCount++;
    });
  });

  // Calculate live Topic Folder density focus distribution
  const totalMaterialsAcrossFolders = folders.reduce((sum, f) => sum + f.materials.length, 0);
  
  // Calculate relative stats of documents per subject
  const densityFactors = folders.map(f => {
    const fraction = totalMaterialsAcrossFolders > 0 ? (f.materials.length / totalMaterialsAcrossFolders) * 100 : 0;
    return {
      folderId: f.id,
      name: f.name,
      color: f.color,
      fractionText: `${Math.round(fraction)}%`,
      fractionVal: fraction,
      filesCount: f.materials.length
    };
  }).sort((a, b) => b.fractionVal - a.fractionVal);

  // Generate Custom SVG Coordinates for the area chart
  const renderScoreTrendUrl = () => {
    if (attempts.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = { top: 20, bottom: 25, left: 40, right: 20 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // We plot percentages (score / total) to normalise different question lengths
    const points = attempts.map((att, idx) => {
      const percentage = (att.score / att.totalQuestions) * 100;
      
      const x = padding.left + (attempts.length > 1 
        ? (idx / (attempts.length - 1)) * chartWidth 
        : chartWidth / 2);

      // y mapping (100% at top, 0% at bottom)
      const y = padding.top + chartHeight - (percentage / 100) * chartHeight;
      return { x, y, value: percentage, name: att.deckName, raw: `${att.score}/${att.totalQuestions}` };
    });

    // Make clean SVG spline elements paths
    let linePath = "";
    let areaPath = "";

    if (points.length > 0) {
      // Line path
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
      
      // Enclose area
      areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
    }

    return { points, linePath, areaPath, chartWidth, chartHeight, padding, width, height };
  };

  const chartData = renderScoreTrendUrl();

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 text-xs uppercase font-mono tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">Diagnostic Core</span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white uppercase sm:text-4xl">
            Analytics Dash
          </h1>
          <p className="text-sm text-slate-400 font-sans">
            Track spaced repetition consistency, review performance area trends, and identify weak memory anchors requiring consolidation.
          </p>
        </div>
      </div>

      {/* OVERALL SUMMARY COUNTERS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT CODES */}
        {[
          { label: "Active Timers", icon: Clock, value: `${estimatedStudyTimeMins}m`, desc: "Accumulated active study logs", color: "text-indigo-400" },
          { label: "Drill completions", icon: Trophy, value: totalDrillRuns, desc: "Completed quiz runs filed", color: "text-emerald-450" },
          { label: "Average scores", icon: Target, value: `${averageAccuracy}%`, desc: "Percent accuracy accruals", color: "text-orange-400" },
          { label: "Recall Masteries", icon: BrainCircuit, value: `${overallRecallRate}%`, desc: "Calculated memory consolidation", color: "text-cyan-400" }
        ].map((card, i) => {
          const IconComp = card.icon;
          return (
            <div key={i} className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-500 uppercase">{card.label}</span>
                <IconComp className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <div>
                <span className="text-3xl font-mono text-white font-extrabold">{card.value}</span>
                <span className="text-[10px] font-sans text-slate-400 line-clamp-1 block mt-1">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* GRAPH VIEW: ACCURACY TRENDS (LG:7) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-1.5">
              <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
              <span>Diagnostic Accuracy Trend</span>
            </h3>
            <span className="text-[9px] font-mono uppercase bg-slate-950 px-2 py-0.5 border border-slate-850 rounded text-slate-400">
              Score % over attempts
            </span>
          </div>

          {attempts.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Calendar className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-mono uppercase">Plot Logs Suspended</p>
              <p className="text-[11px] text-slate-505 mt-0.5 max-w-xs">
                Drill a study flashcard recall deck to generate historical trends.
              </p>
            </div>
          ) : (
            chartData && (
              <div className="space-y-4">
                {/* SVG RENDERS */}
                <div className="w-full overflow-hidden bg-slate-950/40 rounded-xl border border-slate-855/60 p-2">
                  <svg 
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`} 
                    className="w-full h-full overflow-visible"
                  >
                    {/* Define area violet gradients */}
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal auxiliary grids */}
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const y = chartData.padding.top + chartData.chartHeight - (tick / 100) * chartData.chartHeight;
                      return (
                        <g key={tick} className="opacity-15">
                          <line 
                            x1={chartData.padding.left} 
                            y1={y} 
                            x2={chartData.width - chartData.padding.right} 
                            y2={y} 
                            stroke="#ffffff" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                          />
                          <text 
                            x={chartData.padding.left - 8} 
                            y={y + 3} 
                            fill="#ffffff" 
                            fontSize="8" 
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {tick}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient filled area path */}
                    <path d={chartData.areaPath} fill="url(#areaGrad)" />

                    {/* Stroke line path */}
                    <path 
                      d={chartData.linePath} 
                      fill="none" 
                      stroke="#a78bfa" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                    />

                    {/* Markers Dots */}
                    {chartData.points.map((p, idx) => (
                      <g key={idx} className="group/dot cursor-pointer">
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="6" 
                          fill="#c084fc" 
                          className="hover:r-8 hover:fill-white transition-all" 
                        />
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="3" 
                          fill="#0f172a" 
                        />
                      </g>
                    ))}
                  </svg>
                </div>

                {/* GRAPH COMPACT LEGEND LOGS TABLE */}
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {attempts.slice().reverse().map((att, idx) => (
                    <div 
                      key={att.id} 
                      className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="font-semibold text-white truncate max-w-[160px] md:max-w-xs">{att.deckName}</span>
                      </div>

                      <div className="flex items-center gap-4.5 font-mono text-[10px]">
                        <span className="text-slate-400">{new Date(att.date).toLocaleDateString()}</span>
                        <span className="text-emerald-450 font-bold bg-emerald-950 py-0.5 px-2 rounded border border-emerald-900/30">
                          {att.score}/{att.totalQuestions} hits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* RIGHT DUAL STREAKS PANEL & MEMORY DEPOT (LG:5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SUBJECT DENSITY DISTRIBUTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-indigo-500/30 transition-all">
            <div>
              <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-1.5">
                <Library className="w-4.5 h-4.5 text-indigo-400" />
                <span>Cabinet Subject Focus Density</span>
              </h3>
              <p className="text-[10px] text-slate-550 font-sans mt-0.5">Focus computed from documented notes distribution</p>
            </div>

            {densityFactors.length === 0 ? (
              <p className="text-xs text-slate-505 font-mono text-center">No active study folder cabinets provisioned to track focus index.</p>
            ) : (
              <div className="space-y-4">
                {densityFactors.map(factor => (
                  <div key={factor.folderId} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-300 font-semibold truncate max-w-[180px]">{factor.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase">{factor.filesCount} logs</span>
                        <span className="text-white font-bold">{factor.fractionText}</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-${factor.color}-500 shadow-[0_0_8px_rgba(255,255,255,0.1)] rounded-full`} 
                        style={{ width: `${factor.fractionVal}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MASTERED LEVELS BOX */}
          <div className="bg-slate-900 border border-slate-805 rounded-3xl p-6 space-y-4 hover:border-indigo-500/30 transition-all">
            <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5 text-indigo-400" />
              <span>Consolidation Stage Metrics</span>
            </h3>

            {totalCards === 0 ? (
              <p className="text-xs text-slate-500 font-mono text-center pb-2">Load flashcards to assess retention consolidation levels.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                {/* WEAK */}
                <div className="bg-slate-950/60 border border-rose-950/20 p-2.5 rounded-xl space-y-1 relative group">
                  <div className="absolute top-1 right-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <span className="text-rose-500 text-lg font-bold block pt-1">{weakCount}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Critical Drills</span>
                </div>

                {/* MEDIUM */}
                <div className="bg-slate-950/60 border border-orange-950/20 p-2.5 rounded-xl space-y-1 relative">
                  <div className="absolute top-1 right-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <span className="text-orange-400 text-lg font-bold block pt-1">{mediumCount}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Warm review</span>
                </div>

                {/* MASTERED */}
                <div className="bg-slate-950/60 border border-emerald-950/20 p-2.5 rounded-xl space-y-1 relative">
                  <div className="absolute top-1 right-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450 animate-pulse" />
                  </div>
                  <span className="text-emerald-400 text-lg font-bold block pt-1">{masteredCount}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Consolidated</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
