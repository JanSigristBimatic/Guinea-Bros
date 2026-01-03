import React from 'react'

export default function GameOver({
  wave,
  score,
  earnedPoints,
  onRestart,
  onOpenSkillTree,
}) {
  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 pointer-events-auto">
      <div className="bg-gradient-to-b from-red-900 to-red-950 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl">
        <div className="text-5xl mb-3">💀</div>
        <div className="text-white text-2xl font-bold mb-2">GAME OVER</div>
        <div className="text-red-300 mb-4">Welle {wave + 1} erreicht</div>

        <div className="bg-black/30 rounded-xl p-3 mb-4">
          <div className="text-gray-400 text-sm mb-1">Verdiente Skillpunkte</div>
          <div className="text-yellow-400 text-2xl font-bold">
            +{earnedPoints} ⭐
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-2 mb-4">
          <div className="text-gray-400 text-xs">Endstand</div>
          <div className="text-orange-400 text-lg font-bold">{score} 🥕</div>
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
