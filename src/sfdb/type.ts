export enum SfdbValueFormat {
    UINT8 = 'uint8',
    UINT16 = 'uint16',
    UINT32 = 'uint32',
    UINT64 = 'uint64',
    INT8 = 'int8',
    INT16 = 'int16',
    INT32 = 'int32',
    INT64 = 'int64',
    FLOAT = 'float',
    DOUBLE = 'double',

    //特殊类型（不设置显示类型）
    STRING = 'string', 
    DATE6 = 'date6', // 6 bytes, year(1 byte), month(1 byte), day(1 byte), hour(1 byte), minute(1 byte), second(1 byte)
    UNIXTIME = 'unixtime', // 4 bytes, seconds since 1970-01-01 00:00:00 UTC
}

export enum SfdbDisplayFormat {
    DEC = 'dec',
    HEX = 'hex',
    BIN = 'bin',
}

export type SfdbRecordBaseType = {
    key: number,
    name: string,
    value: string,
    valueFormat: SfdbValueFormat,
    displayFormat: SfdbDisplayFormat,
    decimalPlaces: number,
    littleEndian: boolean,
}
export type SfdbRecordSubType = SfdbRecordBaseType & {
    bitOffset: number,
}
export type SfdbRecordType = SfdbRecordBaseType & {
    byteOffset: number,
    byteLength: number,
    byteLengthCanSet: boolean,
    children: SfdbRecordSubType[]
}
export type SfdbType = {
    valid: boolean,
    head: {
        magic: string,
        recordIdx: number,
        recordCnt: number,
        maxRecordCnt: number,
        recordSize: number,
    },
    records: ArrayBuffer[]
}