const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

export const COLORS = [
  { id: 'natural', label: 'Natural', swatch: '#C8B48A', folder: '/new/jpg',       glb: encode('/new/Sauna City XS.glb') },
  { id: 'brown',   label: 'Brown',   swatch: '#6B4226', folder: '/new/jpg-brown', glb: null, image: encode('/new/jpg-brown/wood-43_d 1,8x2,4m 2 nat 2 33333_wood dark_4.jpg') },
]

export const INTERIORS = [
  { id: 'harvia',    label: 'Harvia',            path: encode('/new/interjor/CIty XS_6k_Harvia.jpg') },
  { id: 'harvia-ir', label: 'Harvia + Infrared', path: encode('/new/interjor/CIty XS_6k_Harvia+infrared Harvia.jpg') },
  { id: 'huum',      label: 'Huum',              path: encode('/new/interjor/CIty XS_6k_Huum.jpg') },
  { id: 'huum-eos',  label: 'Huum + Eos',        path: encode('/new/interjor/CIty XS_6k_Huum+Eos.jpg') },
]
