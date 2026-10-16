import { buildMbBundle } from '../bundle'
import { parseWikisourceMb, wikisourceMbTitle, wikisourcePageTitle } from '../wikisource'

// Real snippet of משנה ברורה על אורח חיים ג (linked headers; a bold DH continuation;
// two seifim katanim in one seif; <ref>, a link and a category to strip).
const SIMAN_3 = `{{פרשן על שו"ע|משנה ברורה|אורח חיים|ב|ג|ד}}
===[[שולחן ערוך אורח חיים ג א|סעיף א]]===
<קטע התחלה=א/>

{{משע|מב|א|ועכשיו}} '''וכו' '''– כי אין אנו מוחזקין ליראי שמים שמלאכים מלווין אותנו.<קטע סוף=א/>
===[[שולחן ערוך אורח חיים ג ב|סעיף ב]]===
<קטע התחלה=ב/>
{{משע|מב|ב|עד שישב}} – והוא הדין שלא יקום כשהוא מגולה<ref>הערה</ref>.

{{משע|מב|ג|ולא ילכו}} - ואם מפחד, ראה [[#(ד)|בס"ק ד']] ו[[שולחן ערוך אורח חיים צא|סימן צ"א]].
שורה שניה באותה פסקה.<br />
פסקה חדשה.<קטע סוף=ב/>

----
<references />
[[קטגוריה:משנה ברורה]]`

describe('parseWikisourceMb', () => {
  const { units, warnings, prefaces, appendices } = parseWikisourceMb(SIMAN_3)

  it('reads seif katan numbers, the SA seif from the header, and the DH', () => {
    expect(units.map((u) => [u.n, u.saSeif])).toEqual([
      [1, 1],
      [2, 2],
      [3, 2],
    ])
    expect(units[1]).toEqual({
      n: 2,
      saSeif: 2,
      dh: 'עד שישב',
      text: 'עד שישב – והוא הדין שלא יקום כשהוא מגולה.',
    })
    expect(warnings).toEqual([])
    expect(prefaces).toEqual([])
    expect(appendices).toEqual([])
  })

  it('joins a bold DH continuation to the template DH', () => {
    expect(units[0].dh).toBe("ועכשיו וכו'")
    expect(units[0].text.startsWith("ועכשיו וכו' – כי אין")).toBe(true)
  })

  it("keeps the apostrophe of a bold DH ending in וכו'", () => {
    const r = parseWikisourceMb("==סעיף א==\n{{משע|מב|א|אחר שלבש}} '''וכו'''' - ואפילו אם הטלית")
    expect(r.units[0].dh).toBe("אחר שלבש וכו'")
    expect(r.units[0].text).toBe("אחר שלבש וכו' – ואפילו אם הטלית")
  })

  it('flattens links, wraps, paragraphs and footers', () => {
    expect(units[2].text).toBe(
      'ולא ילכו – ואם מפחד, ראה בס"ק ד\' וסימן צ"א. שורה שניה באותה פסקה.\nפסקה חדשה.',
    )
    expect(units.map((u) => u.text).join('')).not.toMatch(/קטגוריה|references|\[\[|\{\{|<קטע/)
  })

  it('accepts plain headers, level-2 headers and pages that have only <קטע> markers', () => {
    const plain = parseWikisourceMb(
      `==סימן לו==\n==סעיף א==\n<קטע התחלה=א/>{{משע|מב|א|אחד}} - גוף\n===סעיף ב===\n{{משע|מב|ב|שנים}} - עוד\n{{משע|מב|ג|שלשה}} - ועוד`,
    )
    expect(plain.units.map((u) => [u.n, u.saSeif])).toEqual([
      [1, 1],
      [2, 2],
      [3, 2],
    ])
    const bare = parseWikisourceMb(
      `<קטע התחלה=א/>\n{{משע|מב|א|עראי}} - גזרינן\n<קטע סוף=א/>\n<קטע התחלה=ב/>\n{{משע|מב|ב|עמו}} - אבל`,
    )
    expect(bare.units.map((u) => [u.n, u.saSeif])).toEqual([
      [1, 1],
      [2, 2],
    ])
  })

  it('handles the minor templates', () => {
    const r = parseWikisourceMb(
      `===סעיף א===\n{{משע|מב|טו|שהוא חייב:}}{{ררר}} שהם שבעה {{צ|ולא תתורו}} ו{{ב|ת"ג|תנועה גדולה}} {{מקור|מנחות קי א|מנחות קי.}} {{ממ רמב"ם|יב|תפילה|}} {{קטן|[נמנע]}}`,
    )
    expect(r.units).toEqual([
      {
        n: 15,
        saSeif: 1,
        dh: 'שהוא חייב',
        text: 'שהוא חייב – שהם שבעה ולא תתורו ות"ג מנחות קי. [נמנע]',
      },
    ])
    expect(r.warnings).toEqual([])
  })

  it('reports unknown templates, and keeps unnumbered text and appendices apart', () => {
    const r = parseWikisourceMb(
      `===סעיף א===\nהקדמה ארוכה של המשנה ברורה לפני הסימן הראשון {{מוזר|x}}\n\n{{משע|מב|א|דבר}} - טקסט\n==משנת סופרים==\nטקסט נוסף ארוך מאוד שאינו חלק מהסעיפים`,
    )
    expect(r.warnings).toEqual(['unknown template {{מוזר}}'])
    expect(r.prefaces).toEqual([
      { saSeif: 1, text: 'הקדמה ארוכה של המשנה ברורה לפני הסימן הראשון' },
    ])
    expect(r.units.map((u) => u.n)).toEqual([0, 1])
    expect(r.appendices).toEqual(['משנת סופרים'])
  })

  it('names pages by Hebrew numeral', () => {
    expect(wikisourceMbTitle(118)).toBe('משנה ברורה על אורח חיים קיח')
    expect(wikisourcePageTitle('משנה ברורה על אורח חיים {siman}', 588)).toBe(
      'משנה ברורה על אורח חיים תקפח',
    )
  })
})

describe('buildMbBundle with Wikisource seifim katanim', () => {
  const mk = (n: number, label: string) =>
    `<i data-commentator="Mishnah Berurah" data-order="${n}" data-label="${label}"></i>`
  const baseHtml = [
    `<b>דין. ובו שני סעיפים:</b><br>${mk(1, 'א')}ועכשיו אין אנו`,
    `${mk(2, 'ב')}עד שישב והוא ${mk(3, 'ג')}ולא ילכו`,
  ]
  const { units } = parseWikisourceMb(SIMAN_3)

  it('anchors by the OC markers and reports an aligned siman', () => {
    const { bundle, stats } = buildMbBundle({ siman: 3, baseHtml, mbUnits: units, bhText: null })
    expect(bundle.seifim.map((u) => [u.n, u.saSeif])).toEqual([
      [1, 1],
      [2, 2],
      [3, 2],
    ])
    expect(bundle.base?.[1].anchors?.map((a) => [a.sk, a.end !== undefined])).toEqual([
      [2, true],
      [3, true],
    ])
    expect(stats.mbSkNoMarker).toBe(0)
    expect(stats.mbMarkerNoSk).toBe(0)
    expect(stats.mbSeifDisagree ?? 0).toBe(0)
  })

  it('lets the OC marker win over a misfiled header, and reports gaps', () => {
    const skewed = units.map((u) => (u.n === 3 ? { ...u, saSeif: 1 } : u)).filter((u) => u.n !== 2)
    const { bundle, stats } = buildMbBundle({ siman: 3, baseHtml, mbUnits: skewed, bhText: null })
    expect(bundle.seifim.find((u) => u.n === 3)?.saSeif).toBe(2)
    expect(stats.mbSeifDisagree).toBe(1)
    expect(stats.mbMarkerNoSk).toBe(1)
    expect(stats.alignment?.markerNoText).toEqual(['ב'])
  })
})
