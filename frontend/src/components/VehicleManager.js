import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Row, Col, Modal, ListGroup } from 'react-bootstrap';
import { ref, set, push, remove, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaCog, FaBars } from 'react-icons/fa';
// MUI 組件
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// 解決 React 18 StrictMode 相容性問題的自定義 Droppable
const StrictModeDroppable = ({ children, ...props }) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    if (!enabled) {
        return null;
    }

    return <Droppable {...props}>{children}</Droppable>;
};

const VehicleManager = ({ data, companyId, setData, database, onSave }) => {
    // 狀態管理
    const [vehicles, setVehicles] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTypeManagerModal, setShowTypeManagerModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleTypes, setVehicleTypes] = useState(['水泥攪拌車', '連結車']);
    const [showTypeInput, setShowTypeInput] = useState(false);
    const [customType, setCustomType] = useState('');
    const [newTypeInput, setNewTypeInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // 通知相關狀態
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success' 或 'error'

    // 表單欄位
    const [plate, setPlate] = useState('');
    const [type, setType] = useState('水泥攪拌車');
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');
    const [typeError, setTypeError] = useState('');

    // 從data初始化vehicles
    useEffect(() => {
        console.log('VehicleManager - 當前公司ID:', companyId);

        if (data && data.companies && data.companies[companyId] && data.companies[companyId].vehicles) {
            const vehiclesArray = Object.entries(data.companies[companyId].vehicles || {})
                .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                .map(([id, vehicle]) => ({ id, ...vehicle }));
            setVehicles(vehiclesArray);
            console.log('已載入車輛數據:', vehiclesArray.length, '輛車');
        } else {
            console.log('沒有找到公司的車輛數據。公司ID:', companyId);
            console.log('可用的公司:', data?.companies ? Object.keys(data.companies) : '無');
            setVehicles([]);
        }
    }, [data, companyId]);

    // 新增拖曳開始處理
    const onDragStart = () => {
        setIsDragging(true);
        // 更改游標樣式為grabbing
        document.body.style.cursor = 'grabbing';
    };

    // 載入車輛類型
    const loadVehicleTypes = useCallback(async () => {
        try {
            const typesRef = ref(database, 'vehicle_types');
            const snapshot = await get(typesRef);
            if (snapshot.exists()) {
                setVehicleTypes(snapshot.val() || ['水泥攪拌車', '連結車']);
            }
        } catch (error) {
            console.error('載入車輛類型錯誤:', error);
        }
    }, [database]);

    // 顯示通知函數
    const showNotification = (message, severity = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    };

    // 關閉通知
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnackbar(false);
    };

    // 初始化
    useEffect(() => {
        loadVehicleTypes();

        // 清理事件監聽器
        return () => {
            document.body.style.cursor = 'default';
        };
    }, [loadVehicleTypes]);

    // 更新全局資料
    const updateGlobalData = (updatedVehicles) => {
        if (setData) {
            const newData = JSON.parse(JSON.stringify(data));

            // 將車輛數組轉換為對象格式
            const vehiclesObj = {};
            updatedVehicles.forEach(vehicle => {
                vehiclesObj[vehicle.id] = { ...vehicle };
                delete vehiclesObj[vehicle.id].id; // 刪除多餘的 id 字段
            });

            if (!newData.companies[companyId]) {
                newData.companies[companyId] = { vehicles: {} };
            }
            newData.companies[companyId].vehicles = vehiclesObj;
            setData(newData);
        }
    };

    // 添加車輛
    const addVehicle = async () => {
        if (!plate.trim()) {
            setError('車牌號碼不能為空');
            return;
        }

        if (!companyId || companyId === 'all') {
            setError('未選擇公司或公司ID無效');
            console.error('添加車輛錯誤: 公司ID無效', companyId);
            showNotification('未選擇公司或公司ID無效', 'error');
            return;
        }

        setError('');
        try {
            console.log('正在添加車輛到公司:', companyId);

            // 檢查是否已存在相同車牌
            const existingVehicle = vehicles.find(v => v.plate === plate.trim());
            if (existingVehicle) {
                setError('該車牌號碼已存在');
                return;
            }

            // 創建車輛數據
            const newVehicleRef = push(ref(database, `companies/${companyId}/vehicles`));
            const newVehicle = {
                plate: plate.trim(),
                type: type,
                remarks: remarks.trim(),
                records: [],
                sort_index: vehicles.length + 1 // 從1開始計數
            };

            // 更新 Firebase
            await set(newVehicleRef, newVehicle);
            console.log('車輛數據已保存到 Firebase, 路徑:', `companies/${companyId}/vehicles/${newVehicleRef.key}`);

            // 更新本地狀態
            const updatedVehicle = { id: newVehicleRef.key, ...newVehicle };
            const updatedVehicles = [...vehicles, updatedVehicle];
            setVehicles(updatedVehicles);

            // 更新全局資料
            updateGlobalData(updatedVehicles);

            // 重置表單
            resetForm();
            setShowAddModal(false);

            // 顯示成功通知
            showNotification('車輛已成功添加！', 'success');
        } catch (error) {
            console.error('添加車輛時發生錯誤:', error);
            setError(`添加車輛時發生錯誤: ${error.message}`);
            showNotification(`添加車輛時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 更新車輛
    const updateVehicle = async () => {
        if (!plate.trim() || !selectedVehicle) {
            setError('車牌號碼不能為空');
            return;
        }

        setError('');
        try {
            // 檢查是否已存在相同車牌（不包括當前編輯的車輛）
            const existingVehicle = vehicles.find(v => v.plate === plate.trim() && v.id !== selectedVehicle.id);
            if (existingVehicle) {
                setError('該車牌號碼已存在');
                return;
            }

            // 準備更新資料
            const updatedVehicle = {
                plate: plate.trim(),
                type: type,
                remarks: remarks.trim(),
                // 保留原有記錄與排序索引
                records: selectedVehicle.records || [],
                sort_index: selectedVehicle.sort_index
            };

            // 更新 Firebase
            await set(ref(database, `companies/${companyId}/vehicles/${selectedVehicle.id}`), updatedVehicle);

            // 更新本地狀態
            const updatedVehicles = vehicles.map(vehicle =>
                vehicle.id === selectedVehicle.id
                    ? { ...vehicle, ...updatedVehicle }
                    : vehicle
            );
            setVehicles(updatedVehicles);

            // 更新全局資料
            updateGlobalData(updatedVehicles);

            // 重置表單
            resetForm();
            setShowEditModal(false);

            // 顯示成功通知
            showNotification('車輛資料已成功更新！', 'success');
        } catch (error) {
            console.error('更新車輛時發生錯誤:', error);
            setError(`更新車輛時發生錯誤: ${error.message}`);
            showNotification(`更新車輛時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 刪除車輛
    const deleteVehicle = async (vehicle) => {
        if (!window.confirm(`確定要刪除車牌為 "${vehicle.plate}" 的車輛嗎？這將會同時刪除所有相關紀錄！`)) return;

        try {
            // 從 Firebase 刪除
            await remove(ref(database, `companies/${companyId}/vehicles/${vehicle.id}`));

            // 更新本地狀態
            const updatedVehicles = vehicles.filter(v => v.id !== vehicle.id);
            setVehicles(updatedVehicles);

            // 更新全局資料
            updateGlobalData(updatedVehicles);

            // 如果刪除的是當前選中的車輛，則清空選擇
            if (selectedVehicle && selectedVehicle.id === vehicle.id) {
                setSelectedVehicle(null);
            }

            // 通知父元件，但不觸發全頁重新載入
            if (onSave) onSave({ reload: false, source: 'VehicleManager' });

            // 顯示成功通知
            showNotification('車輛已成功刪除！', 'success');
        } catch (error) {
            console.error('刪除車輛時發生錯誤:', error);
            showNotification(`刪除車輛時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 處理拖放排序結束事件
    const onDragEnd = async (result) => {
        // 恢復正常鼠標樣式
        document.body.style.cursor = 'default';
        setIsDragging(false);

        // 如果沒有目標或相同位置，直接返回
        if (!result.destination || result.source.index === result.destination.index) return;

        // 獲取當前的車輛數組副本
        const items = Array.from(vehicles);

        // 從源位置移除被拖拽的項目
        const [reorderedItem] = items.splice(result.source.index, 1);

        // 將項目插入到目標位置
        items.splice(result.destination.index, 0, reorderedItem);

        // 更新排序索引，從1開始
        const reorderedVehicles = items.map((vehicle, index) => ({
            ...vehicle,
            sort_index: index + 1
        }));

        // 更新本地狀態
        setVehicles(reorderedVehicles);

        try {
            // 更新排序索引到 Firebase
            for (const vehicle of reorderedVehicles) {
                await set(ref(database, `companies/${companyId}/vehicles/${vehicle.id}/sort_index`), vehicle.sort_index);
            }

            // 更新全局狀態
            updateGlobalData(reorderedVehicles);

            // 通知父元件，但不觸發重新載入
            if (onSave) onSave({ reload: false, source: 'VehicleManager' });

            showNotification('排序已更新', 'success');
        } catch (error) {
            console.error('更新排序時發生錯誤:', error);
            showNotification(`更新排序時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 添加車輛類型
    const addVehicleType = async () => {
        if (!newTypeInput.trim()) {
            setTypeError('類型不能為空');
            return;
        }

        setTypeError('');
        try {
            // 檢查是否已有相同類型
            if (vehicleTypes.includes(newTypeInput.trim())) {
                setTypeError('該類型已存在');
                return;
            }

            // 添加新類型
            const updatedTypes = [...vehicleTypes, newTypeInput.trim()];

            // 更新 Firebase
            await set(ref(database, 'vehicle_types'), updatedTypes);

            // 更新本地狀態
            setVehicleTypes(updatedTypes);
            setNewTypeInput('');

            // 顯示成功通知
            showNotification('車輛類型已成功添加！', 'success');
        } catch (error) {
            console.error('添加車輛類型時發生錯誤:', error);
            setTypeError(`添加車輛類型時發生錯誤: ${error.message}`);
            showNotification(`添加車輛類型時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 刪除車輛類型
    const deleteVehicleType = async (typeToDelete) => {
        if (!window.confirm(`確定要刪除類型 "${typeToDelete}" 嗎？`)) return;

        try {
            // 過濾掉要刪除的類型
            const updatedTypes = vehicleTypes.filter(t => t !== typeToDelete);

            // 更新 Firebase
            await set(ref(database, 'vehicle_types'), updatedTypes);

            // 更新本地狀態
            setVehicleTypes(updatedTypes);

            // 顯示成功通知
            showNotification('車輛類型已成功刪除！', 'success');
        } catch (error) {
            console.error('刪除車輛類型時發生錯誤:', error);
            showNotification(`刪除車輛類型時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 清除表單
    const resetForm = () => {
        setPlate('');
        setType('水泥攪拌車');
        setRemarks('');
        setError('');
        setCustomType('');
        setShowTypeInput(false);
    };

    // 準備編輯車輛
    const prepareEditVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setPlate(vehicle.plate || '');
        setType(vehicle.type || '水泥攪拌車');
        setRemarks(vehicle.remarks || '');
        setShowEditModal(true);
    };

    // 清理事件監聽器
    useEffect(() => {
        return () => {
            document.body.style.cursor = 'default';
        };
    }, []);


    return (
        <div className="vehicle-manager" style={{ overflow: 'hidden' }}>
            {/* MUI Snackbar 通知 */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbarSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Row className="mb-3">
                <Col>
                    <Button
                        variant="primary"
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="me-2"
                    >
                        新增車輛
                    </Button>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowTypeManagerModal(true)}
                    >
                        <FaCog className="me-1" /> 管理車輛類型
                    </Button>
                </Col>
            </Row>

            {isDragging && (
                <div className="alert alert-info mb-2">
                    <small>拖曳進行中...放開滑鼠完成排序</small>
                </div>
            )}

            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <StrictModeDroppable droppableId={`vehicle-list-${companyId}`}>
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="drag-container mb-3"
                            style={{ overflow: 'hidden' }}
                        >
                            <ListGroup className="mb-3">
                                {vehicles.map((vehicle, index) => (
                                    <Draggable
                                        key={`vehicle-${vehicle.id}`}
                                        draggableId={`vehicle-${vehicle.id}`}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <ListGroup.Item
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`d-flex justify-content-between align-items-center vehicle-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="drag-handle me-2"
                                                        style={{
                                                            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                                            fontSize: '18px',
                                                            backgroundColor: '#f0f0f0',
                                                            padding: '6px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <FaBars />
                                                    </div>
                                                    <div>
                                                        <strong>{vehicle.plate}</strong> ({vehicle.type})
                                                        {vehicle.remarks && <small className="d-block text-muted">備註：{vehicle.remarks}</small>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-1"
                                                        onClick={() => prepareEditVehicle(vehicle)}
                                                    >
                                                        編輯
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => deleteVehicle(vehicle)}
                                                    >
                                                        刪除
                                                    </Button>
                                                </div>
                                            </ListGroup.Item>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </ListGroup>
                        </div>
                    )}
                </StrictModeDroppable>
            </DragDropContext>

            {vehicles.length === 0 && (
                <div className="text-center p-3 bg-light rounded">
                    尚未添加任何車輛
                </div>
            )}

            {/* 新增車輛對話框 */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>新增車輛</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>車牌號碼 *</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入車牌號碼"
                                value={plate}
                                onChange={(e) => setPlate(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>車輛類型 *</Form.Label>
                            {!showTypeInput ? (
                                <div className="d-flex">
                                    <Form.Select
                                        value={type}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setShowTypeInput(true);
                                                setCustomType('');
                                            } else {
                                                setType(e.target.value);
                                            }
                                        }}
                                        className="flex-grow-1"
                                    >
                                        {vehicleTypes.map((type, index) => (
                                            <option key={index} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                        <option value="custom">自定義類型...</option>
                                    </Form.Select>
                                </div>
                            ) : (
                                <div className="d-flex">
                                    <Form.Control
                                        type="text"
                                        placeholder="輸入自定義類型"
                                        value={customType}
                                        onChange={(e) => {
                                            setCustomType(e.target.value);
                                            setType(e.target.value); // 同時更新type值
                                        }}
                                        className="flex-grow-1"
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        className="ms-2"
                                        onClick={() => {
                                            setShowTypeInput(false);
                                            setType(vehicleTypes[0] || '');
                                        }}
                                    >
                                        取消
                                    </Button>
                                </div>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>備註</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="輸入備註（選填）"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Form.Group>

                        {error && <div className="text-danger mb-3">{error}</div>}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={addVehicle}>
                        新增
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 編輯車輛對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>編輯車輛</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>車牌號碼 *</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入車牌號碼"
                                value={plate}
                                onChange={(e) => setPlate(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>車輛類型 *</Form.Label>
                            {!showTypeInput ? (
                                <div className="d-flex">
                                    <Form.Select
                                        value={vehicleTypes.includes(type) ? type : 'custom'}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setShowTypeInput(true);
                                                setCustomType(vehicleTypes.includes(type) ? '' : type);
                                            } else {
                                                setType(e.target.value);
                                            }
                                        }}
                                        className="flex-grow-1"
                                    >
                                        {vehicleTypes.map((t, index) => (
                                            <option key={index} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                        <option value="custom">自定義類型...</option>
                                    </Form.Select>
                                </div>
                            ) : (
                                <div className="d-flex">
                                    <Form.Control
                                        type="text"
                                        placeholder="輸入自定義類型"
                                        value={customType}
                                        onChange={(e) => {
                                            setCustomType(e.target.value);
                                            setType(e.target.value); // 同時更新type值
                                        }}
                                        className="flex-grow-1"
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        className="ms-2"
                                        onClick={() => {
                                            setShowTypeInput(false);
                                            setType(vehicleTypes[0] || '');
                                        }}
                                    >
                                        取消
                                    </Button>
                                </div>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>備註</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="輸入備註（選填）"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Form.Group>

                        {error && <div className="text-danger mb-3">{error}</div>}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={updateVehicle}>
                        更新
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 車輛類型管理對話框 */}
            <Modal
                show={showTypeManagerModal}
                onHide={() => setShowTypeManagerModal(false)}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>管理車輛類型</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label><strong>新增車輛類型</strong></Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入新類型名稱"
                                value={newTypeInput}
                                onChange={(e) => setNewTypeInput(e.target.value)}
                                className="mb-2"
                            />
                            <Button
                                variant="primary"
                                onClick={addVehicleType}
                            >
                                新增車輛類型
                            </Button>
                            {typeError && <div className="text-danger mt-2">{typeError}</div>}
                        </Form.Group>

                        <h6 className="mt-4 mb-3"><strong>現有車輛類型</strong></h6>
                        <ListGroup>
                            {vehicleTypes.map((type, index) => (
                                <ListGroup.Item
                                    key={index}
                                    className="d-flex justify-content-between align-items-center mb-2 border rounded"
                                >
                                    <span className="fs-5">{type}</span>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => deleteVehicleType(type)}
                                    >
                                        刪除
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>

                        {vehicleTypes.length === 0 && (
                            <div className="text-center p-3 bg-light rounded">
                                尚未添加任何車輛類型
                            </div>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTypeManagerModal(false)}>
                        關閉
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default VehicleManager; 