import { createHash } from 'crypto';

function calcLength(a: number, b: number, c: number, d: number) {
  let length = 0;
  length += a << 0;
  length += b << 8;
  length += c << 16;
  length += (d << 24) >>> 0;
  return length;
}

function getBinaryString(
  bytesView: Buffer,
  startOffset: number,
  endOffset: number,
) {
  let binaryString = '';
  for (let i = startOffset; i < endOffset; ++i) {
    binaryString += String.fromCharCode(bytesView[i]);
  }
  return binaryString;
}

function getPublicKeyFromProtoBuf(
  bytesView: Buffer,
  startOffset: number,
  endOffset: number,
) {
  function getvarint() {
    let val = bytesView[startOffset] & 0x7f;
    if (bytesView[startOffset++] < 0x80) return val;
    val |= (bytesView[startOffset] & 0x7f) << 7;
    if (bytesView[startOffset++] < 0x80) return val;
    val |= (bytesView[startOffset] & 0x7f) << 14;
    if (bytesView[startOffset++] < 0x80) return val;
    val |= (bytesView[startOffset] & 0x7f) << 21;
    if (bytesView[startOffset++] < 0x80) return val;
    val = (val | ((bytesView[startOffset] & 0xf) << 28)) >>> 0;
    if (bytesView[startOffset++] & 0x80) console.warn('proto: not a uint32');
    return val;
  }

  const publicKeys: string[] = [];
  let crxIdBin: Buffer | undefined;
  while (startOffset < endOffset) {
    const key = getvarint();
    const length = getvarint();
    if (key === 80002) {
      const sigdatakey = getvarint();
      const sigdatalen = getvarint();
      if (sigdatakey !== 0xa) {
        console.warn(
          'proto: Unexpected key in signed_header_data: ' + sigdatakey,
        );
      } else if (sigdatalen !== 16) {
        console.warn('proto: Unexpected signed_header_data length ' + length);
      } else if (crxIdBin) {
        console.warn('proto: Unexpected duplicate signed_header_data');
      } else {
        crxIdBin = bytesView.subarray(startOffset, startOffset + 16);
      }
      startOffset += sigdatalen;
      continue;
    }
    if (key !== 0x12) {
      if (key != 0x1a) {
        console.warn('proto: Unexpected key: ' + key);
      }
      startOffset += length;
      continue;
    }

    const keyproofend = startOffset + length;
    let keyproofkey = getvarint();
    let keyprooflength = getvarint();

    if (keyproofkey === 0x12) {
      startOffset += keyprooflength;
      if (startOffset >= keyproofend) {
        continue;
      }
      keyproofkey = getvarint();
      keyprooflength = getvarint();
    }
    if (keyproofkey !== 0xa) {
      startOffset += keyprooflength;
      console.warn(
        'proto: Unexpected key in AsymmetricKeyProof: ' + keyproofkey,
      );
      continue;
    }
    if (startOffset + keyprooflength > endOffset) {
      console.warn('proto: size of public_key field is too large');
      break;
    }

    publicKeys.push(
      getBinaryString(bytesView, startOffset, startOffset + keyprooflength),
    );
    startOffset = keyproofend;
  }
  if (!publicKeys.length) {
    console.warn('proto: Did not find any public key');
    return null;
  }
  if (!crxIdBin) {
    console.warn('proto: Did not find crx_id');
    return null;
  }
  const crxIdHex = Buffer.from(
    getBinaryString(crxIdBin, 0, 16),
    'binary',
  ).toString('hex');

  for (let i = 0; i < publicKeys.length; ++i) {
    const publicKeyBin = Buffer.from(publicKeys[i], 'binary');
    const sha256sum = createHash('sha256').update(publicKeyBin).digest('hex');

    if (sha256sum.slice(0, 32) === crxIdHex) {
      return publicKeyBin;
    }
  }
  console.warn('proto: None of the public keys matched with crx_id');

  return null;
}

export const parseCrx = (buf: Buffer) => {
  if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) {
    return { zip: buf };
  }

  if (buf[0] !== 67 || buf[1] !== 114 || buf[2] !== 50 || buf[3] !== 52) {
    throw new Error('Invalid header: Does not start with Cr24');
  }

  if ((buf[4] !== 2 && buf[4] !== 3) || buf[5] || buf[6] || buf[7]) {
    throw new Error('Unexpected crx format version number.');
  }

  let zipStartOffset;
  let publicKeyLength;
  let signatureLength;
  let publicKey;

  if (buf[4] === 2) {
    publicKeyLength = calcLength(buf[8], buf[9], buf[10], buf[11]);
    signatureLength = calcLength(buf[12], buf[13], buf[14], buf[15]);

    zipStartOffset = 16 + publicKeyLength + signatureLength;

    publicKey = Buffer.from(
      getBinaryString(buf, 16, 16 + publicKeyLength),
      'binary',
    );
  } else if (buf[4] === 3) {
    const crx3HeaderLength = calcLength(buf[8], buf[9], buf[10], buf[11]);

    zipStartOffset = 12 + crx3HeaderLength;

    publicKey = getPublicKeyFromProtoBuf(buf, 12, zipStartOffset);
  }

  const crxId = createHash('sha256')
    .update(publicKey)
    .digest('hex')
    .split('')
    .map((x) => (parseInt(x, 16) + 0x0a).toString(26))
    .join('')
    .slice(0, 32);

  zipStartOffset = 16 + publicKeyLength + signatureLength;

  return { zip: buf.slice(zipStartOffset, buf.length), id: crxId, publicKey };
};
