import React from 'react'

export default function Menu({
  meta,
  onStartGame,
  onOpenSkillTree,
}) {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-green-800 to-green-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-6xl mb-4 animate-float">🐹</div>
      <h1 className="text-3xl font-bold text-white mb-2">Guinea Bros</h1>
      <p className="text-green-300 mb-6">Tower Defense Roguelike</p>

      {/* Stats Preview */}
      <div className="bg-black/30 rounded-xl p-4 mb-6 text-center">
        <div className="text-yellow-400 text-xl font-bold">⭐ {meta.skillPoints} SP</div>
        <div className="text-gray-400 text-sm">
          {meta.bestWave > 0 ? `Beste Welle: ${meta.bestWave}` : 'Noch nicht gespielt'}
        </div>
        {meta.totalGames > 0 && (
          <div className="text-gray-500 text-xs mt-1">
            {meta.totalGames} Spiele | {meta.bossesKilled} Bosse besiegt
          </div>
        )}
      </div>

      {/* Play Button */}
      <button
        className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold px-12 py-4 rounded-2xl mb-4 w-full max-w-xs transition-all transform hover:scale-105 touch-feedback shadow-lg"
        onClick={onStartGame}
      >
        ▶️ Spielen
      </button>

      {/* Skill Tree Button */}
      <button
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl w-full max-w-xs transition-all touch-feedback"
        onClick={onOpenSkillTree}
      >
        🌳 Skill Tree
      </button>

      {/* Footer */}
      <div className="absolute bottom-4 text-gray-600 text-xs">
        Guinea Bros v1.0
      </div>
    </div>
  )
}
