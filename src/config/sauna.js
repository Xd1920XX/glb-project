const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

const INTERIORS_XS = [
  { id: 'harvia',    label: 'Harvia Spirit 9kw WI-FI',             icon: encode('/Ikoonid/Harvia.jpg'),        path: encode('/new/interjor/CIty XS_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia Spirit 9kw WI-FI + Infrared',  icon: encode('/Ikoonid/Harvia + infrared.jpg'), path: encode('/new/interjor/CIty XS_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum Drop 9kw WI-FI',                 icon: encode('/Ikoonid/Huum.jpg'),          path: encode('/new/interjor/CIty XS_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum Drop 9kw WI-FI + Eos',           icon: encode('/Ikoonid/HUUM + EOS.jpg'),    path: encode('/new/interjor/CIty XS_6k_Huum+Eos.jpg') },
]

const INTERIORS_CITY = [
  { id: 'harvia',    label: 'Harvia Spirit 9kw WI-FI',             icon: encode('/Ikoonid/Harvia.jpg'),        path: encode('/latest/CIty_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia Spirit 9kw WI-FI + Infrared',  icon: encode('/Ikoonid/Harvia + infrared.jpg'), path: encode('/latest/CIty_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum Drop 9kw WI-FI',                 icon: encode('/Ikoonid/Huum.jpg'),          path: encode('/latest/CIty_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum Drop 9kw WI-FI + Eos',           icon: encode('/Ikoonid/HUUM + EOS.jpg'),    path: encode('/latest/CIty_6k_Huum+infrared EOS.jpg') },
]

const INTERIORS_LUX = [
  { id: 'harvia',    label: 'Harvia Spirit 9kw WI-FI',             icon: encode('/Ikoonid/Harvia.jpg'),        path: encode('/city_lux/CIty LUX_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia Spirit 9kw WI-FI + Infrared',  icon: encode('/Ikoonid/Harvia + infrared.jpg'), path: encode('/city_lux/CIty LUX_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum Drop 9kw WI-FI',                 icon: encode('/Ikoonid/Huum.jpg'),          path: encode('/city_lux/CIty LUX_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum Drop 9kw WI-FI + Eos',           icon: encode('/Ikoonid/HUUM + EOS.jpg'),    path: encode('/city_lux/CIty LUX_6k_Huum+infrared EOS.jpg') },
]

export const MODELS = {
  'city-elegant': {
    name: 'City Elegant',
    colors: [
      { id: 'black', label: 'Black', swatch: '#1A1A1A', folder: '/elegant-new/black', glb: encode('/elegant-new/Sauna City Elegant.glb') },
      { id: 'brown', label: 'Brown', swatch: '#6B4226', folder: '/elegant-new/brown', glb: encode('/elegant-new/Sauna City Elegant.glb'),
        texture: encode('/new/brown_dark.jpg'),
        textureMaterials: ['black_walls'] },
    ],
    interiors: [
      { id: 'huum-drop',     label: 'Huum Drop 9kw WI-FI',         icon: encode('/Ikoonid/Huum.jpg'),       path: encode('/elegant-new/CIty Elegant_6k_Huum Drop.jpg') },
      { id: 'huum-drop-eos', label: 'Huum Drop 9kw WI-FI + Eos',   icon: encode('/Ikoonid/HUUM + EOS.jpg'), path: encode('/elegant-new/CIty Elegant_6k_Huum Drop+EOS.jpg') },
      { id: 'huum-flow',     label: 'Huum Flow Mini 8.5kw',         icon: encode('/Ikoonid/Huum.jpg'),       path: encode('/elegant-new/CIty Elegant_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow Mini 8.5kw + EOS',   icon: encode('/Ikoonid/HUUM HIVE Flow Mini + EOS.jpg'), path: encode('/elegant-new/CIty Elegant_6k_Huum Flow+EOS.jpg') },
    ],
  },
  'city-xs': {
    name: 'City XS',
    colors: [
      { id: 'black', label: 'Black', swatch: '#1A1A1A', folder: '/xs-Exterior/Black', glb: encode('/xs-Exterior/Sauna City XS (1).glb') },
      { id: 'brown', label: 'Brown', swatch: '#6B4226', folder: '/xs-Exterior/Brown', glb: encode('/xs-Exterior/Sauna City XS (1).glb'),
        texture: encode('/new/brown_dark.jpg'),
        textureMaterials: ['black_walls', 'dark_wood_walls'] },
    ],
    interiors: INTERIORS_XS,
  },
  'city-lux': {
    name: 'City LUX',
    colors: [
      { id: 'black', label: 'Black', swatch: '#1A1A1A', folder: '/city_lux/black', glb: encode('/city_lux/Sauna City LUX.glb') },
      { id: 'brown', label: 'Brown', swatch: '#6B4226', folder: '/city_lux/brown', glb: encode('/city_lux/Sauna City LUX.glb'),
        texture: encode('/new/brown_dark.jpg'),
        textureMaterials: ['black_walls'] },
    ],
    interiors: INTERIORS_LUX,
  },
  'city': {
    name: 'City',
    colors: [
      { id: 'black', label: 'Black', swatch: '#1A1A1A', folder: '/latest/black', glb: encode('/latest/Sauna City.glb') },
      { id: 'brown', label: 'Brown', swatch: '#6B4226', folder: '/latest/brown', glb: encode('/latest/Sauna City.glb'),
        texture: encode('/new/brown_dark.jpg'),
        textureMaterials: ['black_walls'] },
    ],
    interiors: INTERIORS_CITY,
  },
}

// Legacy exports for backward compatibility
const DEFAULT = MODELS['city-xs']
export const COLORS   = DEFAULT.colors
export const INTERIORS = DEFAULT.interiors
