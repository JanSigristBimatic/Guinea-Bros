import React from 'react'
import { BUILDING_TYPES } from '../../constants'

export default function BuildMenu({
  score,
  buildMode,
  buildingCosts,
  onBuild,
  onCancelBuild,
  onBreed,
}) {
  const buildOptions = [
    {
      type: 'collectorHut',
      icon: BUILDING_TYPES.collectorHut.icon,
      label: BUILDING_TYPES.collectorHut.label,
      cost: buildingCosts.collectorHut,
    },
    {
      type: 'heroHut',
      icon: BUILDING_TYPES.heroHut.icon,
      label: BUILDING_TYPES.heroHut.label,
      cost: buildingCosts.heroHut,
    },
    {
      type: 'tower',
      icon: BUILDING_TYPES.tower.icon,
      label: BUILDING_TYPES.tower.label,
      cost: buildingCosts.tower,
    },
    {
      type: 'wall',
      icon: BUILDING_TYPES.wall.icon,
      label: BUILDING_TYPES.wall.label,
      cost: buildingCosts.wall,
    },
    {
      type: 'breed',
      icon: '💕',
      label: 'Züchten',
      cost: 15,
    },
  ]

  return (
    <div className="absolute bottom-4 left-0 right-0 px-3 pointer-events-auto">
      <div className="bg-black/85 rounded-2xl p-3">
        <div className="text-white text-xs text-center mb-2">
          {buildMode ? '👆 Tippe zum Platzieren' : '🏗️ Bauen'}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {buildOptions.map(({ type, icon, label, cost }) => (
            <button
              key={type}
              className={`rounded-xl p-2 flex flex-col items-center transition-all touch-feedback ${
                buildMode === type ? 'bg-green-600 ring-2 ring-white' :
                score >= cost ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-800 opacity-50'
              }`}
              disabled={score < cost}
              onClick={() => {
                if (type === 'breed') {
                  onBreed()
                } else if (buildMode === type) {
                  onCancelBuild()
                } else {
                  onBuild(type)
                }
              }}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-white text-xs">{cost}🥕</span>
            </button>
          ))}
        </div>
        {buildMode && (
          <button
            className="mt-2 w-full bg-red-600 text-white py-2 rounded-xl text-sm touch-feedback"
            onClick={onCancelBuild}
          >
            ✕ Abbrechen
          </button>
        )}
      </div>
    </div>
  )
}
