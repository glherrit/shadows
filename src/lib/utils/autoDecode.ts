// inspired by https://github.com/gignupg/Detect-File-Encoding-and-Language/blob/main/src/index-browser.js
// to only have the detect encoding part and to work directly on arraybuffers instead of file/blob

const byteOrderMarks = [
  {
    encoding: 'UTF-EBCDIC',
    regex: new RegExp('221 115 102 115'),
  },
  {
    encoding: 'GB-18030',
    regex: new RegExp('132 49 149 51'),
  },
  {
    encoding: 'UTF-32LE',
    regex: new RegExp('255 254 0 0'),
  },
  {
    encoding: 'UTF-32BE',
    regex: new RegExp('0 0 254 255'),
  },
  {
    encoding: 'UTF-8',
    regex: new RegExp('239 187 191'),
  },
  {
    encoding: 'UTF-7',
    regex: new RegExp('43 47 118'),
  },
  {
    encoding: 'UTF-1',
    regex: new RegExp('247 100 76'),
  },
  {
    encoding: 'SCSU',
    regex: new RegExp('14 254 255'),
  },
  {
    encoding: 'BOCU-1',
    regex: new RegExp('251 238 40'),
  },
  {
    encoding: 'UTF-16BE',
    regex: new RegExp('254 255'),
  },
  {
    encoding: 'UTF-16LE',
    regex: new RegExp('255 254'),
  },
]

function encodingFromByteOrderMark(uInt8Start: string) {
  for (const element of byteOrderMarks) {
    if (element.regex.test(uInt8Start)) return element.encoding
  }

  return null
}

function isGoodLookingUTF(content: string) {
  for (let b = 0; b < content.length; b++) {
    // If ? is encountered it's definitely not utf8!
    if (content[b] === '�') {
      return false
    }
  }
  return true
}

export default function autoDecode(buffer: ArrayBuffer) {
  // check for byte order mark first as encoding indicator
  const uInt8String = new Uint8Array(buffer).slice(0, 4).join(' ')
  let encoding = encodingFromByteOrderMark(uInt8String)
  let data: string

  if (encoding) {
    const textDecoder = new TextDecoder(encoding)
    data = textDecoder.decode(buffer)
  } else {
    encoding = 'UTF-8'
    const utf8decoder = new TextDecoder(encoding)
    data = utf8decoder.decode(buffer)

    if (!isGoodLookingUTF(data)) {
      encoding = 'ISO-8859-1'
      const isoDecoder = new TextDecoder(encoding)
      data = isoDecoder.decode(buffer)
    }
  }
  return { encoding, data: data.trim() }
}
