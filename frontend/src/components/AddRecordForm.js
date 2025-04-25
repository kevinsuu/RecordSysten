import React, { useState } from 'react';
import { Button, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { ref, set } from 'firebase/database';
import DatePicker from 'react-datepicker';
import { FaPlus, FaTrash } from 'react-icons/fa';

const AddRecordForm = ({ data, setData, database, companyId, vehicleId, onSave }) => {
    // 狀態管理
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId || '');
    const [date, setDate] = useState(new Date());
    const [paymentType, setPaymentType] = useState('receivable'); // 應收廠商為預設值
    const [serviceTitems, setServiceItems] = useState([{ name: '', price: 0 }]);
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');

    // 添加服務項目
    const addServiceItem = () => {
        setServiceItems([...serviceTitems, { name: '', price: 0 }]);
    };

    // 刪除服務項目
    const removeServiceItem = (index) => {
        if (serviceTitems.length === 1) {
            // 至少需要一個項目
            return;
        }

        const newItems = [...serviceTitems];
        newItems.splice(index, 1);
        setServiceItems(newItems);
    };

    // 更新服務項目
    const updateServiceItem = (index, field, value) => {
        const newItems = [...serviceTitems];
        newItems[index] = { ...newItems[index], [field]: value };
        setServiceItems(newItems);
    };

    // 儲存記錄
    const saveRecord = async () => {
        // 檢查必填欄位
        if (!selectedCompanyId) {
            setError('請選擇公司');
            return;
        }

        if (!selectedVehicleId) {
            setError('請選擇車輛');
            return;
        }

        // 檢查服務項目
        let hasEmptyItem = false;
        serviceTitems.forEach(item => {
            if (!item.name.trim()) {
                hasEmptyItem = true;
            }
        });

        if (hasEmptyItem) {
            setError('請填寫所有服務項目名稱');
            return;
        }

        try {
            // 格式化日期
            const dateStr = date.toISOString().split('T')[0];

            // 建立新記錄物件
            const newRecord = {
                date: dateStr,
                payment_type: paymentType,
                items: serviceTitems.map(item => ({
                    name: item.name.trim(),
                    price: parseFloat(item.price) || 0
                })),
                remarks: remarks.trim()
            };

            // 獲取當前車輛的記錄
            const vehicleData = data.companies[selectedCompanyId].vehicles[selectedVehicleId];
            const records = vehicleData.records || [];

            // 添加新記錄
            const updatedRecords = [...records, newRecord];

            // 更新 Firebase
            await set(ref(database, `companies/${selectedCompanyId}/vehicles/${selectedVehicleId}/records`), updatedRecords);

            // 更新本地狀態
            const newData = { ...data };
            newData.companies[selectedCompanyId].vehicles[selectedVehicleId].records = updatedRecords;
            setData(newData);

            // 清除表單
            setDate(new Date());
            setPaymentType('receivable');
            setServiceItems([{ name: '', price: 0 }]);
            setRemarks('');
            setError('');

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('新增記錄時發生錯誤:', error);
            setError(`新增記錄時發生錯誤: ${error.message}`);
        }
    };

    // 計算總金額
    const calculateTotal = () => {
        return serviceTitems.reduce((total, item) => {
            return total + (parseFloat(item.price) || 0);
        }, 0);
    };

    return (
        <div className="add-record-form">
            <Form>
                {/* 公司選擇 */}
                <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>公司</Form.Label>
                    <Col sm={9}>
                        <Form.Select
                            value={selectedCompanyId}
                            onChange={(e) => {
                                setSelectedCompanyId(e.target.value);
                                setSelectedVehicleId(''); // 清除選擇的車輛
                            }}
                            isInvalid={error === '請選擇公司'}
                        >
                            <option value="">選擇公司</option>
                            {Object.entries(data.companies || {})
                                .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                                .map(([id, company]) => (
                                    <option key={id} value={id}>{company.name}</option>
                                ))
                            }
                        </Form.Select>
                        {error === '請選擇公司' && (
                            <Form.Control.Feedback type="invalid">
                                {error}
                            </Form.Control.Feedback>
                        )}
                    </Col>
                </Form.Group>

                {/* 車輛選擇 */}
                <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>車輛</Form.Label>
                    <Col sm={9}>
                        <Form.Select
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            isInvalid={error === '請選擇車輛'}
                            disabled={!selectedCompanyId}
                        >
                            <option value="">選擇車輛</option>
                            {selectedCompanyId && Object.entries(data.companies[selectedCompanyId]?.vehicles || {})
                                .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                                .map(([id, vehicle]) => (
                                    <option key={id} value={id}>
                                        {vehicle.plate} ({vehicle.type})
                                    </option>
                                ))
                            }
                        </Form.Select>
                        {error === '請選擇車輛' && (
                            <Form.Control.Feedback type="invalid">
                                {error}
                            </Form.Control.Feedback>
                        )}
                    </Col>
                </Form.Group>

                {/* 日期選擇 */}
                <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>日期</Form.Label>
                    <Col sm={9}>
                        <DatePicker
                            selected={date}
                            onChange={date => setDate(date)}
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                        />
                    </Col>
                </Form.Group>

                {/* 應付/應收選擇 */}
                <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>類型</Form.Label>
                    <Col sm={9}>
                        <div className="d-flex">
                            <Form.Check
                                type="radio"
                                label="應收廠商"
                                name="paymentType"
                                id="receivable"
                                checked={paymentType === 'receivable'}
                                onChange={() => setPaymentType('receivable')}
                                className="me-3"
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
                    </Col>
                </Form.Group>

                {/* 服務項目 */}
                <Form.Group className="mb-3">
                    <Form.Label>服務項目</Form.Label>
                    {serviceTitems.map((item, index) => (
                        <Row key={index} className="mb-2 align-items-center">
                            <Col xs={6}>
                                <Form.Control
                                    placeholder="項目名稱"
                                    value={item.name}
                                    onChange={(e) => updateServiceItem(index, 'name', e.target.value)}
                                    isInvalid={error === '請填寫所有服務項目名稱' && !item.name.trim()}
                                />
                                {error === '請填寫所有服務項目名稱' && !item.name.trim() && (
                                    <Form.Control.Feedback type="invalid">
                                        請填寫項目名稱
                                    </Form.Control.Feedback>
                                )}
                            </Col>
                            <Col xs={4}>
                                <InputGroup>
                                    <InputGroup.Text>$</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        placeholder="0"
                                        value={item.price}
                                        onChange={(e) => updateServiceItem(index, 'price', e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col xs={2}>
                                <Button
                                    variant="outline-danger"
                                    onClick={() => removeServiceItem(index)}
                                    disabled={serviceTitems.length === 1}
                                >
                                    <FaTrash />
                                </Button>
                            </Col>
                        </Row>
                    ))}

                    <div className="mt-2">
                        <Button variant="outline-primary" onClick={addServiceItem}>
                            <FaPlus className="me-1" /> 添加項目
                        </Button>
                    </div>
                </Form.Group>

                {/* 總金額顯示 */}
                <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>金額總計</Form.Label>
                    <Col sm={9}>
                        <Form.Control
                            plaintext
                            readOnly
                            value={`$${calculateTotal().toLocaleString()}`}
                            className="fw-bold"
                        />
                    </Col>
                </Form.Group>

                {/* 備註 */}
                <Form.Group className="mb-3">
                    <Form.Label>備註（選填）</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </Form.Group>

                {/* 錯誤信息顯示 */}
                {error && error !== '請選擇公司' && error !== '請選擇車輛' && error !== '請填寫所有服務項目名稱' && (
                    <div className="alert alert-danger mb-3">{error}</div>
                )}

                {/* 提交按鈕 */}
                <div className="d-flex justify-content-end">
                    <Button variant="primary" onClick={saveRecord}>
                        儲存紀錄
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default AddRecordForm; 