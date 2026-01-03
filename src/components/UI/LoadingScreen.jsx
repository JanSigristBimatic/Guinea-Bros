import React from 'react'

export default function LoadingScreen({ progress = 0, message = 'Laden...' }) {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center">
      <div className="text-6xl mb-6 animate-bounce">🐹</div>
      <div className="text-white text-xl mb-4">{message}</div>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-green-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-green-400 text-sm mt-2">{Math.round(progress)}%</div>

      {/* Loading tips */}
      <div className="mt-8 text-green-600 text-sm max-w-xs text-center">
        <span className="opacity-75">
          💡 Tipp: Baue Sammler-Hütten früh für mehr Karotten!
        </span>
      </div>
    </div>
  )
}
