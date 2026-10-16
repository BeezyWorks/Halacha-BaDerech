import { buildKitzurBundle, buildMbBundle, buildSaBundle, parseBase } from '../bundle'

const mk = (name: string, order: number, label?: string) =>
  `<i data-commentator="${name}" data-order="${order}"${label ? ` data-label="${label}"` : ''}></i>`

const aliases = {
  'Magen Avraham': 'magenAvraham',
  'Turei Zahav': 'tureiZahav',
  'Pithei Teshuva': 'pitcheiTeshuva',
}

describe('buildSaBundle', () => {
  const baseHtml = [
    `<b>דין כלשהו. ובו שני סעיפים:</b><br>${mk('Turei Zahav', 1)}יתגבר ${mk('Magen Avraham', 1)}כארי לעמוד ${mk('Unknown Person', 1)}בבוקר: <small>הגה ${mk('Magen Avraham', 2)}ועכ"פ לא יאחר</small>`,
    `${mk('Magen Avraham', 3)}שיהא הוא מעורר השחר`,
  ]
  const works = [
    {
      id: 'magenAvraham',
      unit: 'sk' as const,
      dh: 'bold' as const,
      text: ['<b>כארי</b>. ראשון', '<b>ועכ"פ</b>. שני', '<b>שיהא הוא מעורר</b>. שלישי'],
    },
    { id: 'tureiZahav', unit: 'sk' as const, dh: 'bold' as const, text: ['<b>יתגבר כארי.</b> טז'] },
    {
      id: 'rabbiAkivaEiger',
      unit: 'link' as const,
      dh: 'boldLocator' as const,
      text: ['<small>ס"א </small>הגה ועכ"פ לא יאחר זמן'],
    },
  ]
  const input = { sefer: 'oc', siman: 1, baseHtml, works, aliases, ignoredMarkers: [] }

  it('splits the title, anchors markers to comments, finds DH ends', () => {
    const { bundle, stats } = buildSaBundle({ ...input, linkSeif: { rabbiAkivaEiger: { 1: 1 } } })
    expect(bundle.title).toBe('דין כלשהו. ובו שני סעיפים:')
    expect(bundle.seifim.map((u) => u.n)).toEqual([1, 2])
    const u1 = bundle.seifim[0]
    expect(u1.text).toBe('יתגבר כארי לעמוד בבוקר: הגה ועכ"פ לא יאחר')
    expect(u1.marks).toEqual([{ start: 24, end: u1.text.length, kind: 'hagah' }])
    const ma = u1.anchors!.filter((a) => a.work === 'magenAvraham')
    expect(ma.map((a) => [a.sk, u1.text.slice(a.at, a.end)])).toEqual([
      [1, 'כארי'],
      [2, 'ועכ"פ'],
    ])
    expect(bundle.seifim[1].anchors).toEqual([
      { at: 0, end: 'שיהא הוא מעורר'.length, work: 'magenAvraham', sk: 3 },
    ])
    expect(stats.unmappedNames).toEqual(['Unknown Person'])
    expect(stats.markersMapped).toBe(4)
  })

  it('places comments by marker, dh removed from the text', () => {
    const { bundle } = buildSaBundle({ ...input, linkSeif: { rabbiAkivaEiger: { 1: 1 } } })
    expect(bundle.commentary.magenAvraham).toEqual([
      { seif: 1, sk: 1, label: 'א', dh: 'כארי', text: 'ראשון' },
      { seif: 1, sk: 2, label: 'ב', dh: 'ועכ"פ', text: 'שני' },
      { seif: 2, sk: 3, label: 'ג', dh: 'שיהא הוא מעורר', text: 'שלישי' },
    ])
  })

  it('places link-mode works via links and anchors them by DH search; reports needsLinks without them', () => {
    expect(buildSaBundle(input).needsLinks).toBe(true)
    const { bundle, needsLinks } = buildSaBundle({
      ...input,
      linkSeif: { rabbiAkivaEiger: { 1: 1 } },
    })
    expect(needsLinks).toBe(false)
    expect(bundle.commentary.rabbiAkivaEiger).toEqual([
      { seif: 1, sk: 1, label: 'ס"א', text: 'הגה ועכ"פ לא יאחר זמן' },
    ])
  })

  it('omits works without content', () => {
    const { bundle } = buildSaBundle({ ...input, works: [] })
    expect(bundle.commentary).toEqual({})
  })
})

describe('parseBase', () => {
  it('reads seifim without a heading', () => {
    expect(parseBase(['א', 'ב']).title).toBeUndefined()
  })
})

describe('buildMbBundle', () => {
  const mbMarker = (label: string) =>
    `<i data-commentator=Mishnah Berurah" data-label="${label}"></i>`
  it('groups seifim katanim by SA seif and anchors them', () => {
    const { bundle } = buildMbBundle({
      siman: 187,
      baseHtml: [
        `<b>כותרת. ובו שני סעיפים:</b><br>${mbMarker('א')}יש אומרים ברוך ${mbMarker('ב')}משביע לרעבים`,
        `${mbMarker('ג')}אין לאומרו`,
      ],
      mbText: ['(א) יש אומרים - ביאור', '(ב) משביע - עוד', '(ג) אין לאומרו - סוף'],
      bhText: [['<b>משביע לרעבים</b> - ביאור הלכה']],
    })
    expect(bundle.sefer).toBe('mb')
    expect(bundle.seifim).toEqual([
      { n: 1, text: 'יש אומרים - ביאור', saSeif: 1, dh: 'יש אומרים' },
      { n: 2, text: 'משביע - עוד', saSeif: 1, dh: 'משביע' },
      { n: 3, text: 'אין לאומרו - סוף', saSeif: 2, dh: 'אין לאומרו' },
    ])
    expect(bundle.base).toHaveLength(2)
    expect(bundle.base![0].anchors!.filter((a) => a.work === 'mb')).toHaveLength(2)
    expect(bundle.commentary.biurHalacha).toEqual([
      { seif: 1, sk: 1, label: 'א', dh: 'משביע לרעבים', text: 'ביאור הלכה' },
    ])
    expect(bundle.base![0].anchors!.find((a) => a.work === 'biurHalacha')).toMatchObject({
      work: 'biurHalacha',
      sk: 1,
    })
  })
})

describe('buildMbBundle with Wikisource text and Biur Halacha only', () => {
  const mbMarker = (label: string) =>
    `<i data-commentator=Mishnah Berurah" data-label="${label}"></i>`
  it('anchors the "(א) DH – body" format (en dash)', () => {
    const { bundle, stats } = buildMbBundle({
      siman: 1,
      baseHtml: [`<b>כותרת:</b><br>יתגבר ${mbMarker('א')}כארי לעמוד בבוקר`],
      mbText: ['(א) כארי – כי לכך נברא האדם, כמו שאמר הכתוב: "כל הנקרא בשמי"'],
      bhText: null,
    })
    expect(bundle.seifim[0]).toMatchObject({ n: 1, saSeif: 1, dh: 'כארי' })
    expect(bundle.seifim[0].text).toMatch(/^כארי – כי/)
    expect(stats.anchorsWithEnd).toBe(1)
  })
  it('makes a bundle of only the base and Biur Halacha when the MB text is missing', () => {
    const { bundle } = buildMbBundle({
      siman: 3,
      baseHtml: ['יברך על ידיו'],
      mbText: [],
      bhText: [['<b>יברך</b> - ביאור']],
    })
    expect(bundle.seifim).toEqual([])
    expect(bundle.base).toHaveLength(1)
    expect(bundle.commentary.biurHalacha).toHaveLength(1)
    expect(bundle.base![0].anchors).toHaveLength(1)
  })
})

describe('buildKitzurBundle', () => {
  it('keeps nikud, no commentary', () => {
    const b = buildKitzurBundle(1, ["\nשִׁוִּיתִי ה' לְנֶגְדִּי", ''], 'דיני השכמה')
    expect(b).toEqual({
      sefer: 'kitzur',
      siman: 1,
      title: 'דיני השכמה',
      seifim: [{ n: 1, text: "שִׁוִּיתִי ה' לְנֶגְדִּי" }],
      commentary: {},
    })
  })
})
