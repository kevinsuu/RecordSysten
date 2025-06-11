import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, ListGroup, Modal } from 'react-bootstrap';
import { ref, set, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaPlus, FaBars } from 'react-icons/fa';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// 解決 React 18 StrictMode 相容性問題的自定義 Droppable
const StrictModeDroppable = ({ children, droppableId, type = "DEFAULT", direction = "vertical", ignoreContainerClipping = false, isDropDisabled = false, isCombineEnabled = false, renderClone, mode = "standard", ...props }) => {
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

    return (
        <Droppable
            droppableId={droppableId}
            type={type}
            direction={direction}
            ignoreContainerClipping={ignoreContainerClipping}
            isDropDisabled={isDropDisabled}
            isCombineEnabled={isCombineEnabled}
            renderClone={renderClone}
            mode={mode}
            {...props}
        >
            {children}
        </Droppable>
    );
};

const WashItemManager = ({ database, onSave }) => {
    const [washItems, setWashItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemId, setNewItemId] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [lastEditedItemId, setLastEditedItemId] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // 載入服務項目
    useEffect(() => {
        const fetchWashItems = async () => {
            try {
                const washItemsRef = ref(database, 'wash_items');
                const snapshot = await get(washItemsRef);
                if (snapshot.exists()) {
                    const items = snapshot.val();
                    const itemsList = Object.entries(items)
                        .map(([id, item]) => ({
                            id,
                            ...item
                        }));
                    setWashItems(itemsList);
                }
            } catch (error) {
                console.error('Error fetching wash items:', error);
                setSnackbar({
                    open: true,
                    message: '載入服務項目時發生錯誤',
                    severity: 'error'
                });
            }
        };

        fetchWashItems();
    }, [database]);

    // 儲存服務項目
    const saveWashItems = async (items) => {
        try {
            const washItemsRef = ref(database, 'wash_items');
            const itemsObject = items.reduce((acc, item, index) => {
                acc[item.id] = {
                    name: item.name,
                    price: item.price,
                    sort_index: index
                };
                return acc;
            }, {});

            await set(washItemsRef, itemsObject);
            if (onSave) {
                onSave({ reload: false });
            }
            return true;
        } catch (error) {
            console.error('Error saving wash items:', error);
            setSnackbar({
                open: true,
                message: '儲存服務項目時發生錯誤',
                severity: 'error'
            });
            return false;
        }
    };

    // 處理新增項目
    const handleAddItem = async () => {
        if (!newItemName.trim() || !newItemPrice.trim()) {
            setSnackbar({
                open: true,
                message: '請填寫項目名稱和價格',
                severity: 'warning'
            });
            return;
        }

        const price = parseFloat(newItemPrice);
        if (isNaN(price) || price < 0) {
            setSnackbar({
                open: true,
                message: '請輸入有效的價格',
                severity: 'warning'
            });
            return;
        }

        // 使用輸入的ID或生成新ID
        const itemId = newItemId.trim() || Date.now().toString();

        // 檢查ID是否已存在
        if (newItemId.trim() && washItems.some(item => item.id === itemId)) {
            setSnackbar({
                open: true,
                message: '此ID已存在，請使用不同的ID',
                severity: 'warning'
            });
            return;
        }

        const newItem = {
            id: itemId,
            name: newItemName.trim(),
            price: price
        };

        // 將新項目放在最上方
        const updatedItems = [newItem, ...washItems];
        const success = await saveWashItems(updatedItems);

        if (success) {
            setWashItems(updatedItems);
            setNewItemName('');
            setNewItemPrice('');
            setNewItemId('');
            setLastEditedItemId(itemId);

            // 5秒後清除高亮狀態
            setTimeout(() => {
                setLastEditedItemId(null);
            }, 5000);

            setSnackbar({
                open: true,
                message: '新增服務項目成功',
                severity: 'success'
            });
        }
    };

    // 處理編輯項目
    const handleEditItem = (item) => {
        setEditingItem({
            ...item,
            originalId: item.id // 保存原始ID以便檢查是否已變更
        });
        setShowEditModal(true);
    };

    // 處理更新項目
    const handleUpdateItem = async () => {
        if (!editingItem.name.trim() || !editingItem.price.toString().trim() || !editingItem.id.trim()) {
            setSnackbar({
                open: true,
                message: '請填寫項目ID、名稱和價格',
                severity: 'warning'
            });
            return;
        }

        const price = parseFloat(editingItem.price);
        if (isNaN(price) || price < 0) {
            setSnackbar({
                open: true,
                message: '請輸入有效的價格',
                severity: 'warning'
            });
            return;
        }

        // 檢查是否有重複ID（排除自身）
        const isDuplicateId = washItems.some(item =>
            item.id === editingItem.id && item.id !== editingItem.originalId
        );

        if (isDuplicateId) {
            setSnackbar({
                open: true,
                message: '此ID已存在，請使用不同的ID',
                severity: 'warning'
            });
            return;
        }

        // 如果ID已變更，需要刪除舊項目並新增一個新項目
        if (editingItem.originalId && editingItem.id !== editingItem.originalId) {
            const newItem = {
                id: editingItem.id,
                name: editingItem.name.trim(),
                price: price
            };

            // 將新項目放在最上方
            const updatedItems = [
                newItem,
                ...washItems.filter(item => item.id !== editingItem.originalId)
            ];

            const success = await saveWashItems(updatedItems);

            if (success) {
                setWashItems(updatedItems);
                setShowEditModal(false);
                setLastEditedItemId(editingItem.id);

                // 5秒後清除高亮狀態
                setTimeout(() => {
                    setLastEditedItemId(null);
                }, 5000);

                setSnackbar({
                    open: true,
                    message: '更新服務項目成功',
                    severity: 'success'
                });
            }
        } else {
            // 沒有變更ID，正常更新，但將項目移至最上方
            const updatedItem = {
                ...editingItem,
                name: editingItem.name.trim(),
                price: price
            };

            // 將更新後的項目放在最上方
            const updatedItems = [
                updatedItem,
                ...washItems.filter(item => item.id !== editingItem.id)
            ];

            const success = await saveWashItems(updatedItems);

            if (success) {
                setWashItems(updatedItems);
                setShowEditModal(false);
                setLastEditedItemId(editingItem.id);

                // 5秒後清除高亮狀態
                setTimeout(() => {
                    setLastEditedItemId(null);
                }, 5000);

                setSnackbar({
                    open: true,
                    message: '更新服務項目成功',
                    severity: 'success'
                });
            }
        }
    };

    // 處理刪除項目
    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('確定要刪除此服務項目？')) {
            return;
        }

        const updatedItems = washItems.filter(item => item.id !== itemId);
        const success = await saveWashItems(updatedItems);

        if (success) {
            setWashItems(updatedItems);
            setSnackbar({
                open: true,
                message: '刪除服務項目成功',
                severity: 'success'
            });
        }
    };

    // 處理拖曳開始
    const onDragStart = () => {
        setIsDragging(true);
    };

    // 處理拖曳結束
    const onDragEnd = async (result) => {
        setIsDragging(false);

        if (!result.destination) {
            return;
        }

        const items = Array.from(washItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const success = await saveWashItems(items);
        if (success) {
            setWashItems(items);
        }
    };

    // 關閉 Snackbar
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 新增項目表單 */}
            <Form className="mb-3">
                <Row>
                    <Col xs={12} sm={3}>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="text"
                                placeholder="項目ID (選填)"
                                value={newItemId || ''}
                                onChange={(e) => setNewItemId(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={12} sm={3}>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="text"
                                placeholder="項目名稱"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={12} sm={3}>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="number"
                                placeholder="價格"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={12} sm={3}>
                        <Button
                            variant="primary"
                            onClick={handleAddItem}
                            className="w-100 mb-2"
                        >
                            <FaPlus className="me-1" /> 新增項目
                        </Button>
                    </Col>
                </Row>
            </Form>

            {/* 項目列表 */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                    <StrictModeDroppable droppableId="wash-items">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{ minHeight: '100%' }}
                            >
                                <ListGroup>
                                    {washItems.map((item, index) => (
                                        <Draggable
                                            key={item.id}
                                            draggableId={item.id}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <ListGroup.Item
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`mb-2 ${snapshot.isDragging ? 'dragging' : ''}`}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        backgroundColor: lastEditedItemId === item.id ? '#d4edda' : '#f8f9fa',
                                                        border: '1px solid ' + (lastEditedItemId === item.id ? '#c3e6cb' : '#dee2e6'),
                                                        borderRadius: '8px',
                                                        transition: 'background-color 0.5s ease, border-color 0.5s ease'
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="me-3"
                                                            style={{
                                                                cursor: 'grab',
                                                                color: '#6c757d',
                                                                padding: '8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: lastEditedItemId === item.id ? '#c3e6cb' : '#e9ecef'
                                                            }}
                                                        >
                                                            <FaBars />
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="fw-bold">{item.name}</div>
                                                            <div className="text-muted">價格: ${item.price}</div>
                                                            <div className="text-muted small">ID: {item.id}</div>
                                                        </div>
                                                        <div>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => handleEditItem(item)}
                                                            >
                                                                編輯
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                            >
                                                                刪除
                                                            </Button>
                                                        </div>
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
            </div>

            {/* 編輯項目對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>編輯服務項目</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>項目ID</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingItem?.id || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, id: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>項目名稱</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingItem?.name || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>價格</Form.Label>
                            <Form.Control
                                type="number"
                                value={editingItem?.price || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={handleUpdateItem}>
                        儲存
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 通知 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default WashItemManager; 