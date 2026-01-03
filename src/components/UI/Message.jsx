import React from 'react'

export default function Message({ text }) {
  if (!text) return null

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="bg-black/90 rounded-2xl px-6 py-4 shadow-xl animate-fade-in">
        <div className="text-white text-xl font-bold text-center">{text}</div>
      </div>
    </div>
  )
}
