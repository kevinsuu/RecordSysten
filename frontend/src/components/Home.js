import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Card, Nav, Modal } from 'react-bootstrap';
import { ref, get } from 'firebase/database';
import { FaBuilding, FaCar, FaListAlt, FaPlus, FaSync, FaShower } from 'react-icons/fa';
import CompanyManager from './CompanyManager';
import VehicleManager from './VehicleManager';
import RecordList from './RecordList';
import AddRecordForm from './AddRecordForm';
import WashItemManager from './WashItemManager';
import Loading from './Loading';
import { useAuth } from '../contexts/AuthContext';

const Home = ({ database }) => {
    // State for data
    const [data, setData] = useState({
        companies: {},
        records: [],
        washItems: []
    });

    // UI state
    const [activeTab, setActiveTab] = useState('add-record');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [showWashItemModal, setShowWashItemModal] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { currentUser } = useAuth();

    // 檢查螢幕大小變化
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Modals
    const toggleCompanyModal = () => setShowCompanyModal(!showCompanyModal);
    const toggleVehicleModal = (companyId = null) => {
        setSelectedCompanyId(companyId);
        setShowVehicleModal(!showVehicleModal);
    };
    const toggleWashItemModal = () => setShowWashItemModal(!showWashItemModal);

    // 當 CompanyManager 或 VehicleManager 儲存資料後的處理函數
    // 修改 onSave 函數以檢查 options.reload 參數
    const onSave = useCallback((options = {}) => {
        // 如果 options.reload 為 false，則不重新載入資料
        if (options && options.reload === false) {
            return;
        }

        // 否則重新載入資料
        loadData();
        setShowCompanyModal(false);
        setShowVehicleModal(false);
        setShowWashItemModal(false);
    }, []);

    // 載入資料
    const loadData = useCallback(async (options = {}) => {
        // 如果 options.reload 為 false，則不重新載入資料
        if (options && options.reload === false) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 獲取公司資料
            const companiesRef = ref(database, 'companies');
            const companiesSnapshot = await get(companiesRef);

            // 獲取服務項目資料
            const washItemsRef = ref(database, 'washItems');
            const washItemsSnapshot = await get(washItemsRef);

            // 獲取車輛類型
            const vehicleTypesRef = ref(database, 'vehicleTypes');
            const vehicleTypesSnapshot = await get(vehicleTypesRef);

            if (companiesSnapshot.exists()) {
                const companiesData = companiesSnapshot.val();

                // 建立記錄清單
                const allRecords = [];

                // 處理每間公司
                Object.entries(companiesData).forEach(([companyId, company]) => {
                    const companyName = company.name;

                    // 確保 vehicles 屬性存在且不為空
                    if (company.vehicles) {
                        // 處理每輛車
                        Object.entries(company.vehicles).forEach(([vehicleId, vehicle]) => {
                            const vehiclePlate = vehicle.plate;

                            // 確保 records 屬性存在且不為空
                            if (vehicle.records && Array.isArray(vehicle.records)) {
                                // 處理每筆記錄
                                vehicle.records.forEach((record, index) => {
                                    // 計算記錄的總金額
                                    let totalAmount = 0;
                                    if (record.items && Array.isArray(record.items)) {
                                        record.items.forEach(item => {
                                            totalAmount += parseFloat(item.price || 0);
                                        });
                                    }

                                    // 添加到所有記錄中
                                    allRecords.push({
                                        id: `${companyId}-${vehicleId}-${index}`,
                                        companyId,
                                        companyName,
                                        vehicleId,
                                        vehiclePlate,
                                        date: record.date,
                                        paymentType: record.payment_type,
                                        items: record.items || [],
                                        amount: totalAmount,
                                        remarks: record.remarks || ''
                                    });
                                });
                            }
                        });
                    }
                });

                // 按日期排序記錄 (最新在前)
                allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

                // 更新狀態
                setData({
                    companies: companiesData,
                    records: allRecords,
                    washItems: washItemsSnapshot.exists() ? washItemsSnapshot.val() : [],
                    vehicleTypes: vehicleTypesSnapshot.exists() ? vehicleTypesSnapshot.val() : []
                });
            } else {
                // 沒有資料時的處理
                setData({
                    companies: {},
                    records: [],
                    washItems: washItemsSnapshot.exists() ? washItemsSnapshot.val() : [],
                    vehicleTypes: vehicleTypesSnapshot.exists() ? vehicleTypesSnapshot.val() : []
                });
            }
        } catch (error) {
            console.error('載入資料時發生錯誤:', error);
            setError('載入資料時發生錯誤: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [database]);

    // 初始載入
    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [loadData, currentUser]);

    // 顯示錯誤
    if (error) {
        return (
            <Container className="py-4">
                <div className="alert alert-danger">{error}</div>
                <Button variant="primary" onClick={loadData}>
                    <FaSync className="me-2" /> 重新載入
                </Button>
            </Container>
        );
    }

    // 載入中
    if (loading) {
        return <Loading message="載入資料中..." />;
    }

    return (
        <Container fluid className="py-3">
            <Row>
                {/* 左側導航 (桌面版) 或頂部導航 (移動版) */}
                {isMobile ? (
                    <Col xs={12} className="mb-3">
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="p-0">
                                <Nav variant="pills" className="flex-row nav-justified">
                                    <Nav.Item>
                                        <Nav.Link
                                            active={activeTab === 'add-record'}
                                            onClick={() => setActiveTab('add-record')}
                                            className="text-center py-3"
                                        >
                                            <FaPlus className="d-block mx-auto mb-1" />
                                            <span className="small">新增記錄</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            active={activeTab === 'records'}
                                            onClick={() => setActiveTab('records')}
                                            className="text-center py-3"
                                        >
                                            <FaListAlt className="d-block mx-auto mb-1" />
                                            <span className="small">記錄列表</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            onClick={toggleCompanyModal}
                                            className="text-center py-3"
                                        >
                                            <FaBuilding className="d-block mx-auto mb-1" />
                                            <span className="small">管理公司</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            onClick={() => toggleVehicleModal()}
                                            className="text-center py-3"
                                        >
                                            <FaCar className="d-block mx-auto mb-1" />
                                            <span className="small">管理車輛</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            onClick={toggleWashItemModal}
                                            className="text-center py-3"
                                        >
                                            <FaShower className="d-block mx-auto mb-1" />
                                            <span className="small">服務項目</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                </Nav>
                            </Card.Body>
                        </Card>
                    </Col>
                ) : (
                    <Col md={3} lg={2} className="mb-4">
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <Nav variant="pills" className="flex-column">
                                    <Nav.Item>
                                        <Nav.Link
                                            active={activeTab === 'add-record'}
                                            onClick={() => setActiveTab('add-record')}
                                            className="d-flex align-items-center py-2"
                                        >
                                            <FaPlus className="me-2" /> 新增記錄
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            active={activeTab === 'records'}
                                            onClick={() => setActiveTab('records')}
                                            className="d-flex align-items-center py-2 mt-2"
                                        >
                                            <FaListAlt className="me-2" /> 記錄列表
                                        </Nav.Link>
                                    </Nav.Item>
                                    <hr className="my-3" />
                                    <Nav.Item>
                                        <Nav.Link
                                            onClick={toggleCompanyModal}
                                            className="d-flex align-items-center py-2"
                                        >
                                            <FaBuilding className="me-2" /> 管理公司
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            onClick={() => toggleVehicleModal()}
                                            className="d-flex align-items-center py-2 mt-2"
                                        >
                                            <FaCar className="me-2" /> 管理車輛
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link
                                            onClick={toggleWashItemModal}
                                            className="d-flex align-items-center py-2 mt-2"
                                        >
                                            <FaShower className="me-2" /> 服務項目
                                        </Nav.Link>
                                    </Nav.Item>
                                </Nav>
                            </Card.Body>
                        </Card>
                    </Col>
                )}

                {/* 右側內容 */}
                <Col xs={12} md={9} lg={10}>
                    {activeTab === 'add-record' && (
                        <AddRecordForm
                            data={data}
                            setData={setData}
                            database={database}
                            onSave={onSave}
                        />
                    )}

                    {activeTab === 'records' && (
                        <RecordList
                            records={data.records}
                            companies={data.companies}
                        />
                    )}
                </Col>
            </Row>

            {/* 公司管理視窗 */}
            <Modal
                show={showCompanyModal}
                onHide={toggleCompanyModal}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>管理公司</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <CompanyManager
                        companies={data.companies}
                        database={database}
                        onSave={onSave}
                    />
                </Modal.Body>
            </Modal>

            {/* 車輛管理視窗 */}
            <Modal
                show={showVehicleModal}
                onHide={() => toggleVehicleModal()}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>管理車輛</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <VehicleManager
                        companies={data.companies}
                        vehicleTypes={data.vehicleTypes}
                        database={database}
                        defaultCompanyId={selectedCompanyId}
                        onSave={onSave}
                    />
                </Modal.Body>
            </Modal>

            {/* 服務項目管理視窗 */}
            <Modal
                show={showWashItemModal}
                onHide={toggleWashItemModal}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>管理服務項目</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <WashItemManager
                        database={database}
                        onSave={onSave}
                    />
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default Home; 