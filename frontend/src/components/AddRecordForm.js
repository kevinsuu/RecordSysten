import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, InputGroup, Card, ListGroup } from 'react-bootstrap';
import { ref, set, get, push } from 'firebase/database';
import DatePicker from 'react-datepicker';
import { FaPlus, FaTrash, FaCalendarAlt, FaCheck } from 'react-icons/fa';
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

const AddRecordForm = ({ data, setData, database, companyId, vehicleId, onSave }) => {
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
        }
    };

    // 載入洗車項目
    useEffect(() => {
        const loadWashItems = async () => {
            try {
                const washItemsRef = ref(database, 'wash_items');
                const snapshot = await get(washItemsRef);
                if (snapshot.exists()) {
                    const items = snapshot.val() || [];
                    setWashItems(items);
                } else {
                    setWashItems([]);
                }
            } catch (error) {
                console.error('載入洗車項目時發生錯誤:', error);
            }
        };

        loadWashItems();
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

    // 轉換服務項目為 react-select 格式
    const washItemOptions = washItems.map((item, index) => ({
        value: index,
        label: `${formatWashItemName(item)} - $${formatWashItemPrice(item)}`,
        item: item
    }));

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
        })
    };

    // 處理服務項目多選
    const handleWashItemsChange = (selectedOptions) => {
        const newSelectedItems = selectedOptions.map(option => option.item);
        setSelectedItems(newSelectedItems);
    };

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

    // 計算總金額
    const calculateTotal = () => {
        // 計算已選服務項目的總金額
        const selectedItemsTotal = selectedItems.reduce((total, item) => {
            return total + (parseFloat(item.price) || 0);
        }, 0);

        // 計算自訂項目的總金額
        const customItemsTotal = customItems.reduce((total, item) => {
            return total + (parseFloat(item.price) || 0);
        }, 0);

        return selectedItemsTotal + customItemsTotal;
    };

    // 儲存記錄
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
            // 準備新記錄數據
            const dateString = date.toISOString().split('T')[0];
            const allItems = [...selectedItems, ...customItems];

            // 獲取當前記錄
            const records = data.companies[selectedCompanyId]?.vehicles[selectedVehicleId]?.records || [];

            // 建立時間戳 (毫秒)
            const timestamp = Date.now();

            // 準備新記錄
            const newRecord = {
                date: dateString,
                payment_type: paymentType,
                items: allItems,
                remarks: remarks.trim(),
                timestamp: timestamp // 添加時間戳
            };

            // 添加新記錄
            const updatedRecords = [...records, newRecord];

            // 更新 Firebase
            await set(ref(database, `companies/${selectedCompanyId}/vehicles/${selectedVehicleId}/records`), updatedRecords);

            // 更新本地狀態 (重要：避免觸發頁面重新載入)
            const newData = { ...data };
            newData.companies[selectedCompanyId].vehicles[selectedVehicleId].records = updatedRecords;
            setData(newData);

            // 清除表單
            setDate(new Date());
            setPaymentType('receivable');
            setSelectedItems([]);
            setCustomItems([]);
            setNewCustomItem({ name: '', price: '' });
            setRemarks('');
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

            // 通知父元件，傳遞新紀錄和reload=false，避免重新載入
            onSave({
                reload: false,
                newRecord: formattedRecord,
                updatedData: newData,
                source: 'AddRecordForm'
            });

            showNotification('記錄已成功儲存', 'success');
        } catch (error) {
            console.error('儲存記錄時發生錯誤:', error);
            setError(`儲存記錄時發生錯誤: ${error.message}`);
            showNotification(`儲存記錄時發生錯誤: ${error.message}`, 'danger');
        } finally {
            setIsSaving(false);
        }
    };

    // 檢查項目是否已被選中
    const isItemSelected = (item) => {
        return selectedItems.some(selectedItem =>
            typeof item === 'string'
                ? selectedItem.name === item
                : selectedItem.name === item.name
        );
    };

    return (
        <div className="add-record-form">
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-3">
                    <Form onSubmit={(e) => e.preventDefault()}>
                        {/* 基本資訊區塊 */}
                        <div style={styles.cardSection}>
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

                            {/* 日期選擇 */}
                            <Form.Group className="mb-3">
                                <Form.Label style={styles.formLabel}>日期</Form.Label>
                                <div style={styles.datePickerWrapper}>
                                    <DatePicker
                                        selected={date}
                                        onChange={date => setDate(date)}
                                        className="form-control"
                                        dateFormat="yyyy-MM-dd"
                                        style={styles.formControl}
                                    />
                                    <FaCalendarAlt style={styles.datePickerIcon} />
                                </div>
                            </Form.Group>

                            {/* 應付/應收選擇 */}
                            <Form.Group className="mb-0">
                                <Form.Label style={styles.formLabel}>類型</Form.Label>
                                <div className="d-flex">
                                    <Form.Check
                                        type="radio"
                                        label="應收廠商"
                                        name="paymentType"
                                        id="receivable"
                                        checked={paymentType === 'receivable'}
                                        onChange={() => setPaymentType('receivable')}
                                        className="me-4"
                                    />
                                    <Form.Check
                                        type="radio"
                                        label="應付廠商"
                                        name="paymentType"
                                        id="payable"
                                        checked={paymentType === 'payable'}
                                        onChange={() => setPaymentType('payable')}
                                    />
                                </div>
                            </Form.Group>
                        </div>

                        {/* 服務項目區塊 */}
                        <div style={styles.cardSection}>
                            <h6 className="mb-3 text-muted">服務項目</h6>

                            {/* 使用 Select 元件替換原本的 ListGroup */}
                            <Select
                                options={washItemOptions}
                                value={washItemOptions.filter(option =>
                                    selectedItems.some(item =>
                                        (typeof item === 'string' ? item : item.name) ===
                                        (typeof option.item === 'string' ? option.item : option.item.name)
                                    )
                                )}
                                onChange={handleWashItemsChange}
                                isMulti
                                placeholder="選擇或搜尋服務項目..."
                                noOptionsMessage={() => "找不到符合的服務項目"}
                                styles={selectStyles}
                            />

                            {/* 自訂項目區塊 */}
                            <div className="mt-4">
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

                            {/* 金額總計 */}
                            <div className="mt-4 d-flex justify-content-between align-items-center p-2 bg-white rounded">
                                <h6 className="mb-0">金額總計</h6>
                                <span style={styles.totalAmount}>${calculateTotal().toLocaleString()}</span>
                            </div>

                            {/* 錯誤提示 */}
                            {error === '請至少選擇一個服務項目或添加自訂項目' && (
                                <div className="alert alert-danger mt-2 mb-0 py-2">{error}</div>
                            )}
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
                                onClick={(event) => saveRecord(event)}
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