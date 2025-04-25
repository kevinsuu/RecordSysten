import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, ListGroup, Modal } from 'react-bootstrap';
import { ref, set, get } from 'firebase/database';

const WashItemManager = ({ database, onSave }) => {
    const [washItems, setWashItems] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [selectedItemIndex, setSelectedItemIndex] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // 載入洗車項目
    useEffect(() => {
        const loadWashItems = async () => {
            try {
                const washItemsRef = ref(database, 'wash_items');
                const snapshot = await get(washItemsRef);
                if (snapshot.exists()) {
                    setWashItems(snapshot.val() || []);
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

    // 添加洗車項目
    const addWashItem = async () => {
        if (!itemName.trim()) {
            setError('請輸入服務項目名稱');
            return;
        }

        try {
            // 準備新項目
            let newItem;
            if (itemPrice !== '' && !isNaN(Number(itemPrice))) {
                newItem = {
                    name: itemName.trim(),
                    price: Number(itemPrice)
                };
            } else {
                newItem = itemName.trim();
            }

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

            // 通知父元件
            if (onSave) onSave();
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
            let updatedItem;
            if (itemPrice !== '' && !isNaN(Number(itemPrice))) {
                updatedItem = {
                    name: itemName.trim(),
                    price: Number(itemPrice)
                };
            } else {
                updatedItem = itemName.trim();
            }

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

            // 通知父元件
            if (onSave) onSave();
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
            setWashItems(newWashItems);

            // 更新 Firebase
            await set(ref(database, 'wash_items'), newWashItems);

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('刪除洗車項目時發生錯誤:', error);
            alert('刪除洗車項目時發生錯誤: ' + error.message);
        }
    };

    // 格式化顯示項目
    const formatItemDisplay = (item, index) => {
        if (typeof item === 'string') {
            return `${item} - $0`;
        } else {
            return `${item.name} - $${item.price}`;
        }
    };

    // 重置表單
    const resetForm = () => {
        setItemName('');
        setItemPrice('');
        setError('');
    };

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

            <ListGroup className="mb-3">
                {washItems.map((item, index) => (
                    <ListGroup.Item
                        key={index}
                        className="d-flex justify-content-between align-items-center"
                    >
                        <span>{formatItemDisplay(item, index)}</span>
                        <div>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                    setSelectedItemIndex(index);
                                    if (typeof item === 'string') {
                                        setItemName(item);
                                        setItemPrice('');
                                    } else {
                                        setItemName(item.name);
                                        setItemPrice(item.price.toString());
                                    }
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
                ))}
            </ListGroup>

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
        </div>
    );
};

export default WashItemManager; 