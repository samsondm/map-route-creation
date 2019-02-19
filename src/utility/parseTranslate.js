const arrayToRegExp = (array) => new RegExp(array.map(r => r.source).join(''));

export default function parseTranslate(transform) {
  const translatePropsRgx = new RegExp(
    `(` +      // opening of capturing parentesis for props
    `\\s*` +    // preceding white space
    `-?` +     // sign
    `(` + // opening capturing parentesis for length
    `((?!0)\\d+(?:\\.\\d+)?|0?\\.\\d+|)` + // not 0 number
    `px{1}` + // unit
    `|` + // or
    `0(px)?` + // 0
    `)` + // closing capturing parentesis for length
    `\\s*` +    // subsequent white space
    `,?` +     // comma
    `)` +      // closing of capturing parentesis for props
    `{1,3}`   // number of props
  );
  const translateRgx = arrayToRegExp([
    /translate/,    // translate
    /(3d|[XYZ])?/,  // type
    /\(/,           // opening parentesis
    translatePropsRgx,
    /\)$/           // closing parentesis
  ]);
  const valid = translateRgx.test(transform);
  if (!valid) return null;
  let x = 0,
    y = 0,
    z = 0;
  const type = transform.match(/(?:3d|[XYZ])?(?=\()/)[0];
  const match = transform.match(/-?(\d+(?:\.\d+)?|\.\d+)(?!d)/g);
  if (type === 'X') {
    if (match.length !== 1) return null;
    x = match[0];
  } else if (type === 'Y') {
    if (match.length !== 1) return null;
    y = match[0];
  } else if (type === 'Z') {
    if (match.length !== 1) return null;
    z = match[0];
  } else {
    if (type === '' && match.length > 2) return null;
    z = match[0];
    ({ 0: x = 0, 1: y = 0, 2: z = 0 } = match);
  }
  return { x: +x, y: +y, z: +z };
}