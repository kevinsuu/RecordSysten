import React, { useState } from 'react';
import { Button, Form, Row, Col, Modal, ListGroup } from 'react-bootstrap';
import { ref, set, push, remove } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// 需要安裝 react-beautiful-dnd: npm install react-beautiful-dnd

const CompanyManager = ({ data, setData, database, onSave }) => {
    // 狀態管理
    const [companies, setCompanies] = useState(Object.entries(data.companies || {})
        .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
        .map(([id, company]) => ({ id, ...company }))
    );
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');

    // 添加公司
    const addCompany = async () => {
        if (!companyName.trim()) {
            setError('請輸入公司名稱');
            return;
        }

        try {
            // 建立新公司物件
            const newCompany = {
                name: companyName.trim(),
                tax_id: taxId.trim(),
                phone: phone.trim(),
                address: address.trim(),
                vehicles: {},
                sort_index: companies.length
            };

            // 更新 Firebase
            const newCompanyRef = push(ref(database, 'companies'));
            await set(newCompanyRef, newCompany);

            // 更新本地狀態
            const newCompanyWithId = { id: newCompanyRef.key, ...newCompany };
            setCompanies([...companies, newCompanyWithId]);

            // 清除表單
            setCompanyName('');
            setTaxId('');
            setPhone('');
            setAddress('');
            setShowAddModal(false);
            setError('');

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('添加公司時發生錯誤:', error);
            setError(`添加公司時發生錯誤: ${error.message}`);
        }
    };

    // 編輯公司
    const editCompany = async () => {
        if (!companyName.trim()) {
            setError('請輸入公司名稱');
            return;
        }

        try {
            // 更新選中的公司
            const updatedCompany = {
                ...selectedCompany,
                name: companyName.trim(),
                tax_id: taxId.trim(),
                phone: phone.trim(),
                address: address.trim()
            };

            // 更新 Firebase
            await set(ref(database, `companies/${selectedCompany.id}`), {
                name: updatedCompany.name,
                tax_id: updatedCompany.tax_id,
                phone: updatedCompany.phone,
                address: updatedCompany.address,
                vehicles: updatedCompany.vehicles || {},
                sort_index: updatedCompany.sort_index
            });

            // 更新本地狀態
            const newCompanies = companies.map(company =>
                company.id === selectedCompany.id ? updatedCompany : company
            );
            setCompanies(newCompanies);

            // 清除表單
            setCompanyName('');
            setTaxId('');
            setPhone('');
            setAddress('');
            setSelectedCompany(null);
            setShowEditModal(false);
            setError('');

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('編輯公司時發生錯誤:', error);
            setError(`編輯公司時發生錯誤: ${error.message}`);
        }
    };

    // 刪除公司
    const deleteCompany = async (company) => {
        if (!window.confirm(`確定要刪除 "${company.name}" 嗎？這會一併刪除該公司的所有車輛和記錄！`)) {
            return;
        }

        try {
            // 從 Firebase 刪除公司
            await remove(ref(database, `companies/${company.id}`));

            // 更新本地狀態
            const newCompanies = companies.filter(c => c.id !== company.id);

            // 更新排序索引
            const reorderedCompanies = newCompanies.map((company, index) => ({
                ...company,
                sort_index: index
            }));

            // 更新排序索引到 Firebase
            reorderedCompanies.forEach(async (company) => {
                await set(ref(database, `companies/${company.id}/sort_index`), company.sort_index);
            });

            setCompanies(reorderedCompanies);

            // 通知父元件
            if (onSave) onSave();
        } catch (error) {
            console.error('刪除公司時發生錯誤:', error);
            alert(`刪除公司時發生錯誤: ${error.message}`);
        }
    };

    // 處理拖放排序結束事件
    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const items = Array.from(companies);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // 更新排序索引
        const reorderedCompanies = items.map((company, index) => ({
            ...company,
            sort_index: index
        }));

        // 更新本地狀態
        setCompanies(reorderedCompanies);

        // 更新排序索引到 Firebase
        reorderedCompanies.forEach(async (company) => {
            await set(ref(database, `companies/${company.id}/sort_index`), company.sort_index);
        });

        // 通知父元件
        if (onSave) onSave();
    };

    // 清除表單
    const resetForm = () => {
        setCompanyName('');
        setTaxId('');
        setPhone('');
        setAddress('');
        setError('');
    };

    return (
        <div className="company-manager">
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

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="companies">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            <ListGroup className="mb-3">
                                {companies.map((company, index) => (
                                    <Draggable
                                        key={company.id}
                                        draggableId={company.id}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <ListGroup.Item
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`d-flex justify-content-between align-items-center sortable-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                            >
                                                <span>{company.name}</span>
                                                <div>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => {
                                                            setSelectedCompany(company);
                                                            setCompanyName(company.name);
                                                            setTaxId(company.tax_id || '');
                                                            setPhone(company.phone || '');
                                                            setAddress(company.address || '');
                                                            setError('');
                                                            setShowEditModal(true);
                                                        }}
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
                </Droppable>
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
                    <Form.Group className="mb-3">
                        <Form.Label>公司名稱:</Form.Label>
                        <Form.Control
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="請輸入公司名稱"
                            isInvalid={!!error}
                        />
                        <Form.Control.Feedback type="invalid">
                            {error}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>統一編號:</Form.Label>
                        <Form.Control
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            placeholder="請輸入統一編號"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>電話:</Form.Label>
                        <Form.Control
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="請輸入電話"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>地址:</Form.Label>
                        <Form.Control
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="請輸入地址"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={addCompany}>
                        儲存
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 編輯公司對話框 */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>公司資料</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>公司名稱:</Form.Label>
                        <Form.Control
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            isInvalid={!!error}
                        />
                        <Form.Control.Feedback type="invalid">
                            {error}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>統一編號:</Form.Label>
                        <Form.Control
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            placeholder="請輸入統一編號"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>電話:</Form.Label>
                        <Form.Control
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="請輸入電話"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>地址:</Form.Label>
                        <Form.Control
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="請輸入地址"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={editCompany}>
                        儲存
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CompanyManager; 