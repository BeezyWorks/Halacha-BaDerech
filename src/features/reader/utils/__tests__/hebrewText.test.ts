import { stripTaamim } from '../hebrewText'

describe('stripTaamim', () => {
  it('keeps nikud and sof pasuk, drops cantillation', () => {
    expect(stripTaamim('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃')).toBe(
      'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃',
    )
  })

  it('drops paseq and keeps maqaf', () => {
    expect(stripTaamim('וּלְכֹ֣ל ׀ רוֹמֵ֣שׂ עַל־הָאָ֗רֶץ')).toBe('וּלְכֹל רוֹמֵשׂ עַל־הָאָרֶץ')
  })
})
