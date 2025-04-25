import React, { useState } from 'react';
import { Button, Form, Row, Col, Modal, ListGroup } from 'react-bootstrap';
import { ref, set, push, remove } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const VehicleManager = ({ data, companyId, setData, database, onSave }) => {
    // 狀態管理
    const [vehicles, setVehicles] = useState(
        Object.entries(data.companies[companyId]?.vehicles || {})
            .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
            .map(([id, vehicle]) => ({ id, ...vehicle }))
    );
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    // 表單欄位
    const [plate, setPlate] = useState('');
    const [type, setType] = useState('');
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');

    // 添加車輛
    const addVehicle = async () => {
        if (!plate.trim()) {
            setError('請輸入車牌號碼');
            return;
        }

        if (!type.trim()) {
            setError('請輸入車輛種類');
            return;
        }

        try {
            // 建立新車輛物件
            const newVehicle = {
                plate: plate.trim(),
                type: type.trim(),
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
            setType('');
            setRemarks('');
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

        if (!type.trim()) {
            setError('請輸入車輛種類');
            return;
        }

        try {
            // 更新選中的車輛
            const updatedVehicle = {
                ...selectedVehicle,
                plate: plate.trim(),
                type: type.trim(),
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
            setType('');
            setRemarks('');
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

    return (
        <div className="vehicle-manager">
            <Row className="mb-3">
                <Col>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setPlate('');
                            setType('');
                            setRemarks('');
                            setError('');
                            setShowAddModal(true);
                        }}
                    >
                        新增車輛
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
                                                            setType(vehicle.type);
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
                    <Modal.Title>新增車輛</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>車牌號碼</Form.Label>
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
                            <Form.Label>車輛種類</Form.Label>
                            <Form.Control
                                type="text"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                isInvalid={error === '請輸入車輛種類'}
                            />
                            {error === '請輸入車輛種類' && (
                                <Form.Control.Feedback type="invalid">
                                    {error}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>備註（選填）</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Form.Group>
                    </Form>

                    {error && error !== '請輸入車牌號碼' && error !== '請輸入車輛種類' && (
                        <div className="alert alert-danger">{error}</div>
                    )}
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
                            <Form.Label>車牌號碼</Form.Label>
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
                            <Form.Label>車輛種類</Form.Label>
                            <Form.Control
                                type="text"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                isInvalid={error === '請輸入車輛種類'}
                            />
                            {error === '請輸入車輛種類' && (
                                <Form.Control.Feedback type="invalid">
                                    {error}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>備註（選填）</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Form.Group>
                    </Form>

                    {error && error !== '請輸入車牌號碼' && error !== '請輸入車輛種類' && (
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
        </div>
    );
};

export default VehicleManager; 