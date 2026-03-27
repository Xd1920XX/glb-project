const encode = (path) => encodeURI(path)

export const FRAMES = [
  {
    id: 'B3',
    label: 'B3',
    slots: 3,
    path: encode('/GLB/1. Karkass/Container-B3-Karkass_v2.glb'),
  },
  {
    id: 'B4',
    label: 'B4',
    slots: 4,
    path: encode('/GLB/1. Karkass/Container-B4-Karkass_v2.glb'),
  },
  {
    id: 'B5',
    label: 'B5',
    slots: 5,
    path: encode('/GLB/1. Karkass/Container-B5-Karkass_v2.glb'),
  },
]

export const LIDS = [
  {
    id: 'Bio',
    label: 'Bio',
    color: '#5A8A3C',
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Bio_v1.glb'),
  },
  {
    id: 'Klaas',
    label: 'Klaas',
    color: '#4A7FA5',
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Klaas_v1.glb'),
  },
  {
    id: 'Paber',
    label: 'Paber',
    color: '#6B9FBE',
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Paber_v1.glb'),
  },
  {
    id: 'Pakend',
    label: 'Pakend',
    color: '#E8A844',
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Pakend_v1.glb'),
  },
  {
    id: 'Prugi',
    label: 'Prugi',
    color: '#888888',
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Prugi_v1.glb'),
  },
  {
    id: 'Puhas',
    label: 'Puhas',
    color: '#EBEBEB',
    border: true,
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Puhas_v1.glb'),
  },
  {
    id: 'Taara',
    label: 'Taara',
    color: '#CC4477',
    path: encode('/GLB/2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Taara_v1.glb'),
  },
]

export const FRONT_PANELS = {
  label: 'Front Panels',
  path: encode('/GLB/3. Esipaneelid/Container-Esipaneelid_Pos1-5_v1.glb'),
}

export const PRICES = {
  frames:  { B3: 299, B4: 349, B5: 419 },
  lids:    { Bio: 24, Klaas: 18, Paber: 18, Pakend: 22, Prugi: 12, Puhas: 28, Taara: 32 },
  panels:  49,
}
