import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, ListGroup, Modal, Card, Badge, InputGroup } from 'react-bootstrap';
import { ref, get, set } from 'firebase/database';
import { FaPlus, FaPen, FaTrash, FaBars, FaSearch, FaLayerGroup } from 'react-icons/fa';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
    createWashGroup,
    updateWashGroup,
    deleteWashGroup,
    addItemToGroup,
    removeItemFromGroup
} from '../services/firebase';

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

const WashGroupManager = ({ database, onSave }) => {
    const [washGroups, setWashGroups] = useState([]);
    const [washItems, setWashItems] = useState({});
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // 載入服務項目和分組
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 載入服務項目
                const washItemsRef = ref(database, 'wash_items');
                const itemsSnapshot = await get(washItemsRef);
                if (itemsSnapshot.exists()) {
                    setWashItems(itemsSnapshot.val() || {});
                }

                // 載入分組
                const washGroupsRef = ref(database, 'wash_groups');
                const groupsSnapshot = await get(washGroupsRef);
                if (groupsSnapshot.exists()) {
                    const groups = groupsSnapshot.val();
                    const groupsList = Object.entries(groups)
                        .map(([id, group]) => ({
                            id,
                            ...group
                        }))
                        .sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0));
                    setWashGroups(groupsList);

                    // 自動選擇第一個分組
                    if (groupsList.length > 0) {
                        setSelectedGroup(groupsList[0]);
                    }
                }
            } catch (error) {
                console.error('載入數據時發生錯誤:', error);
                setSnackbar({
                    open: true,
                    message: '載入數據時發生錯誤',
                    severity: 'error'
                });
            }
        };

        fetchData();
    }, [database]);

    // 儲存分組順序
    const saveGroupsOrder = async (groups) => {
        try {
            // 更新每個分組的 sort_index
            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                const groupRef = ref(database, `wash_groups/${group.id}`);

                // 獲取當前分組數據
                const snapshot = await get(groupRef);
                if (snapshot.exists()) {
                    const currentData = snapshot.val();

                    // 更新 sort_index
                    await set(groupRef, {
                        ...currentData,
                        sort_index: i
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('儲存分組順序時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '儲存分組順序時發生錯誤',
                severity: 'error'
            });
            return false;
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

        const items = Array.from(washGroups);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setWashGroups(items);

        // 儲存新的排序
        const success = await saveGroupsOrder(items);

        if (success) {
            setSnackbar({
                open: true,
                message: '分組順序已更新',
                severity: 'success'
            });

            // 如果選中的分組被移動，更新選中的分組
            if (selectedGroup && selectedGroup.id === reorderedItem.id) {
                setSelectedGroup(reorderedItem);
            }
        }
    };

    // 處理新增分組
    const handleAddGroup = async () => {
        if (!newGroupName.trim()) {
            setSnackbar({
                open: true,
                message: '請輸入分組名稱',
                severity: 'warning'
            });
            return;
        }

        try {
            const groupId = await createWashGroup(newGroupName.trim());
            const newGroup = {
                id: groupId,
                name: newGroupName.trim(),
                items: [],
                sort_index: washGroups.length
            };

            setWashGroups([...washGroups, newGroup]);
            setNewGroupName('');
            setSnackbar({
                open: true,
                message: '分組新增成功',
                severity: 'success'
            });

            if (onSave) {
                onSave({ reload: false });
            }
        } catch (error) {
            console.error('新增分組時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '新增分組時發生錯誤',
                severity: 'error'
            });
        }
    };

    // 處理編輯分組
    const handleEditGroup = (group) => {
        setEditingGroup({ ...group });
        setShowEditModal(true);
    };

    // 處理更新分組
    const handleUpdateGroup = async () => {
        if (!editingGroup.name.trim()) {
            setSnackbar({
                open: true,
                message: '請輸入分組名稱',
                severity: 'warning'
            });
            return;
        }

        try {
            await updateWashGroup(editingGroup.id, editingGroup);

            const updatedGroups = washGroups.map(group =>
                group.id === editingGroup.id ? editingGroup : group
            );

            setWashGroups(updatedGroups);
            setShowEditModal(false);
            setSnackbar({
                open: true,
                message: '分組更新成功',
                severity: 'success'
            });

            if (onSave) {
                onSave({ reload: false });
            }
        } catch (error) {
            console.error('更新分組時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '更新分組時發生錯誤',
                severity: 'error'
            });
        }
    };

    // 處理刪除分組
    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm('確定要刪除此分組？')) {
            return;
        }

        try {
            await deleteWashGroup(groupId);

            const updatedGroups = washGroups.filter(group => group.id !== groupId);
            setWashGroups(updatedGroups);

            if (selectedGroup && selectedGroup.id === groupId) {
                setSelectedGroup(null);
            }

            setSnackbar({
                open: true,
                message: '分組刪除成功',
                severity: 'success'
            });

            if (onSave) {
                onSave({ reload: false });
            }
        } catch (error) {
            console.error('刪除分組時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '刪除分組時發生錯誤',
                severity: 'error'
            });
        }
    };

    // 處理添加項目到分組
    const handleAddItemToGroup = async (groupId, itemId) => {
        try {
            await addItemToGroup(groupId, itemId);

            const updatedGroups = washGroups.map(group => {
                if (group.id === groupId) {
                    const items = group.items || [];
                    if (!items.includes(itemId)) {
                        return {
                            ...group,
                            items: [...items, itemId]
                        };
                    }
                }
                return group;
            });

            setWashGroups(updatedGroups);

            if (selectedGroup && selectedGroup.id === groupId) {
                setSelectedGroup(updatedGroups.find(g => g.id === groupId));
            }

            setSnackbar({
                open: true,
                message: '項目已添加至分組',
                severity: 'success'
            });
        } catch (error) {
            console.error('添加項目到分組時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '添加項目到分組時發生錯誤',
                severity: 'error'
            });
        }
    };

    // 處理從分組移除項目
    const handleRemoveItemFromGroup = async (groupId, itemId) => {
        try {
            await removeItemFromGroup(groupId, itemId);

            const updatedGroups = washGroups.map(group => {
                if (group.id === groupId) {
                    const items = group.items || [];
                    return {
                        ...group,
                        items: items.filter(id => id !== itemId)
                    };
                }
                return group;
            });

            setWashGroups(updatedGroups);

            if (selectedGroup && selectedGroup.id === groupId) {
                setSelectedGroup(updatedGroups.find(g => g.id === groupId));
            }

            setSnackbar({
                open: true,
                message: '項目已從分組中移除',
                severity: 'success'
            });
        } catch (error) {
            console.error('從分組移除項目時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '從分組移除項目時發生錯誤',
                severity: 'error'
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

    // 檢查項目是否在選定的分組中
    const isItemInSelectedGroup = (itemId) => {
        if (!selectedGroup || !selectedGroup.items) {
            return false;
        }
        return selectedGroup.items.includes(itemId);
    };

    // 過濾項目並排序 - 已加入分組的項目置頂
    const getFilteredItems = () => {
        if (!washItems) return [];

        const itemsArray = Object.entries(washItems).map(([id, item]) => ({
            id,
            ...item
        }));

        // 獲取分組中的項目IDs
        const groupItemIds = selectedGroup?.items || [];

        // 過濾符合搜尋條件的項目
        let filteredItems = itemsArray;
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredItems = itemsArray.filter(item =>
                item.name.toLowerCase().includes(lowerSearchTerm) ||
                item.id.toLowerCase().includes(lowerSearchTerm)
            );
        }

        // 排序：先按是否在分組中排序，再按原本的sort_index排序
        return filteredItems.sort((a, b) => {
            // 優先按是否在分組中排序
            const aInGroup = groupItemIds.includes(a.id);
            const bInGroup = groupItemIds.includes(b.id);

            if (aInGroup && !bInGroup) return -1;
            if (!aInGroup && bInGroup) return 1;

            // 次優先按sort_index排序
            return (a.sort_index || 0) - (b.sort_index || 0);
        });
    };

    // 渲染項目列表
    const renderItemsList = () => {
        // 如果沒有選擇分組，返回空
        if (!selectedGroup) return null;

        // 獲取已過濾並排序的項目
        const filteredItems = getFilteredItems();

        // 獲取分組中的項目IDs
        const groupItemIds = selectedGroup.items || [];

        return (
            <Card>
                <Card.Body>
                    <div className="mb-3">
                        <InputGroup>
                            <InputGroup.Text>
                                <FaSearch />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="搜尋項目 (名稱或ID)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => setSearchTerm('')}
                                >
                                    清除
                                </Button>
                            )}
                        </InputGroup>
                    </div>

                    <ListGroup>
                        {filteredItems.length === 0 ? (
                            <ListGroup.Item className="text-center">
                                {searchTerm ? '沒有符合搜尋條件的項目' : '沒有可用的服務項目'}
                            </ListGroup.Item>
                        ) : (
                            filteredItems.map(item => {
                                const isInGroup = groupItemIds.includes(item.id);
                                return (
                                    <ListGroup.Item
                                        key={item.id}
                                        className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center"
                                        style={{
                                            backgroundColor: isInGroup ? '#f8f9fa' : 'white',
                                            borderLeft: isInGroup ? '4px solid #007bff' : 'none',
                                            padding: '0.75rem'
                                        }}
                                    >
                                        <div className="mb-2 mb-sm-0 flex-grow-1">
                                            <div className="fw-bold">{item.name}</div>
                                            <div className="text-muted small">
                                                價格: ${item.price} | ID: {item.id}
                                            </div>
                                            {isInGroup && (
                                                <Badge bg="primary" pill className="mt-1 d-inline-block d-sm-none">
                                                    已加入分組
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="d-grid d-sm-block">
                                            {isInGroup ? (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="w-100 w-sm-auto"
                                                    onClick={() => handleRemoveItemFromGroup(selectedGroup.id, item.id)}
                                                >
                                                    <FaTrash className="me-1 d-none d-sm-inline" /> 移除
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    className="w-100 w-sm-auto"
                                                    onClick={() => handleAddItemToGroup(selectedGroup.id, item.id)}
                                                >
                                                    <FaPlus className="me-1 d-none d-sm-inline" /> 新增
                                                </Button>
                                            )}
                                        </div>
                                    </ListGroup.Item>
                                );
                            })
                        )}
                    </ListGroup>
                </Card.Body>
            </Card>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 新增分組表單 */}
            <Form className="mb-3">
                <Row>
                    <Col xs={12} sm={9}>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="text"
                                placeholder="分組名稱"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={12} sm={3}>
                        <Button
                            variant="primary"
                            onClick={handleAddGroup}
                            className="w-100 mb-2"
                        >
                            <FaPlus className="me-1" /> 新增分組
                        </Button>
                    </Col>
                </Row>
            </Form>

            {/* 分組和項目列表 */}
            <div className="d-flex flex-column flex-md-row" style={{ flex: 1, gap: '15px', overflowY: 'auto' }}>
                {/* 分組列表 - 改進樣式 */}
                <div className="mb-3 mb-md-0" style={{ width: '100%', minWidth: '180px', maxWidth: '220px', flex: '0 0 auto' }}>
                    <h5 className="mb-3 d-flex align-items-center">
                        <FaLayerGroup className="me-2" style={{ color: '#007bff' }} />
                        分組列表
                    </h5>
                    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                        <StrictModeDroppable droppableId="wash-groups">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{ minHeight: '100%' }}
                                >
                                    <ListGroup>
                                        {washGroups.map((group, index) => (
                                            <Draggable
                                                key={group.id}
                                                draggableId={group.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <ListGroup.Item
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        action
                                                        active={selectedGroup && selectedGroup.id === group.id}
                                                        onClick={() => setSelectedGroup(group)}
                                                        className="mb-2 position-relative"
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            backgroundColor: selectedGroup && selectedGroup.id === group.id ? '#007bff' : '#f8f9fa',
                                                            color: selectedGroup && selectedGroup.id === group.id ? 'white' : 'inherit',
                                                            borderRadius: '8px',
                                                            padding: '10px 12px',
                                                            border: selectedGroup && selectedGroup.id === group.id ? 'none' : '1px solid #dee2e6',
                                                            boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : (selectedGroup && selectedGroup.id === group.id ? '0 2px 5px rgba(0,123,255,0.3)' : 'none')
                                                        }}
                                                    >
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="position-absolute"
                                                            style={{
                                                                top: '50%',
                                                                left: '8px',
                                                                transform: 'translateY(-50%)',
                                                                cursor: 'grab',
                                                                color: selectedGroup && selectedGroup.id === group.id ? 'rgba(255,255,255,0.7)' : '#6c757d',
                                                            }}
                                                        >
                                                            <FaBars size="0.8em" />
                                                        </div>

                                                        <div style={{ paddingLeft: '16px', paddingRight: '60px' }}>
                                                            <div className="fw-bold text-truncate">{group.name}</div>
                                                            <Badge
                                                                bg={selectedGroup && selectedGroup.id === group.id ? "light" : "primary"}
                                                                text={selectedGroup && selectedGroup.id === group.id ? "dark" : ""}
                                                                pill
                                                                style={{ fontSize: '0.7rem' }}
                                                            >
                                                                {group.items ? group.items.length : 0} 項目
                                                            </Badge>
                                                        </div>

                                                        <div className="position-absolute" style={{ top: '50%', right: '8px', transform: 'translateY(-50%)', display: 'flex' }}>
                                                            <Button
                                                                variant={selectedGroup && selectedGroup.id === group.id ? "light" : "outline-primary"}
                                                                size="sm"
                                                                className="me-1 p-1"
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    opacity: selectedGroup && selectedGroup.id === group.id ? 0.9 : 0.7
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditGroup(group);
                                                                }}
                                                            >
                                                                <FaPen size="0.7em" />
                                                            </Button>
                                                            <Button
                                                                variant={selectedGroup && selectedGroup.id === group.id ? "light" : "outline-danger"}
                                                                size="sm"
                                                                className="p-1"
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    opacity: selectedGroup && selectedGroup.id === group.id ? 0.9 : 0.7
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteGroup(group.id);
                                                                }}
                                                            >
                                                                <FaTrash size="0.7em" />
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
                </div>

                {/* 項目列表 */}
                <div style={{ flex: 1 }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5>服務項目</h5>
                        {selectedGroup && (
                            <Badge bg="primary" pill>
                                已選擇分組: {selectedGroup.name}
                            </Badge>
                        )}
                    </div>
                    {selectedGroup ? (
                        renderItemsList()
                    ) : (
                        <Card body className="text-center">
                            請從左側選擇一個分組，以管理其中的項目
                        </Card>
                    )}
                </div>
            </div>

            {/* 編輯分組對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>編輯分組</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>分組名稱</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingGroup?.name || ''}
                                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={handleUpdateGroup}>
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

export default WashGroupManager; 