const form = document.getElementById('form')

form.addEventListener('submit', submit)

const ACPI_WMI_EXPENSIVE   = 0x1
const ACPI_WMI_METHOD      = 0x2	/* GUID is a method */
const ACPI_WMI_STRING      = 0x4	/* GUID takes & returns a string */
const ACPI_WMI_EVENT       = 0x8	/* GUID is an event */

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
        return `${this.guid[3].toString(16).padStart(2, '0')+this.guid[2].toString(16).padStart(2, '0')+this.guid[1].toString(16).padStart(2, '0')+this.guid[0].toString(16).padStart(2, '0')}-${this.guid[5].toString(16).padStart(2, '0')+this.guid[4].toString(16).padStart(2, '0')}-${this.guid[7].toString(16).padStart(2, '0')+this.guid[6].toString(16).padStart(2, '0')}-${this.guid[8].toString(16).padStart(2, '0')+this.guid[9].toString(16).padStart(2, '0')}-${this.guid.slice(10).map(hex => hex.toString(16).padStart(2, '0')).join('')}`
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
        return this.flags.toString(16).padStart(2, '0')
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

function readwdgin(str) {
    const buffer = []
    let comment = false
    let skipLine = false
    let byte = undefined

    for(let i = 0; i < str.length; i++) {
        // console.log(byte, str[i])
        if (str[i] === '/' && str[i+1] && str[i+1] === '*') {
            comment = true
            i++
            continue
        }
        if (str[i] === '*' && str[i+1] && str[i+1] === '/') {
            comment = false
            i++
            continue
        }
        if (str[i] === '/' && str[i+1] && str[i+1] === '/') {
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
        if (!/^[a-zA-Z0-9]+$/i.test(str[i]) || i === str.length - 1) {
            console.log('non alnum', str[i])
            if (byte || byte === 0 || byte === '0') {
                console.log('byte', byte)
                buffer.push(parseInt(byte, 16))
                byte = undefined
            } else {
                continue
            }
        } else {
            console.log('alnum', str[i])
            byte = byte ? byte + str[i] : str[i]
        }
    }

    return buffer
}

function parsewdgin(wdgs) {
    const rv = []
    var i,j,chunk = 20;
    for (i=0,j=wdgs.length; i<j; i+=chunk) {
        rv.push(wdgs.slice(i,i+chunk))
    }
    return rv.map(wdg => new GuidBlock(wdg))
}

function submit(event) {
    event.preventDefault()

    const { wdgin, wdgout } = event.currentTarget
    const wdgs = readwdgin(wdgin.value)
    console.log(wdgs)
    const rv = parsewdgin(wdgs).map(wdg => wdg.toString())
    wdgout.value = rv.join('\n')
}