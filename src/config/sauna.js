const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

const ICON = {
  harvia:    encode('/Ikoonid/Harvia.jpg'),
  harviaIR:  encode('/Ikoonid/Harvia + infrared.jpg'),
  huum:      encode('/Ikoonid/Huum.jpg'),
  huumEOS:   encode('/Ikoonid/HUUM + EOS.jpg'),
  flow:      encode('/Ikoonid/HUUM HIVE Flow Mini.jpg'),
  flowEOS:   encode('/Ikoonid/HUUM HIVE Flow Mini + EOS.jpg'),
}

const BROWN_TEXTURE     = encode('/new/brown_dark.jpg')
const BROWN_MATERIALS   = ['black_walls']

const makeColors = ({ blackFolder, brownFolder, glb }) => {
  const base = (folder) => glb ? { folder: encode(folder), glb: encode(glb) } : { folder: encode(folder) }
  return [
    { id: 'black', label: 'Black', swatch: '#1A1A1A', ...base(blackFolder) },
    { id: 'brown', label: 'Brown', swatch: '#6B4226', ...base(brownFolder),
      texture: BROWN_TEXTURE, textureMaterials: BROWN_MATERIALS },
  ]
}

export const MODELS = {
  'city-xs': {
    name: 'City XS',
    colors: makeColors({
      blackFolder: '/Mudelid/02_City XS/Pööratav must',
      brownFolder: '/Mudelid/02_City XS/Pööratav pruun',
      glb:         '/Mudelid/02_City XS/Sauna City XS.glb',
    }),
    interiors: [
      { id: 'harvia',    label: 'Harvia Spirit 9kw WI-FI',            icon: ICON.harvia,   path: encode('/Mudelid/02_City XS/CIty XS_6k_Harvia.jpg') },
      { id: 'harvia-ir', label: 'Harvia Spirit 9kw WI-FI + Infrared', icon: ICON.harviaIR, path: encode('/Mudelid/02_City XS/CIty XS_6k_Harvia+infrared Harvia.jpg') },
      { id: 'huum',      label: 'Huum Drop 9kw WI-FI',                icon: ICON.huum,     path: encode('/Mudelid/02_City XS/CIty XS_6k_Huum.jpg') },
      { id: 'huum-eos',  label: 'Huum Drop 9kw WI-FI + EOS',          icon: ICON.huumEOS,  path: encode('/Mudelid/02_City XS/CIty XS_6k_Huum+Eos.jpg') },
    ],
  },

  'city': {
    name: 'City',
    colors: makeColors({
      blackFolder: '/Mudelid/03_Saun City/Pööratav must',
      brownFolder: '/Mudelid/03_Saun City/Pööratav pruun',
      glb:         '/Mudelid/03_Saun City/Sauna City.glb',
    }),
    interiors: [
      { id: 'harvia',    label: 'Harvia Spirit 9kw WI-FI',            icon: ICON.harvia,   path: encode('/Mudelid/03_Saun City/CIty_6k_Harvia.jpg') },
      { id: 'harvia-ir', label: 'Harvia Spirit 9kw WI-FI + Infrared', icon: ICON.harviaIR, path: encode('/Mudelid/03_Saun City/CIty_6k_Harvia+infrared Harvia.jpg') },
      { id: 'huum',      label: 'Huum Drop 9kw WI-FI',                icon: ICON.huum,     path: encode('/Mudelid/03_Saun City/CIty_6k_Huum.jpg') },
      { id: 'huum-eos',  label: 'Huum Drop 9kw WI-FI + Infrared EOS', icon: ICON.huumEOS,  path: encode('/Mudelid/03_Saun City/CIty_6k_Huum+infrared EOS.jpg') },
    ],
  },

  'city-lux': {
    name: 'City LUX',
    colors: makeColors({
      blackFolder: '/Mudelid/04_Saun City LUX/Pööratav must',
      brownFolder: '/Mudelid/04_Saun City LUX/Pööratav pruun',
    }),
    interiors: [
      { id: 'harvia',    label: 'Harvia Spirit 9kw WI-FI',            icon: ICON.harvia,   path: encode('/Mudelid/04_Saun City LUX/CIty LUX_6k_Harvia.jpg') },
      { id: 'harvia-ir', label: 'Harvia Spirit 9kw WI-FI + Infrared', icon: ICON.harviaIR, path: encode('/Mudelid/04_Saun City LUX/CIty LUX_6k_Harvia+infrared Harvia.jpg') },
      { id: 'huum',      label: 'Huum Drop 9kw WI-FI',                icon: ICON.huum,     path: encode('/Mudelid/04_Saun City LUX/CIty LUX_6k_Huum.jpg') },
      { id: 'huum-eos',  label: 'Huum Drop 9kw WI-FI + Infrared EOS', icon: ICON.huumEOS,  path: encode('/Mudelid/04_Saun City LUX/CIty LUX_6k_Huum+infrared EOS.jpg') },
    ],
  },

  'city-xl': {
    name: 'City XL',
    colors: makeColors({
      blackFolder: '/Mudelid/05_City XL/Pööratav must',
      brownFolder: '/Mudelid/05_City XL/Pööratav pruun',
      glb:         '/Mudelid/05_City XL/Sauna City XL.glb',
    }),
    interiors: [
      { id: 'huum-flow',     label: 'Huum Flow 8.5kw',                icon: ICON.flow,    path: encode('/Mudelid/05_City XL/CIty XL_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow 8.5kw + Infrared EOS', icon: ICON.flowEOS, path: encode('/Mudelid/05_City XL/CIty XL_6k_Huum Flow+infrared EOS.jpg') },
      { id: 'huum-hive',     label: 'Huum Hive 9kw',                  icon: ICON.huum,    path: encode('/Mudelid/05_City XL/CIty XL_6k_Huum Hive.jpg') },
      { id: 'huum-hive-eos', label: 'Huum Hive 9kw + Infrared EOS',   icon: ICON.huumEOS, path: encode('/Mudelid/05_City XL/CIty XL_6k_Huum Hive+infrared EOS.jpg') },
    ],
  },

  'panorama': {
    name: 'Panorama',
    colors: makeColors({
      blackFolder: '/Mudelid/06_Panorama/Pööratav must',
      brownFolder: '/Mudelid/06_Panorama/Pööratav pruun',
      glb:         '/Mudelid/06_Panorama/Sauna City Panorama.glb',
    }),
    interiors: [
      { id: 'huum-flow',     label: 'Huum Flow 8.5kw',                icon: ICON.flow,    path: encode('/Mudelid/06_Panorama/CIty Panorama_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow 8.5kw + Infrared EOS', icon: ICON.flowEOS, path: encode('/Mudelid/06_Panorama/CIty Panorama_6k_Huum Flow+infrared EOS.jpg') },
      { id: 'huum-hive',     label: 'Huum Hive 9kw',                  icon: ICON.huum,    path: encode('/Mudelid/06_Panorama/CIty Panorama_6k_Huum Hive.jpg') },
      { id: 'huum-hive-eos', label: 'Huum Hive 9kw + Infrared EOS',   icon: ICON.huumEOS, path: encode('/Mudelid/06_Panorama/CIty Panorama_6k_Huum Hive+infrared EOS.jpg') },
    ],
  },

  'city-elegant': {
    name: 'City Elegant',
    colors: makeColors({
      blackFolder: '/Mudelid/07_Saun City Elegant/Must pööratav',
      brownFolder: '/Mudelid/07_Saun City Elegant/Pruun pööratav',
      glb:         '/Mudelid/07_Saun City Elegant/Sauna City Elegant.glb',
    }),
    rooms: [
      { id: 'sauna',    label: 'Sauna room' },
      { id: 'changing', label: 'Changing room', path: encode('/Mudelid/07_Saun City Elegant/CIty Elegant_6k_2nd room.jpg') },
    ],
    interiors: [
      { id: 'huum-drop',     label: 'Huum Drop 9kw WI-FI',        icon: ICON.huum,    path: encode('/Mudelid/07_Saun City Elegant/CIty Elegant_6k_Huum Drop.jpg') },
      { id: 'huum-drop-eos', label: 'Huum Drop 9kw WI-FI + EOS',  icon: ICON.huumEOS, path: encode('/Mudelid/07_Saun City Elegant/CIty Elegant_6k_Huum Drop+EOS.jpg') },
      { id: 'huum-flow',     label: 'Huum Flow Mini 8.5kw',       icon: ICON.flow,    path: encode('/Mudelid/07_Saun City Elegant/CIty Elegant_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow Mini 8.5kw + EOS', icon: ICON.flowEOS, path: encode('/Mudelid/07_Saun City Elegant/CIty Elegant_6k_Huum Flow+EOS.jpg') },
    ],
  },

  'grande': {
    name: 'Grande',
    colors: makeColors({
      blackFolder: '/Mudelid/08_Grande/Pööratav_Must',
      brownFolder: '/Mudelid/08_Grande/Pööratav_Pruun',
      glb:         '/Mudelid/08_Grande/Saun Grande.glb',
    }),
    interiors: [
      { id: 'huum-flow',     label: 'Huum Flow 8.5kw',                icon: ICON.flow,    path: encode('/Mudelid/08_Grande/Saun Grande_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow 8.5kw + Infrared EOS', icon: ICON.flowEOS, path: encode('/Mudelid/08_Grande/Saun Grande_6k_Huum Flow_infrared EOS.jpg') },
      { id: 'huum-hive',     label: 'Huum Hive 9kw',                  icon: ICON.huum,    path: encode('/Mudelid/08_Grande/Saun Grande_6k_Huum Hive.jpg') },
      { id: 'huum-hive-eos', label: 'Huum Hive 9kw + Infrared EOS',   icon: ICON.huumEOS, path: encode('/Mudelid/08_Grande/Saun Grande_6k_Huum Hive_infrared EOS.jpg') },
    ],
  },

  'elegant': {
    name: 'Elegant',
    colors: makeColors({
      blackFolder: '/Mudelid/09_Saun Elegant/Must pööratav',
      brownFolder: '/Mudelid/09_Saun Elegant/Pruun pööratav',
      glb:         '/Mudelid/09_Saun Elegant/Saun Elegant.glb',
    }),
    rooms: [
      { id: 'sauna',    label: 'Sauna room' },
      { id: 'changing', label: 'Changing room', path: encode('/Mudelid/09_Saun Elegant/Saun Elegant_6k_2nd room.jpg') },
    ],
    interiors: [
      { id: 'huum-flow',     label: 'Huum Flow 8.5kw',        icon: ICON.flow,    path: encode('/Mudelid/09_Saun Elegant/Saun Elegant_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow 8.5kw + EOS',  icon: ICON.flowEOS, path: encode('/Mudelid/09_Saun Elegant/Saun Elegant_6k_Huum Flow+EOS.jpg') },
      { id: 'huum-hive',     label: 'Huum Hive 9kw',          icon: ICON.huum,    path: encode('/Mudelid/09_Saun Elegant/Saun Elegant_6k_Huum Hive.jpg') },
      { id: 'huum-hive-eos', label: 'Huum Hive 9kw + EOS',    icon: ICON.huumEOS, path: encode('/Mudelid/09_Saun Elegant/Saun Elegant_6k_Huum Hive+EOS.jpg') },
    ],
  },

  'denmark': {
    name: 'Denmark',
    colors: makeColors({
      blackFolder: '/Mudelid/10_Denmark/Pööratav must',
      brownFolder: '/Mudelid/10_Denmark/Pööratav pruun',
      glb:         '/Mudelid/10_Denmark/Saun Denmark.glb',
    }),
    interiors: [
      { id: 'huum-flow',     label: 'Huum Flow 8.5kw',        icon: ICON.flow,    path: encode('/Mudelid/10_Denmark/Saun Denmark_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow 8.5kw + EOS',  icon: ICON.flowEOS, path: encode('/Mudelid/10_Denmark/Saun Denmark_6k_Huum Flow+EOS.jpg') },
      { id: 'huum-hive',     label: 'Huum Hive 9kw',          icon: ICON.huum,    path: encode('/Mudelid/10_Denmark/Saun Denmark_6k_Huum Hive.jpg') },
      { id: 'huum-hive-eos', label: 'Huum Hive 9kw + EOS',    icon: ICON.huumEOS, path: encode('/Mudelid/10_Denmark/Saun Denmark_6k_Huum Hive+EOS.jpg') },
    ],
  },

  'sauna-dushiga': {
    name: 'Saun Duširuumiga',
    colors: makeColors({
      blackFolder: '/Mudelid/01_Saun Duširuumiga/Pööratav must',
      brownFolder: '/Mudelid/01_Saun Duširuumiga/Pööratav pruun',
      glb:         '/Mudelid/01_Saun Duširuumiga/Saun Dushiga.glb',
    }),
    rooms: [
      { id: 'sauna',    label: 'Sauna room' },
      { id: 'shower',   label: 'Shower room',   path: encode('/Mudelid/01_Saun Duširuumiga/Saun Duširuumiga_6k_shower room.jpg') },
      { id: 'changing', label: 'Changing room', path: encode('/Mudelid/01_Saun Duširuumiga/Saun Duširuumiga_6k_2nd room.jpg') },
    ],
    interiors: [
      { id: 'huum-flow',     label: 'Huum Flow 8.5kw',                icon: ICON.flow,    path: encode('/Mudelid/01_Saun Duširuumiga/Saun Duširuumiga_6k_Huum Flow.jpg') },
      { id: 'huum-flow-eos', label: 'Huum Flow 8.5kw + Infrared EOS', icon: ICON.flowEOS, path: encode('/Mudelid/01_Saun Duširuumiga/Saun Duširuumiga_6k_Huum Flow+infrared EOS.jpg') },
      { id: 'huum-hive',     label: 'Huum Hive 9kw',                  icon: ICON.huum,    path: encode('/Mudelid/01_Saun Duširuumiga/Saun Duširuumiga_6k_Huum Hive.jpg') },
      { id: 'huum-hive-eos', label: 'Huum Hive 9kw + Infrared EOS',   icon: ICON.huumEOS, path: encode('/Mudelid/01_Saun Duširuumiga/Saun Duširuumiga_6k_Huum Hive+infrared EOS.jpg') },
    ],
  },
}

// Legacy exports for backward compatibility
const DEFAULT = MODELS['city-xs']
export const COLORS    = DEFAULT.colors
export const INTERIORS = DEFAULT.interiors
