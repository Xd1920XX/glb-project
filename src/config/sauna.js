const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

const GLB = encode('/latest/Sauna City.glb')

export const COLORS = [
  { id: 'natural', label: 'Black', swatch: '#1A1A1A', folder: '/latest/black', glb: GLB },
  { id: 'brown',   label: 'Brown', swatch: '#6B4226', folder: '/latest/brown', glb: GLB },
]

export const INTERIORS = [
  { id: 'harvia',    label: 'Harvia',            path: encode('/latest/CIty_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia + Infrared', path: encode('/latest/CIty_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum',              path: encode('/latest/CIty_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum + Eos',        path: encode('/latest/CIty_6k_Huum+infrared EOS.jpg') },
]
