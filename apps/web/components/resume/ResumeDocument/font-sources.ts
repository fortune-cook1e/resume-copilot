// Versioned TrueType faces shared by the browser print layout and Forme.
type FontFaces = Record<'400' | '700' | '400italic' | '700italic', string>

export const resumeFontSources = new Map<string, FontFaces>([
  [
    'EB Garamond',
    {
      '400':
        'https://fonts.gstatic.com/s/ebgaramond/v33/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUAw.ttf',
      '700':
        'https://fonts.gstatic.com/s/ebgaramond/v33/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-DPNUAw.ttf',
      '400italic':
        'https://fonts.gstatic.com/s/ebgaramond/v33/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7e8QI96.ttf',
      '700italic':
        'https://fonts.gstatic.com/s/ebgaramond/v33/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7dbR496.ttf',
    },
  ],
  [
    'Tinos',
    {
      '400': 'https://fonts.gstatic.com/s/tinos/v25/buE4poGnedXvwgX8dGVh8TI-.ttf',
      '700': 'https://fonts.gstatic.com/s/tinos/v25/buE1poGnedXvwj1AW0Fp2i43-cxL.ttf',
      '400italic': 'https://fonts.gstatic.com/s/tinos/v25/buE2poGnedXvwjX-fmFD9CI-4NU.ttf',
      '700italic': 'https://fonts.gstatic.com/s/tinos/v25/buEzpoGnedXvwjX-Rt1s0CoV_NxLeiw.ttf',
    },
  ],
  [
    'Source Serif 4',
    {
      '400':
        'https://fonts.gstatic.com/s/sourceserif4/v14/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxXD-wGvjU.ttf',
      '700':
        'https://fonts.gstatic.com/s/sourceserif4/v14/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjivBtrhxXD-wGvjU.ttf',
      '400italic':
        'https://fonts.gstatic.com/s/sourceserif4/v14/vEF02_tTDB4M7-auWDN0ahZJW1ge6NmXpVAHV83Bfb_US2D2QYxoUKIkn98pRl9dC84DrjXEXw.ttf',
      '700italic':
        'https://fonts.gstatic.com/s/sourceserif4/v14/vEF02_tTDB4M7-auWDN0ahZJW1ge6NmXpVAHV83Bfb_US2D2QYxoUKIkn98poVhdC84DrjXEXw.ttf',
    },
  ],
  [
    'Source Sans 3',
    {
      '400':
        'https://fonts.gstatic.com/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky461EN_io6npfB.ttf',
      '700':
        'https://fonts.gstatic.com/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Kxf7FEN_io6npfB.ttf',
      '400italic':
        'https://fonts.gstatic.com/s/sourcesans3/v19/nwpDtKy2OAdR1K-IwhWudF-R3woAa8opPOrG97lwqLlO9C4Ym4fB3Ts.ttf',
      '700italic':
        'https://fonts.gstatic.com/s/sourcesans3/v19/nwpDtKy2OAdR1K-IwhWudF-R3woAa8opPOrG97lwqF5J9C4Ym4fB3Ts.ttf',
    },
  ],
  [
    'Carlito',
    {
      '400': 'https://fonts.gstatic.com/s/carlito/v4/3Jn9SDPw3m-pk039DDeBSQ.ttf',
      '700': 'https://fonts.gstatic.com/s/carlito/v4/3Jn4SDPw3m-pk039BIykWXolVg.ttf',
      '400italic': 'https://fonts.gstatic.com/s/carlito/v4/3Jn_SDPw3m-pk039DDKxTl0F.ttf',
      '700italic': 'https://fonts.gstatic.com/s/carlito/v4/3Jn6SDPw3m-pk039DDK59XgVUcBD.ttf',
    },
  ],
  [
    'Lato',
    {
      '400': 'https://fonts.gstatic.com/s/lato/v25/S6uyw4BMUTPHvxk6XweuBCY.ttf',
      '700': 'https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh6UVew-FGC_p9dw.ttf',
      '400italic': 'https://fonts.gstatic.com/s/lato/v25/S6u8w4BMUTPHjxswWyWrFCbw7A.ttf',
      '700italic': 'https://fonts.gstatic.com/s/lato/v25/S6u_w4BMUTPHjxsI5wqPHA3s5dwt7w.ttf',
    },
  ],
])

export const resumeFontCss = Array.from(resumeFontSources, ([family, faces]) =>
  Object.entries(faces)
    .map(([face, url]) => {
      const style = face.endsWith('italic') ? 'italic' : 'normal'
      const weight = face.startsWith('700') ? '600 900' : '400'
      return `@font-face { font-family: "${family}"; src: url("${url}") format("truetype"); font-weight: ${weight}; font-style: ${style}; font-display: swap; }`
    })
    .join(''),
).join('')
