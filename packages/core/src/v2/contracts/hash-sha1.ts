/**
 * Sync SHA-1 hex digest that works in both Node and browsers.
 * Must match `createHash('sha1').update(utf8).digest('hex')` so scopeKey
 * stays stable across Producer / Store / GUI.
 */
export function sha1Hex(utf8: string): string {
  const bytes = utf8ToBytes(utf8);
  const words = bytesToWords(bytes);
  const bitLength = bytes.length * 8;
  words[bitLength >> 5] = (words[bitLength >> 5] ?? 0) | (0x80 << (24 - (bitLength % 32)));
  words[(((bitLength + 64) >>> 9) << 4) + 15] = bitLength;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Array<number>(80);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t += 1) w[t] = words[i + t] ?? 0;
    for (let t = 16; t < 80; t += 1) {
      w[t] = rotateLeft((w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!) >>> 0, 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let t = 0; t < 80; t += 1) {
      const [f, k] =
        t < 20
          ? [(b & c) | (~b & d), 0x5a827999]
          : t < 40
            ? [b ^ c ^ d, 0x6ed9eba1]
            : t < 60
              ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc]
              : [b ^ c ^ d, 0xca62c1d6];
      const temp = (rotateLeft(a, 5) + f + e + k + w[t]!) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4].map(wordToHex).join('');
}

function utf8ToBytes(value: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      i + 1 < value.length
    ) {
      const low = value.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i += 1;
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
        continue;
      }
      bytes.push(0xef, 0xbf, 0xbd);
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function bytesToWords(bytes: number[]): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] =
      (words[i >> 2] ?? 0) | ((bytes[i]! & 0xff) << (24 - (i % 4) * 8));
  }
  return words;
}

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function wordToHex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}
