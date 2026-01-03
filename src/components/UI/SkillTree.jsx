import React from 'react'
import { SKILL_TIERS } from '../../constants'

export default function SkillTree({
  skills,
  meta,
  onUpgradeSkill,
  onResetSkills,
  onClose,
}) {
  return (
    <div className="absolute inset-0 bg-black/95 z-50 overflow-y-auto p-4 skill-tree-scroll">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">🌳 Skill Tree</h2>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg touch-feedback"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Skill Points Display */}
        <div className="bg-yellow-600 rounded-xl p-3 mb-4 text-center glow-gold">
          <span className="text-white text-lg font-bold">⭐ {meta.skillPoints} Skillpunkte</span>
        </div>

        {/* Stats Overview */}
        <div className="bg-gray-800 rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-sm">
          <div className="text-center text-gray-300">
            <div className="text-lg">🎮</div>
            <div>{meta.totalGames} Spiele</div>
          </div>
          <div className="text-center text-gray-300">
            <div className="text-lg">🌊</div>
            <div>Beste: Welle {meta.bestWave}</div>
          </div>
          <div className="text-center text-gray-300">
            <div className="text-lg">👑</div>
            <div>{meta.bossesKilled} Bosse</div>
          </div>
        </div>

        {/* Skill Tiers */}
        {SKILL_TIERS.map((tier) => (
          <div key={tier.tier} className="mb-4">
            <h3 className="text-yellow-400 font-bold mb-2">{tier.name}</h3>
            <div className="grid gap-2">
              {tier.skills.map(skillId => {
                const skill = skills[skillId]
                if (!skill) return null

                const canUpgrade = skill.level < skill.max && meta.skillPoints >= skill.cost[skill.level]
                const isMaxed = skill.level >= skill.max
                const currentEffect = skill.level > 0 ? skill.effect[skill.level - 1] : skill.effect[0]

                return (
                  <div
                    key={skillId}
                    className={`p-3 rounded-lg transition-all ${isMaxed ? 'bg-green-900' : 'bg-gray-700'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{skill.icon}</span>
                        <div>
                          <div className="text-white font-bold">{skill.name}</div>
                          <div className="text-gray-400 text-xs">
                            {skill.desc.replace('{}', currentEffect)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-white text-sm">{skill.level}/{skill.max}</div>
                        {!isMaxed && (
                          <button
                            className={`px-3 py-1 rounded text-sm font-bold transition-all touch-feedback ${
                              canUpgrade
                                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!canUpgrade}
                            onClick={() => onUpgradeSkill(skillId)}
                          >
                            {skill.cost[skill.level]} ⭐
                          </button>
                        )}
                        {isMaxed && (
                          <span className="text-green-400 text-sm font-bold">MAX</span>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isMaxed ? 'bg-green-400' : 'bg-yellow-400'}`}
                        style={{ width: `${(skill.level / skill.max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Reset Button */}
        <button
          className="w-full bg-red-600 text-white py-3 rounded-xl font-bold mt-4 touch-feedback hover:bg-red-700 transition-colors"
          onClick={() => {
            if (window.confirm('Wirklich alle Skills zurücksetzen?')) {
              onResetSkills()
            }
          }}
        >
          🔄 Skills Zurücksetzen
        </button>
      </div>
    </div>
  )
}
