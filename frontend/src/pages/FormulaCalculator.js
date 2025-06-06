import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form, Card, Table, Button, ListGroup, Badge, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { FaArrowLeft, FaHistory, FaSave, FaClock, FaTag } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { saveFormulaHistory, getFormulaHistory } from '../services/firebase';
import '../assets/FormulaCalculator.css';

function FormulaCalculator() {
    const navigate = useNavigate();
    const [group, setGroup] = useState('');
    const [inputH, setInputH] = useState(620);
    const [inputL, setInputL] = useState(500);
    const [calculatedX, setCalculatedX] = useState(120);
    const [results, setResults] = useState([]);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [recordName, setRecordName] = useState('');

    // 定義不同組別的公式數據和顏色
    const groupColors = {
        'A組': '#e63946', // 更深的紅色
        '30k組': '#1d3557', // 更深的藍色
        '80k組': '#e76f51', // 更深的橙色
        '20k組': '#7b2cbf'  // 更深的紫色
    };

    // 使用 useMemo 包裝 formulaData 避免重複創建
    const formulaData = useMemo(() => ({
        'A組': [
            { formula: '0.68X + L', calculation: (h, l, x) => 0.66 * x + l, result: 0 },
            { formula: '0.59X + L', calculation: (h, l, x) => 0.58 * x + l, result: 0 },
            { formula: '0.5X + L', calculation: (h, l, x) => 0.5 * x + l, result: 0 },
            { formula: '0.41X + L', calculation: (h, l, x) => 0.42 * x + l, result: 0 },
            { formula: '0.32X + L', calculation: (h, l, x) => 0.33 * x + l, result: 0 },
        ],
        '30k組': [
            { formula: '2X + H', calculation: (h, l, x) => 2 * x + h, result: 0 },
            { formula: '1X + H', calculation: (h, l, x) => 1 * x + h, result: 0 },
            { formula: '0.78X + H', calculation: (h, l, x) => 0.78 * x + h, result: 0 },
            { formula: '0.6X + H', calculation: (h, l, x) => 0.6 * x + h, result: 0 },
            { formula: '0.42X + H', calculation: (h, l, x) => 0.42 * x + h, result: 0 },
            { formula: 'L-0.42X', calculation: (h, l, x) => l - 0.42 * x, result: 0 },
            { formula: 'L-0.6X', calculation: (h, l, x) => l - 0.6 * x, result: 0 },
            { formula: 'L-0.78X', calculation: (h, l, x) => l - 0.78 * x, result: 0 },
            { formula: 'L-1X', calculation: (h, l, x) => l - 1 * x, result: 0 },
            { formula: 'L-2X', calculation: (h, l, x) => l - 2 * x, result: 0 },
        ],
        '80k組': [
            { formula: '2X + H', calculation: (h, l, x) => 2 * x + h, result: 0 },
            { formula: '1X + H', calculation: (h, l, x) => 1 * x + h, result: 0 },
            { formula: '0.78X + H', calculation: (h, l, x) => 0.78 * x + h, result: 0 },
            { formula: '0.6X + H', calculation: (h, l, x) => 0.6 * x + h, result: 0 },
            { formula: '0.42X + H', calculation: (h, l, x) => 0.42 * x + h, result: 0 },

        ],
        '20k組': [
            { formula: 'L-0.42X', calculation: (h, l, x) => l - 0.42 * x, result: 0 },
            { formula: 'L-0.6X', calculation: (h, l, x) => l - 0.6 * x, result: 0 },
            { formula: 'L-0.78X', calculation: (h, l, x) => l - 0.78 * x, result: 0 },
            { formula: 'L-1X', calculation: (h, l, x) => l - 1 * x, result: 0 },
            { formula: 'L-2X', calculation: (h, l, x) => l - 2 * x, result: 0 },
        ]
    }), []);

    // 獲取當前組別的顏色
    const getCurrentGroupColor = () => {
        return group ? groupColors[group] : '';
    };

    // 計算X值
    useEffect(() => {
        // X值由H-L計算得出
        const newX = inputH - inputL;
        setCalculatedX(newX);
    }, [inputH, inputL]);

    // 計算結果
    useEffect(() => {
        if (group && formulaData[group]) {
            const calculatedResults = formulaData[group].map(item => {
                return {
                    ...item,
                    result: Math.round(item.calculation(inputH, inputL, calculatedX) * 10) / 10
                };
            });
            setResults(calculatedResults);
        } else {
            setResults([]);
        }
    }, [group, inputH, inputL, calculatedX, formulaData]);

    // 載入歷史記錄
    const fetchHistory = async () => {
        setLoading(true);
        try {
            console.log('開始載入歷史記錄');
            const history = await getFormulaHistory();
            console.log('歷史記錄載入成功，數量:', history.length);

            // 歷史記錄按時間戳降序排序（最新的在前面）
            if (Array.isArray(history)) {
                const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
                setHistoryRecords(sortedHistory);
            } else {
                console.error('獲取的歷史記錄不是數組');
                setHistoryRecords([]);
            }
        } catch (error) {
            console.error('獲取歷史記錄失敗:', error);
            setHistoryRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // 初次載入歷史記錄
    useEffect(() => {
        fetchHistory();
    }, []);

    // 打開儲存對話框
    const handleOpenSaveModal = () => {
        if (!group) return; // 必須選擇組別才能儲存

        // 設置默認記錄名稱
        const defaultName = `${group} - H:${inputH} L:${inputL} X:${calculatedX}`;
        setRecordName(defaultName);
        setShowSaveModal(true);
    };

    // 關閉儲存對話框
    const handleCloseSaveModal = () => {
        setShowSaveModal(false);
    };

    // 儲存當前記錄
    const saveCurrentRecord = async () => {
        if (!group) return; // 必須選擇組別才能儲存

        setSaving(true);
        try {
            // 構建保存數據
            const recordData = {
                group,
                name: recordName.trim() || `${group} - H:${inputH} L:${inputL}`,
                inputH,
                inputL,
                calculatedX,
                results: results.map(r => ({ formula: r.formula, result: r.result }))
            };

            console.log('正在保存歷史記錄:', recordData);

            // 保存到 Firebase
            const updatedHistory = await saveFormulaHistory(recordData);
            console.log('保存成功，更新後的歷史記錄:', updatedHistory);

            // 重新加載歷史記錄，確保顯示最新數據
            await fetchHistory();

            // 顯示歷史面板並關閉儲存對話框
            setShowHistory(true);
            setShowSaveModal(false);
        } catch (error) {
            console.error('儲存歷史記錄失敗:', error);
            alert('儲存失敗，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    // 從歷史記錄中還原
    const restoreFromHistory = (record) => {
        setGroup(record.group);
        setInputH(record.inputH);
        setInputL(record.inputL);
        setShowHistory(false); // 還原後隱藏歷史記錄
    };

    // 格式化時間戳
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 返回首頁
    const handleBack = () => {
        navigate('/');
    };

    // 生成組別選項，包含顏色指示
    const renderGroupOptions = () => {
        return Object.keys(formulaData).map(groupName => (
            <option
                key={groupName}
                value={groupName}
                style={{ backgroundColor: groupColors[groupName], color: '#fff', fontWeight: 'bold' }}
            >
                {groupName}
            </option>
        ));
    };

    // 切換歷史記錄顯示
    const toggleHistory = () => {
        setShowHistory(!showHistory);
    };

    return (
        <Container fluid className="formula-calculator-container">
            <Row className="header-row mb-2">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <Button variant="outline-secondary" className="back-button" onClick={handleBack}>
                            <FaArrowLeft /> 返回
                        </Button>
                        <h2 className="text-center my-2 flex-grow-1">公式計算器</h2>
                        <Button
                            variant="outline-primary"
                            className="history-button"
                            onClick={toggleHistory}
                        >
                            <FaHistory /> {showHistory ? '隱藏紀錄' : '歷史紀錄'}
                        </Button>
                    </div>
                </Col>
            </Row>

            {showHistory && (
                <Row className="mb-2">
                    <Col>
                        <Card className="history-card">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <span>歷史紀錄</span>
                                {loading && <Spinner animation="border" size="sm" />}
                            </Card.Header>
                            <ListGroup variant="flush">
                                {historyRecords.length > 0 ? (
                                    historyRecords.map((record, index) => (
                                        <ListGroup.Item
                                            key={index}
                                            action
                                            onClick={() => restoreFromHistory(record)}
                                            className="d-flex justify-content-between align-items-center"
                                        >
                                            <div>
                                                <Badge
                                                    bg="primary"
                                                    style={{
                                                        backgroundColor: groupColors[record.group]
                                                    }}
                                                >
                                                    {record.group}
                                                </Badge>{' '}
                                                <span className="history-name">
                                                    {record.name || `H: ${record.inputH}, L: ${record.inputL}, X: ${record.calculatedX}`}
                                                </span>
                                            </div>
                                            <small className="text-muted">
                                                <FaClock className="me-1" />
                                                {formatTimestamp(record.timestamp)}
                                            </small>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <ListGroup.Item className="text-center text-muted">
                                        {loading ? '載入中...' : '沒有歷史紀錄'}
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </Card>
                    </Col>
                </Row>
            )}

            <Row className="mb-2">
                <Col xs={12} md={6} className="mb-2 mb-md-0">
                    <Card
                        className="input-card"
                        style={{
                            borderColor: getCurrentGroupColor(),
                            borderWidth: group ? '2px' : '1px'
                        }}
                    >
                        <Card.Header
                            className="d-flex justify-content-between align-items-center"
                            style={{
                                backgroundColor: getCurrentGroupColor(),
                                color: '#fff',
                                fontWeight: 'bold',
                                display: group ? 'flex' : 'none'
                            }}
                        >
                            <span>{group}</span>
                            <Button
                                size="sm"
                                variant="light"
                                onClick={handleOpenSaveModal}
                                disabled={!group}
                            >
                                <FaSave /> 儲存
                            </Button>
                        </Card.Header>
                        <Card.Body className="py-2">
                            <Form>
                                <Form.Group className="mb-2">
                                    <Form.Label>選擇組別</Form.Label>
                                    <Form.Select
                                        value={group}
                                        onChange={(e) => setGroup(e.target.value)}
                                        className="form-select-lg"
                                    >
                                        <option value="">請選擇...</option>
                                        {renderGroupOptions()}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-2">
                                    <Form.Label>H值</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={inputH}
                                        onChange={(e) => setInputH(Number(e.target.value))}
                                        className="form-control-lg"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-2">
                                    <Form.Label>L值</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={inputL}
                                        onChange={(e) => setInputL(Number(e.target.value))}
                                        className="form-control-lg"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-2">
                                    <Form.Label>X值 (H-L)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={calculatedX}
                                        readOnly
                                        className="form-control-lg bg-light"
                                    />
                                </Form.Group>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card
                        className="result-card"
                        style={{
                            borderColor: getCurrentGroupColor(),
                            borderWidth: group ? '2px' : '1px'
                        }}
                    >
                        <Card.Header
                            style={{
                                backgroundColor: getCurrentGroupColor(),
                                color: '#fff',
                                fontWeight: 'bold',
                                display: group ? 'block' : 'none'
                            }}
                        >
                            計算結果
                        </Card.Header>
                        <Card.Body className="p-0">
                            {!group && <h4 className="mb-2 p-2">計算結果</h4>}
                            {results.length > 0 ? (
                                <div className="table-responsive">
                                    <Table bordered hover className="mb-0">
                                        <thead style={{ backgroundColor: getCurrentGroupColor(), color: '#fff' }}>
                                            <tr>
                                                <th>公式</th>
                                                <th>計算結果</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.formula}</td>
                                                    <td
                                                        className="result-value"
                                                        style={{ color: getCurrentGroupColor() }}
                                                    >
                                                        {item.result}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-center text-muted p-2">請選擇一個組別來查看計算結果</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* 儲存對話框 */}
            <Modal show={showSaveModal} onHide={handleCloseSaveModal} centered>
                <Modal.Header
                    style={{
                        backgroundColor: getCurrentGroupColor(),
                        color: '#fff'
                    }}
                >
                    <Modal.Title>儲存計算記錄</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>記錄名稱</Form.Label>
                            <InputGroup>
                                <InputGroup.Text>
                                    <FaTag />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="輸入一個易於識別的名稱"
                                    value={recordName}
                                    onChange={(e) => setRecordName(e.target.value)}
                                    autoFocus
                                />
                            </InputGroup>
                            <Form.Text className="text-muted">
                                為計算記錄命名，方便以後查找（如未輸入將使用預設名稱）
                            </Form.Text>
                        </Form.Group>

                        <div className="calculation-summary">
                            <div><strong>組別:</strong> {group}</div>
                            <div><strong>H值:</strong> {inputH}</div>
                            <div><strong>L值:</strong> {inputL}</div>
                            <div><strong>X值:</strong> {calculatedX}</div>
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseSaveModal}>
                        取消
                    </Button>
                    <Button
                        variant="primary"
                        onClick={saveCurrentRecord}
                        disabled={saving}
                        style={{
                            backgroundColor: getCurrentGroupColor(),
                            borderColor: getCurrentGroupColor()
                        }}
                    >
                        {saving ? <Spinner animation="border" size="sm" /> : <FaSave className="me-1" />}
                        {saving ? '儲存中...' : '儲存記錄'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default FormulaCalculator; 