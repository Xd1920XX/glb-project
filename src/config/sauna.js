const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

const GLB = encode('/updated_images/Exterior/Sauna City XS (1).glb')

export const COLORS = [
  { id: 'natural', label: 'Black', swatch: '#1A1A1A', folder: '/updated_images/Exterior/Black', glb: GLB },
  { id: 'brown',   label: 'Brown', swatch: '#6B4226', folder: '/updated_images/Exterior/Brown', glb: GLB, texture: encode('/updated_images/Exterior/wood-43_d 1,8x2,4m 2 nat 2 33333_wood dark_4.jpg') },
]

export const INTERIORS = [
  { id: 'harvia',    label: 'Harvia',            path: encode('/updated_images/Interior/CIty XS_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia + Infrared', path: encode('/updated_images/Interior/CIty XS_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum',              path: encode('/updated_images/Interior/CIty XS_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum + Eos',        path: encode('/updated_images/Interior/CIty XS_6k_Huum+Eos.jpg') },
]
