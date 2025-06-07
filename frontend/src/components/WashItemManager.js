import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, ListGroup, Modal } from 'react-bootstrap';
import { ref, set, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaBars, FaPlus } from 'react-icons/fa';
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

const WashItemManager = ({ database, onSave }) => {
    const [washItems, setWashItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
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
                    const sortedItems = Object.entries(items)
                        .map(([id, item]) => ({
                            id,
                            ...item
                        }))
                        .sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0));
                    setWashItems(sortedItems);
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

        const newItem = {
            id: Date.now().toString(),
            name: newItemName.trim(),
            price: price
        };

        const updatedItems = [...washItems, newItem];
        const success = await saveWashItems(updatedItems);

        if (success) {
            setWashItems(updatedItems);
            setNewItemName('');
            setNewItemPrice('');
            setSnackbar({
                open: true,
                message: '新增服務項目成功',
                severity: 'success'
            });
        }
    };

    // 處理編輯項目
    const handleEditItem = (item) => {
        setEditingItem(item);
        setShowEditModal(true);
    };

    // 處理更新項目
    const handleUpdateItem = async () => {
        if (!editingItem.name.trim() || !editingItem.price.toString().trim()) {
            setSnackbar({
                open: true,
                message: '請填寫項目名稱和價格',
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

        const updatedItems = washItems.map(item =>
            item.id === editingItem.id
                ? { ...item, name: editingItem.name.trim(), price: price }
                : item
        );

        const success = await saveWashItems(updatedItems);

        if (success) {
            setWashItems(updatedItems);
            setShowEditModal(false);
            setSnackbar({
                open: true,
                message: '更新服務項目成功',
                severity: 'success'
            });
        }
    };

    // 處理刪除項目
    const handleDeleteItem = async (itemId) => {
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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 新增項目表單 */}
            <Form className="mb-3">
                <Row>
                    <Col xs={12} sm={5}>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="text"
                                placeholder="項目名稱"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={12} sm={4}>
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
            <div style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                msOverflowStyle: '-ms-autohiding-scrollbar',
                paddingRight: '5px'
            }}>
                <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                    <StrictModeDroppable droppableId="wash-item-list">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="drag-container"
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
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="drag-handle"
                                                        >
                                                            <FaBars />
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="fw-bold">{item.name}</div>
                                                            <div className="text-muted">
                                                                NT$ {item.price}
                                                            </div>
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

            {/* 編輯 Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>編輯服務項目</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>項目名稱</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingItem?.name || ''}
                                onChange={(e) =>
                                    setEditingItem({ ...editingItem, name: e.target.value })
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>價格</Form.Label>
                            <Form.Control
                                type="number"
                                value={editingItem?.price || ''}
                                onChange={(e) =>
                                    setEditingItem({ ...editingItem, price: e.target.value })
                                }
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

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
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