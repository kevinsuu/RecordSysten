import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, ListGroup, Modal } from 'react-bootstrap';
import { ref, set, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaBars } from 'react-icons/fa';
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [selectedItemIndex, setSelectedItemIndex] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    // 添加通知狀態
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' // 'success', 'error', 'warning', 'info'
    });

    // 處理關閉通知
    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // 顯示通知的輔助函數
    const showNotification = (message, severity = 'success') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    // 載入洗車項目
    useEffect(() => {
        const loadWashItems = async () => {
            try {
                const washItemsRef = ref(database, 'wash_items');
                const snapshot = await get(washItemsRef);
                if (snapshot.exists()) {
                    const items = snapshot.val() || [];
                    // 確保每個項目都有 sort_index
                    const itemsWithIndex = items.map((item, index) => {
                        if (typeof item === 'string') {
                            return {
                                name: item,
                                price: 0,
                                sort_index: index
                            };
                        }
                        return {
                            ...item,
                            sort_index: item.sort_index !== undefined ? item.sort_index : index
                        };
                    });
                    // 根據 sort_index 排序
                    itemsWithIndex.sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0));
                    setWashItems(itemsWithIndex);
                } else {
                    setWashItems([]);
                }
            } catch (error) {
                console.error('載入洗車項目時發生錯誤:', error);
                setError('載入洗車項目時發生錯誤: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        loadWashItems();
    }, [database]);

    // 處理拖放排序開始事件
    const onDragStart = () => {
        document.body.style.cursor = 'grabbing';
        setIsDragging(true);
    };

    // 處理拖放排序結束事件
    const onDragEnd = async (result) => {
        // 恢復正常鼠標樣式
        document.body.style.cursor = 'default';
        setIsDragging(false);

        // 如果沒有目標或拖曳到相同位置，則不做任何事
        if (!result.destination || result.source.index === result.destination.index) {
            return;
        }

        try {
            // 獲取當前的項目數組副本
            const items = Array.from(washItems);

            // 從源位置移除被拖拽的項目
            const [reorderedItem] = items.splice(result.source.index, 1);

            // 將項目插入到目標位置
            items.splice(result.destination.index, 0, reorderedItem);

            // 更新排序索引
            const reorderedItems = items.map((item, index) => ({
                ...item,
                sort_index: index
            }));

            // 更新本地狀態
            setWashItems(reorderedItems);

            // 更新 Firebase
            await set(ref(database, 'wash_items'), reorderedItems);

            // 顯示成功通知
            showNotification('項目順序已更新！');

            // 通知父元件
            if (onSave) onSave({ reload: false });
        } catch (error) {
            console.error('更新排序時發生錯誤:', error);
            showNotification('更新排序時發生錯誤: ' + error.message, 'error');
        }
    };

    // 添加洗車項目
    const addWashItem = async () => {
        if (!itemName.trim()) {
            setError('請輸入服務項目名稱');
            return;
        }

        try {
            // 準備新項目
            const maxSortIndex = Math.max(...washItems.map(item => item.sort_index || 0), -1);
            const newItem = {
                name: itemName.trim(),
                price: itemPrice !== '' && !isNaN(Number(itemPrice)) ? Number(itemPrice) : 0,
                sort_index: maxSortIndex + 1
            };

            // 更新本地數據
            const newWashItems = [...washItems, newItem];
            setWashItems(newWashItems);

            // 更新 Firebase
            await set(ref(database, 'wash_items'), newWashItems);

            // 清除表單
            setItemName('');
            setItemPrice('');
            setShowAddModal(false);
            setError('');

            // 顯示成功通知
            showNotification('洗車項目已成功新增！');

            // 通知父元件
            if (onSave) onSave({ reload: false });
        } catch (error) {
            console.error('添加洗車項目時發生錯誤:', error);
            setError('添加洗車項目時發生錯誤: ' + error.message);
        }
    };

    // 編輯洗車項目
    const editWashItem = async () => {
        if (!itemName.trim()) {
            setError('請輸入服務項目名稱');
            return;
        }

        try {
            // 準備更新的項目
            const updatedItem = {
                ...washItems[selectedItemIndex],
                name: itemName.trim(),
                price: itemPrice !== '' && !isNaN(Number(itemPrice)) ? Number(itemPrice) : 0
            };

            // 更新本地數據
            const newWashItems = [...washItems];
            newWashItems[selectedItemIndex] = updatedItem;
            setWashItems(newWashItems);

            // 更新 Firebase
            await set(ref(database, 'wash_items'), newWashItems);

            // 清除表單
            setItemName('');
            setItemPrice('');
            setSelectedItemIndex(null);
            setShowEditModal(false);
            setError('');

            // 顯示成功通知
            showNotification('洗車項目已成功編輯！');

            // 通知父元件
            if (onSave) onSave({ reload: false });
        } catch (error) {
            console.error('編輯洗車項目時發生錯誤:', error);
            setError('編輯洗車項目時發生錯誤: ' + error.message);
        }
    };

    // 刪除洗車項目
    const deleteWashItem = async (index) => {
        if (!window.confirm('確定要刪除此洗車項目嗎？')) {
            return;
        }

        try {
            // 更新本地數據
            const newWashItems = [...washItems];
            newWashItems.splice(index, 1);

            // 重新計算排序索引
            newWashItems.forEach((item, idx) => {
                item.sort_index = idx;
            });

            setWashItems(newWashItems);

            // 更新 Firebase
            await set(ref(database, 'wash_items'), newWashItems);

            // 顯示成功通知
            showNotification('洗車項目已成功刪除！');

            // 通知父元件
            if (onSave) onSave({ reload: false });
        } catch (error) {
            console.error('刪除洗車項目時發生錯誤:', error);
            showNotification('刪除洗車項目時發生錯誤: ' + error.message, 'error');
        }
    };

    // 格式化顯示項目
    const formatItemDisplay = (item) => {
        return `${item.name} - $${item.price}`;
    };

    // 重置表單
    const resetForm = () => {
        setItemName('');
        setItemPrice('');
        setError('');
    };

    // 清理事件監聽器
    useEffect(() => {
        return () => {
            document.body.style.cursor = 'default';
        };
    }, []);

    if (loading) {
        return (
            <div className="text-center my-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">載入中...</span>
                </div>
                <p className="mt-2">正在載入洗車項目，請稍候...</p>
            </div>
        );
    }

    return (
        <div className="wash-item-manager">
            <Row className="mb-3">
                <Col>
                    <Button
                        variant="primary"
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                    >
                        新增項目
                    </Button>
                </Col>
            </Row>

            {isDragging && (
                <div className="alert alert-info mb-2">
                    <small>拖曳進行中...放開滑鼠完成排序</small>
                </div>
            )}

            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd} strict={true}>
                <StrictModeDroppable droppableId="wash-item-list">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="drag-container mb-3"
                            style={{ overflow: 'hidden' }}
                        >
                            <ListGroup className="mb-3">
                                {washItems.map((item, index) => (
                                    <Draggable
                                        key={`wash-item-${index}`}
                                        draggableId={`wash-item-${index}`}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <ListGroup.Item
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`d-flex justify-content-between align-items-center ${snapshot.isDragging ? 'dragging' : ''}`}
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
                                                    <span>{formatItemDisplay(item)}</span>
                                                </div>
                                                <div>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => {
                                                            setSelectedItemIndex(index);
                                                            setItemName(item.name);
                                                            setItemPrice(item.price.toString());
                                                            setError('');
                                                            setShowEditModal(true);
                                                        }}
                                                    >
                                                        編輯
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => deleteWashItem(index)}
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

            {washItems.length === 0 && (
                <div className="text-center p-3 bg-light rounded">
                    尚未添加任何洗車項目
                </div>
            )}

            {/* 新增洗車項目對話框 */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>新增項目</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>服務項目名稱:</Form.Label>
                        <Form.Control
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="請輸入服務項目名稱"
                            isInvalid={!!error}
                        />
                        <Form.Control.Feedback type="invalid">
                            {error}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>服務金額:</Form.Label>
                        <Form.Control
                            type="number"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value)}
                            placeholder="請輸入服務金額"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={addWashItem}>
                        新增項目
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 編輯洗車項目對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>編輯項目</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>服務項目名稱:</Form.Label>
                        <Form.Control
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            isInvalid={!!error}
                        />
                        <Form.Control.Feedback type="invalid">
                            {error}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>服務金額:</Form.Label>
                        <Form.Control
                            type="number"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value)}
                            placeholder="請輸入服務金額"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={editWashItem}>
                        儲存
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 通知組件 */}
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