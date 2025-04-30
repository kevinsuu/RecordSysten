import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Modal, ListGroup } from 'react-bootstrap';
import { ref, set, push, remove } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {  FaBars } from 'react-icons/fa';
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

const CompanyManager = ({ data, setData, database, onSave }) => {
    // 狀態管理
    const [companies, setCompanies] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // 通知相關狀態
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // 初始化公司數據
    useEffect(() => {
        if (data && data.companies) {
            const companiesArray = Object.entries(data.companies || {})
                .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                .map(([id, company]) => ({ id, ...company }));
            setCompanies(companiesArray);
        }
    }, [data]);

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

    // 處理拖放排序開始事件
    const onDragStart = () => {
        document.body.style.cursor = 'grabbing';
        setIsDragging(true);
    };

    // 更新全局資料
    const updateGlobalData = (updatedCompanies) => {
        if (setData) {
            const newData = JSON.parse(JSON.stringify(data));

            // 將公司數組轉換為對象格式
            const companiesObj = {};
            updatedCompanies.forEach(company => {
                companiesObj[company.id] = { ...company };
                delete companiesObj[company.id].id; // 刪除多餘的 id 字段
            });

            newData.companies = companiesObj;
            setData(newData);
        }
    };

    // 添加公司
    const addCompany = async () => {
        if (!companyName.trim()) {
            setError('公司名稱不能為空');
            return;
        }

        setError('');
        try {
            // 準備新公司資料
            const newCompanyRef = push(ref(database, 'companies'));
            const newCompany = {
                name: companyName.trim(),
                tax_id: taxId.trim(),
                phone: phone.trim(),
                address: address.trim(),
                vehicles: {},
                sort_index: companies.length + 1 // 從1開始計數
            };

            // 更新 Firebase
            await set(newCompanyRef, newCompany);

            // 更新本地狀態
            const updatedCompany = { id: newCompanyRef.key, ...newCompany };
            const updatedCompanies = [...companies, updatedCompany];
            setCompanies(updatedCompanies);

            // 更新全局資料
            updateGlobalData(updatedCompanies);

            // 重置表單
            resetForm();
            setShowAddModal(false);

            // 顯示成功通知
            showNotification('公司已成功添加！', 'success');
        } catch (error) {
            console.error('添加公司時發生錯誤:', error);
            setError(`添加公司時發生錯誤: ${error.message}`);
            showNotification(`添加公司時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 更新公司
    const updateCompany = async () => {
        if (!companyName.trim() || !selectedCompany) {
            setError('公司名稱不能為空');
            return;
        }

        setError('');
        try {
            // 準備更新資料
            const updatedCompany = {
                name: companyName.trim(),
                tax_id: taxId.trim(),
                phone: phone.trim(),
                address: address.trim(),
                // 保留現有車輛與排序索引
                vehicles: selectedCompany.vehicles || {},
                sort_index: selectedCompany.sort_index
            };

            // 更新 Firebase
            await set(ref(database, `companies/${selectedCompany.id}`), updatedCompany);

            // 更新本地狀態
            const updatedCompanies = companies.map(company =>
                company.id === selectedCompany.id
                    ? { ...company, ...updatedCompany }
                    : company
            );
            setCompanies(updatedCompanies);

            // 更新全局資料
            updateGlobalData(updatedCompanies);

            // 重置表單
            resetForm();
            setShowEditModal(false);

            // 顯示成功通知
            showNotification('公司資料已成功更新！', 'success');
        } catch (error) {
            console.error('更新公司時發生錯誤:', error);
            setError(`更新公司時發生錯誤: ${error.message}`);
            showNotification(`更新公司時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 刪除公司
    const deleteCompany = async (company) => {
        if (!window.confirm(`確定要刪除公司 "${company.name}" 嗎？這將會同時刪除所有相關車輛與紀錄！`)) return;

        try {
            // 從 Firebase 刪除
            await remove(ref(database, `companies/${company.id}`));

            // 更新本地狀態
            const updatedCompanies = companies.filter(c => c.id !== company.id);
            setCompanies(updatedCompanies);

            // 更新全局資料
            updateGlobalData(updatedCompanies);

            // 如果刪除的是當前選中的公司，則清空選擇
            if (selectedCompany && selectedCompany.id === company.id) {
                setSelectedCompany(null);
            }

            // 通知父元件，但不要觸發重新載入整頁
            if (onSave) onSave({ reload: false, source: 'CompanyManager' });

            // 顯示成功通知
            showNotification('公司已成功刪除！', 'success');
        } catch (error) {
            console.error('刪除公司時發生錯誤:', error);
            showNotification(`刪除公司時發生錯誤: ${error.message}`, 'error');
        }
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

        // 獲取當前的公司數組副本
        const items = Array.from(companies);

        // 從源位置移除被拖拽的項目
        const [reorderedItem] = items.splice(result.source.index, 1);

        // 將項目插入到目標位置
        items.splice(result.destination.index, 0, reorderedItem);

        // 更新排序索引，從1開始
        const reorderedCompanies = items.map((company, index) => ({
            ...company,
            sort_index: index + 1
        }));

        // 先更新本地狀態，讓UI即時更新
        setCompanies(reorderedCompanies);

        try {
            // 更新排序索引到 Firebase
            for (const company of reorderedCompanies) {
                await set(ref(database, `companies/${company.id}/sort_index`), company.sort_index);
            }

            // 更新全局狀態
            updateGlobalData(reorderedCompanies);

            // 通知父元件，但不觸發重新載入
            if (onSave) onSave({ reload: false, source: 'CompanyManager' });

            showNotification('排序已更新', 'success');
        } catch (error) {
            console.error('更新排序時發生錯誤:', error);
            showNotification(`更新排序時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 清除表單
    const resetForm = () => {
        setCompanyName('');
        setTaxId('');
        setPhone('');
        setAddress('');
        setError('');
    };

    // 準備編輯公司
    const prepareEditCompany = (company) => {
        setSelectedCompany(company);
        setCompanyName(company.name || '');
        setTaxId(company.tax_id || '');
        setPhone(company.phone || '');
        setAddress(company.address || '');
        setShowEditModal(true);
    };

    // 清理事件監聽器
    useEffect(() => {
        return () => {
            document.body.style.cursor = 'default';
        };
    }, []);

    return (
        <div className="company-manager" style={{ overflow: 'hidden' }}>
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
                    >
                        新增公司
                    </Button>
                </Col>
            </Row>

            {isDragging && (
                <div className="alert alert-info mb-2">
                    <small>拖曳進行中...放開滑鼠完成排序</small>
                </div>
            )}

            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd} strict={true}>
                <StrictModeDroppable droppableId="company-list">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="drag-container mb-3"
                            style={{ overflow: 'hidden' }}
                        >
                            <ListGroup className="mb-3">
                                {companies.map((company, index) => (
                                    <Draggable
                                        key={`company-${company.id}`}
                                        draggableId={`company-${company.id}`}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <ListGroup.Item
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`d-flex justify-content-between align-items-center company-item ${snapshot.isDragging ? 'dragging' : ''}`}
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
                                                        <strong>{company.name}</strong>
                                                        {company.tax_id && <small className="d-block text-muted">統編：{company.tax_id}</small>}
                                                        {company.phone && <small className="d-block text-muted">電話：{company.phone}</small>}
                                                        {company.address && <small className="d-block text-muted">地址：{company.address}</small>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-1"
                                                        onClick={() => prepareEditCompany(company)}
                                                    >
                                                        編輯
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => deleteCompany(company)}
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

            {companies.length === 0 && (
                <div className="text-center p-3 bg-light rounded">
                    尚未添加任何公司
                </div>
            )}

            {/* 新增公司對話框 */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>新增公司</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>公司名稱 *</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入公司名稱"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>統一編號</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入統一編號"
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>電話</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入聯絡電話"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>地址</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入公司地址"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </Form.Group>

                        {error && <div className="text-danger mb-3">{error}</div>}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={addCompany}>
                        新增
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 編輯公司對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>編輯公司</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>公司名稱 *</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入公司名稱"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>統一編號</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入統一編號"
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>電話</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入聯絡電話"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>地址</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="輸入公司地址"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </Form.Group>

                        {error && <div className="text-danger mb-3">{error}</div>}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={updateCompany}>
                        更新
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CompanyManager; 