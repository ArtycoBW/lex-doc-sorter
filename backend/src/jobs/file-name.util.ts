const UTF8_MOJIBAKE_PATTERN =
  /[\u00c2\u00c3\u00d0\u00d1][\u0080-\u00bf]|\u00e2[\u0080-\u00bf]/;

export function decodePossiblyMojibakeFileName(name: string) {
  if (!UTF8_MOJIBAKE_PATTERN.test(name)) {
    return name;
  }

  const decoded = Buffer.from(name, 'latin1').toString('utf8');

  return decoded.includes('\uFFFD') ? name : decoded;
}
