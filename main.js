const ACPI_WMI_EXPENSIVE = 0x1
const ACPI_WMI_METHOD = 0x2	/* GUID is a method */
const ACPI_WMI_STRING = 0x4	/* GUID takes & returns a string */
const ACPI_WMI_EVENT = 0x8	/* GUID is an event */

const Flags = {
  ACPI_WMI_EXPENSIVE, ACPI_WMI_METHOD, ACPI_WMI_STRING, ACPI_WMI_EVENT
}

class GuidBlock {
  guid
  object_id
  instance_count
  flags

  constructor(buffer) {
    this.guid = buffer.slice(0, 16)
    this.object_id = buffer.slice(16, 18)
    this.instance_count = buffer[18]
    this.flags = buffer[19]
  }

  getGuid() {
    return `${this.guid[3].toString(16).padStart(2, '0') + this.guid[2].toString(16).padStart(2, '0') + this.guid[1].toString(16).padStart(2, '0') + this.guid[0].toString(16).padStart(2, '0')}-${this.guid[5].toString(16).padStart(2, '0') + this.guid[4].toString(16).padStart(2, '0')}-${this.guid[7].toString(16).padStart(2, '0') + this.guid[6].toString(16).padStart(2, '0')}-${this.guid[8].toString(16).padStart(2, '0') + this.guid[9].toString(16).padStart(2, '0')}-${this.guid.slice(10).map(hex => hex.toString(16).padStart(2, '0')).join('')}`
  }

  getNotifyId() {
    return this.object_id[0].toString(16).padStart(2, '0')
  }

  getReserved() {
    return this.object_id[1].toString(16).padStart(2, '0')
  }

  getInstanceCount() {
    return this.instance_count.toString(16).padStart(2, '0')
  }

  getFlags() {
    const flags = parseInt(this.flags, 16)
    return flags === 0 ? '0x00' : Object.keys(Flags).map(flag => {
      if (flags & Flags[flag]) {
        return `${flag}(0x${Flags[flag].toString(16)})`
      }
    }).filter(v => !!v).join(' | ').padStart(2, '0')
  }

  toString() {
    return `${this.getGuid()}
        \tnotify_id: ${this.getNotifyId()}
        \treserved: ${this.getReserved()}
        \tinstance_count: ${this.getInstanceCount()}
        \tflags: ${this.getFlags()}`
  }
}

function parseHexString(str) {
  var result = [];
  while (str.length >= 8) {
    result.push(parseInt(str.substring(0, 8), 16));

    str = str.substring(8, str.length);
  }

  return result;
}

function readinput(str) {
    const buffer = []
    let comment = false
    let skipLine = false
    let byte = undefined

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '/' && str[i + 1] && str[i + 1] === '*') {
      comment = true
      i++
      continue
    }
    if (str[i] === '*' && str[i + 1] && str[i + 1] === '/') {
      comment = false
      i++
      continue
    }
    if (str[i] === '/' && str[i + 1] && str[i + 1] === '/') {
      skipLine = true
      i++
      continue
    }
    if (comment) {
      continue
    }
    if (skipLine) {
      if (str[i] === '\n') {
        skipLine = false
      }
      continue
    }
    isNum = /^[xXa-fA-F0-9]+$/i.test(str[i])
    if (isNum) {
      byte = byte ? byte + str[i] : str[i]
    }
    if (!isNum || i === str.length - 1){
      if (byte || byte === 0 || byte === '0') {
        buffer.push(parseInt(byte, 16))
        byte = undefined
      } else {
        continue
      }
    }
  }

  return new Uint8Array(buffer)
}

function parsewdgin(wdgs) {
  const rv = []
  var i, j, chunk = 20;
  for (i = 0, j = wdgs.length; i < j; i += chunk) {
    rv.push(wdgs.slice(i, i + chunk))
  }
  return rv.map(wdg => new GuidBlock(wdg))
}

function wdgsubmit(event) {
  event.preventDefault()

  const { wdgin, wdgout } = event.currentTarget
  const wdgs = readinput(wdgin.value)
  const rv = parsewdgin(wdgs).map(wdg => wdg.toString())
  wdgout.value = rv.join('\n')
}

function bmfsubmit(event) {
  event.preventDefault()

  const { bmfin, mofout } = event.currentTarget
  mofout.value = ''
  const bmfbuf = readinput(bmfin.value)

  bmf2mof({
    print: function (text) {
      mofout.value += text + '\n'
    }
  }).then(module => {

    const nByte = 2
    function arrayToPtr(array) {
      var ptr = module._malloc(array.length * nByte)
      module.HEAPU8.set(array, ptr)
      return ptr
    }

    module._parse_data(arrayToPtr(bmfbuf), bmfbuf.length)
  })
}
