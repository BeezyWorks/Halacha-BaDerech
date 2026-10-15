import {
  extractTitle,
  gematria,
  htmlToUnit,
  parseGematria,
  parseMarker,
  splitComment,
  splitMb,
} from '../parse'

describe('gematria', () => {
  it('round-trips', () => {
    for (const n of [1, 9, 10, 15, 16, 22, 99, 123, 400, 499, 500, 611, 900]) {
      expect(parseGematria(gematria(n))).toBe(n)
    }
    expect(gematria(15)).toBe('טו')
    expect(gematria(16)).toBe('טז')
    expect(gematria(123)).toBe('קכג')
  })
  it('reads final forms and punctuation', () => {
    expect(parseGematria('י"ך')).toBe(30)
    expect(parseGematria('abc')).toBeNaN()
  })
})

describe('parseMarker', () => {
  it('parses a well-formed marker', () => {
    expect(
      parseMarker(`<i data-commentator="Be'er HaGolah" data-label="א" data-order="1"></i>`),
    ).toEqual({ commentator: "Be'er HaGolah", label: 'א', order: 1 })
    expect(parseMarker('<i data-commentator="Magen Avraham" data-order="12"></i>')).toEqual({
      commentator: 'Magen Avraham',
      order: 12,
    })
  })
  it('tolerates the missing opening quote Sefaria emits for Mishnah Berurah', () => {
    expect(parseMarker('<i data-commentator=Mishnah Berurah" data-label="ב"></i>')).toEqual({
      commentator: 'Mishnah Berurah',
      label: 'ב',
    })
  })
  it('keeps commas and apostrophes in names', () => {
    expect(
      parseMarker('<i data-commentator="Netivot HaMishpat, Hidushim" data-order="3"></i>')
        ?.commentator,
    ).toBe('Netivot HaMishpat, Hidushim')
  })
  it('ignores other tags', () => {
    expect(parseMarker('<i class="footnote">x</i>')).toBeNull()
  })
})

describe('htmlToUnit', () => {
  it('strips tags and records marker offsets before the next word', () => {
    const u = htmlToUnit(
      'א<i data-commentator="Magen Avraham" data-order="1"></i> ב <i data-commentator="Turei Zahav" data-order="2"></i>גדול',
    )
    expect(u.text).toBe('א ב גדול')
    expect(u.markers[0]).toMatchObject({ commentator: 'Magen Avraham', order: 1, at: 1 })
    expect(u.markers[1]).toMatchObject({ commentator: 'Turei Zahav', order: 2, at: 4 })
    expect(u.text.slice(u.markers[1].at)).toBe('גדול')
  })

  it('extracts hagah spans as offsets into the text', () => {
    const u = htmlToUnit(
      'דברי המחבר: <small>הגה <i data-commentator="X" data-order="1"></i>דברי הרמ"א</small>',
    )
    expect(u.text).toBe('דברי המחבר: הגה דברי הרמ"א')
    expect(u.marks).toEqual([{ start: 12, end: u.text.length, kind: 'hagah' }])
    expect(u.text.slice(u.marks[0].start, u.marks[0].end)).toBe('הגה דברי הרמ"א')
  })

  it('keeps small spans that are not a hagah out of marks', () => {
    const u = htmlToUnit('א <small>(טור)</small> ב')
    expect(u.marks).toEqual([])
    expect(u.otherSmall).toEqual(['(טור)'])
  })

  it('closes an unterminated small', () => {
    const u = htmlToUnit('א <small>הגה ב')
    expect(u.marks).toEqual([{ start: 2, end: 7, kind: 'hagah' }])
  })

  it('decodes entities, collapses whitespace and turns br into a newline', () => {
    expect(htmlToUnit('א&nbsp;&nbsp;ב<br>  ג &amp; ד ').text).toBe('א ב\nג & ד')
  })

  it('keeps nikud', () => {
    expect(htmlToUnit("\nשִׁוִּיתִי ה'").text).toBe("שִׁוִּיתִי ה'")
  })
})

describe('extractTitle', () => {
  it('splits the leading bold heading off seif 1', () => {
    expect(
      extractTitle('<b>דין השכמת הבוקר. ובו ט סעיפים:</b><br><i data-commentator="X"></i>יתגבר'),
    ).toEqual({
      title: 'דין השכמת הבוקר. ובו ט סעיפים:',
      rest: '<i data-commentator="X"></i>יתגבר',
    })
  })
  it('leaves other seifim alone', () => {
    expect(extractTitle('יתגבר').title).toBeUndefined()
  })
})

describe('splitComment (dibur hamaschil per format)', () => {
  it('bold: Magen Avraham style', () => {
    expect(splitComment('<b>שיהא הוא מעורר השחר</b>. בשל"ה כתוב סוד: \n', 'bold')).toEqual({
      dh: 'שיהא הוא מעורר השחר',
      text: 'בשל"ה כתוב סוד:',
    })
  })
  it('bold: Biur Halacha style with a dash and leading space', () => {
    expect(splitComment('<b> שיהא הוא מעורר השחר</b> - נכון מאד', 'bold')).toEqual({
      dh: 'שיהא הוא מעורר השחר',
      text: 'נכון מאד',
    })
  })
  it('bold: comment without a bold DH has none', () => {
    expect(splitComment('טור', 'bold')).toEqual({ text: 'טור' })
  })
  it('bold: a DH-only comment keeps it as the text', () => {
    expect(splitComment('<b>טור</b>', 'bold')).toEqual({ text: 'טור' })
  })
  it('boldLocator: Rabbi Akiva Eiger takes the leading locator', () => {
    expect(
      splitComment('(סי\' א\' ש"ך סק"ב) <b>היינו במשוחררים.</b> לפ"ז יקשה', 'boldLocator'),
    ).toEqual({
      dh: 'היינו במשוחררים',
      text: 'לפ"ז יקשה',
      locator: 'סי\' א\' ש"ך סק"ב',
    })
    expect(splitComment('<small>מג"א סק"ה </small>על נהרות בבל. אבל', 'boldLocator')).toEqual({
      text: 'על נהרות בבל. אבל',
      locator: 'מג"א סק"ה',
    })
  })
  it('none: no DH', () => {
    expect(splitComment('<b>x</b> y', 'none')).toEqual({ text: 'x y' })
  })
  it('boldOrPeriod: offers the first sentence as an unconfirmed candidate', () => {
    expect(splitComment('אלא ע"פ העד. ע"ל ס"ס ע"ה בטור', 'boldOrPeriod')).toEqual({
      text: 'אלא ע"פ העד. ע"ל ס"ס ע"ה בטור',
      candidate: { dh: 'אלא ע"פ העד', text: 'ע"ל ס"ס ע"ה בטור' },
    })
  })
})

describe('splitMb (mbDash)', () => {
  it('splits "(א) DH - body", removes the label, keeps the DH inside the text', () => {
    expect(splitMb('(ב) השחר – בשל"ה כתב סוד')).toEqual({
      label: 'ב',
      dh: 'השחר',
      text: 'השחר – בשל"ה כתב סוד',
    })
  })
  it('handles no dash', () => {
    expect(splitMb('(ג) סתם')).toEqual({ label: 'ג', text: 'סתם' })
  })
})
