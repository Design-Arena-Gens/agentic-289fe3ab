'use client';

import { memo } from 'react';

export type TrailSegment = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
};

export type StageSnapshot = {
  x: number;
  y: number;
  direction: number;
  spriteColor: string;
  penDown: boolean;
  penColor: string;
  background: string;
  message: string | null;
  trails: TrailSegment[];
};

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

function calculateScreenPosition(x: number, y: number) {
  const centerX = STAGE_WIDTH / 2;
  const centerY = STAGE_HEIGHT / 2;
  return {
    left: centerX + x,
    top: centerY - y
  };
}

const StageViewComponent = ({ snapshot }: { snapshot: StageSnapshot }) => {
  const spritePosition = calculateScreenPosition(snapshot.x, snapshot.y);

  return (
    <div
      className="stage-root"
      style={{
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        background: snapshot.background,
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)'
      }}
    >
      <svg
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {snapshot.trails.map((segment) => (
          <line
            key={segment.id}
            x1={calculateScreenPosition(segment.from.x, segment.from.y).left}
            y1={calculateScreenPosition(segment.from.x, segment.from.y).top}
            x2={calculateScreenPosition(segment.to.x, segment.to.y).left}
            y2={calculateScreenPosition(segment.to.x, segment.to.y).top}
            stroke={segment.color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.75}
          />
        ))}
      </svg>

      <div
        aria-label="ElectroFire sprite"
        style={{
          position: 'absolute',
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: snapshot.spriteColor,
          border: '4px solid rgba(255, 255, 255, 0.25)',
          color: '#0f172a',
          transform: `translate(-50%, -50%) rotate(${snapshot.direction - 90}deg)`,
          left: spritePosition.left,
          top: spritePosition.top,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1
        }}
      >
        ⚡
      </div>

      {snapshot.message ? (
        <div
          style={{
            position: 'absolute',
            padding: '8px 12px',
            borderRadius: 16,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(226, 232, 240, 0.2)',
            color: '#f8fafc',
            fontSize: 14,
            maxWidth: 220,
            transform: `translate(-50%, -100%)`,
            left: spritePosition.left,
            top: spritePosition.top - 60,
            pointerEvents: 'none'
          }}
        >
          {snapshot.message}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(148, 163, 184, 0.4)',
          fontSize: 13,
          letterSpacing: 0.6,
          display: 'flex',
          gap: 8,
          alignItems: 'center'
        }}
      >
        <span style={{ color: '#fbbf24', fontSize: 18 }}>●</span>
        <span style={{ fontWeight: 600 }}>ElectroFire Stage</span>
      </div>
    </div>
  );
};

export const StageView = memo(StageViewComponent);
