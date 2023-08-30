<template>
    <a-config-provider prefixCls='sfdb'>
        <div class=" head">
            <a-menu mode="horizontal" :items="menuItems" @click="menuClick" />
        </div>
    </a-config-provider>

    <div class="db-main">
        <a-card :bordered="false" style="margin-bottom: 20px;" v-if="sfdb.valid">
            <a-descriptions bordered title="数据库信息" size="small">
                <a-descriptions-item label="数据库版本">{{ sfdb.head.magic.slice(4) }}</a-descriptions-item>
                <a-descriptions-item label="最大记录数">{{ sfdb.head.maxRecordCnt }}</a-descriptions-item>
                <a-descriptions-item label="当前记录数">{{ sfdb.head.recordCnt }}</a-descriptions-item>
                <a-descriptions-item label="当前记录索引">{{ sfdb.head.recordIdx }}</a-descriptions-item>
                <a-descriptions-item label="记录长度">{{ sfdb.head.recordSize }}</a-descriptions-item>
            </a-descriptions>
        </a-card>

        <a-card>
            <a-table :columns="tableColumns" :data-source="tableData" :pagination="tablePageCfg" size="small"
                :scroll="{ x: 'max-content' }" @change="sfdbTableChange" bordered></a-table>
        </a-card>
    </div>

    <div style="display: none;">
        <a-upload v-model:file-list="sfdbFileList" name="file" :showUploadList="false" :before-upload="beforeSfdbUpload">
            <a-button>
                <div ref="sfdbUpload"></div>
            </a-button>
        </a-upload>
        <a-upload v-model:file-list="cfgFileList" name="file" :showUploadList="false" :before-upload="beforeCfgUpload">
            <a-button>
                <div ref="cfgUpload"></div>
            </a-button>
        </a-upload>
    </div>

    <a-modal v-model:open="cfgModalOpen" title="数据项配置">
        <template #footer>
            <a-button key="back" @click="cfgModalCancel">取消</a-button>
            <a-button danger @click="cfgModalClear">清空配置</a-button>
            <a-button key="submit" type="primary" :loading="cfgModalLoading" @click="cfgModalOk">确认</a-button>
        </template>
        <a-tabs v-model:activeKey="activeKey" type="editable-card" @edit="onTabEdit">
            <a-tab-pane v-for="item in sfdbRecordCfg" :key="item.key" :tab="item.name"
                :closable="item.key == sfdbRecordCfg.length - 1">
                <a-form>
                    <a-form-item label="名称">
                        <a-input v-model:value="item.name" />
                    </a-form-item>
                    <a-form-item label="数据格式">
                        <a-select v-model:value="item.valueFormat" @change="recordCfgValueFormatChange(item)">
                            <template v-for="(item) in SfdbValueFormat">
                                <a-select-option :value="item">{{ item }}</a-select-option>
                            </template>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="显示格式" v-if="sfdbDispFormatShow(item.valueFormat)">
                        <a-select v-model:value="item.displayFormat">
                            <template v-for="df in SfdbDisplayFormat">
                                <a-select-option :value="df">{{ df }}</a-select-option>
                            </template>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="偏移量（字节）">
                        <a-input v-model:value="item.byteOffset" />
                    </a-form-item>
                    <a-form-item label="长度（字节）">
                        <a-input v-model:value="item.byteLength" :disabled="!item.byteLengthCanSet" />
                    </a-form-item>
                    <a-form-item label="小数位数"
                        v-if="item.valueFormat == SfdbValueFormat.FLOAT || item.valueFormat == SfdbValueFormat.DOUBLE">
                        <a-input v-model:value="item.decimalPlaces" />
                    </a-form-item>
                    <a-form-item label="小端模式" v-if="sfdbLittleEndianShow(item.valueFormat)">
                        <a-switch v-model:checked="item.littleEndian" />
                    </a-form-item>
                </a-form>
            </a-tab-pane>
        </a-tabs>
    </a-modal>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue';
import type { UploadProps, TableProps, TableColumnType, MenuProps } from 'ant-design-vue';
import {
    SfdbType, SfdbRecordType, SfdbValueFormat, SfdbDisplayFormat,
    sfdbDataDecode, sfdbDataLenGetByValueFormat, sfdbDispFormatShow, sfdbLittleEndianShow
} from '../sfdb'
const HEAD_SIZE = 512
const RECORD_CFG_STORAGE_KEY = 'sfdbRecordCfg'

//MODAL
const cfgModalLoading = ref<boolean>(false);
const cfgModalOpen = ref<boolean>(false);

const menuClick: MenuProps['onClick'] = menuInfo => {
    if (menuInfo.key == "import") {
        sfdbUpload.value?.click()
    } else if (menuInfo.key == "csv") {
        const dataStr = data2Csv()
        fileDownload(dataStr, {
            filename: 'data.csv',
            contentType: 'text/csv;charset=utf-8'
        })
    } else if (menuInfo.key == "txt") {
        const dataStr = data2Txt()
        fileDownload(dataStr, {
            filename: 'data.txt',
            contentType: 'text/plain;charset=utf-8'
        })
    } else if (menuInfo.key == "dataCfg") {
        cfgModalOpen.value = true;
    } else if (menuInfo.key == "dataCfgExport") {
        //export data cfg
        const dataStr: string = localStorage.getItem(RECORD_CFG_STORAGE_KEY) || ''
        fileDownload(dataStr, {
            filename: 'dataCfg.json',
            contentType: 'application/json;charset=utf-8'
        })

    } else if (menuInfo.key == "dataCfgImport") {
        cfgUpload.value?.click()
    }
}

const cfgModalOk = () => {
    cfgModalLoading.value = true;
    let _cfdbRecordCfg = JSON.parse(JSON.stringify(sfdbRecordCfg))
    for (let i = 0; i < _cfdbRecordCfg.length; i++) {
        _cfdbRecordCfg[i].value = ''
    }

    window.setTimeout(() => {
        if (!sfdbTableColumnMake()) {
            message.error('数据项配置异常')
        } else {
            localStorage.setItem(RECORD_CFG_STORAGE_KEY, JSON.stringify(_cfdbRecordCfg))
            message.success('配置已保存')
            if (!sfdbTableMake()) {
                message.error('数据解析异常')
            }
            cfgModalLoading.value = false;
            cfgModalOpen.value = false;

            sfdb.valid = false
            sfdb.records.length = 0
            tableData.length = 0
        }
    }, 300);
}

const cfgModalCancel = () => {
    cfgModalOpen.value = false;
}

const cfgModalClear = () => {
    sfdbRecordCfg.length = 0
}

//TAB
const activeKey = ref(0);
const onTabEdit = (targetKey: string, action: string) => {
    if (action == 'remove' && targetKey == sfdbRecordCfg[sfdbRecordCfg.length - 1].key.toString()) {
        sfdbRecordCfg.length -= 1
    } else if (action == 'add') {
        addRecordCfg()
    }
}

const sfdb: SfdbType = reactive({
    valid: false,
    head: {
        magic: '',
        recordIdx: 0,
        recordCnt: 0,
        maxRecordCnt: 0,
        recordSize: 0,
    },
    records: []
})
const tableColumns: TableColumnType[] = reactive([])
const sortedInfo = ref()
const tablePageCfg = reactive({
    defaultPageSize: 20,
    total: sfdb.head.recordCnt,
    showTotal: (total: number) => `总${total}条`
})

const tableData: any[] = reactive([])
const sfdbRecordCfg: SfdbRecordType[] = reactive([])
const menuItems = ref<MenuProps['items']>([
    {
        key: 'app',
        icon: () => h(AppstoreOutlined),
        label: '应用',
        title: '应用',
        children: [{
            label: '导入数据库',
            key: 'import',
        }, {
            label: '导出数据库',
            key: 'export',
            children: [
                {
                    label: 'CSV',
                    key: 'csv',
                },
                {
                    label: 'TXT',
                    key: 'txt',
                },
            ]
        }]
    }, {
        key: 'settings',
        icon: () => h(SettingOutlined),
        label: '设置',
        title: '设置',
        children: [{
            label: '数据项配置',
            key: 'dataCfg',
        }, {
            label: '数据项配置导出',
            key: 'dataCfgExport',
        }, {
            label: '数据项配置导入',
            key: 'dataCfgImport',
        }]
    }
]);


const addRecordCfg = () => {
    sfdbRecordCfg.push({
        name: '新数据项',
        key: sfdbRecordCfg.length,
        value: '',
        valueFormat: SfdbValueFormat.UINT8,
        displayFormat: SfdbDisplayFormat.DEC,
        byteOffset: 0,
        byteLength: 1,
        byteLengthCanSet: false,
        decimalPlaces: 0,
        littleEndian: false,
        children: []
    })
}

const recordCfgValueFormatChange = (cfg: SfdbRecordType) => {
    cfg.byteLength = sfdbDataLenGetByValueFormat(cfg.valueFormat)
    if (cfg.byteLength == 0) {
        cfg.byteLengthCanSet = true
    } else {
        cfg.byteLengthCanSet = false
    }
}

const sdb_head_decode = (headBuffer: ArrayBuffer): boolean => {
    //decode magic str
    if (headBuffer.byteLength < HEAD_SIZE) return false
    const magic: ArrayBuffer = headBuffer.slice(0, 8)
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
    const magicStr = decoder.decode(magic)
    sfdb.head.magic = magicStr.replace(/\0/g, '')

    //decode recordIdx
    sfdb.head.recordIdx = new DataView(headBuffer).getUint32(12, true)
    //decode recordCnt
    sfdb.head.recordCnt = new DataView(headBuffer).getUint32(16, true)
    //decode maxRecordCnt
    sfdb.head.maxRecordCnt = new DataView(headBuffer).getUint32(20, true)
    //decode recordSize
    sfdb.head.recordSize = new DataView(headBuffer).getUint32(24, true)

    //CHECK magic str, format: SFDBXXX X is a number form 0 to 9
    if (!sfdb.head.magic.match(/SFDB\d{3}/)) {
        return false
    }

    return true
}

const sdb_record_list_decode = (recordBuffer: ArrayBuffer): boolean => {
    //根据 recordCnt 和 recordIdx 从新到旧的顺序，将记录存入 records 数组
    let _idx = sfdb.head.recordIdx
    for (let i = 0; i < sfdb.head.recordCnt; i++) {
        let record: ArrayBuffer = recordBuffer.slice(_idx * sfdb.head.recordSize, (_idx + 1) * sfdb.head.recordSize)
        sfdb.records.push(record)
        _idx--;
        if (_idx < 0) {
            _idx = sfdb.head.maxRecordCnt - 1
        }
    }
    return true
}

const sfdbTableColumnMake = (): boolean => {
    tableColumns.length = 0
    const sorted = sortedInfo.value || {};

    tableColumns.push({
        title: '序号',
        dataIndex: 'sn',
        key: 'sn',
        sorter: (a, b) => a.sn - b.sn,
        sortOrder: sorted.columnKey === 'sn' && sorted.order
    })

    for (let i = 0; i < sfdbRecordCfg.length; i++) {
        let cfg = sfdbRecordCfg[i]
        let column: TableColumnType = {
            title: cfg.name,
            dataIndex: cfg.key,
            key: cfg.key
        }
        if (cfg.displayFormat == SfdbDisplayFormat.DEC || cfg.displayFormat == SfdbDisplayFormat.HEX || cfg.displayFormat == SfdbDisplayFormat.BIN) {
            column.sorter = (a, b) => {
                let radix: number = 10
                switch (cfg.displayFormat) {
                    case SfdbDisplayFormat.HEX:
                        radix = 16
                        break
                    case SfdbDisplayFormat.DEC:
                        radix = 10
                        break
                    case SfdbDisplayFormat.BIN:
                        radix = 2
                        break
                    default:
                        radix = 10
                        break
                }
                let aNum = parseInt(a[cfg.key], radix)
                let bNum = parseInt(b[cfg.key], radix)
                return aNum - bNum
            }
            column.sortOrder = sorted.columnKey === cfg.key && sorted.order
        }

        if (cfg.valueFormat == SfdbValueFormat.DATE6 || cfg.valueFormat == SfdbValueFormat.UNIXTIME) {
            column.sorter = (a, b) => {
                let aDate = new Date(a[cfg.key])
                let bDate = new Date(b[cfg.key])
                return aDate.getTime() - bDate.getTime()
            }
            column.sortOrder = sorted.columnKey === cfg.key && sorted.order
        }

        tableColumns.push(column)
    }
    return true
}

const sfdbTableChange: TableProps['onChange'] = (pagination, filters, sorter: any) => {
    pagination
    filters
    sortedInfo.value = sorter
    tableColumns.forEach((item, index) => {
        if (item.key === sorter.columnKey) {
            tableColumns[index].sortOrder = sorter.order;
        } else {
            tableColumns[index].sortOrder = undefined;
        }
    });

}

const sfdbRecordDataDecode = (record: ArrayBuffer): boolean => {
    for (let i = 0; i < sfdbRecordCfg.length; i++) {
        try {
            if (!sfdbDataDecode(record, sfdbRecordCfg[i])) {
                return false
            }
        } catch (e) {
            console.error(e)
            return false
        }
    }
    return true
}
const sfdbTableDataMake = (): boolean => {
    let data: any = {}
    tableData.length = 0
    for (let i = 0; i < sfdb.head.recordCnt; i++) {
        if (!sfdbRecordDataDecode(sfdb.records[i])) {
            return false
        }

        for (let j = 0; j < sfdbRecordCfg.length; j++) {
            let cfg = sfdbRecordCfg[j]
            data[cfg.key] = cfg.value
        }
        data.sn = i + 1
        tableData.push(JSON.parse(JSON.stringify(data)))
    }
    return true
}

const sfdbTableMake = (): boolean => {
    if (!sfdbTableDataMake()) return false

    return true
}

// sfdb upload
const sfdbUpload = ref<HTMLInputElement | null>(null)
const sfdbFileList = ref<UploadProps['fileList']>([]);
const beforeSfdbUpload: UploadProps['beforeUpload'] = file => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer
        const head: ArrayBuffer = data?.slice(0, HEAD_SIZE)
        const records: ArrayBuffer = data?.slice(HEAD_SIZE)
        if (!sdb_head_decode(head)) {
            message.error('导入失败，不是有效的sdb文件');
            return false
        }

        if (!sdb_record_list_decode(records)) {
            message.error('文件已损坏');
            return false
        }
        if (!sfdbTableMake()) {
            message.error('数据解析异常')
            sfdb.records.length = 0
            return false
        }

        message.success('导入成功');
        sfdb.valid = true
    }

    reader.readAsArrayBuffer(file)
    return false
}

//cfg upload
const cfgUpload = ref<HTMLInputElement | null>(null)
const cfgFileList = ref<UploadProps['fileList']>([]);
const beforeCfgUpload: UploadProps['beforeUpload'] = file => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result
        if (!data) {
            return false
        } else {
            sfdbRecordCfg.length = 0
            tableData.length = 0
            sfdb.valid = false
            try {
                sfdbRecordCfg.push(...JSON.parse(data.toString()))
            } catch (e) {
                sfdbRecordCfg.length = 0
                message.error('配置文件解析失败')
                return false
            }
            if (!sfdbTableColumnMake()) {
                sfdbRecordCfg.length = 0
                message.error('配置文件解析失败')
            } else {
                localStorage.setItem(RECORD_CFG_STORAGE_KEY, data.toString())
                message.success('配置文件导入成功')
            }
        }
    }
    reader.readAsText(file)
    return false
}

//data transfer
const data2Csv = (): string => {
    let str = ''

    //make head
    for (let i = 0; i < sfdbRecordCfg.length; i++) {
        str += sfdbRecordCfg[i].name
        if (i < sfdbRecordCfg.length - 1) {
            str += ','
        }
    }
    str += '\r\n'

    //make data
    if (!sfdb.valid) {
        return str
    }
    for (let i = 0; i < tableData.length; i++) {
        for (let j = 0; j < sfdbRecordCfg.length; j++) {
            str += tableData[i][sfdbRecordCfg[j].key]
            if (j < sfdbRecordCfg.length - 1) {
                str += ','
            }
        }
        str += '\r\n'
    }

    return str
}

const data2Txt = (): string => {
    let str = ''

    //make head
    for (let i = 0; i < sfdbRecordCfg.length; i++) {
        str += sfdbRecordCfg[i].name
        if (i < sfdbRecordCfg.length - 1) {
            str += '\t'
        }
    }
    str += '\r\n'

    //make data
    if (!sfdb.valid) {
        return str
    }
    for (let i = 0; i < tableData.length; i++) {
        for (let j = 0; j < sfdbRecordCfg.length; j++) {
            str += tableData[i][sfdbRecordCfg[j].key]
            if (j < sfdbRecordCfg.length - 1) {
                str += '\t'
            }
        }
        str += '\r\n'
    }

    return str
}

//utils
type fileDownloadOptions = {
    filename: string
    contentType: string
}
const fileDownload = (content: BlobPart, options: fileDownloadOptions) => {
    try {
        const blob = new Blob([content], { type: options.contentType })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = options.filename
        a.click()
        window.URL.revokeObjectURL(url)
    } catch (e) {
        console.log(e)
    }

}

onMounted(() => {
    const recordCfgStr = localStorage.getItem(RECORD_CFG_STORAGE_KEY)
    if (recordCfgStr) {
        sfdbRecordCfg.length = 0
        sfdbRecordCfg.push(...JSON.parse(recordCfgStr))
    }
    if (!sfdbTableColumnMake()) {
        message.error('数据项配置异常')
    }
})

</script>

<style scoped>
.not-use {
    color: rgb(255, 223, 209);
}

.head {
    margin-bottom: 10px;
}

.db-main {
    width: 90%;
    margin: 0 auto;
    padding-top: 20px;
}

.sfdb-menu-light {
    background: #292961;
    color: rgb(212, 212, 212);
}

.data-cfg-item {
    margin-top: 10px;
    border-bottom: #c2c2c2 1px solid;
}

.add-btn {
    padding-top: 10px;
    text-align: center;
    margin: 0 auto;
}

.ant-form-item {
    margin-bottom: 15px;
}

:deep(.sfdb-menu-submenu:hover) {
    background: rgba(255, 255, 255, 0.26);
}

:deep(.sfdb-menu-light.sfdb-menu-horizontal >.sfdb-menu-submenu:hover::after) {
    border-bottom-color: transparent;
}

:deep(.sfdb-menu-submenu-title:hover:not(.sfdb-menu-item-selected):not(.sfdb-menu-submenu-selected)) {
    color: white
}

:deep(.sfdb-menu-submenu-selected>.sfdb-menu-submenu-title) {
    color: white
}

:deep(.sfdb-menu-light.sfdb-menu-horizontal >.sfdb-menu-submenu-selected::after) {
    border-bottom-color: transparent;
}

:deep(.sfdb-menu-light.sfdb-menu-horizontal >.sfdb-menu-submenu-open::after) {
    border-bottom-color: transparent;
}

@media screen and (max-width:768px) {
    .db-main {
        width: 98%;
        /* padding: 5px; */
    }
}

@media screen and (max-width:575px) {
    :deep(.ant-form-item-label) {
        padding: 0
    }
}
</style>