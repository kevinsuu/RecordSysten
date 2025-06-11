import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, ListGroup, Modal } from 'react-bootstrap';
import { ref, set, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaPlus, FaBars } from 'react-icons/fa';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// 創建自定義拖曳樣式
const getItemStyle = (isDragging, draggableStyle) => ({
    ...draggableStyle,
    userSelect: 'none',
    backgroundColor: isDragging ? '#e9ecef' : '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #dee2e6',
    padding: '6px 8px',
    marginBottom: '4px',
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    // 減少向上拖曳時的阻力，避免卡住
    transform: draggableStyle.transform,
    // 使拖曳的項目保持在最上層
    zIndex: isDragging ? 9999 : 1,
    // 只對非位置屬性添加過渡效果
    transition: draggableStyle.transition || 'background-color 0.2s ease'
});

// 解決 React 18 StrictMode 相容性問題的自定義 Droppable
const StrictModeDroppable = ({ children, droppableId }) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        // 直接使用 requestAnimationFrame 以確保平滑渲染
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    if (!enabled) {
        // 渲染一個佔位元素，但不要返回 null
        return <div style={{ minHeight: "10px" }} />;
    }

    return (
        <Droppable droppableId={droppableId}>
            {children}
        </Droppable>
    );
};

// 清理不必要的狀態和函數
const WashItemManager = ({ database, onSave }) => {
    const [washItems, setWashItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemId, setNewItemId] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
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
                        }))
                        // 依照 sort_index 由小到大排序 (0在最上面)
                        .sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0));
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
            // 直接構建完整的物件結構
            const itemsObject = {};

            // 對每個項目設置 sort_index，確保順序與顯示一致
            items.forEach((item, index) => {
                itemsObject[item.id] = {
                    name: item.name,
                    price: item.price,
                    sort_index: index // 索引越小越靠前
                };
            });

            // 一次性寫入所有項目
            await set(washItemsRef, itemsObject);

            if (onSave) {
                onSave({ reload: false });
            }

            console.log('已成功保存項目排序', itemsObject);

            setSnackbar({
                open: true,
                message: '服務項目已更新',
                severity: 'success'
            });

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
            price: price,
            sort_index: 0 // 新項目放在最前面
        };

        // 更新所有項目的排序索引
        const updatedItems = washItems.map(item => ({
            ...item,
            sort_index: (item.sort_index || 0) + 1
        }));

        // 將新項目放在最上方
        const finalItems = [newItem, ...updatedItems];
        const success = await saveWashItems(finalItems);

        if (success) {
            setWashItems(finalItems);
            setNewItemName('');
            setNewItemPrice('');
            setNewItemId('');
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
        }
    };

    // 處理拖曳開始
    const onDragStart = () => {
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
    };

    // 處理拖曳結束
    const onDragEnd = async (result) => {
        setIsDragging(false);
        document.body.style.cursor = 'default';

        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;

        const items = Array.from(washItems);
        const [removed] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, removed);

        // 更新排序索引
        const reorderedItems = items.map((item, index) => ({
            ...item,
            sort_index: index
        }));

        // 先更新本地狀態
        setWashItems(reorderedItems);

        // 保存到 Firebase
        const success = await saveWashItems(reorderedItems);

        if (success) {
            setSnackbar({
                open: true,
                message: '服務項目順序已更新',
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

        let updatedItems;

        // 如果ID已變更，需要刪除舊項目並新增一個新項目
        if (editingItem.id !== editingItem.originalId) {
            const newItem = {
                id: editingItem.id,
                name: editingItem.name.trim(),
                price: price,
                sort_index: 0 // 新項目放在最前面
            };

            // 更新所有項目的排序索引
            const items = washItems
                .filter(item => item.id !== editingItem.originalId)
                .map(item => ({
                    ...item,
                    sort_index: (item.sort_index || 0) + 1
                }));

            // 將新項目放在最上方
            updatedItems = [newItem, ...items];
        } else {
            // 沒有變更ID，保持原排序，只更新內容
            updatedItems = washItems.map(item =>
                item.id === editingItem.id
                    ? {
                        ...item,
                        name: editingItem.name.trim(),
                        price: price
                    }
                    : item
            );
        }

        // 保存更新後的項目
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
            <div style={{ flex: 1, overflow: 'auto' }}>
                {isDragging && (
                    <div className="alert alert-info mb-2 py-1 text-center">
                        <small>拖曳進行中...放開滑鼠完成排序 (置頂的項目顯示在最上方)</small>
                    </div>
                )}
                <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                    <StrictModeDroppable droppableId="wash-items">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                <ListGroup className="wash-items-list">
                                    {washItems.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {(provided, snapshot) => (
                                                <ListGroup.Item
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`${snapshot.isDragging ? 'dragging' : ''}`}
                                                    style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                                >
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="drag-handle me-2"
                                                                style={{
                                                                    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                                                    fontSize: '16px',
                                                                    color: '#6c757d',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: '#e9ecef',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <FaBars />
                                                            </div>
                                                            <div>
                                                                <strong>{item.name}</strong> - ${item.price}
                                                                <div className="text-muted small">ID: {item.id}</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                disabled={isDragging}
                                                                onClick={() => handleEditItem(item)}
                                                            >
                                                                編輯
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                disabled={isDragging}
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
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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