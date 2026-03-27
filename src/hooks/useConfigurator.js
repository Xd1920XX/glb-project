import { useState } from 'react'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

export const LID_VARIANTS = [
  { id: 'plain',       label: 'No hole, no sticker' },
  { id: 'inside',      label: 'No hole, sticker inside' },
  { id: 'hole-top',    label: 'Hole — sticker on top' },
  { id: 'hole-bottom', label: 'Hole — sticker inside' },
  { id: 'hole-plain',  label: 'Hole — no sticker' },
]

export const DEFAULT_LID = { type: 'Bio', variant: 'hole-top' }

function resizeLids(prev, newSlots) {
  if (newSlots === prev.length) return prev
  if (newSlots > prev.length) {
    const fill = prev.at(-1) ?? DEFAULT_LID
    return [...prev, ...Array(newSlots - prev.length).fill({ ...fill })]
  }
  return prev.slice(0, newSlots)
}

function calcPrice(frame, lids, showPanels) {
  const lidsPrice = lids.reduce(
    (sum, { type }) => sum + (LIDS.find((l) => l.id === type)?.price ?? 0),
    0,
  )
  return (frame?.price ?? 0) + lidsPrice + (showPanels ? FRONT_PANELS.price : 0)
}

export function useConfigurator() {
  const [frameId, setFrameId] = useState('B3')
  const [lids, setLids] = useState(() => Array(3).fill(DEFAULT_LID))
  const [showPanels, setShowPanels] = useState(true)

  const frame = FRAMES.find((f) => f.id === frameId)
  const slots = frame?.slots ?? 3
  const price = calcPrice(frame, lids, showPanels)

  function setFrame(id) {
    const newSlots = FRAMES.find((f) => f.id === id)?.slots ?? slots
    setFrameId(id)
    setLids((prev) => resizeLids(prev, newSlots))
  }

  function setLidType(i, type) {
    setLids((prev) => prev.map((l, j) => (j === i ? { ...l, type } : l)))
  }

  function setLidVariant(i, variant) {
    setLids((prev) => prev.map((l, j) => (j === i ? { ...l, variant } : l)))
  }

  return {
    frameId, lids, showPanels, frame, slots, price,
    setFrame, setLidType, setLidVariant, setShowPanels,
  }
}
