import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form, Card, Table, Button } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../assets/FormulaCalculator.css';

function FormulaCalculator() {
    const navigate = useNavigate();
    const [group, setGroup] = useState('');
    const [inputH, setInputH] = useState(620);
    const [inputL, setInputL] = useState(500);
    const [calculatedX, setCalculatedX] = useState(120);
    const [results, setResults] = useState([]);

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
            { formula: '0.66X + L', calculation: (h, l, x) => 0.66 * x + l, result: 0 },
            { formula: '0.58X + L', calculation: (h, l, x) => 0.58 * x + l, result: 0 },
            { formula: '0.5X + L', calculation: (h, l, x) => 0.5 * x + l, result: 0 },
            { formula: '0.42X + L', calculation: (h, l, x) => 0.42 * x + l, result: 0 },
            { formula: '0.33X + L', calculation: (h, l, x) => 0.33 * x + l, result: 0 },
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

    return (
        <Container fluid className="formula-calculator-container">
            <Row className="header-row mb-2">
                <Col>
                    <Button variant="outline-secondary" className="back-button" onClick={handleBack}>
                        <FaArrowLeft /> 返回
                    </Button>
                    <h2 className="text-center my-2">公式計算器</h2>
                </Col>
            </Row>

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
                            style={{
                                backgroundColor: getCurrentGroupColor(),
                                color: '#fff',
                                fontWeight: 'bold',
                                display: group ? 'block' : 'none'
                            }}
                        >
                            {group}
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
        </Container>
    );
}

export default FormulaCalculator; 