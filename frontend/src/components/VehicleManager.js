import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Modal, ListGroup, Toast, ToastContainer } from 'react-bootstrap';
import { ref, set, push, remove, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaCog, FaCheck, FaTimes } from 'react-icons/fa';

const VehicleManager = ({ data, companyId, setData, database, onSave }) => {
    // 狀態管理
    const [vehicles, setVehicles] = useState(
        Object.entries(data.companies[companyId]?.vehicles || {})
            .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
            .map(([id, vehicle]) => ({ id, ...vehicle }))
    );
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTypeManagerModal, setShowTypeManagerModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleTypes, setVehicleTypes] = useState(['水泥攪拌車', '連結車']);
    const [showTypeInput, setShowTypeInput] = useState(false);
    const [customType, setCustomType] = useState('');
    const [newTypeInput, setNewTypeInput] = useState('');

    // 通知相關狀態
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' 或 'error'

    // 表單欄位
    const [plate, setPlate] = useState('');
    const [type, setType] = useState('水泥攪拌車');
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');
    const [typeError, setTypeError] = useState('');

    // 從資料庫載入已存在的車輛類型
    useEffect(() => {
        const loadVehicleTypes = async () => {
            try {
                // 先設置默認類型
                const defaultTypes = ['水泥攪拌車', '連結車'];
                const existingTypes = new Set(defaultTypes);

                // 從 Firebase 載入車輛類型
                const vehicleTypesRef = ref(database, 'vehicle_types');
                const snapshot = await get(vehicleTypesRef);

                if (snapshot.exists() && snapshot.val()) {
                    const storedTypes = snapshot.val();
                    // 確保 storedTypes 是陣列
                    if (Array.isArray(storedTypes)) {
                        storedTypes.forEach(vType => {
                            if (vType && !existingTypes.has(vType)) {
                                existingTypes.add(vType);
                            }
                        });
                    }
                } else {
                    // 如果資料庫中沒有車輛類型，則初始化默認值
                    await set(vehicleTypesRef, defaultTypes);
                }

                // 再遍歷所有公司的車輛收集類型
                Object.values(data.companies || {}).forEach(company => {
                    Object.values(company.vehicles || {}).forEach(vehicle => {
                        if (vehicle.type && !existingTypes.has(vehicle.type)) {
                            existingTypes.add(vehicle.type);
                        }
                    });
                });

                // 保存所有類型回 Firebase (包括從車輛收集到的類型)
                const allTypesArray = Array.from(existingTypes);
                await set(vehicleTypesRef, allTypesArray);

                // 更新本地狀態
                setVehicleTypes(allTypesArray);
                console.log('已載入車輛類型:', allTypesArray);
            } catch (error) {
                console.error('載入車輛類型時發生錯誤:', error);
            }
        };

        loadVehicleTypes();
    }, [data.companies, database]);

    // 保存車輛類型到 Firebase
    const saveVehicleTypes = async (types) => {
        try {
            console.log('保存車輛類型到 Firebase:', types);
            await set(ref(database, 'vehicle_types'), types);
            return true;
        } catch (error) {
            console.error('保存車輛類型時發生錯誤:', error);
            return false;
        }
    };

    // 顯示通知函數
    const showNotification = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    // 添加車輛類型
    const addVehicleType = async () => {
        if (!newTypeInput.trim()) {
            setTypeError('請輸入車輛種類名稱');
            return;
        }

        if (vehicleTypes.includes(newTypeInput.trim())) {
            setTypeError('此車輛種類已存在');
            return;
        }

        const newTypes = [...vehicleTypes, newTypeInput.trim()];
        setVehicleTypes(newTypes);
        const saveSuccess = await saveVehicleTypes(newTypes);

        if (saveSuccess) {
            const typeName = newTypeInput.trim();
            setNewTypeInput('');
            setTypeError('');
            showNotification(`已成功新增車輛種類「${typeName}」`, 'success');
        } else {
            setTypeError('儲存車輛種類失敗，請稍後再試');
            showNotification('儲存車輛種類失敗，請稍後再試', 'error');
        }
    };

    // 刪除車輛類型
    const deleteVehicleType = async (typeToDelete) => {
        // 防止刪除預設類型
        if (typeToDelete === '水泥攪拌車' || typeToDelete === '連結車') {
            showNotification('無法刪除預設車輛種類', 'error');
            return;
        }

        // 檢查是否有車輛正在使用此類型
        let isInUse = false;
        Object.values(data.companies || {}).forEach(company => {
            Object.values(company.vehicles || {}).forEach(vehicle => {
                if (vehicle.type === typeToDelete) {
                    isInUse = true;
                }
            });
        });

        if (isInUse) {
            if (!window.confirm(`有車輛正在使用「${typeToDelete}」種類，確定要刪除嗎？`)) {
                return;
            }
        } else {
            if (!window.confirm(`確定要刪除「${typeToDelete}」車輛種類嗎？`)) {
                return;
            }
        }

        const newTypes = vehicleTypes.filter(t => t !== typeToDelete);
        setVehicleTypes(newTypes);
        const saveSuccess = await saveVehicleTypes(newTypes);

        if (saveSuccess) {
            showNotification(`已成功刪除車輛種類「${typeToDelete}」`, 'success');
        } else {
            showNotification('刪除車輛種類失敗，請稍後再試', 'error');
            // 恢復原有種類列表
            setVehicleTypes([...vehicleTypes]);
        }
    };

    // 添加車輛
    const addVehicle = async () => {
        if (!plate.trim()) {
            setError('請輸入車牌號碼');
            return;
        }

        // 準備車輛類型
        let vehicleType = type;
        if (showTypeInput && customType.trim()) {
            vehicleType = customType.trim();

            // 將新類型添加到選項中
            if (!vehicleTypes.includes(vehicleType)) {
                const newTypes = [...vehicleTypes, vehicleType];
                setVehicleTypes(newTypes);
                saveVehicleTypes(newTypes);
            }
        } else if (!vehicleType) {
            setError('請選擇或輸入車輛種類');
            return;
        }

        try {
            // 建立新車輛物件
            const newVehicle = {
                plate: plate.trim(),
                type: vehicleType,
                remarks: remarks.trim(),
                records: [],
                sort_index: vehicles.length
            };

            // 更新 Firebase
            const newVehicleRef = push(ref(database, `companies/${companyId}/vehicles`));
            await set(newVehicleRef, newVehicle);

            // 更新本地狀態
            const newVehicleWithId = { id: newVehicleRef.key, ...newVehicle };
            setVehicles([...vehicles, newVehicleWithId]);

            // 清除表單
            setPlate('');
            setType('水泥攪拌車');
            setCustomType('');
            setRemarks('');
            setShowTypeInput(false);
            setShowAddModal(false);
            setError('');

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('添加車輛時發生錯誤:', error);
            setError(`添加車輛時發生錯誤: ${error.message}`);
        }
    };

    // 編輯車輛
    const editVehicle = async () => {
        if (!plate.trim()) {
            setError('請輸入車牌號碼');
            return;
        }

        // 準備車輛類型
        let vehicleType = type;
        if (showTypeInput && customType.trim()) {
            vehicleType = customType.trim();

            // 將新類型添加到選項中
            if (!vehicleTypes.includes(vehicleType)) {
                const newTypes = [...vehicleTypes, vehicleType];
                setVehicleTypes(newTypes);
                saveVehicleTypes(newTypes);
            }
        } else if (!vehicleType) {
            setError('請選擇或輸入車輛種類');
            return;
        }

        try {
            // 更新選中的車輛
            const updatedVehicle = {
                ...selectedVehicle,
                plate: plate.trim(),
                type: vehicleType,
                remarks: remarks.trim()
            };

            // 更新 Firebase
            await set(ref(database, `companies/${companyId}/vehicles/${selectedVehicle.id}`), {
                plate: updatedVehicle.plate,
                type: updatedVehicle.type,
                remarks: updatedVehicle.remarks,
                records: updatedVehicle.records || [],
                sort_index: updatedVehicle.sort_index
            });

            // 更新本地狀態
            const newVehicles = vehicles.map(vehicle =>
                vehicle.id === selectedVehicle.id ? updatedVehicle : vehicle
            );
            setVehicles(newVehicles);

            // 清除表單
            setPlate('');
            setType('水泥攪拌車');
            setCustomType('');
            setRemarks('');
            setShowTypeInput(false);
            setSelectedVehicle(null);
            setShowEditModal(false);
            setError('');

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('編輯車輛時發生錯誤:', error);
            setError(`編輯車輛時發生錯誤: ${error.message}`);
        }
    };

    // 刪除車輛
    const deleteVehicle = async (vehicle) => {
        if (!window.confirm(`確定要刪除 "${vehicle.plate}" 嗎？這會一併刪除該車輛的所有記錄！`)) {
            return;
        }

        try {
            // 從 Firebase 刪除車輛
            await remove(ref(database, `companies/${companyId}/vehicles/${vehicle.id}`));

            // 更新本地狀態
            const newVehicles = vehicles.filter(v => v.id !== vehicle.id);

            // 更新排序索引
            const reorderedVehicles = newVehicles.map((vehicle, index) => ({
                ...vehicle,
                sort_index: index
            }));

            // 更新排序索引到 Firebase
            reorderedVehicles.forEach(async (vehicle) => {
                await set(ref(database, `companies/${companyId}/vehicles/${vehicle.id}/sort_index`), vehicle.sort_index);
            });

            setVehicles(reorderedVehicles);

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('刪除車輛時發生錯誤:', error);
            alert(`刪除車輛時發生錯誤: ${error.message}`);
        }
    };

    // 處理拖放排序結束事件
    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const items = Array.from(vehicles);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // 更新排序索引
        const reorderedVehicles = items.map((vehicle, index) => ({
            ...vehicle,
            sort_index: index
        }));

        // 更新本地狀態
        setVehicles(reorderedVehicles);

        // 更新排序索引到 Firebase
        reorderedVehicles.forEach(async (vehicle) => {
            await set(ref(database, `companies/${companyId}/vehicles/${vehicle.id}/sort_index`), vehicle.sort_index);
        });

        // 通知父元件
        if (onSave) onSave();
    };

    // 重置表單
    const resetForm = () => {
        setPlate('');
        setType('水泥攪拌車');
        setCustomType('');
        setRemarks('');
        setShowTypeInput(false);
        setError('');
    };

    return (
        <div className="vehicle-manager">
            {/* 通知 Toast */}
            <ToastContainer
                position="bottom-end"
                className="p-3 position-fixed"
                style={{ zIndex: 1060 }}
            >
                <Toast
                    show={showToast}
                    onClose={() => setShowToast(false)}
                    delay={3000}
                    autohide
                    bg={toastType === 'success' ? 'success' : 'danger'}
                    text="white"
                >
                    <Toast.Header closeButton>
                        {toastType === 'success' ? (
                            <FaCheck className="me-2 text-success" />
                        ) : (
                            <FaTimes className="me-2 text-danger" />
                        )}
                        <strong className="me-auto">
                            {toastType === 'success' ? '成功' : '錯誤'}
                        </strong>
                    </Toast.Header>
                    <Toast.Body>{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>

            <Row className="mb-3">
                <Col xs={8}>
                    <Button
                        variant="primary"
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                    >
                        新增車輛
                    </Button>
                </Col>
                <Col xs={4} className="text-end">
                    <Button
                        variant="outline-secondary"
                        onClick={() => {
                            setNewTypeInput('');
                            setTypeError('');
                            setShowTypeManagerModal(true);
                        }}
                    >
                        <FaCog className="me-1" /> 管理車輛種類
                    </Button>
                </Col>
            </Row>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="vehicles">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            <ListGroup className="mb-3">
                                {vehicles.map((vehicle, index) => (
                                    <Draggable
                                        key={vehicle.id}
                                        draggableId={vehicle.id}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <ListGroup.Item
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`d-flex justify-content-between align-items-center sortable-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                            >
                                                <div>
                                                    <strong>{vehicle.plate}</strong> ({vehicle.type})
                                                    {vehicle.remarks && <small className="d-block text-muted">備註：{vehicle.remarks}</small>}
                                                </div>
                                                <div>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => {
                                                            setSelectedVehicle(vehicle);
                                                            setPlate(vehicle.plate);

                                                            // 檢查車輛類型是否在預設選項中
                                                            if (vehicleTypes.includes(vehicle.type)) {
                                                                setType(vehicle.type);
                                                                setShowTypeInput(false);
                                                            } else {
                                                                setType('');
                                                                setCustomType(vehicle.type);
                                                                setShowTypeInput(true);
                                                            }

                                                            setRemarks(vehicle.remarks || '');
                                                            setError('');
                                                            setShowEditModal(true);
                                                        }}
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
                </Droppable>
            </DragDropContext>

            {vehicles.length === 0 && (
                <div className="text-center p-3 bg-light rounded">
                    尚未添加任何車輛
                </div>
            )}

            {/* 新增車輛對話框 */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>車輛資料</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>車牌號碼:</Form.Label>
                            <Form.Control
                                type="text"
                                value={plate}
                                onChange={(e) => setPlate(e.target.value)}
                                placeholder="請輸入車牌號碼"
                                isInvalid={error === '請輸入車牌號碼'}
                            />
                            {error === '請輸入車牌號碼' && (
                                <Form.Control.Feedback type="invalid">
                                    {error}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>車輛種類:</Form.Label>
                            {!showTypeInput ? (
                                <>
                                    <Form.Select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        isInvalid={error === '請選擇或輸入車輛種類'}
                                    >
                                        {vehicleTypes.map(vType => (
                                            <option key={vType} value={vType}>{vType}</option>
                                        ))}
                                    </Form.Select>

                                </>
                            ) : (
                                <>
                                    <Form.Control
                                        type="text"
                                        value={customType}
                                        onChange={(e) => setCustomType(e.target.value)}
                                        placeholder="請輸入自定義車輛種類"
                                        isInvalid={error === '請選擇或輸入車輛種類'}
                                    />
                                    <Button
                                        variant="link"
                                        className="p-0 mt-1"
                                        onClick={() => {
                                            setShowTypeInput(false);
                                            setType('水泥攪拌車');
                                        }}
                                    >
                                        使用預設車輛種類
                                    </Button>
                                </>
                            )}
                            {error === '請選擇或輸入車輛種類' && (
                                <Form.Control.Feedback type="invalid">
                                    {error}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>備註:</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="請輸入備註（選填）"
                            />
                        </Form.Group>
                    </Form>

                    {error && error !== '請輸入車牌號碼' && error !== '請選擇或輸入車輛種類' && (
                        <div className="alert alert-danger">{error}</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={addVehicle}>
                        儲存
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 編輯車輛對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>車輛資料</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>車牌號碼:</Form.Label>
                            <Form.Control
                                type="text"
                                value={plate}
                                onChange={(e) => setPlate(e.target.value)}
                                isInvalid={error === '請輸入車牌號碼'}
                            />
                            {error === '請輸入車牌號碼' && (
                                <Form.Control.Feedback type="invalid">
                                    {error}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>車輛種類:</Form.Label>
                            {!showTypeInput ? (
                                <>
                                    <Form.Select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        isInvalid={error === '請選擇或輸入車輛種類'}
                                    >
                                        {vehicleTypes.map(vType => (
                                            <option key={vType} value={vType}>{vType}</option>
                                        ))}
                                    </Form.Select>

                                </>
                            ) : (
                                <>
                                    <Form.Control
                                        type="text"
                                        value={customType}
                                        onChange={(e) => setCustomType(e.target.value)}
                                        placeholder="請輸入自定義車輛種類"
                                        isInvalid={error === '請選擇或輸入車輛種類'}
                                    />
                                    <Button
                                        variant="link"
                                        className="p-0 mt-1"
                                        onClick={() => {
                                            setShowTypeInput(false);
                                            setType('水泥攪拌車');
                                        }}
                                    >
                                        使用預設車輛種類
                                    </Button>
                                </>
                            )}
                            {error === '請選擇或輸入車輛種類' && (
                                <Form.Control.Feedback type="invalid">
                                    {error}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>備註:</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Form.Group>
                    </Form>

                    {error && error !== '請輸入車牌號碼' && error !== '請選擇或輸入車輛種類' && (
                        <div className="alert alert-danger">{error}</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={editVehicle}>
                        儲存
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 車輛種類管理對話框 */}
            <Modal show={showTypeManagerModal} onHide={() => setShowTypeManagerModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>車輛種類管理</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>新增車輛種類:</Form.Label>
                        <div className="d-flex mb-2">
                            <Form.Control
                                type="text"
                                value={newTypeInput}
                                onChange={(e) => setNewTypeInput(e.target.value)}
                                placeholder="請輸入新車輛種類名稱"
                                isInvalid={!!typeError}
                                className="me-2 flex-grow-1"
                            />
                            <Button variant="primary" onClick={addVehicleType} style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>
                                新增
                            </Button>
                        </div>
                        {typeError && (
                            <Form.Text className="text-danger">
                                {typeError}
                            </Form.Text>
                        )}
                    </Form.Group>

                    <hr />

                    <h6>已有車輛種類:</h6>
                    <ListGroup className="mb-3">
                        {vehicleTypes.map(vType => (
                            <ListGroup.Item key={vType} className="d-flex justify-content-between align-items-center">
                                <span className="text-break flex-grow-1 me-2">{vType}</span>
                                {(vType === '水泥攪拌車' || vType === '連結車') ? (
                                    <span className="text-muted small">預設（無法刪除）</span>
                                ) : (
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => deleteVehicleType(vType)}
                                        style={{ minWidth: '70px' }}
                                    >
                                        刪除
                                    </Button>
                                )}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
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