import React, { useState, useEffect } from 'react';
import { Button, Form, Card, Row, Col, ListGroup, Modal, Badge, InputGroup } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FaPlus, FaBars, FaSearch, FaLayerGroup, FaTrash, FaPen, FaTag } from 'react-icons/fa';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { ref, get, set } from 'firebase/database';
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

// 獲取拖曳項目的樣式，優化拖曳體驗
const getGroupItemStyle = (isDragging, draggableStyle, isActive) => {
    if (!draggableStyle) return {};

    return {
        ...draggableStyle,
        userSelect: 'none',
        backgroundColor: isActive ? '#e8f4ff' : (isDragging ? '#e9ecef' : '#f8f9fa'),
        color: isActive ? '#007bff' : 'inherit',
        borderRadius: '4px',
        border: isActive ? '2px solid #007bff' : '1px solid #dee2e6',
        padding: '6px 8px',
        marginBottom: '4px',
        boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        // 保持原始的 transform，確保拖曳流暢
        transform: draggableStyle.transform,
        // 使拖曳的項目保持在最上層
        zIndex: isDragging ? 9999 : 1,
        // 簡化過渡效果，避免拖曳時的卡頓
        transition: draggableStyle.transition || 'background-color 0.2s ease, border-color 0.2s ease',
        // 左側邊框加粗
        borderLeft: isActive ? '4px solid #007bff' : '1px solid #dee2e6'
    };
};

const WashGroupManager = ({ database, onSave }) => {
    const [washGroups, setWashGroups] = useState([]);
    const [washItems, setWashItems] = useState({});
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemId, setNewItemId] = useState('');
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // 監聽視窗大小變化
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

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
                        // 依照 sort_index 由小到大排序
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
            // 構建整個 wash_groups 對象
            const groupsObject = {};

            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                // 複製原始數據並更新 sort_index
                groupsObject[group.id] = {
                    name: group.name,
                    items: group.items || [],
                    sort_index: i // 索引越小越靠前
                };
            }

            // 一次性更新所有分組
            const washGroupsRef = ref(database, 'wash_groups');
            await set(washGroupsRef, groupsObject);

            // 通知父組件
            if (onSave) {
                onSave({ reload: false });
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
        // 移除自定義游標，讓瀏覽器顯示原生拖曳游標
        document.body.style.cursor = 'grabbing';
    };

    // 處理拖曳結束
    const onDragEnd = async (result) => {
        // 重置拖曳狀態
        setIsDragging(false);
        document.body.style.cursor = 'default';

        // 如果沒有目標位置或拖曳到清單外，不做任何改變
        if (!result.destination) return;

        // 來源與目標相同，且位置相同，不做任何改變
        if (
            result.source.index === result.destination.index
        ) return;

        // 建立分組列表的複本
        const items = Array.from(washGroups);

        // 移除拖曳的分組
        const [reorderedItem] = items.splice(result.source.index, 1);

        // 在新位置插入該分組
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

            // 次優先按sort_index排序（新到舊）
            return (b.sort_index || 0) - (a.sort_index || 0);
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
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center" style={{ flex: 1 }}>
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
                        <Button
                            variant="success"
                            size="sm"
                            className="ms-2 d-flex align-items-center"
                            onClick={() => setShowAddItemModal(true)}
                        >
                            <FaPlus className="me-1" /> 新增項目
                        </Button>
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
                                            backgroundColor: isInGroup ? '#f0f9ff' : 'white',
                                            borderLeft: isInGroup ? '4px solid #007bff' : 'none',
                                            padding: '0.75rem',
                                            transition: 'all 0.2s ease'
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

    // 處理新增項目
    const handleAddItem = async () => {
        // 檢查必填項目
        if (!newItemName.trim() || !newItemPrice.trim()) {
            setSnackbar({
                open: true,
                message: '請輸入服務名稱和價格',
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

        try {
            // 檢查用戶提供的ID是否已存在
            let itemId = newItemId.trim();

            // 轉換washItems物件為陣列進行檢查
            const itemsArray = Object.keys(washItems).map(id => ({
                id,
                ...washItems[id]
            }));

            // 如果提供了ID，檢查是否重複
            if (itemId) {
                // 直接檢查物件是否有該鍵名
                if (washItems[itemId] || itemsArray.some(item => item.id === itemId)) {
                    // 直接在模態框中顯示錯誤，而不是使用Snackbar
                    document.getElementById('idError').innerText = `此ID「${itemId}」已存在，請使用不同的ID`;
                    document.getElementById('idError').style.display = 'block';
                    document.getElementById('itemIdInput').focus();
                    return;
                }
            } else {
                // 使用當前時間戳作為ID
                itemId = Date.now().toString();
            }

            // 清除錯誤訊息
            document.getElementById('idError').style.display = 'none';

            // 生成新項目
            const newItem = {
                name: newItemName.trim(),
                price: Number(newItemPrice),
                // 使用當前時間戳作為排序索引
                sort_index: Date.now()
            };

            // 直接在特定路徑設定新項目
            await set(ref(database, `wash_items/${itemId}`), newItem);

            // 更新本地狀態 - 立即更新服務項目列表
            const updatedItems = {
                ...washItems,
                [itemId]: newItem
            };
            setWashItems(updatedItems);

            // 如果有選擇分組，同時添加到分組中並更新分組狀態
            if (selectedGroup) {
                await handleAddItemToGroup(selectedGroup.id, itemId);

                // 更新選中分組的項目列表，無需等待重新載入
                const updatedGroup = { ...selectedGroup };
                updatedGroup.items = updatedGroup.items || [];
                if (!updatedGroup.items.includes(itemId)) {
                    updatedGroup.items.push(itemId);
                }

                // 更新整個分組列表中的對應分組
                const updatedGroups = washGroups.map(group =>
                    group.id === selectedGroup.id ? updatedGroup : group
                );

                // 更新狀態
                setWashGroups(updatedGroups);
                setSelectedGroup(updatedGroup);
            }

            // 重置表單並關閉模態框
            setNewItemName('');
            setNewItemPrice('');
            setNewItemId('');
            setShowAddItemModal(false);

            // 顯示成功消息
            setSnackbar({
                open: true,
                message: '項目新增成功',
                severity: 'success'
            });

            // 通知父組件，但不要求強制重新載入
            if (onSave) {
                onSave({ reload: false });
            }
        } catch (error) {
            console.error('新增項目時發生錯誤:', error);
            setSnackbar({
                open: true,
                message: '新增項目時發生錯誤：' + error.message,
                severity: 'error',
                autoHideDuration: 6000
            });
        }
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

            {/* 分組和項目列表 - 使用單一滾動區域 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <div className={`d-flex ${windowWidth < 768 ? 'flex-column' : 'flex-row'}`} style={{ gap: '15px' }}>
                    {/* 分組列表 - 僅在手機版擴大寬度 */}
                    <div className={`mb-3 ${windowWidth >= 768 ? 'mb-md-0' : ''} order-1`} style={{
                        width: '100%',
                        minWidth: windowWidth < 768 ? '100%' : '250px',
                        maxWidth: windowWidth < 768 ? '100%' : '350px',
                        flex: windowWidth >= 768 ? '0 0 auto' : 'initial'
                    }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="m-0 d-flex align-items-center">
                                <FaLayerGroup className="me-2" style={{ color: '#007bff' }} />
                                分組列表
                            </h5>
                        </div>

                        {isDragging && (
                            <div className="alert alert-info mb-2 py-1 text-center">
                                <small>拖曳進行中...放開滑鼠完成排序 (置頂的項目顯示在最上方)</small>
                            </div>
                        )}

                        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                            <StrictModeDroppable droppableId="wash-groups">
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="group-list-container"
                                    >
                                        <ListGroup>
                                            {washGroups.map((group, index) => (
                                                <Draggable
                                                    key={group.id}
                                                    draggableId={group.id}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={getGroupItemStyle(
                                                                snapshot.isDragging,
                                                                provided.draggableProps.style,
                                                                selectedGroup && selectedGroup.id === group.id
                                                            )}
                                                            onClick={() => setSelectedGroup(group)}
                                                            className={windowWidth < 768 ? 'py-2' : ''}
                                                        >
                                                            <div className="d-flex align-items-center w-100">
                                                                {/* 拖曳控制點 */}
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    style={{
                                                                        cursor: 'grab',
                                                                        display: 'flex',
                                                                        marginRight: '8px',
                                                                        color: '#6c757d',
                                                                        padding: windowWidth < 768 ? '5px' : '0'
                                                                    }}
                                                                >
                                                                    <FaBars size={windowWidth < 768 ? '16' : '14'} />
                                                                </div>

                                                                {/* 分組名稱和項目數量 */}
                                                                <div style={{ flexGrow: 1 }}>
                                                                    <div
                                                                        style={{
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            fontSize: windowWidth < 768 ? '1rem' : 'inherit'
                                                                        }}
                                                                    >
                                                                        {group.name}
                                                                    </div>
                                                                    <Badge
                                                                        bg="primary"
                                                                        pill
                                                                        style={{
                                                                            fontSize: windowWidth < 768 ? '0.8rem' : '0.7rem',
                                                                            marginTop: '2px',
                                                                            padding: windowWidth < 768 ? '0.25rem 0.6rem' : ''
                                                                        }}
                                                                    >
                                                                        <FaTag size={windowWidth < 768 ? '12' : '10'} style={{ marginRight: '4px' }} />
                                                                        {group.items ? group.items.length : 0} 項目
                                                                    </Badge>
                                                                </div>

                                                                {/* 操作按鈕 - 在手機版下調整大小 */}
                                                                <div className={windowWidth < 768 ? 'd-flex flex-column' : ''}>
                                                                    {/* 編輯按鈕 */}
                                                                    <Button
                                                                        variant="outline-primary"
                                                                        size="sm"
                                                                        className={`${windowWidth < 768 ? 'mb-1' : 'me-2'}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditGroup(group);
                                                                        }}
                                                                        style={{
                                                                            padding: windowWidth < 768 ? '4px 8px' : '2px 5px',
                                                                            fontSize: windowWidth < 768 ? '0.85rem' : '0.75rem',
                                                                            width: windowWidth < 768 ? '100%' : 'auto'
                                                                        }}
                                                                    >
                                                                        <FaPen size="12" className="me-1" />
                                                                        編輯
                                                                    </Button>

                                                                    {/* 刪除按鈕 */}
                                                                    <Button
                                                                        variant="outline-danger"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteGroup(group.id);
                                                                        }}
                                                                        style={{
                                                                            padding: windowWidth < 768 ? '4px 8px' : '2px 5px',
                                                                            fontSize: windowWidth < 768 ? '0.85rem' : '0.75rem',
                                                                            width: windowWidth < 768 ? '100%' : 'auto'
                                                                        }}
                                                                    >
                                                                        <FaTrash size="12" className="me-1" />
                                                                        刪除
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
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

                    {/* 項目列表 - 放在右側 */}
                    <div className="order-2" style={{ flex: 1 }}>
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

            {/* 新增項目對話框 */}
            <Modal show={showAddItemModal} onHide={() => setShowAddItemModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>新增服務項目</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>服務名稱</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="請輸入服務名稱"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>價格</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="請輸入價格"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>ID (選填)</Form.Label>
                            <Form.Control
                                id="itemIdInput"
                                type="text"
                                placeholder="若不填寫將自動生成"
                                value={newItemId}
                                onChange={(e) => {
                                    setNewItemId(e.target.value);
                                    // 清除錯誤訊息
                                    document.getElementById('idError').style.display = 'none';
                                }}
                            />
                            <div
                                id="idError"
                                className="text-danger mt-1"
                                style={{
                                    display: 'none',
                                    fontWeight: 'bold',
                                    backgroundColor: '#f8d7da',
                                    border: '1px solid #f5c2c7',
                                    borderRadius: '4px',
                                    padding: '8px 12px',
                                    marginTop: '8px'
                                }}
                            ></div>
                            <Form.Text className="text-muted">
                                ID用於系統識別，若不填寫將自動生成
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddItemModal(false)}>
                        取消
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleAddItem}
                        disabled={!newItemName.trim() || !newItemPrice.trim()}
                    >
                        新增
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 通知 - 修改Snackbar樣式確保錯誤訊息清晰可見 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={snackbar.autoHideDuration || 5000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{
                    zIndex: 9999, // 確保顯示在最上層
                    marginTop: '60px', // 增加頂部間距，避免被模態框頭部遮擋
                    '& .MuiAlert-root': {
                        width: '100%',
                        fontSize: '1rem',
                        fontWeight: snackbar.severity === 'error' ? 'bold' : 'normal',
                        padding: '12px 16px'
                    }
                }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default WashGroupManager; 