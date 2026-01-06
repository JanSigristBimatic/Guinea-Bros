import React from 'react'
import { WEATHER_EFFECTS } from '../../constants'

export default function HUD({
  phase,
  wave,
  score,
  wood,
  baseHealth,
  maxBaseHealth,
  dayTimeLeft,
  weather,
  combo,
  rageMode,
  bossActive,
}) {
  const weatherInfo = WEATHER_EFFECTS[weather]

  return (
    <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-none">
      {/* Left: Phase & Weather */}
      <div className="space-y-2">
        <div className={`bg-black/80 rounded-xl px-3 py-2 ${rageMode ? 'animate-pulse border-2 border-red-500' : ''}`}>
          <div className={`text-sm font-bold ${phase === 'day' ? 'text-yellow-400' : 'text-indigo-400'}`}>
            {phase === 'day' ? `☀️ TAG ${wave + 1}` : `🌙 WELLE ${wave + 1}`}
            {bossActive && ' 👑'}
          </div>
          {phase === 'day' && (
            <div className="text-white text-xs">⏱️ {dayTimeLeft}s</div>
          )}
        </div>

        <div className="bg-black/60 rounded-lg px-2 py-1 text-xs text-white">
          {weatherInfo.icon} {weatherInfo.name}
          {weatherInfo.description !== 'Keine besonderen Effekte' && (
            <span className="text-gray-400"> ({weatherInfo.description})</span>
          )}
        </div>

        {combo > 2 && (
          <div className="bg-orange-500 rounded-lg px-3 py-1 animate-bounce">
            <span className="text-white font-bold">🔥 x{combo} COMBO!</span>
          </div>
        )}
      </div>

      {/* Right: Resources */}
      <div className="flex gap-2">
        <div className="bg-orange-600 rounded-xl px-3 py-2 text-center min-w-[70px]">
          <div className="text-white text-xl font-bold">{score}</div>
          <div className="text-orange-200 text-xs">🥕</div>
        </div>
        <div className="bg-amber-700 rounded-xl px-3 py-2 text-center min-w-[70px]">
          <div className="text-white text-xl font-bold">{wood || 0}</div>
          <div className="text-amber-200 text-xs">🪵</div>
        </div>
        <div className={`rounded-xl px-3 py-2 text-center min-w-[70px] ${
          baseHealth > maxBaseHealth * 0.5 ? 'bg-green-600' :
          baseHealth > maxBaseHealth * 0.25 ? 'bg-yellow-600' : 'bg-red-600'
        }`}>
          <div className="text-white text-lg font-bold">{Math.floor(baseHealth)}</div>
          <div className="text-white/80 text-xs">/{maxBaseHealth} ❤️</div>
        </div>
      </div>
    </div>
  )
}
