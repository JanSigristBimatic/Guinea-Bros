import React from 'react'
import { TOTAL_WAVES } from '../../constants'

export default function Victory({
  score,
  earnedPoints,
  onRestart,
  onOpenSkillTree,
}) {
  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 pointer-events-auto">
      <div className="bg-gradient-to-b from-yellow-600 to-amber-800 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl">
        <div className="text-5xl mb-3">🏆</div>
        <div className="text-white text-2xl font-bold mb-2">SIEG!</div>
        <div className="text-yellow-100 mb-4">
          Alle {TOTAL_WAVES} Wellen überstanden!
        </div>

        <div className="bg-black/30 rounded-xl p-3 mb-4">
          <div className="text-yellow-200 text-sm mb-1">Verdiente Skillpunkte</div>
          <div className="text-white text-2xl font-bold glow-gold">
            +{earnedPoints} ⭐
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-2 mb-4">
          <div className="text-yellow-200 text-xs">Endstand</div>
          <div className="text-orange-300 text-lg font-bold">{score} 🥕</div>
        </div>

        <button
          className="bg-white text-black px-8 py-3 rounded-xl font-bold text-lg w-full mb-2 touch-feedback hover:bg-gray-200 transition-colors"
          onClick={onRestart}
        >
          🔄 Nochmal
        </button>
        <button
          className="bg-purple-600 text-white px-8 py-2 rounded-xl font-bold w-full touch-feedback hover:bg-purple-700 transition-colors"
          onClick={onOpenSkillTree}
        >
          🌳 Skill Tree
        </button>
      </div>
    </div>
  )
}
