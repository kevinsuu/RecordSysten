import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Form, Table, Modal, Navbar, Nav } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { FaCog, FaFileExcel, FaSignOutAlt } from 'react-icons/fa';
import { utils, writeFile } from 'xlsx';
import CompanyManager from '../components/CompanyManager';
import VehicleManager from '../components/VehicleManager';
import AddRecordForm from '../components/AddRecordForm';
import * as firebaseService from '../services/firebase';
import { database } from '../services/firebase';
import { getAuth, signOut } from 'firebase/auth';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-datepicker/dist/react-datepicker.css';

function Home() {
    // 狀態管理
    const [data, setData] = useState({ companies: {} });
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [selectedVehicle, setSelectedVehicle] = useState('all');
    const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
    const [endDate, setEndDate] = useState(new Date());
    const [searchText, setSearchText] = useState('');
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Modal 狀態管理
    const [showCompanyManager, setShowCompanyManager] = useState(false);
    const [showVehicleManager, setShowVehicleManager] = useState(false);
    const [showAddRecord, setShowAddRecord] = useState(false);

    // 處理登出
    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
        } catch (error) {
            console.error('登出失敗:', error);
            alert('登出失敗: ' + error.message);
        }
    };

    // 監聽窗口大小變化
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 處理記錄
    const processRecords = useCallback((data) => {
        const allRecords = [];

        Object.entries(data.companies || {}).forEach(([companyId, company]) => {
            const companyName = company.name;

            Object.entries(company.vehicles || {}).forEach(([vehicleId, vehicle]) => {
                (vehicle.records || []).forEach((record) => {
                    allRecords.push({
                        ...record,
                        companyId,
                        companyName,
                        vehicleId,
                        vehicle: {
                            plate: vehicle.plate,
                            type: vehicle.type,
                            remarks: vehicle.remarks || ''
                        }
                    });
                });
            });
        });

        setRecords(allRecords);
    }, []);

    // 載入資料
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const loadedData = await firebaseService.getAllData();
            setData(loadedData);
            processRecords(loadedData);
            setIsLoading(false);
        } catch (error) {
            console.error('載入資料時發生錯誤:', error);
            setError(error.message);
            setIsLoading(false);
        }
    }, [processRecords]);

    // 過濾記錄
    const filterRecords = useCallback(() => {
        let filtered = [...records];

        // 依據公司過濾
        if (selectedCompany !== 'all') {
            filtered = filtered.filter(record => record.companyId === selectedCompany);
        }

        // 依據車輛過濾
        if (selectedVehicle !== 'all') {
            filtered = filtered.filter(record => record.vehicleId === selectedVehicle);
        }

        // 依據日期範圍過濾
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });

        // 依據搜尋文字過濾
        if (searchText) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(record => {
                // 檢查各種欄位是否包含搜尋文字
                const typeMatch = record.payment_type?.toLowerCase().includes(search);
                const dateMatch = record.date?.toLowerCase().includes(search);
                const companyMatch = record.companyName?.toLowerCase().includes(search);
                const plateMatch = record.vehicle?.plate?.toLowerCase().includes(search);
                const typeVehicleMatch = record.vehicle?.type?.toLowerCase().includes(search);

                // 檢查服務項目是否包含搜尋文字
                const itemsMatch = record.items.some(item => {
                    if (typeof item === 'string') return item.toLowerCase().includes(search);
                    return item.name.toLowerCase().includes(search);
                });

                // 檢查備註是否包含搜尋文字
                const remarksMatch = record.remarks?.toLowerCase().includes(search);

                return typeMatch || dateMatch || companyMatch || plateMatch || typeVehicleMatch || itemsMatch || remarksMatch;
            });
        }

        setFilteredRecords(filtered);
    }, [records, selectedCompany, selectedVehicle, startDate, endDate, searchText]);

    // 初始載入資料
    useEffect(() => {
        console.log('開始載入資料');
        loadData();
    }, [loadData]);

    // 監聽篩選條件變化
    useEffect(() => {
        filterRecords();
    }, [filterRecords]);

    // 刪除記錄
    const deleteRecord = async (record) => {
        if (!window.confirm('確定要刪除這筆紀錄嗎？')) return;

        try {
            const recordIndex = data.companies[record.companyId].vehicles[record.vehicleId].records.findIndex(
                r => r.date === record.date
            );

            if (recordIndex === -1) throw new Error('找不到要刪除的記錄');

            // 從資料中移除此記錄
            const newData = { ...data };
            newData.companies[record.companyId].vehicles[record.vehicleId].records.splice(recordIndex, 1);

            // 更新 Firebase
            await firebaseService.saveData(
                `companies/${record.companyId}/vehicles/${record.vehicleId}/records`,
                newData.companies[record.companyId].vehicles[record.vehicleId].records
            );

            // 更新狀態
            setData(newData);
            processRecords(newData);

            alert('記錄已成功刪除！');
        } catch (error) {
            console.error('刪除記錄時發生錯誤:', error);
            alert(`刪除記錄時發生錯誤: ${error.message}`);
        }
    };

    // 匯出 Excel
    const exportToExcel = () => {
        try {
            const worksheet = utils.json_to_sheet([]);

            // 添加標題
            utils.sheet_add_aoa(worksheet, [['類型', '日期', '公司', '車牌號碼', '車輛種類', '服務項目', '備註', '金額總計']], { origin: 'A1' });

            let rowIndex = 2;
            filteredRecords.forEach(record => {
                // 處理服務項目
                const items = record.items || [];
                let first = true;

                items.forEach(item => {
                    const itemName = typeof item === 'string' ? item : item.name;
                    const itemPrice = typeof item === 'string' ? 0 : item.price;

                    if (first) {
                        // 第一項目，添加所有欄位
                        utils.sheet_add_aoa(worksheet, [[
                            record.payment_type === 'payable' ? '應付廠商' : record.payment_type === 'receivable' ? '應收廠商' : '',
                            record.date,
                            record.companyName,
                            record.vehicle.plate,
                            record.vehicle.type,
                            `• ${itemName} - $${itemPrice}`,
                            record.remarks || '',
                            calculateTotal(record.items)
                        ]], { origin: `A${rowIndex}` });
                        first = false;
                    } else {
                        // 其他項目，只添加服務項目
                        utils.sheet_add_aoa(worksheet, [[
                            '', '', '', '', '',
                            `• ${itemName} - $${itemPrice}`,
                            '', ''
                        ]], { origin: `A${rowIndex}` });
                    }

                    rowIndex++;
                });

                // 記錄之間添加空行
                rowIndex++;
            });

            // 創建工作簿
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, '洗車紀錄');

            // 生成檔案名稱
            const timeStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
            const fileName = `洗車紀錄_${timeStr}.xlsx`;

            // 匯出檔案
            writeFile(workbook, fileName);

            alert('資料已成功匯出！');
        } catch (error) {
            console.error('匯出資料時發生錯誤:', error);
            alert(`匯出資料時發生錯誤: ${error.message}`);
        }
    };

    // 計算總金額
    const calculateTotal = (items) => {
        if (!items || !items.length) return 0;

        return items.reduce((total, item) => {
            if (typeof item === 'string') return total;
            return total + (item.price || 0);
        }, 0);
    };

    // 清除搜尋
    const clearSearch = () => {
        setSearchText('');
        setStartDate(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
        setEndDate(new Date());
        setSelectedCompany('all');
        setSelectedVehicle('all');
    };

    // 獲取支付類型文字
    const getPaymentTypeText = (type) => {
        switch (type) {
            case 'payable': return '應付廠商';
            case 'receivable': return '應收廠商';
            default: return '';
        }
    };

    return (
        <>
            {/* 導航欄 */}
            <Navbar bg="light" expand="lg" className="mb-3">
                <Container>
                    <Navbar.Brand>電子紀錄系統</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                        <Nav>
                            <Nav.Link onClick={handleLogout} className="d-flex align-items-center">
                                <FaSignOutAlt className="me-1" /> 登出
                            </Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container fluid className="app-container">
                {/* 顯示錯誤信息 */}
                {error && (
                    <div className="alert alert-danger" role="alert">
                        載入資料時發生錯誤: {error}
                    </div>
                )}

                {/* 顯示載入指示器 */}
                {isLoading && (
                    <div className="text-center my-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">載入中...</span>
                        </div>
                        <p className="mt-2">正在載入資料，請稍候...</p>
                    </div>
                )}

                {/* 剩餘內容保持不變 */}
                {!isLoading && (
                    <>
                        {/* 使用 isMobile 控制響應式顯示 */}
                        {!isMobile ? (
                            // 桌面版控制區域
                            <>
                                <Row className="mb-3">
                                    {/* 公司選擇 */}
                                    <Col md={3} className="mb-2">
                                        <Form.Group className="d-flex align-items-center">
                                            <Form.Label className="me-2 mb-0">公司:</Form.Label>
                                            <Form.Select
                                                value={selectedCompany}
                                                onChange={(e) => setSelectedCompany(e.target.value)}
                                                className="flex-grow-1"
                                            >
                                                <option value="all">全部公司</option>
                                                {Object.entries(data.companies || {})
                                                    .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                                                    .map(([id, company]) => (
                                                        <option key={id} value={id}>{company.name}</option>
                                                    ))
                                                }
                                            </Form.Select>
                                            <Button
                                                variant="light"
                                                className="ms-1 p-1"
                                                title="管理公司"
                                                onClick={() => setShowCompanyManager(true)}
                                            >
                                                <FaCog />
                                            </Button>
                                        </Form.Group>
                                    </Col>

                                    {/* 車輛選擇 */}
                                    <Col md={3} className="mb-2">
                                        <Form.Group className="d-flex align-items-center">
                                            <Form.Label className="me-2 mb-0">車輛:</Form.Label>
                                            <Form.Select
                                                value={selectedVehicle}
                                                onChange={(e) => setSelectedVehicle(e.target.value)}
                                                className="flex-grow-1"
                                            >
                                                <option value="all">全部車輛</option>
                                                {selectedCompany !== 'all' &&
                                                    Object.entries(data.companies[selectedCompany]?.vehicles || {})
                                                        .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                                                        .map(([id, vehicle]) => (
                                                            <option key={id} value={id}>
                                                                {vehicle.plate} ({vehicle.type})
                                                            </option>
                                                        ))
                                                }
                                            </Form.Select>
                                            <Button
                                                variant="light"
                                                className="ms-1 p-1"
                                                title="管理車輛"
                                                onClick={() => {
                                                    if (selectedCompany === 'all') {
                                                        alert('請先選擇一個公司');
                                                        return;
                                                    }
                                                    setShowVehicleManager(true);
                                                }}
                                            >
                                                <FaCog />
                                            </Button>
                                        </Form.Group>
                                    </Col>

                                    {/* 按鈕區 */}
                                    <Col md={6} className="mb-2 d-flex justify-content-end">
                                        <Button
                                            variant="primary"
                                            className="me-2"
                                            onClick={() => setShowAddRecord(true)}
                                        >
                                            新增紀錄
                                        </Button>
                                        <Button
                                            variant="success"
                                            onClick={exportToExcel}
                                        >
                                            <FaFileExcel className="me-1" />
                                            匯出篩選資料
                                        </Button>
                                    </Col>
                                </Row>

                                {/* 桌面版搜尋區域 */}
                                <Row className="mb-3">
                                    {/* 日期範圍選擇 */}
                                    <Col md={6} className="mb-2">
                                        <Form.Group className="d-flex align-items-center">
                                            <Form.Label className="me-2 mb-0">日期從:</Form.Label>
                                            <DatePicker
                                                selected={startDate}
                                                onChange={date => setStartDate(date)}
                                                className="form-control me-2"
                                                dateFormat="yyyy-MM-dd"
                                            />
                                            <Form.Label className="me-2 mb-0">到:</Form.Label>
                                            <DatePicker
                                                selected={endDate}
                                                onChange={date => setEndDate(date)}
                                                className="form-control"
                                                dateFormat="yyyy-MM-dd"
                                            />
                                        </Form.Group>
                                    </Col>

                                    {/* 搜尋輸入 */}
                                    <Col md={4} className="mb-2">
                                        <Form.Control
                                            type="text"
                                            placeholder="搜尋服務項目、備註..."
                                            value={searchText}
                                            onChange={e => setSearchText(e.target.value)}
                                        />
                                    </Col>

                                    {/* 清除搜尋按鈕 */}
                                    <Col md={2} className="mb-2">
                                        <Button
                                            variant="secondary"
                                            onClick={clearSearch}
                                            className="w-100"
                                        >
                                            清除搜尋
                                        </Button>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            // 移動版控制區域
                            <div className="mb-3">
                                {/* 公司選擇 */}
                                <Form.Group className="mb-2">
                                    <Form.Label>公司:</Form.Label>
                                    <div className="d-flex">
                                        <Form.Select
                                            value={selectedCompany}
                                            onChange={(e) => setSelectedCompany(e.target.value)}
                                            className="flex-grow-1"
                                        >
                                            <option value="all">全部公司</option>
                                            {Object.entries(data.companies || {})
                                                .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                                                .map(([id, company]) => (
                                                    <option key={id} value={id}>{company.name}</option>
                                                ))
                                            }
                                        </Form.Select>
                                        <Button
                                            variant="light"
                                            className="ms-1 p-1"
                                            title="管理公司"
                                            onClick={() => setShowCompanyManager(true)}
                                        >
                                            <FaCog />
                                        </Button>
                                    </div>
                                </Form.Group>

                                {/* 車輛選擇 */}
                                <Form.Group className="mb-2">
                                    <Form.Label>車輛:</Form.Label>
                                    <div className="d-flex">
                                        <Form.Select
                                            value={selectedVehicle}
                                            onChange={(e) => setSelectedVehicle(e.target.value)}
                                            className="flex-grow-1"
                                        >
                                            <option value="all">全部車輛</option>
                                            {selectedCompany !== 'all' &&
                                                Object.entries(data.companies[selectedCompany]?.vehicles || {})
                                                    .sort((a, b) => (a[1].sort_index || Infinity) - (b[1].sort_index || Infinity))
                                                    .map(([id, vehicle]) => (
                                                        <option key={id} value={id}>
                                                            {vehicle.plate} ({vehicle.type})
                                                        </option>
                                                    ))
                                            }
                                        </Form.Select>
                                        <Button
                                            variant="light"
                                            className="ms-1 p-1"
                                            title="管理車輛"
                                            onClick={() => {
                                                if (selectedCompany === 'all') {
                                                    alert('請先選擇一個公司');
                                                    return;
                                                }
                                                setShowVehicleManager(true);
                                            }}
                                        >
                                            <FaCog />
                                        </Button>
                                    </div>
                                </Form.Group>

                                {/* 移動版日期範圍選擇 */}
                                <Form.Group className="mb-2">
                                    <Form.Label>日期從:</Form.Label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={date => setStartDate(date)}
                                        className="form-control w-100 mb-1"
                                        dateFormat="yyyy-MM-dd"
                                    />
                                    <Form.Label>到:</Form.Label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={date => setEndDate(date)}
                                        className="form-control w-100"
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </Form.Group>

                                {/* 移動版搜尋輸入 */}
                                <Form.Group className="mb-2">
                                    <Form.Control
                                        type="text"
                                        placeholder="搜尋服務項目、備註..."
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        className="mb-1"
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={clearSearch}
                                        className="w-100"
                                    >
                                        清除搜尋
                                    </Button>
                                </Form.Group>
                            </div>
                        )}

                        {/* 資料表格容器 */}
                        <div className={`table-responsive ${isMobile ? 'table-container-mobile' : ''}`}>
                            <Table striped bordered hover className="mb-0">
                                <thead>
                                    <tr>
                                        <th>類型</th>
                                        <th>日期</th>
                                        <th>公司</th>
                                        <th>車牌</th>
                                        {!isMobile && <th>車種</th>}
                                        <th>服務項目</th>
                                        {!isMobile && <th>備註</th>}
                                        <th>金額</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map((record, index) => (
                                        <tr key={index}>
                                            <td>{getPaymentTypeText(record.payment_type)}</td>
                                            <td>{record.date}</td>
                                            <td>{record.companyName}</td>
                                            <td title={record.vehicle.remarks ? `備註：${record.vehicle.remarks}` : ''}>
                                                {record.vehicle.plate}
                                            </td>
                                            {!isMobile && <td>{record.vehicle.type}</td>}
                                            <td>
                                                {record.items.map((item, idx) => {
                                                    const itemName = typeof item === 'string' ? item : item.name;
                                                    const itemPrice = typeof item === 'string' ? 0 : item.price;
                                                    return (
                                                        <div key={idx}>• {itemName} - ${itemPrice}</div>
                                                    );
                                                })}
                                            </td>
                                            {!isMobile && <td>{record.remarks || ''}</td>}
                                            <td className="text-end">${calculateTotal(record.items).toLocaleString()}</td>
                                            <td>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => deleteRecord(record)}
                                                >
                                                    刪除
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={isMobile ? 7 : 9} className="text-center">沒有找到符合條件的記錄</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        {/* 移動版底部固定按鈕 */}
                        {isMobile && (
                            <div className="action-buttons-mobile">
                                <Button
                                    variant="primary"
                                    onClick={() => setShowAddRecord(true)}
                                >
                                    新增紀錄
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={exportToExcel}
                                >
                                    <FaFileExcel className="me-1" />
                                    匯出資料
                                </Button>
                            </div>
                        )}

                        {/* 公司管理對話框 */}
                        <Modal
                            show={showCompanyManager}
                            onHide={() => setShowCompanyManager(false)}
                            size="lg"
                            fullscreen={isMobile}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>公司管理</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <CompanyManager
                                    data={data}
                                    setData={setData}
                                    database={database}
                                    onSave={loadData}
                                />
                            </Modal.Body>
                        </Modal>

                        {/* 車輛管理對話框 */}
                        <Modal
                            show={showVehicleManager}
                            onHide={() => setShowVehicleManager(false)}
                            size="lg"
                            fullscreen={isMobile}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>車輛管理</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <VehicleManager
                                    data={data}
                                    companyId={selectedCompany}
                                    setData={setData}
                                    database={database}
                                    onSave={loadData}
                                />
                            </Modal.Body>
                        </Modal>

                        {/* 新增紀錄對話框 */}
                        <Modal
                            show={showAddRecord}
                            onHide={() => setShowAddRecord(false)}
                            size="lg"
                            fullscreen={isMobile}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>新增紀錄</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <AddRecordForm
                                    data={data}
                                    setData={setData}
                                    database={database}
                                    companyId={selectedCompany !== 'all' ? selectedCompany : ''}
                                    vehicleId={selectedVehicle !== 'all' ? selectedVehicle : ''}
                                    onSave={() => {
                                        loadData();
                                        setShowAddRecord(false);
                                    }}
                                />
                            </Modal.Body>
                        </Modal>
                    </>
                )}
            </Container>
        </>
    );
}

export default Home; 