export const LANGS = ['en', 'et', 'is']

export const t = {
  en: {
    configure: 'Configure →',
    ourModels: 'Our models',
    chooseModel: 'Choose your model',
    premium: 'Premium Collection',
    premiumPlus: 'Premium Plus Collection',
    allRights: 'All rights reserved.',

    exterior: 'Exterior',
    interior: 'Interior',
    summary: 'Summary',
    configureSub: 'Configure your sauna',
    color: 'Color',
    next: 'Next →',
    room: 'Room',
    heater: 'Heater',

    yourConfig: 'Your configuration',
    fullName: 'Full name *',
    email: 'Email *',
    phone: 'Phone',
    address: 'Delivery address',
    wishes: 'Additional wishes',
    phName: 'Jane Smith',
    phEmail: 'jane@example.com',
    phPhone: '+1 234 567 8900',
    phAddress: 'Street, city, country',
    phWishes: 'Any special requests…',
    send: 'Send order request',
    sending: 'Sending…',
    thanks: 'Thank you!',
    thanksBody: 'Your order request has been prepared. Please send the email that just opened in your mail client.',
    back: 'Back',
    errGeneric: 'Something went wrong. Please try again or contact us directly.',

    loadingImages: 'Loading images…',
    spinnerHint: 'Drag to rotate · Scroll to zoom',

    colorBlack: 'Black',
    colorBrown: 'Brown',
    roomSauna: 'Sauna room',
    roomChanging: 'Changing room',
    roomShower: 'Shower room',
  },
  et: {
    configure: 'Konfigureeri →',
    ourModels: 'Meie mudelid',
    chooseModel: 'Vali oma mudel',
    premium: 'Premium kollektsioon',
    premiumPlus: 'Premium Plus kollektsioon',
    allRights: 'Kõik õigused kaitstud.',

    exterior: 'Välisvaade',
    interior: 'Sisevaade',
    summary: 'Kokkuvõte',
    configureSub: 'Konfigureeri oma saun',
    color: 'Värv',
    next: 'Edasi →',
    room: 'Ruum',
    heater: 'Küttekeha',

    yourConfig: 'Sinu konfiguratsioon',
    fullName: 'Täisnimi *',
    email: 'E-post *',
    phone: 'Telefon',
    address: 'Tarneaadress',
    wishes: 'Lisasoovid',
    phName: 'Mari Maasikas',
    phEmail: 'mari@naide.ee',
    phPhone: '+372 5000 0000',
    phAddress: 'Tänav, linn, riik',
    phWishes: 'Erisoovid…',
    send: 'Saada tellimus',
    sending: 'Saadan…',
    thanks: 'Aitäh!',
    thanksBody: 'Sinu tellimuse päring on ettevalmistatud. Palun saada e-kiri, mis avanes sinu e-posti programmis.',
    back: 'Tagasi',
    errGeneric: 'Midagi läks valesti. Palun proovi uuesti või võta meiega otse ühendust.',

    loadingImages: 'Piltide laadimine…',
    spinnerHint: 'Lohista pööramiseks · Keri suurendamiseks',

    colorBlack: 'Must',
    colorBrown: 'Pruun',
    roomSauna: 'Leiliruum',
    roomChanging: 'Riietusruum',
    roomShower: 'Duširuum',
  },
  is: {
    configure: 'Hannaðu →',
    ourModels: 'Okkar vörulína',
    chooseModel: 'Veldu þína gerð',
    premium: 'Premium Collection',
    premiumPlus: 'Premium Plus Collection',
    allRights: 'Allur réttur áskilinn.',

    exterior: 'Exterior',
    interior: 'Interior',
    summary: 'Samantekt',
    configureSub: 'Settu saman þína sauna',
    color: 'Litur',
    next: 'Næst →',
    room: 'Rými',
    heater: 'Saunaofn',

    yourConfig: 'Þín samsetning',
    model: 'Gerð',
    fullName: 'Fullt nafn *',
    email: 'Netfang *',
    phone: 'Sími',
    address: 'Heimilisfang',
    wishes: 'Séróskir',
    phName: 'Jón Jónsson',
    phEmail: 'jon@daemi.is',
    phPhone: '+354 555 0000',
    phAddress: 'Bæjarfélag',
    phWishes: 'Einhverjar séróskir…',
    send: 'Senda inn fyrirspurn',
    sending: 'Sendi…',
    thanks: 'Takk!',
    thanksBody: 'Fyrirspurn þín er tilbúin. Vinsamlegast sendu tölvupóstinn sem opnaðist í póstforritinu þínu.',
    back: 'Til baka',
    errGeneric: 'Eitthvað fór úrskeiðis. Vinsamlegast reyndu aftur eða hafðu samband beint.',

    loadingImages: 'Hleð myndir…',
    spinnerHint: 'Dragðu til að snúa · Skrollaðu til að sjá nær',

    colorBlack: 'Svartur',
    colorBrown: 'Brúnn',
    roomSauna: 'Sauna rými',
    roomChanging: 'Búningsherbergi',
    roomShower: 'Sturtu rými',
  },
}

const ET_LABEL_RULES = [
  [/\bInfrared\b/g, 'Infrapuna'],
]

export function translateLabel(label, lang) {
  if (lang !== 'et' || !label) return label
  let out = label
  for (const [re, rep] of ET_LABEL_RULES) out = out.replace(re, rep)
  return out
}

export function resolveLabel(item, lang) {
  if (!item) return ''
  if (item.labelKey && t[lang]?.[item.labelKey]) return t[lang][item.labelKey]
  return translateLabel(item.label, lang)
}
