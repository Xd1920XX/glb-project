const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

export const COLORS = [
  { id: 'natural', label: 'Black', swatch: '#1A1A1A', folder: encode('/new/wetransfer_black-rotatable-eti-box_2026-04-13_0936'), fileSuffix: '_2', glb: encode('/new/Sauna City XS.glb') },
  { id: 'brown',   label: 'Brown',   swatch: '#6B4226', folder: encode('/new/wetransfer_brown-rotatable-eti-box_2026-04-13_0931'), fileSuffix: '_2', glb: encode('/new/Sauna City XS.glb') },
]

export const INTERIORS = [
  { id: 'harvia',    label: 'Harvia',            path: encode('/new/interjor/CIty XS_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia + Infrared', path: encode('/new/interjor/CIty XS_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum',              path: encode('/new/interjor/CIty XS_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum + Eos',        path: encode('/new/interjor/CIty XS_6k_Huum+Eos.jpg') },
]
