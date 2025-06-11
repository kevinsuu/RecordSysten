import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, InputGroup, Card, OverlayTrigger, Tooltip, Badge, ListGroup } from 'react-bootstrap';
import { ref, set, get, onValue } from 'firebase/database';
import DatePicker from 'react-datepicker';
import { FaPlus, FaTrash, FaCalendarAlt, FaTimes, FaSearch, FaMinus, FaPlus as FaPlusCircle } from 'react-icons/fa';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';

// 格式化洗車項目顯示名稱
const formatWashItemName = (washItem) => {
    if (typeof washItem === 'string') {
        return washItem;
    } else {
        return washItem.name;
    }
};

// 格式化洗車項目價格
const formatWashItemPrice = (washItem) => {
    if (typeof washItem === 'string') {
        return 0;
    } else {
        return washItem.price;
    }
};

const AddRecordForm = ({ data, setData, database, companyId, vehicleId, editingRecord, onSave }) => {
    // 狀態管理
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId || '');
    const [date, setDate] = useState(new Date());
    const [paymentType, setPaymentType] = useState('receivable'); // 應收廠商為預設值
    const [selectedItems, setSelectedItems] = useState([]); // 勾選的項目
    const [customItems, setCustomItems] = useState([]); // 自訂項目
    const [newCustomItem, setNewCustomItem] = useState({ name: '', price: '' }); // 新增的自訂項目
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');
    const [washItems, setWashItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [adjustmentItems, setAdjustmentItems] = useState([]); // 新增校正項目的state
    const [adjustmentName, setAdjustmentName] = useState('');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [washGroups, setWashGroups] = useState([]);
    const [selectedWashGroup, setSelectedWashGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 通知狀態
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' // 'success', 'error', 'warning', 'info'
    });

    // 關閉通知
    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // 顯示通知
    const showNotification = (message, variant = 'success') => {
        // 將 Bootstrap 的 variant 轉換為 MUI 的 severity
        const severity = variant === 'danger' ? 'error' : variant;
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    // 自定義樣式
    const styles = {
        formLabel: {
            fontWeight: "500",
            marginBottom: "0.5rem"
        },
        formControl: {
            borderRadius: "6px",
            border: "1px solid #ced4da",
            padding: "0.5rem 0.75rem",
            transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out"
        },
        datePickerWrapper: {
            position: "relative",
            width: "100%"
        },
        datePickerIcon: {
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "#6c757d"
        },
        cardSection: {
            border: "1px solid #e9ecef",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#f8f9fa"
        },
        itemRow: {
            padding: "0.5rem",
            marginBottom: "0.5rem",
            borderRadius: "6px",
            backgroundColor: "white",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        },
        itemCheckbox: {
            marginRight: "8px"
        },
        itemPrice: {
            color: "#0d6efd",
            fontWeight: "500"
        },
        totalAmount: {
            fontSize: "1.2rem",
            fontWeight: "bold",
            color: "#0d6efd"
        },
        submitButton: {
            padding: "0.5rem 1.5rem",
            fontWeight: "500"
        },
        customItem: {
            backgroundColor: "white",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "0.5rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        },
        calendarIcon: {
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "#6c757d"
        }
    };

    // 載入洗車項目
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 載入洗車項目
                const washItemsRef = ref(database, 'wash_items');
                const itemsSnapshot = await get(washItemsRef);

                if (itemsSnapshot.exists()) {
                    const items = itemsSnapshot.val();
                    const itemsArray = Object.entries(items).map(([id, item]) => ({
                        id,
                        ...item
                    })).sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0));
                    setWashItems(itemsArray);
                } else {
                    setWashItems([]);
                }

                // 載入洗車分組
                const washGroupsRef = ref(database, 'wash_groups');
                const groupsSnapshot = await get(washGroupsRef);

                if (groupsSnapshot.exists()) {
                    const groups = groupsSnapshot.val();
                    const groupsArray = Object.entries(groups).map(([id, group]) => ({
                        id,
                        ...group
                    })).sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0));
                    setWashGroups(groupsArray);

                    // 自動選擇第一個分組
                    if (groupsArray.length > 0) {
                        setSelectedWashGroup(groupsArray[0]);
                    }
                } else {
                    setWashGroups([]);
                }
            } catch (error) {
                console.error('載入數據時發生錯誤:', error);
                showNotification('載入數據失敗', 'error');
            }
        };

        fetchData();
    }, [database]);

    // 轉換公司數據為 react-select 格式
    const companyOptions = Object.entries(data.companies || {})
        .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
        .map(([id, company]) => ({
            value: id,
            label: company.name
        }));

    // 轉換車輛數據為 react-select 格式
    const vehicleOptions = selectedCompanyId
        ? Object.entries(data.companies[selectedCompanyId]?.vehicles || {})
            .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
            .map(([id, vehicle]) => ({
                value: id,
                label: `${vehicle.plate} (${vehicle.type})`
            }))
        : [];

    // 處理選擇洗車分組
    const handleGroupChange = (groupId) => {
        if (!groupId) {
            setSelectedWashGroup(null);
            return;
        }

        const group = washGroups.find(g => g.id === groupId);
        if (group) {
            setSelectedWashGroup(group);
        }
    };

    // 獲取分組中的項目
    const getGroupItems = () => {
        if (!selectedWashGroup || !selectedWashGroup.items || !washItems.length) {
            return [];
        }

        // 獲取分組中的項目並保持原有排序
        return washItems
            .filter(item => selectedWashGroup.items.includes(item.id))
            .sort((a, b) => {
                // 首先檢查兩個項目是否都有 sort_index
                if (a.sort_index !== undefined && b.sort_index !== undefined) {
                    return a.sort_index - b.sort_index;
                }
                // 如果只有一個有 sort_index，有的放前面
                if (a.sort_index !== undefined) return -1;
                if (b.sort_index !== undefined) return 1;
                // 兩個都沒有，保持原來的順序
                return 0;
            });
    };

    // 根據分組過濾洗車項目
    const filteredWashItems = selectedWashGroup ? getGroupItems() : washItems;

    // 轉換服務項目為 react-select 格式
    const washItemOptions = filteredWashItems.map((item, index) => ({
        value: index,
        label: `${formatWashItemName(item)} - $${formatWashItemPrice(item)}`,
        item: item
    }));

    // 轉換分組為下拉選單格式
    const groupOptions = [
        { value: '', label: '全部項目' },
        ...washGroups.map(group => ({
            value: group.id,
            label: `${group.name} (${group.items?.length || 0} 項)`
        }))
    ];

    // 自定義 Select 樣式
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            borderColor: '#ced4da',
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
            '&:hover': {
                borderColor: '#ced4da'
            }
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white',
            ':active': {
                backgroundColor: state.isSelected ? '#0d6efd' : '#e9ecef'
            }
        }),
        menu: (base) => ({
            ...base,
            position: 'relative',
            zIndex: 2
        }),
        clearIndicator: (base) => ({
            ...base,
            cursor: 'pointer',
            padding: '6px',
            ':hover': {
                color: '#dc3545'
            }
        })
    };

    // 自定義清除按鈕
    const ClearIndicator = props => {
        return (
            <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="clear-tooltip">清除所有已選項目</Tooltip>}
            >
                <div {...props.innerProps} style={props.getStyles('clearIndicator', props)}>
                    <FaTimes />
                </div>
            </OverlayTrigger>
        );
    };

    // 處理服務項目多選
    const handleWashItemsChange = (selectedOptions) => {
        const newSelectedItems = selectedOptions ? selectedOptions.map(option => {
            if (typeof option.item === 'string') {
                return { name: option.item, price: 0 };
            }
            return option.item;
        }) : [];
        setSelectedItems(newSelectedItems);
    };

    // 處理選單開關
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 添加自訂項目
    const addCustomItem = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!newCustomItem.name.trim()) return;

        const price = parseFloat(newCustomItem.price) || 0;
        const customItem = {
            name: newCustomItem.name.trim(),
            price: price,
            isCustom: true
        };

        setCustomItems([...customItems, customItem]);
        setNewCustomItem({ name: '', price: '' });
    };

    // 刪除自訂項目
    const removeCustomItem = (index) => {
        const newCustomItems = [...customItems];
        newCustomItems.splice(index, 1);
        setCustomItems(newCustomItems);
    };

    // 處理添加校正項目
    const handleAddAdjustment = () => {
        if (!adjustmentName.trim() || !adjustmentAmount) return;

        const newAdjustment = {
            id: Date.now().toString(),
            name: adjustmentName.trim(),
            price: parseFloat(adjustmentAmount)
        };

        setAdjustmentItems([...adjustmentItems, newAdjustment]);
        setAdjustmentName('');
        setAdjustmentAmount('');
    };

    // 處理刪除校正項目
    const handleDeleteAdjustment = (id) => {
        setAdjustmentItems(adjustmentItems.filter(item => item.id !== id));
    };

    // 計算總金額（包含服務項目和校正項目）
    const calculateTotal = () => {
        // 計算服務項目總金額
        const servicesTotal = selectedItems.reduce((sum, item) => {
            const quantity = item.quantity || 1;  // 如果沒有數量，預設為 1
            const price = item.originalPrice || item.price || 0;  // 使用原始價格
            return sum + (price * quantity);
        }, 0);

        // 計算自訂項目總金額
        const customTotal = customItems.reduce((sum, item) => {
            return sum + (item.price || 0);
        }, 0);

        // 計算校正項目總金額
        const adjustmentsTotal = adjustmentItems.reduce((sum, item) => {
            return sum + (item.price || 0);
        }, 0);

        return servicesTotal + customTotal + adjustmentsTotal;
    };

    // 初始化表單數據
    useEffect(() => {
        if (editingRecord) {
            setSelectedCompanyId(editingRecord.companyId);
            setSelectedVehicleId(editingRecord.vehicleId);
            setDate(new Date(editingRecord.date));
            setPaymentType(editingRecord.payment_type);

            // 設置服務項目
            const selectedServiceItems = editingRecord.items.filter(item => !item.isCustom);
            setSelectedItems(selectedServiceItems);

            // 設置自訂項目
            const customServiceItems = editingRecord.items.filter(item => item.isCustom);
            setCustomItems(customServiceItems);

            // 設置備註
            setRemarks(editingRecord.remarks || '');
        }
    }, [editingRecord]);

    // 修改儲存記錄函數
    const saveRecord = async () => {
        if (!selectedCompanyId) {
            setError('請選擇公司');
            showNotification('請選擇公司', 'danger');
            return;
        }

        if (!selectedVehicleId) {
            setError('請選擇車輛');
            showNotification('請選擇車輛', 'danger');
            return;
        }

        if (selectedItems.length === 0 && customItems.length === 0) {
            setError('請至少選擇一個服務項目或添加校正項目');
            showNotification('請至少選擇一個服務項目或添加校正項目', 'danger');
            return;
        }

        setError('');
        setIsSaving(true);

        try {
            const dateString = date.toISOString().split('T')[0];
            const allItems = [...selectedItems, ...customItems, ...adjustmentItems];

            // 獲取當前記錄
            const records = data.companies[selectedCompanyId]?.vehicles[selectedVehicleId]?.records || [];

            // 建立時間戳 (毫秒)
            const timestamp = editingRecord ? editingRecord.timestamp : Date.now();

            // 準備新記錄
            const newRecord = {
                date: dateString,
                payment_type: paymentType,
                items: allItems,
                remarks: remarks.trim(),
                timestamp: timestamp
            };

            let updatedRecords;
            if (editingRecord) {
                // 更新現有記錄，確保只更新一筆
                const recordIndex = records.findIndex(record => record.timestamp === editingRecord.timestamp);
                if (recordIndex !== -1) {
                    updatedRecords = [...records];
                    updatedRecords[recordIndex] = newRecord;
                } else {
                    updatedRecords = [...records, newRecord];
                }
            } else {
                // 添加新記錄
                updatedRecords = [...records, newRecord];
            }

            // 更新 Firebase
            await set(ref(database, `companies/${selectedCompanyId}/vehicles/${selectedVehicleId}/records`), updatedRecords);

            // 更新本地狀態
            const newData = { ...data };
            newData.companies[selectedCompanyId].vehicles[selectedVehicleId].records = updatedRecords;
            setData(newData);

            // 清除表單
            if (!editingRecord) {
                setDate(new Date());
                setPaymentType('receivable');
                setSelectedItems([]);
                setCustomItems([]);
                setAdjustmentItems([]);
                setNewCustomItem({ name: '', price: '' });
                setRemarks('');
            }
            setError('');

            // 創建一個格式化的記錄用於前端顯示
            const formattedRecord = {
                ...newRecord,
                companyId: selectedCompanyId,
                companyName: data.companies[selectedCompanyId].name,
                vehicleId: selectedVehicleId,
                vehicle: {
                    plate: data.companies[selectedCompanyId].vehicles[selectedVehicleId].plate,
                    type: data.companies[selectedCompanyId].vehicles[selectedVehicleId].type,
                    remarks: data.companies[selectedCompanyId].vehicles[selectedVehicleId].remarks || ''
                }
            };

            // 通知父元件
            onSave({
                reload: false,
                newRecord: formattedRecord,
                updatedData: newData,
                source: 'AddRecordForm',
                shouldClearSearch: !editingRecord,
                shouldResetForm: true
            });

            showNotification(editingRecord ? '記錄已成功更新！' : '記錄已成功儲存', 'success');
        } catch (error) {
            console.error(editingRecord ? '更新記錄時發生錯誤:' : '儲存記錄時發生錯誤:', error);
            setError(`${editingRecord ? '更新' : '儲存'}記錄時發生錯誤: ${error.message}`);
            showNotification(`${editingRecord ? '更新' : '儲存'}記錄時發生錯誤: ${error.message}`, 'danger');
        } finally {
            setIsSaving(false);
        }
    };

    // 過濾服務項目 - 加入搜尋功能
    const getFilteredItems = () => {
        // 第一步：根據分組過濾項目
        let itemsToFilter = selectedWashGroup && selectedWashGroup.items
            ? washItems.filter(item => selectedWashGroup.items.includes(item.id))
            : washItems;

        // 第二步：根據搜尋詞過濾項目
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            itemsToFilter = itemsToFilter.filter(item =>
                item.name.toLowerCase().includes(lowerSearchTerm) ||
                (item.id && item.id.toLowerCase().includes(lowerSearchTerm))
            );
        }

        return itemsToFilter;
    };

    // 處理項目點擊
    const handleItemClick = (selectedItem) => {
        // 使用 id 來識別項目
        const existingItemIndex = selectedItems.findIndex(item => item.id === selectedItem.id);

        if (existingItemIndex >= 0) {
            // 如果項目已存在，增加數量
            const newItems = [...selectedItems];
            const currentQuantity = newItems[existingItemIndex].quantity || 1;
            newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                quantity: currentQuantity + 1,
                originalPrice: selectedItem.price
            };
            setSelectedItems(newItems);
        } else {
            // 如果是新項目，添加到列表
            setSelectedItems([...selectedItems, {
                ...selectedItem,
                quantity: 1,
                originalPrice: selectedItem.price
            }]);
        }
    };

    // 處理數量變更
    const handleQuantityChange = (itemId, change) => {
        setSelectedItems(prevItems =>
            prevItems.map(item => {
                if (item.id === itemId || (item.name === itemId && !item.id)) {
                    const newQuantity = Math.max(1, (item.quantity || 1) + change);
                    return {
                        ...item,
                        quantity: newQuantity
                    };
                }
                return item;
            })
        );
    };

    // 處理項目刪除
    const handleItemDelete = (itemId) => {
        setSelectedItems(prevItems => prevItems.filter(item => item.id !== itemId));
    };

    // 獲取過濾後的項目
    const filteredItems = getFilteredItems();

    return (
        <div className="add-record-form">
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-3" style={{
                    maxHeight: 'calc(100vh - 120px)',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    msOverflowStyle: '-ms-autohiding-scrollbar'
                }}>
                    <Form onSubmit={(e) => e.preventDefault()}>
                        {/* 基本資訊區塊 */}
                        <div style={{
                            ...styles.cardSection,
                            position: 'relative',
                            zIndex: 3
                        }}>
                            <h6 className="mb-3 text-muted">基本資訊</h6>

                            {/* 公司選擇 */}
                            <Form.Group className="mb-3">
                                <Form.Label style={styles.formLabel}>公司</Form.Label>
                                <Select
                                    options={companyOptions}
                                    value={companyOptions.find(option => option.value === selectedCompanyId)}
                                    onChange={(option) => {
                                        setSelectedCompanyId(option?.value || '');
                                        setSelectedVehicleId('');
                                    }}
                                    isClearable
                                    isSearchable
                                    placeholder="選擇或搜尋公司..."
                                    noOptionsMessage={() => "找不到符合的公司"}
                                    styles={selectStyles}
                                />
                                {error === '請選擇公司' && (
                                    <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>
                                        {error}
                                    </div>
                                )}
                            </Form.Group>

                            {/* 車輛選擇 */}
                            <Form.Group className="mb-3">
                                <Form.Label style={styles.formLabel}>車輛</Form.Label>
                                <Select
                                    options={vehicleOptions}
                                    value={vehicleOptions.find(option => option.value === selectedVehicleId)}
                                    onChange={(option) => setSelectedVehicleId(option?.value || '')}
                                    isClearable
                                    isSearchable
                                    placeholder="選擇或搜尋車輛..."
                                    noOptionsMessage={() => selectedCompanyId ? "找不到符合的車輛" : "請先選擇公司"}
                                    isDisabled={!selectedCompanyId}
                                    styles={selectStyles}
                                />
                                {error === '請選擇車輛' && (
                                    <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>
                                        {error}
                                    </div>
                                )}
                            </Form.Group>

                            {/* 日期與收付款方式 */}
                            <Row className="mb-3">
                                <Col xs={12} md={6}>
                                    <Form.Group controlId="recordDate">
                                        <Form.Label>日期</Form.Label>
                                        <div className="position-relative">
                                            <DatePicker
                                                selected={date}
                                                onChange={(date) => setDate(date)}
                                                dateFormat="yyyy-MM-dd"
                                                className="form-control"
                                                placeholderText="選擇日期..."
                                            />
                                            <FaCalendarAlt style={styles.calendarIcon} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Form.Group controlId="paymentType">
                                        <Form.Label>收付款方式</Form.Label>
                                        <div>
                                            <Form.Check
                                                inline
                                                type="radio"
                                                label="應收款項"
                                                name="paymentType"
                                                id="receivable"
                                                checked={paymentType === 'receivable'}
                                                onChange={() => setPaymentType('receivable')}
                                            />
                                            <Form.Check
                                                inline
                                                type="radio"
                                                label="應付款項"
                                                name="paymentType"
                                                id="payable"
                                                checked={paymentType === 'payable'}
                                                onChange={() => setPaymentType('payable')}
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* 洗車服務項目搜尋和分組選擇 */}
                            <Row className="mb-2">
                                <Col xs={12} md={6}>
                                    <Form.Group controlId="groupSelect">
                                        <Form.Label>服務分組</Form.Label>
                                        <Select
                                            options={groupOptions}
                                            value={groupOptions.find(option => option.value === (selectedWashGroup?.id || '')) || groupOptions[0]}
                                            onChange={(selected) => {
                                                handleGroupChange(selected ? selected.value : '');
                                                setSearchTerm(''); // 清空搜尋
                                            }}
                                            placeholder="選擇分組..."
                                            styles={selectStyles}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Form.Group controlId="searchWashItems">
                                        <Form.Label>搜尋服務項目</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text>
                                                <FaSearch />
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="輸入名稱或編號搜尋..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            {searchTerm && (
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={() => setSearchTerm('')}
                                                >
                                                    清除
                                                </Button>
                                            )}
                                        </InputGroup>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* 服務項目區域 */}
                            <div className="service-selection-area" style={{ marginBottom: '15px' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0">服務項目列表</h6>
                                    <Badge bg="secondary" pill>
                                        {filteredItems.length} 項可選
                                    </Badge>
                                </div>

                                {/* 已選擇的服務項目 */}
                                {selectedItems.length > 0 && (
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div className="fw-bold text-primary" style={{ fontSize: '0.9rem' }}>已選擇的項目</div>
                                            <Badge bg="primary" pill>
                                                共 {selectedItems.length} 項
                                            </Badge>
                                        </div>
                                        <div className="selected-items-container" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                            <Row className="mx-0">
                                                {selectedItems.map((item, index) => (
                                                    <Col xs={12} md={6} key={item.id || `custom-${index}`} className="px-1 mb-1">
                                                        <div
                                                            className="d-flex justify-content-between align-items-center p-2"
                                                            style={{
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '4px',
                                                                border: '1px solid #dee2e6',
                                                                height: '40px',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <div className="d-flex align-items-center overflow-hidden" style={{ flex: '1' }}>
                                                                <span className="fw-bold text-truncate" title={`${item.name} (編號: ${item.id})`}>
                                                                    {item.name} {item.id && <small className="text-muted">#{item.id}</small>}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex align-items-center ms-1">
                                                                <Button
                                                                    variant="outline-secondary"
                                                                    size="sm"
                                                                    className="p-0 d-flex align-items-center justify-content-center"
                                                                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                                                                    onClick={() => handleQuantityChange(item.id, -1)}
                                                                >
                                                                    <FaMinus size={8} />
                                                                </Button>
                                                                <span className="mx-1" style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity || 1}</span>
                                                                <Button
                                                                    variant="outline-secondary"
                                                                    size="sm"
                                                                    className="p-0 d-flex align-items-center justify-content-center me-1"
                                                                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                                                                    onClick={() => handleQuantityChange(item.id, 1)}
                                                                >
                                                                    <FaPlusCircle size={8} />
                                                                </Button>
                                                                <Badge bg="primary" className="me-1" style={{ minWidth: '40px' }}>
                                                                    ${(item.price * (item.quantity || 1)).toFixed(0)}
                                                                </Badge>
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    className="p-0 d-flex align-items-center justify-content-center"
                                                                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                                                                    onClick={() => handleItemDelete(item.id)}
                                                                >
                                                                    <FaTrash size={8} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </div>
                                    </div>
                                )}

                                {/* 洗車服務項目列表 */}
                                <div
                                    className="wash-items-container border rounded p-2"
                                    style={{ maxHeight: selectedItems.length > 0 ? '200px' : '360px', overflowY: 'auto' }}
                                >
                                    {filteredItems.length === 0 ? (
                                        <div className="text-center p-3 text-muted">
                                            {searchTerm ? '沒有符合搜尋條件的項目' : '沒有可用的服務項目'}
                                        </div>
                                    ) : (
                                        <Row className="mx-0">
                                            {filteredItems.map((item) => {
                                                const isSelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
                                                return (
                                                    <Col xs={12} md={6} lg={4} key={item.id} className="px-1 mb-1">
                                                        <div
                                                            className={`wash-item py-1 px-2 d-flex justify-content-between align-items-center hover-highlight cursor-pointer ${isSelected ? 'bg-light' : ''}`}
                                                            onClick={() => handleItemClick(item)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                borderLeft: isSelected ? '3px solid #0d6efd' : 'none',
                                                                height: '40px',
                                                                fontSize: '0.9rem',
                                                                border: '1px solid #dee2e6',
                                                                borderRadius: '4px',
                                                                overflow: 'hidden',
                                                                whiteSpace: 'nowrap',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                        >
                                                            <div className="d-flex align-items-center overflow-hidden" style={{ flex: '1' }}>
                                                                <span className={`${isSelected ? 'fw-bold' : ''} text-truncate`} title={`${item.name} (ID: ${item.id})`}>
                                                                    {item.name} <small className="text-muted">#{item.id}</small>
                                                                </span>
                                                                {isSelected && (
                                                                    <Badge bg="primary" className="ms-1" style={{ minWidth: '22px', height: '22px' }}>
                                                                        {selectedItems.find(si => si.id === item.id)?.quantity || 1}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="ms-1 text-nowrap">
                                                                <span className={`${isSelected ? 'fw-bold text-primary' : ''}`}>${item.price}</span>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}
                                </div>
                            </div>

                            {/* 金額總計 */}
                            <div className="mt-3 d-flex justify-content-between align-items-center p-3 rounded" style={{ backgroundColor: '#0d6efd', color: 'white' }}>
                                <h6 className="mb-0 fw-bold">金額總計</h6>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${calculateTotal().toLocaleString()}</span>
                            </div>

                            {/* 錯誤提示 */}
                            {error === '請至少選擇一個服務項目或添加自訂項目' && (
                                <div className="alert alert-danger mt-2 mb-0 py-2">{error}</div>
                            )}
                        </div>

                        {/* 自訂項目區塊 */}
                        <div className="mt-4" style={{
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <h6 className="mb-3 text-muted">校正項目</h6>

                            {/* 顯示已添加的自訂項目 */}
                            {customItems.length > 0 && (
                                <div className="mb-3">
                                    {customItems.map((item, index) => (
                                        <div key={index} style={styles.customItem} className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="fw-bold">{item.name}</div>
                                                <div className="text-primary">${item.price}</div>
                                            </div>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => removeCustomItem(index)}
                                                className="rounded-circle p-0"
                                                style={{ width: '32px', height: '32px' }}
                                            >
                                                <FaTrash size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 添加新自訂項目的表單 */}
                            <div style={styles.customItem}>
                                <Row className="align-items-end g-2">
                                    <Col xs={12} sm={5}>
                                        <Form.Group>
                                            <Form.Label style={{ fontSize: '0.875rem' }}>項目名稱</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="輸入名稱"
                                                value={newCustomItem.name}
                                                onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                                                size="sm"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col xs={7} sm={4}>
                                        <Form.Group>
                                            <Form.Label style={{ fontSize: '0.875rem' }}>金額</Form.Label>
                                            <InputGroup size="sm">
                                                <InputGroup.Text>$</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    placeholder="0"
                                                    value={newCustomItem.price}
                                                    onChange={(e) => setNewCustomItem({ ...newCustomItem, price: e.target.value })}
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                    <Col xs={5} sm={3}>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={(event) => addCustomItem(event)}
                                            className="w-100"
                                            disabled={!newCustomItem.name.trim()}
                                            type="button"
                                        >
                                            <FaPlus className="me-1" /> 添加
                                        </Button>
                                    </Col>
                                </Row>
                            </div>
                        </div>

                        {/* 備註 */}
                        <Form.Group className="mb-4">
                            <Form.Label style={styles.formLabel}>備註（選填）</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                style={styles.formControl}
                                placeholder="請輸入備註內容..."
                            />
                        </Form.Group>

                        {/* 錯誤信息顯示 */}
                        {error && error !== '請選擇公司' && error !== '請選擇車輛' && error !== '請至少選擇一個服務項目或添加自訂項目' && (
                            <div className="alert alert-danger mb-3 py-2">{error}</div>
                        )}

                        {/* 提交按鈕 */}
                        <div className="d-grid">
                            <Button
                                variant="primary"
                                onClick={saveRecord}
                                style={styles.submitButton}
                                size="lg"
                                type="button"
                                disabled={isSaving}
                            >
                                {isSaving ? '儲存中...' : '儲存紀錄'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* MUI 通知元件 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default AddRecordForm; 