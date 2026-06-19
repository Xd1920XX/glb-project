import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'
import { parseSelectionFromQuery } from '../embed/embedApi.js'

const ENC = (p) => encodeURI(p)

const LID_TYPES = [
  { id: 'bio',    label: 'Bio',    swatch: '#5A8A3C' },
  { id: 'klaas',  label: 'Klaas',  swatch: '#4A7FA5' },
  { id: 'paber',  label: 'Paber',  swatch: '#6B9FBE' },
  { id: 'pakend', label: 'Pakend', swatch: '#E8A844' },
  { id: 'prugi',  label: 'Prügi',  swatch: '#888888' },
  { id: 'puhas',  label: 'Puhas',  swatch: '#EBEBEB' },
  { id: 'taara',  label: 'Taara',  swatch: '#CC4477' },
]

const cap       = (s) => s[0].toUpperCase() + s.slice(1)
const LID_GLB   = (typeId) => ENC(`/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_${cap(typeId)}_v1.glb`)
const PANEL_GLB = ENC('/GLB/3. Esipaneelid/Container-Esipaneelid_Pos1-5_v1.glb')
const FRAME_GLB = (n)      => ENC(`/GLB/1. Karkass/Container-B${n}-Karkass_v2.glb`)

const lidNodeToken   = (typeId) => `_${cap(typeId)}_`
const panelNodeToken = (typeId) => `_${cap(typeId)}`

function buildPartOptions(p) {
  const lidLabel   = `Lid ${p}`
  const panelLabel = `Panel ${p}`
  return [
    {
      id: `pos${p}-kaas`,
      label: `Pos ${p} kaas`,
      matchLayerLabels: [lidLabel],
      defaultOptionId: 'bio',
      options: LID_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        swatch: t.swatch,
        glbUrl: LID_GLB(t.id),
        visibleNodes: [lidNodeToken(t.id)],
        ...(t.id === 'puhas' ? { hidesGroups: [`Pos ${p} auk`, `Pos ${p} suund`] } : {}),
      })),
    },
    {
      id: `pos${p}-auk`,
      label: `Pos ${p} auk`,
      matchLayerLabels: [lidLabel],
      defaultOptionId: 'auguga',
      options: [
        { id: 'auguga', label: 'Auguga', swatch: '#bbb', visibleNodes: ['Auguga'] },
        { id: 'auguta', label: 'Auguta', swatch: '#444', visibleNodes: ['Auguta'] },
      ],
    },
    {
      id: `pos${p}-suund`,
      label: `Pos ${p} suund`,
      matchLayerLabels: [lidLabel],
      defaultOptionId: 'ulal',
      options: [
        // OR within list: include Kleepsuta so the hole-ring stays visible
        // when Auguga (hole) is chosen, regardless of sticker orientation.
        { id: 'ulal', label: 'Ülal', swatch: '#fff', visibleNodes: ['Ulal', 'Kleepsuta'] },
        { id: 'all',  label: 'All',  swatch: '#222', visibleNodes: ['All', 'Kleepsuta'] },
      ],
    },
    {
      id: `pos${p}-paneel`,
      label: `Pos ${p} paneel`,
      matchLayerLabels: [panelLabel],
      defaultOptionId: 'bio',
      options: LID_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        swatch: t.swatch,
        visibleNodes: [panelNodeToken(t.id)],
      })),
    },
  ]
}

function buildVariant(n) {
  const positions = Array.from({ length: n }, (_, i) => i + 1)
  return {
    id: `b${n}`,
    label: `B${n}`,
    type: 'glb',
    groupId: 'frame',
    swatch: '#3a3a3a',
    price: { 3: 299, 4: 349, 5: 419 }[n],
    glbLayers: [
      { id: 'frame', label: 'Frame', glbUrl: FRAME_GLB(n) },
      ...positions.flatMap((p) => [
        { id: `lid-${p}`,   label: `Lid ${p}`,   glbUrl: LID_GLB('bio'),   visibleNodes: [`Pos${p}_`] },
        { id: `panel-${p}`, label: `Panel ${p}`, glbUrl: PANEL_GLB,        visibleNodes: [`Pos${p}_`] },
      ]),
    ],
    partOptions: positions.flatMap(buildPartOptions),
  }
}

const DEMO_CONFIG = {
  id: 'prygikast-demo',
  name: 'Prügikast demo',
  variantGroups: [
    { id: 'frame', label: 'Karkass', dependsOnVariantId: null },
  ],
  variants: [3, 4, 5].map(buildVariant),
  interiors: [],
  viewerSettings: {
    glbAmbientIntensity: 30,
    glbKeyIntensity: 45,
    glbFillIntensity: 25,
    glbEnvIntensity: 55,
    glbEnvironment: 'city',
    glbAllowZoom: true,
    glbBackgroundColor: '#f7f6f4',
    glbToneMapping: 'aces',
    glbContactShadows: true,
    glbContactShadowOpacity: 0.5,
    glbMinDistance: 2,
    glbMaxDistance: 12,
  },
  exteriorLabel: 'Exterior',
  hideInteriorTab: true,
}

export default function PrygikastDemo() {
  const { search } = useLocation()
  const initialSelection = useMemo(() => parseSelectionFromQuery(search), [search])
  const renderKey = `prygikast::${JSON.stringify(initialSelection)}`

  return (
    <ConfiguratorRenderer
      key={renderKey}
      config={DEMO_CONFIG}
      initialSelection={initialSelection}
      enableEmbedApi
    />
  )
}
