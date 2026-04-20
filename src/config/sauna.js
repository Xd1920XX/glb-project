const encode = (p) => encodeURI(p)

export const FRAME_COUNT = 16

export const MODELS = {
  'city-xs': {
    name: 'City XS',
    colors: [
      { id: 'black', label: 'Black', swatch: '#1A1A1A', folder: '/xs-Exterior/Black', glb: encode('/xs-Exterior/Sauna City XS (1).glb') },
      { id: 'brown', label: 'Brown', swatch: '#6B4226', folder: '/xs-Exterior/Brown', glb: encode('/xs-Exterior/Sauna City XS (1).glb'),
        texture: encode('/xs-Exterior/wood-43_d 1,8x2,4m 2 nat 2 33333_wood dark_4.jpg'),
        textureMaterials: ['black_walls', 'dark_wood_walls'] },
    ],
    interiors: [
      { id: 'harvia',    label: 'Harvia',            path: encode('/new/interjor/CIty XS_6k_Harvia.jpg') },
      { id: 'harvia-ir', label: 'Harvia + Infrared', path: encode('/new/interjor/CIty XS_6k_Harvia+infrared Harvia.jpg') },
      { id: 'huum',      label: 'Huum',              path: encode('/new/interjor/CIty XS_6k_Huum.jpg') },
      { id: 'huum-eos',  label: 'Huum + Eos',        path: encode('/new/interjor/CIty XS_6k_Huum+Eos.jpg') },
    ],
  },
  'city': {
    name: 'City',
    colors: [
      { id: 'black', label: 'Black', swatch: '#1A1A1A', folder: '/latest/black', glb: encode('/latest/Sauna City.glb') },
      { id: 'brown', label: 'Brown', swatch: '#6B4226', folder: '/latest/brown', glb: encode('/latest/Sauna City.glb'),
        texture: encode('/new/jpg-brown/wood-43_d 1,8x2,4m 2 nat 2 33333_wood dark_4.jpg'),
        textureMaterials: ['black_walls'] },
    ],
    interiors: [
      { id: 'harvia',    label: 'Harvia',            path: encode('/latest/CIty_6k_Harvia.jpg') },
      { id: 'harvia-ir', label: 'Harvia + Infrared', path: encode('/latest/CIty_6k_Harvia+infrared Harvia.jpg') },
      { id: 'huum',      label: 'Huum',              path: encode('/latest/CIty_6k_Huum.jpg') },
      { id: 'huum-eos',  label: 'Huum + Eos',        path: encode('/latest/CIty_6k_Huum+infrared EOS.jpg') },
    ],
  },
}

// Legacy exports for backward compatibility
const DEFAULT = MODELS['city-xs']
export const COLORS   = DEFAULT.colors
export const INTERIORS = DEFAULT.interiors
