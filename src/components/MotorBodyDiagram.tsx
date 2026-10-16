import React, { useState } from 'react';

export type MRCPowerGrade = 0 | 1 | 2 | 3 | 4 | 5;

interface Props {
  rightUpper: number | string;
  leftUpper: number | string;
  rightLower: number | string;
  leftLower: number | string;
  onChange: (limb: 'rightUpperPower' | 'leftUpperPower' | 'rightLowerPower' | 'leftLowerPower', grade: number) => void;
  readOnly?: boolean;
}

export const MRC_SCALE_DEFINITIONS: Record<number, { label: string; description: string; color: string; bg: string; border: string }> = {
  5: {
    label: '5/5',
    description: 'Normal power (full resistance)',
    color: '#15803d', // green-700
    bg: '#dcfce7', // green-100
    border: '#86efac',
  },
  4: {
    label: '4/5',
    description: 'Active movement against moderate resistance',
    color: '#0284c7', // sky-600
    bg: '#e0f2fe', // sky-100
    border: '#7dd3fc',
  },
  3: {
    label: '3/5',
    description: 'Movement against gravity only (no resistance)',
    color: '#d97706', // amber-600
    bg: '#fef3c7', // amber-100
    border: '#fde68a',
  },
  2: {
    label: '2/5',
    description: 'Movement with gravity eliminated',
    color: '#ea580c', // orange-600
    bg: '#ffedd5', // orange-100
    border: '#fed7aa',
  },
  1: {
    label: '1/5',
    description: 'Trace flicker or twitch of muscle contraction',
    color: '#dc2626', // red-600
    bg: '#fee2e2', // red-100
    border: '#fca5a5',
  },
  0: {
    label: '0/5',
    description: 'Complete paralysis (plegia, no movement)',
    color: '#881337', // rose-900
    bg: '#ffe4e6', // rose-100
    border: '#fda4af',
  },
};

export function parseGrade(val: number | string | undefined): number {
  if (val === undefined || val === null || val === '') return 5;
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  return isNaN(num) ? 5 : Math.max(0, Math.min(5, num));
}

// Generate static Canvas / PNG Data URL for PDF and PNG export (Compact & Razor-sharp)
export function generateMotorDiagramCanvasURL(
  rightUpper: number | string,
  leftUpper: number | string,
  rightLower: number | string,
  leftLower: number | string
): string {
  const rU = parseGrade(rightUpper);
  const lU = parseGrade(leftUpper);
  const rL = parseGrade(rightLower);
  const lL = parseGrade(leftLower);

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 240; // Compact height
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer subtle border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ANATOMICAL MOTOR POWER DIAGRAM (MRC 0–5 SCALE)', canvas.width / 2, 24);

  // Orientation labels (Patient perspective)
  ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.textAlign = 'left';
  ctx.fillText("← PATIENT'S RIGHT (R)", 24, 40);
  ctx.textAlign = 'right';
  ctx.fillText("PATIENT'S LEFT (L) →", canvas.width - 24, 40);

  const cx = canvas.width / 2;

  // Head
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(cx, 58, 14, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(cx - 18, 76, 36, 60, 6);
  ctx.fill();

  // Limb drawing helper
  const drawLimb = (grade: number, x: number, y: number, w: number, h: number, r: number) => {
    const info = MRC_SCALE_DEFINITIONS[grade] || MRC_SCALE_DEFINITIONS[5];
    ctx.fillStyle = info.bg;
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.stroke();

    // Power text in limb
    ctx.fillStyle = info.color;
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(grade), x + w / 2, y + h / 2 + 4);
  };

  // Limbs on silhouette
  drawLimb(rU, cx - 44, 78, 18, 56, 8); // Right Arm (viewer left)
  drawLimb(lU, cx + 26, 78, 18, 56, 8); // Left Arm (viewer right)
  drawLimb(rL, cx - 18, 140, 16, 62, 6); // Right Leg (viewer left)
  drawLimb(lL, cx + 2, 140, 16, 62, 6); // Left Leg (viewer right)

  // Side callout cards (positioned cleanly without overlapping body)
  const drawSideCard = (
    title: string,
    grade: number,
    x: number,
    y: number,
    width: number,
    alignRight: boolean
  ) => {
    const info = MRC_SCALE_DEFINITIONS[grade] || MRC_SCALE_DEFINITIONS[5];
    const cardHeight = 36;
    const cardX = alignRight ? x - width : x;

    ctx.fillStyle = info.bg;
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, y, width, cardHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Title & Score
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, cardX + 8, y + 15);

    ctx.fillStyle = info.color;
    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${grade}/5`, cardX + width - 8, y + 22);

    ctx.font = 'normal 9px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(info.description.slice(0, 24), cardX + 8, y + 28);
  };

  // Draw 4 side cards
  drawSideCard('Right Upper (Arm)', rU, cx - 55, 78, 175, true);
  drawSideCard('Left Upper (Arm)', lU, cx + 55, 78, 175, false);
  drawSideCard('Right Lower (Leg)', rL, cx - 45, 148, 175, true);
  drawSideCard('Left Lower (Leg)', lL, cx + 45, 148, 175, false);

  // Compact Legend at bottom
  ctx.fillStyle = '#64748b';
  ctx.font = 'normal 9px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'MRC Grades: 5=Normal | 4=Against Resistance | 3=Against Gravity | 2=Gravity Eliminated | 1=Trace Flicker | 0=Paralysis',
    canvas.width / 2,
    226
  );

  return canvas.toDataURL('image/png', 0.95);
}

export const MotorBodyDiagram: React.FC<Props> = ({
  rightUpper,
  leftUpper,
  rightLower,
  leftLower,
  onChange,
  readOnly = false,
}) => {
  const rU = parseGrade(rightUpper);
  const lU = parseGrade(leftUpper);
  const rL = parseGrade(rightLower);
  const lL = parseGrade(leftLower);

  const [activeLimbSelector, setActiveLimbSelector] = useState<
    'rightUpperPower' | 'leftUpperPower' | 'rightLowerPower' | 'leftLowerPower' | null
  >(null);

  const getLimbTitle = (limb: string) => {
    switch (limb) {
      case 'rightUpperPower':
        return "Patient's Right Upper Limb (Arm)";
      case 'leftUpperPower':
        return "Patient's Left Upper Limb (Arm)";
      case 'rightLowerPower':
        return "Patient's Right Lower Limb (Leg)";
      case 'leftLowerPower':
        return "Patient's Left Lower Limb (Leg)";
      default:
        return 'Limb';
    }
  };

  const currentGrade =
    activeLimbSelector === 'rightUpperPower'
      ? rU
      : activeLimbSelector === 'leftUpperPower'
      ? lU
      : activeLimbSelector === 'rightLowerPower'
      ? rL
      : activeLimbSelector === 'leftLowerPower'
      ? lL
      : 5;

  return (
    <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 space-y-2 select-none shadow-xs">
      {/* Anatomical Orientation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-[11px]">
            Motor Power Body Diagram (MRC 0–5)
          </span>
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
            Tap limb or badge to adjust
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold">
          <span className="text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
            &larr; Patient's RIGHT (R)
          </span>
          <span className="text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
            Patient's LEFT (L) &rarr;
          </span>
        </div>
      </div>

      {/* Main Diagram Layout: Left Callouts | Center Silhouette | Right Callouts */}
      <div className="relative max-w-lg mx-auto flex items-center justify-between gap-2 py-1">
        {/* Left Badges: Patient's Right */}
        <div className="flex-1 flex flex-col justify-around gap-2 text-right">
          {/* Right Upper Limb Badge */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setActiveLimbSelector('rightUpperPower')}
            className="p-2 rounded-xl border transition shadow-xs text-left active:scale-95 hover:brightness-95 cursor-pointer touch-manipulation"
            style={{
              backgroundColor: MRC_SCALE_DEFINITIONS[rU].bg,
              borderColor: MRC_SCALE_DEFINITIONS[rU].color,
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                Right Arm
              </span>
              <span
                className="font-black text-sm sm:text-base font-mono"
                style={{ color: MRC_SCALE_DEFINITIONS[rU].color }}
              >
                {rU}/5
              </span>
            </div>
            <p className="text-[9.5px] text-slate-600 font-medium truncate mt-0.5">
              {MRC_SCALE_DEFINITIONS[rU].description}
            </p>
          </button>

          {/* Right Lower Limb Badge */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setActiveLimbSelector('rightLowerPower')}
            className="p-2 rounded-xl border transition shadow-xs text-left active:scale-95 hover:brightness-95 cursor-pointer touch-manipulation"
            style={{
              backgroundColor: MRC_SCALE_DEFINITIONS[rL].bg,
              borderColor: MRC_SCALE_DEFINITIONS[rL].color,
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                Right Leg
              </span>
              <span
                className="font-black text-sm sm:text-base font-mono"
                style={{ color: MRC_SCALE_DEFINITIONS[rL].color }}
              >
                {rL}/5
              </span>
            </div>
            <p className="text-[9.5px] text-slate-600 font-medium truncate mt-0.5">
              {MRC_SCALE_DEFINITIONS[rL].description}
            </p>
          </button>
        </div>

        {/* Center Front-Facing Human Body Silhouette (Compact Height ~180px) */}
        <div className="w-28 sm:w-36 shrink-0 flex justify-center relative">
          <svg
            viewBox="0 0 160 210"
            className="w-full h-auto drop-shadow-xs select-none max-h-[190px]"
          >
            {/* Chest anatomical markers */}
            <text x="56" y="66" fill="#94a3b8" fontSize="8" fontWeight="bold">R</text>
            <text x="96" y="66" fill="#94a3b8" fontSize="8" fontWeight="bold">L</text>

            {/* Head */}
            <circle cx="80" cy="22" r="14" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" />

            {/* Neck */}
            <rect x="76" y="35" width="8" height="8" fill="#cbd5e1" />

            {/* Torso */}
            <rect x="60" y="42" width="40" height="60" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />

            {/* Right Arm (Viewer's Left) */}
            <g
              onClick={() => !readOnly && setActiveLimbSelector('rightUpperPower')}
              className="cursor-pointer transition hover:opacity-85 touch-manipulation"
            >
              <rect
                x="36"
                y="45"
                width="18"
                height="62"
                rx="8"
                fill={MRC_SCALE_DEFINITIONS[rU].bg}
                stroke={MRC_SCALE_DEFINITIONS[rU].color}
                strokeWidth="2"
              />
              <text
                x="45"
                y="80"
                fill={MRC_SCALE_DEFINITIONS[rU].color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {rU}
              </text>
            </g>

            {/* Left Arm (Viewer's Right) */}
            <g
              onClick={() => !readOnly && setActiveLimbSelector('leftUpperPower')}
              className="cursor-pointer transition hover:opacity-85 touch-manipulation"
            >
              <rect
                x="106"
                y="45"
                width="18"
                height="62"
                rx="8"
                fill={MRC_SCALE_DEFINITIONS[lU].bg}
                stroke={MRC_SCALE_DEFINITIONS[lU].color}
                strokeWidth="2"
              />
              <text
                x="115"
                y="80"
                fill={MRC_SCALE_DEFINITIONS[lU].color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {lU}
              </text>
            </g>

            {/* Right Leg (Viewer's Left) */}
            <g
              onClick={() => !readOnly && setActiveLimbSelector('rightLowerPower')}
              className="cursor-pointer transition hover:opacity-85 touch-manipulation"
            >
              <rect
                x="61"
                y="104"
                width="16"
                height="88"
                rx="7"
                fill={MRC_SCALE_DEFINITIONS[rL].bg}
                stroke={MRC_SCALE_DEFINITIONS[rL].color}
                strokeWidth="2"
              />
              <text
                x="69"
                y="152"
                fill={MRC_SCALE_DEFINITIONS[rL].color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {rL}
              </text>
            </g>

            {/* Left Leg (Viewer's Right) */}
            <g
              onClick={() => !readOnly && setActiveLimbSelector('leftLowerPower')}
              className="cursor-pointer transition hover:opacity-85 touch-manipulation"
            >
              <rect
                x="83"
                y="104"
                width="16"
                height="88"
                rx="7"
                fill={MRC_SCALE_DEFINITIONS[lL].bg}
                stroke={MRC_SCALE_DEFINITIONS[lL].color}
                strokeWidth="2"
              />
              <text
                x="91"
                y="152"
                fill={MRC_SCALE_DEFINITIONS[lL].color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {lL}
              </text>
            </g>
          </svg>
        </div>

        {/* Right Badges: Patient's Left */}
        <div className="flex-1 flex flex-col justify-around gap-2 text-left">
          {/* Left Upper Limb Badge */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setActiveLimbSelector('leftUpperPower')}
            className="p-2 rounded-xl border transition shadow-xs text-left active:scale-95 hover:brightness-95 cursor-pointer touch-manipulation"
            style={{
              backgroundColor: MRC_SCALE_DEFINITIONS[lU].bg,
              borderColor: MRC_SCALE_DEFINITIONS[lU].color,
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                Left Arm
              </span>
              <span
                className="font-black text-sm sm:text-base font-mono"
                style={{ color: MRC_SCALE_DEFINITIONS[lU].color }}
              >
                {lU}/5
              </span>
            </div>
            <p className="text-[9.5px] text-slate-600 font-medium truncate mt-0.5">
              {MRC_SCALE_DEFINITIONS[lU].description}
            </p>
          </button>

          {/* Left Lower Limb Badge */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setActiveLimbSelector('leftLowerPower')}
            className="p-2 rounded-xl border transition shadow-xs text-left active:scale-95 hover:brightness-95 cursor-pointer touch-manipulation"
            style={{
              backgroundColor: MRC_SCALE_DEFINITIONS[lL].bg,
              borderColor: MRC_SCALE_DEFINITIONS[lL].color,
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                Left Leg
              </span>
              <span
                className="font-black text-sm sm:text-base font-mono"
                style={{ color: MRC_SCALE_DEFINITIONS[lL].color }}
              >
                {lL}/5
              </span>
            </div>
            <p className="text-[9.5px] text-slate-600 font-medium truncate mt-0.5">
              {MRC_SCALE_DEFINITIONS[lL].description}
            </p>
          </button>
        </div>
      </div>

      {/* Compact MRC Color Legend */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 text-[10px]">
        {[5, 4, 3, 2, 1, 0].map((gr) => (
          <div key={`legend-${gr}`} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full border"
              style={{
                backgroundColor: MRC_SCALE_DEFINITIONS[gr].bg,
                borderColor: MRC_SCALE_DEFINITIONS[gr].color,
              }}
            />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {gr}: {gr === 5 ? 'Normal' : gr === 4 ? 'Moderate' : gr === 3 ? 'Gravity' : gr === 2 ? 'Elim.' : gr === 1 ? 'Trace' : 'Plegia'}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Modal / Popover Selector when a limb is clicked */}
      {activeLimbSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {getLimbTitle(activeLimbSelector)}
                </h4>
                <p className="text-xs text-slate-500">Select MRC Muscle Power Grade</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLimbSelector(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {[5, 4, 3, 2, 1, 0].map((grade) => {
                const def = MRC_SCALE_DEFINITIONS[grade];
                const isSelected = currentGrade === grade;
                return (
                  <button
                    key={`mrc-opt-${grade}`}
                    type="button"
                    onClick={() => {
                      onChange(activeLimbSelector, grade);
                      setActiveLimbSelector(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border transition text-left ${
                      isSelected
                        ? 'ring-2 ring-cyan-500 shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    style={{
                      backgroundColor: def.bg,
                      borderColor: def.color,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm" style={{ color: def.color }}>
                          {def.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {grade === 5
                            ? 'Normal Power'
                            : grade === 4
                            ? 'Against Moderate Resistance'
                            : grade === 3
                            ? 'Against Gravity Only'
                            : grade === 2
                            ? 'Movement with Gravity Eliminated'
                            : grade === 1
                            ? 'Trace Flicker'
                            : 'Complete Paralysis (0/5)'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">
                        {def.description}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white text-slate-800 shadow-xs">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
