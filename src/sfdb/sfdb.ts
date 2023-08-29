import { SfdbDisplayFormat, SfdbRecordType, SfdbValueFormat } from './type';

export * from './type'


function _num2Str(num: number, format: SfdbDisplayFormat): string {
    let str = ''
    switch (format) {
        case SfdbDisplayFormat.DEC:
            str = num.toString(10)
            break
        case SfdbDisplayFormat.HEX:
            str = num.toString(16).toUpperCase() + 'H'
            break
        case SfdbDisplayFormat.BIN:
            str = num.toString(2) + 'b'
            break
        default:
            str = num.toString(10)
            break
    }
    return str
}

export function sfdbDataDecode(buffer: ArrayBuffer, cfg: SfdbRecordType): boolean {
    let ret = true
    switch (cfg.valueFormat) {
        case SfdbValueFormat.UINT8:
            _sfdbUint8Decode(buffer, cfg)
            break
        case SfdbValueFormat.UINT16:
            _sfdbUint16Decode(buffer, cfg)
            break
        case SfdbValueFormat.UINT32:
            _sfdbUint32Decode(buffer, cfg)
            break
        case SfdbValueFormat.UINT64:
            _sfdbUint64Decode(buffer, cfg)
            break
        case SfdbValueFormat.INT8:
            _sfdbInt8Decode(buffer, cfg)
            break
        case SfdbValueFormat.INT16:
            _sfdbInt16Decode(buffer, cfg)
            break
        case SfdbValueFormat.INT32:
            _sfdbInt32Decode(buffer, cfg)
            break
        case SfdbValueFormat.INT64:
            _sfdbInt64Decode(buffer, cfg)
            break
        case SfdbValueFormat.FLOAT:
            _sfdbFloat32Decode(buffer, cfg)
            break
        case SfdbValueFormat.DOUBLE:
            _sfdbFloat64Decode(buffer, cfg)
            break
        case SfdbValueFormat.STRING:
            _sfdbStringDecode(buffer, cfg)
            break
        case SfdbValueFormat.DATE6:
            _sfdbDate6Decode(buffer, cfg)
            break
        case SfdbValueFormat.UNIXTIME:
            _sfdbUnixtimeDecode(buffer, cfg)
            break
        default:
            console.error(`sfdbDataDecode: unknown valueFormat: ${cfg.valueFormat}`)
            ret = false
            break
    }
    return ret
}

export function sfdbDataLenGetByValueFormat(format: SfdbValueFormat): number {
    let len = 0
    switch (format) {
        case SfdbValueFormat.UINT8:
        case SfdbValueFormat.INT8:
            len = 1
            break
        case SfdbValueFormat.UINT16:
        case SfdbValueFormat.INT16:
            len = 2
            break
        case SfdbValueFormat.UINT32:
        case SfdbValueFormat.INT32:
        case SfdbValueFormat.FLOAT:
            len = 4
            break
        case SfdbValueFormat.UINT64:
        case SfdbValueFormat.INT64:
        case SfdbValueFormat.DOUBLE:
            len = 8
            break
        case SfdbValueFormat.STRING:
            len = 0
            break
        case SfdbValueFormat.DATE6:
            len = 6
            break
        case SfdbValueFormat.UNIXTIME:
            len = 4
            break
        default:
            len = 0
            console.warn(`sfdbDataLenGetByValueFormat: unknown valueFormat: ${format}`)
            break
    }
    return len
}

export function sfdbDispFormatShow(vf: SfdbValueFormat): boolean {
    let show = true

    switch (vf) {
        case SfdbValueFormat.STRING:
        case SfdbValueFormat.DATE6:
        case SfdbValueFormat.UNIXTIME:
            show = false
            break
    }

    return show
}

export function sfdbLittleEndianShow(vf: SfdbValueFormat): boolean {
    let show = true

    switch (vf) {
        case SfdbValueFormat.STRING:
        case SfdbValueFormat.DATE6:
            show = false
            break
    }

    return show
}

function _float2Str(num: number, decimalPlaces: number): string {
    let str = ''
    str = num.toFixed(decimalPlaces)
    return str
}

function _sfdbUint8Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getUint8(cfg.byteOffset)
    cfg.value = _num2Str(value, cfg.displayFormat)
}

function _sfdbUint16Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getUint16(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _num2Str(value, cfg.displayFormat)
}

function _sfdbUint32Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getUint32(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _num2Str(value, cfg.displayFormat)
}

function _sfdbUint64Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getBigInt64(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _num2Str(Number(value), cfg.displayFormat)
}

function _sfdbInt8Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getInt8(cfg.byteOffset)
    cfg.value = _num2Str(value, cfg.displayFormat)
}

function _sfdbInt16Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getInt16(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _num2Str(value, cfg.displayFormat)
}

function _sfdbInt32Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getInt32(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _num2Str(value, cfg.displayFormat)
}

function _sfdbInt64Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getBigInt64(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _num2Str(Number(value), cfg.displayFormat)
}

function _sfdbFloat32Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getFloat32(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _float2Str(value, cfg.decimalPlaces)
}

function _sfdbFloat64Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getFloat64(cfg.byteOffset, cfg.littleEndian)
    cfg.value = _float2Str(value, cfg.decimalPlaces)
}

function _sfdbStringDecode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new TextDecoder().decode(buffer.slice(cfg.byteOffset, cfg.byteOffset + cfg.byteLength))
    cfg.value = value.replace(/\0/g, '')
}

function _sfdbDate6Decode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let year = new DataView(buffer).getUint8(cfg.byteOffset)
    let month = new DataView(buffer).getUint8(cfg.byteOffset + 1)
    let day = new DataView(buffer).getUint8(cfg.byteOffset + 2)
    let hour = new DataView(buffer).getUint8(cfg.byteOffset + 3)
    let minute = new DataView(buffer).getUint8(cfg.byteOffset + 4)
    let second = new DataView(buffer).getUint8(cfg.byteOffset + 5)
    cfg.value = `${2000 + year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
}

function _sfdbUnixtimeDecode(buffer: ArrayBuffer, cfg: SfdbRecordType) {
    let value = new DataView(buffer).getUint32(cfg.byteOffset, cfg.littleEndian)
    //unix ts to  yyyy-mm-dd hh:mm:ss
    cfg.value = new Date(value * 1000).toLocaleString()
}
