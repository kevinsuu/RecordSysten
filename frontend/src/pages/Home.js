import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Button, Form, Table, Modal, Navbar, Nav, Pagination } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { FaCog, FaFileExcel, FaSignOutAlt, FaListAlt, FaCalculator } from 'react-icons/fa';
import { utils, writeFile } from 'xlsx';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CompanyManager from '../components/CompanyManager';
import VehicleManager from '../components/VehicleManager';
import AddRecordForm from '../components/AddRecordForm';
import WashItemManager from '../components/WashItemManager';
import * as firebaseService from '../services/firebase';
import { database } from '../services/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-datepicker/dist/react-datepicker.css';
import '../assets/Home.css';
import { ref, set } from 'firebase/database';

function Home() {
    const navigate = useNavigate();
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

    // 添加分頁相關狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(10);

    // 添加表單參考以進行滾動
    const tableRef = useRef(null);

    // Modal 狀態管理
    const [showCompanyManager, setShowCompanyManager] = useState(false);
    const [showVehicleManager, setShowVehicleManager] = useState(false);
    const [showAddRecord, setShowAddRecord] = useState(false);
    const [showWashItemManager, setShowWashItemManager] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // 添加通知狀態
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' // 'success', 'error', 'warning', 'info'
    });

    // 新增記錄高亮效果
    const [recentlyAddedId, setRecentlyAddedId] = useState(null);

    // 添加最後活動時間和定時器的狀態
    const [lastActivityTime, setLastActivityTime] = useState(Date.now());
    const autoRefreshIntervalRef = useRef(null);
    const REFRESH_INTERVAL = 60 * 60 * 1000; // 1小時
    const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5分鐘檢查一次

    // 添加可收合的搜尋介面功能
    const [isSearchExpanded, setIsSearchExpanded] = useState(true);

    // 處理登出
    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
        } catch (error) {
            console.error('登出失敗:', error);
            showNotification('登出失敗: ' + error.message, 'error');
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
                if (vehicle.records && Array.isArray(vehicle.records)) {
                    // 為沒有時間戳的記錄添加時間戳
                    let needsUpdate = false;
                    const recordsWithTimestamp = vehicle.records.map(record => {
                        if (!record.timestamp) {
                            needsUpdate = true;
                            // 如果沒有時間戳，使用日期轉換成時間戳，或使用當前時間作為備用
                            const dateParts = record.date?.split('-');
                            let timestamp;
                            if (dateParts && dateParts.length === 3) {
                                const recordDate = new Date(
                                    parseInt(dateParts[0]),
                                    parseInt(dateParts[1]) - 1,
                                    parseInt(dateParts[2])
                                );
                                timestamp = recordDate.getTime();
                            } else {
                                timestamp = Date.now() - Math.floor(Math.random() * 10000000); // 隨機偏移，避免所有舊記錄有相同時間戳
                            }
                            return { ...record, timestamp };
                        }
                        return record;
                    });

                    // 如果有記錄被更新，更新 Firebase
                    if (needsUpdate) {
                        set(ref(database, `companies/${companyId}/vehicles/${vehicleId}/records`), recordsWithTimestamp)
                            .catch(error => console.error('更新記錄時間戳錯誤:', error));
                    }

                    // 將處理後的記錄添加到列表
                    recordsWithTimestamp.forEach(record => {
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
                }
            });
        });

        // 按時間戳降序排序（最新的記錄在前）
        allRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setRecords(allRecords);
    }, []);

    // 載入資料
    const loadData = useCallback(async (options = {}) => {
        // 如果指定不重新載入，就直接返回
        if (options.reload === false) return;

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

    // 當其他元件儲存資料後的處理函數
    const onSave = (options = {}) => {
        // 如果需要重置表單
        if (options.shouldResetForm) {
            setEditingRecord(null);  // 清除編輯狀態
        }

        // 如果傳入reload為false，則避免重新載入
        if (options.reload === false) {
            // 如果需要清除搜尋
            if (options.shouldClearSearch) {
                clearSearch();
            }

            // 如果有新記錄資料，直接更新本地狀態
            if (options.newRecord) {
                // 標記新添加的記錄ID
                if (options.newRecord.timestamp) {
                    setRecentlyAddedId(options.newRecord.timestamp);

                    // 設置定時器，3秒後清除高亮效果
                    setTimeout(() => {
                        setRecentlyAddedId(null);
                    }, 3000);

                    // 如果是手機版，滾動到卡片視圖位置
                    if (isMobile) {
                        // 使用 setTimeout 確保在 DOM 更新後再滾動
                        setTimeout(() => {
                            // 找到卡片視圖容器
                            const cardViewContainer = document.querySelector('.card-view-container');
                            if (cardViewContainer) {
                                // 計算滾動位置，考慮導航欄的高度
                                const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                                const containerTop = cardViewContainer.offsetTop;

                                window.scrollTo({
                                    top: containerTop - navbarHeight - 10, // 減去導航欄高度並留些空間
                                    behavior: 'smooth'
                                });
                            }
                        }, 100);
                    }
                }

                // 添加新記錄，並確保按時間戳降序排序
                setRecords(prevRecords => {
                    const updatedRecords = [options.newRecord, ...prevRecords];
                    return updatedRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                });
            }

            // 若有更新後的完整資料，則更新資料狀態
            if (options.updatedData) {
                setData(options.updatedData);
                processRecords(options.updatedData);
            }

            // 根據來源決定是否關閉對應的模態
            if (!options.source || options.source !== 'VehicleManager') {
                setShowVehicleManager(false);
            }

            if (!options.source || options.source !== 'CompanyManager') {
                setShowCompanyManager(false);
            }

            // AddRecordForm完成後一律返回主頁面
            setShowAddRecord(false);

            return;
        }

        // 否則執行原本的重新載入邏輯
        loadData();
        setShowAddRecord(false);
        setShowCompanyManager(false);
        setShowVehicleManager(false);
    };

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
            // 將日期字符串轉換為日期對象 (格式應為 'YYYY-MM-DD')
            const dateParts = record.date.split('-');
            if (dateParts.length !== 3) return false;

            const recordDate = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1, // 月份從0開始
                parseInt(dateParts[2])
            );

            // 確保日期有效
            if (isNaN(recordDate.getTime())) return false;

            // 設置比較日期，確保包含整天
            const compareStartDate = new Date(startDate);
            compareStartDate.setHours(0, 0, 0, 0);

            const compareEndDate = new Date(endDate);
            compareEndDate.setHours(23, 59, 59, 999);

            return recordDate >= compareStartDate && recordDate <= compareEndDate;
        });

        // 依據搜尋文字過濾
        if (searchText) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(record => {
                // 檢查各種欄位是否包含搜尋文字
                const typeMatch = record.payment_type?.toLowerCase().includes(search) ||
                    getPaymentTypeText(record.payment_type)?.toLowerCase().includes(search);
                const dateMatch = record.date?.toLowerCase().includes(search);
                const companyMatch = record.companyName?.toLowerCase().includes(search);
                const plateMatch = record.vehicle?.plate?.toLowerCase().includes(search);
                const typeVehicleMatch = record.vehicle?.type?.toLowerCase().includes(search);

                // 檢查金額是否匹配
                const totalAmount = calculateTotal(record.items);
                const amountMatch = totalAmount.toString().includes(search);

                // 檢查服務項目是否包含搜尋文字
                const itemsMatch = record.items.some(item => {
                    if (typeof item === 'string') return item.toLowerCase().includes(search);
                    const nameMatch = item.name.toLowerCase().includes(search);
                    const priceMatch = item.price.toString().includes(search);
                    return nameMatch || priceMatch;
                });

                // 檢查備註是否包含搜尋文字
                const remarksMatch = record.remarks?.toLowerCase().includes(search);

                return typeMatch || dateMatch || companyMatch || plateMatch || typeVehicleMatch ||
                    itemsMatch || remarksMatch || amountMatch;
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
                r => r.date === record.date && r.timestamp === record.timestamp // 增加時間戳比對
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

            showNotification('記錄已成功刪除！');
        } catch (error) {
            console.error('刪除記錄時發生錯誤:', error);
            showNotification(`刪除記錄時發生錯誤: ${error.message}`, 'error');
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
            utils.book_append_sheet(workbook, worksheet, '電子系統紀錄');

            // 生成檔案名稱
            const timeStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
            const fileName = `電子系統紀錄_${timeStr}.xlsx`;

            // 匯出檔案
            writeFile(workbook, fileName);

            showNotification('資料已成功匯出！');
        } catch (error) {
            console.error('匯出資料時發生錯誤:', error);
            showNotification(`匯出資料時發生錯誤: ${error.message}`, 'error');
        }
    };

    // 計算總金額
    const calculateTotal = (items) => {
        if (!items || !items.length) return 0;

        return items.reduce((total, item) => {
            if (typeof item === 'string') {
                // 如果是舊格式（純字串），返回 0
                return total;
            }
            // 確保 quantity 有值，如果沒有則預設為 1
            const quantity = item.quantity || 1;
            // 確保 price 有值，如果沒有則預設為 0
            const price = item.price || 0;
            return total + (price * quantity);
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

    // 計算當前頁面的記錄
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

    // 計算頁碼
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    // 處理頁面變化
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // 當頁面變化時滾動到表單
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // 當過濾條件變化時重置頁碼到第一頁
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCompany, selectedVehicle, startDate, endDate, searchText]);

    // 處理表單點擊
    const handleTableClick = () => {
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // 生成分頁控制元素
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pageItems = [];
        const maxPagesToShow = isMobile ? 2 : 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        // 調整，確保顯示足夠的頁碼
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        // 添加首頁
        if (startPage > 1) {
            pageItems.push(
                <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
                    1
                </Pagination.Item>
            );
            if (startPage > 2) {
                pageItems.push(<Pagination.Ellipsis key="ellipsis-start" />);
            }
        }

        // 添加頁碼
        for (let i = startPage; i <= endPage; i++) {
            pageItems.push(
                <Pagination.Item
                    key={i}
                    active={i === currentPage}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </Pagination.Item>
            );
        }

        // 添加末頁
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageItems.push(<Pagination.Ellipsis key="ellipsis-end" />);
            }
            pageItems.push(
                <Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                </Pagination.Item>
            );
        }

        return (
            <Pagination className={`justify-content-center ${isMobile ? 'pagination-mobile mb-5 pb-4' : 'my-2'}`} size="sm">
                <Pagination.Prev
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                />
                {pageItems}
                <Pagination.Next
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                />
            </Pagination>
        );
    };

    // 在組件卸載時清理
    useEffect(() => {
        return () => {
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, []);

    // 在 return 之前添加樣式
    useEffect(() => {
        const addStyles = () => {
            const styleEl = document.createElement('style');
            styleEl.innerHTML = `
                .pagination-mobile {
                    position: relative;
                    z-index: 1000;
                    margin-bottom: 100px !important;
                }
                .pagination-mobile .page-link {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.875rem;
                }
                .action-buttons-mobile {
                    position: fixed;
                    bottom: 20px;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    padding: 15px 20px;
                    background-color: rgba(255, 255, 255, 0.95);
                    z-index: 1000;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                }
                .action-buttons-mobile .btn {
                    font-size: 1.1rem;
                    padding: 12px 15px;
                    min-width: 46%;
                    border-radius: 8px;
                }
                
                /* 卡片式顯示替代表格 */
                @media (max-width: 768px) {
                    .card-view-container {
                        margin-bottom: 120px;
                    }
                    
                    .record-card {
                        background-color: white;
                        border-radius: 10px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        margin-bottom: 16px;
                        padding: 16px;
                        border-left: 4px solid #007bff;
                    }
                    
                    .record-card-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 8px;
                    }
                    
                    .record-card-company {
                        font-weight: bold;
                        font-size: 1.1rem;
                    }
                    
                    .record-card-date {
                        color: #666;
                    }
                    
                    .record-card-type {
                        font-size: 0.9rem;
                        background-color: #f8f9fa;
                        padding: 4px 8px;
                        border-radius: 4px;
                        margin-bottom: 10px;
                        display: inline-block;
                    }
                    
                    .record-card-plate {
                        margin-bottom: 10px;
                        font-weight: 500;
                    }
                    
                    .record-card-items {
                        margin-top: 12px;
                        margin-bottom: 12px;
                    }
                    
                    .record-card-item {
                        background-color: #f8f9fa;
                        padding: 8px 10px;
                        border-radius: 6px;
                        margin-bottom: 8px;
                        border-left: 3px solid #dee2e6;
                    }
                    
                    .record-card-total {
                        text-align: right;
                        font-weight: bold;
                        font-size: 1.15rem;
                        margin-top: 12px;
                        padding-top: 10px;
                        border-top: 1px solid #eee;
                    }
                    
                    .record-card-action {
                        margin-top: 12px;
                        text-align: right;
                    }
                    
                    .record-card-remarks {
                        font-style: italic;
                        color: #666;
                        margin-top: 8px;
                        margin-bottom: 8px;
                        padding-left: 10px;
                        border-left: 2px solid #ddd;
                    }
                    
                    /* 隱藏原始表格 */
                    .table-responsive {
                        display: none;
                    }
                    
                    /* 移動版底部固定導航 */
                    .mobile-bottom-nav {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        display: flex;
                        justify-content: space-between;
                        padding: 15px 20px;
                        background-color: rgba(255, 255, 255, 0.95);
                        z-index: 1000;
                        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                    }
                    
                    .mobile-bottom-nav .btn {
                        font-size: 1.05rem;
                        padding: 12px 15px;
                        min-width: 46%;
                        border-radius: 8px;
                    }
                    
                    .mobile-bottom-nav .btn-icon {
                        margin-right: 6px;
                    }
                }
                
                /* 新增記錄高亮效果 */
                .highlight-new-record {
                    animation: pulse-animation 1.5s infinite alternate;
                    border-left: 4px solid #28a745 !important;
                    background-color: rgba(40, 167, 69, 0.05);
                }
                
                /* 表格行高亮效果 */
                tr.highlight-new-record {
                    background-color: rgba(40, 167, 69, 0.15) !important;
                    box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
                    animation: pulse-background 1.5s infinite alternate;
                }
                
                tr.highlight-new-record td {
                    background-color: rgba(40, 167, 69, 0.15) !important;
                    font-weight: bold;
                    border: 1px solid rgba(40, 167, 69, 0.3);
                }
                
                @keyframes pulse-animation {
                    0% {
                        box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4);
                    }
                    100% {
                        box-shadow: 0 0 10px 5px rgba(40, 167, 69, 0.2);
                    }
                }
                
                @keyframes pulse-background {
                    0% {
                        background-color: rgba(40, 167, 69, 0.1);
                    }
                    100% {
                        background-color: rgba(40, 167, 69, 0.25);
                    }
                }
                
                /* 搜尋區塊收合動畫 */
                .search-card {
                    transition: all 0.3s ease-in-out;
                    overflow: hidden;
                }
                
                .search-card.collapsed {
                    max-height: 0;
                    padding: 0;
                    margin: 0;
                    opacity: 0;
                }
                
                .search-card.expanded {
                    max-height: 1000px;
                    opacity: 1;
                }
                
                .search-toggle-btn {
                    width: 100%;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 15px;
                    background-color: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    color: #495057;
                }
                
                .search-toggle-btn .toggle-icon {
                    transition: transform 0.3s ease;
                }
                
                .search-toggle-btn .toggle-icon.rotated {
                    transform: rotate(180deg);
                }
            `;
            document.head.appendChild(styleEl);
            return () => {
                document.head.removeChild(styleEl);
            };
        };

        const cleanup = addStyles();
        return cleanup;
    }, []);

    // 更新最後活動時間
    const updateLastActivity = useCallback(() => {
        setLastActivityTime(Date.now());
    }, []);

    // 檢查是否需要更新資料
    const checkAndRefreshData = useCallback(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityTime;

        console.log('檢查是否需要更新:', {
            現在時間: new Date(now).toLocaleString(),
            最後活動時間: new Date(lastActivityTime).toLocaleString(),
            閒置時間: Math.floor(timeSinceLastActivity / 1000) + '秒',
            更新間隔: Math.floor(REFRESH_INTERVAL / 1000) + '秒'
        });

        // 如果超過設定時間沒有活動，重新載入資料
        if (timeSinceLastActivity >= REFRESH_INTERVAL) {
            console.log('開始重新載入資料...');
            loadData();
            updateLastActivity();
            showNotification('資料已自動更新', 'info');
        }
    }, [lastActivityTime, loadData, REFRESH_INTERVAL, updateLastActivity]);

    // 設置活動監聽器
    useEffect(() => {
        // 監聽使用者活動
        const activityEvents = [
            'mousedown', 'mousemove', 'keydown',
            'scroll', 'touchstart', 'click', 'keypress'
        ];

        const handleActivity = () => {
            updateLastActivity();
        };

        // 添加所有事件監聽器
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // 設置定期檢查
        autoRefreshIntervalRef.current = setInterval(() => {
            checkAndRefreshData();
        }, ACTIVITY_CHECK_INTERVAL);

        // 清理函數
        return () => {
            // 移除所有事件監聽器
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });

            // 清除定時器
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, [updateLastActivity, checkAndRefreshData, ACTIVITY_CHECK_INTERVAL]);

    // 導航到公式計算頁面
    const navigateToFormulaCalculator = () => {
        navigate('/formula-calculator');
    };

    // 處理編輯記錄
    const handleEdit = (record, companyId, vehicleId) => {
        setEditingRecord({
            ...record,
            companyId,
            vehicleId
        });
        setShowAddRecord(true);
    };

    // 清除編輯狀態
    const handleCloseAddRecord = () => {
        setShowAddRecord(false);
        setEditingRecord(null);
    };

    return (
        <>
            {/* 導航欄 */}
            <Navbar bg="light" expand="lg" className="mb-3 sticky-top">
                <Container fluid>
                    <Navbar.Brand>記錄系統</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                        <Nav>
                            <Nav.Link onClick={navigateToFormulaCalculator} className="d-flex align-items-center me-3">
                                <FaCalculator className="me-1" /> 公式計算
                            </Nav.Link>
                            <Nav.Link onClick={() => setShowWashItemManager(true)} className="d-flex align-items-center me-3">
                                <FaListAlt className="me-1" /> 服務項目管理
                            </Nav.Link>
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
                                <div className="bg-light p-3 rounded mb-3">
                                    <Row className="mb-2">
                                        {/* 公司選擇 */}
                                        <Col md={4} className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label className="fw-bold me-2 mb-0" style={{ minWidth: "20px" }}>公司</Form.Label>
                                                <div className="d-flex flex-grow-1">
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
                                                        className="ms-2 px-2"
                                                        title="管理公司"
                                                        onClick={() => setShowCompanyManager(true)}
                                                    >
                                                        <FaCog />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>

                                        {/* 車輛選擇 */}
                                        <Col md={4} className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label className="fw-bold me-2 mb-0" style={{ minWidth: "20px" }}>車輛</Form.Label>
                                                <div className="d-flex flex-grow-1">
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
                                                        className="ms-2 px-2"
                                                        title="管理車輛"
                                                        onClick={() => {
                                                            if (selectedCompany === 'all') {
                                                                showNotification('請先選擇一個公司', 'warning');
                                                                return;
                                                            }
                                                            setShowVehicleManager(true);
                                                        }}
                                                    >
                                                        <FaCog />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>

                                        {/* 按鈕區 */}
                                        <Col md={4} className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label className="fw-bold me-2 mb-0" style={{ minWidth: "40px" }}>操作</Form.Label>
                                                <div className="d-flex justify-content-end flex-grow-1">
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
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* 桌面版搜尋區域 */}
                                    <Row className="mt-3">
                                        {/* 日期範圍選擇 */}
                                        <Col md={6} className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label className="fw-bold me-2 mb-0" style={{ minWidth: "80px" }}>日期範圍</Form.Label>
                                                <div className="d-flex flex-wrap align-items-center flex-grow-1">
                                                    <div style={{ zIndex: 100, position: "relative", minWidth: "140px" }} className="me-2 mb-1">
                                                        <DatePicker
                                                            selected={startDate}
                                                            onChange={date => setStartDate(date)}
                                                            className="form-control"
                                                            dateFormat="yyyy-MM-dd"
                                                            placeholderText="起始日期"
                                                        />
                                                    </div>
                                                    <span className="mx-2 mb-1">至</span>
                                                    <div style={{ zIndex: 100, position: "relative", minWidth: "140px" }} className="mb-1">
                                                        <DatePicker
                                                            selected={endDate}
                                                            onChange={date => setEndDate(date)}
                                                            className="form-control"
                                                            dateFormat="yyyy-MM-dd"
                                                            placeholderText="結束日期"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>

                                        {/* 搜尋輸入 */}
                                        <Col md={4} className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label className="fw-bold me-2 mb-0" style={{ minWidth: "80px" }}>關鍵字搜尋</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="搜尋類型、日期、公司、車牌、服務項目..."
                                                    value={searchText}
                                                    onChange={e => setSearchText(e.target.value)}
                                                />
                                            </div>
                                        </Col>

                                        {/* 清除搜尋按鈕 */}
                                        <Col md={2} className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label className="fw-bold me-2 mb-0" style={{ minWidth: "20px" }}>清除</Form.Label>
                                                <Button
                                                    variant="secondary"
                                                    onClick={clearSearch}
                                                    className="flex-grow-1"
                                                >
                                                    清除搜尋
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </>
                        ) : (
                            // 移動版控制區域
                            <>
                                <button
                                    className="search-toggle-btn"
                                    onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                                >
                                    <span>搜尋條件 {isSearchExpanded ? '收起' : '展開'}</span>
                                    <span className={`toggle-icon ${isSearchExpanded ? 'rotated' : ''}`}>
                                        ▼
                                    </span>
                                </button>
                                <div className={`bg-light p-3 rounded mb-4 search-card ${isSearchExpanded ? 'expanded' : 'collapsed'}`}>
                                    {/* 公司選擇 */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold mb-2">公司</Form.Label>
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
                                                className="ms-2 px-2"
                                                title="管理公司"
                                                onClick={() => setShowCompanyManager(true)}
                                            >
                                                <FaCog />
                                            </Button>
                                        </div>
                                    </Form.Group>

                                    {/* 車輛選擇 */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold mb-2">車輛</Form.Label>
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
                                                className="ms-2 px-2"
                                                title="管理車輛"
                                                onClick={() => {
                                                    if (selectedCompany === 'all') {
                                                        showNotification('請先選擇一個公司', 'warning');
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
                                    <Form.Group className="mb-4 mt-3">
                                        <Form.Label className="fw-bold mb-2">日期範圍</Form.Label>
                                        <div className="mb-2">
                                            <Form.Label className="text-muted small">起始日期</Form.Label>
                                            <div style={{ zIndex: 100, position: "relative" }}>
                                                <DatePicker
                                                    selected={startDate}
                                                    onChange={date => setStartDate(date)}
                                                    className="form-control w-100"
                                                    dateFormat="yyyy-MM-dd"
                                                    placeholderText="起始日期"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Form.Label className="text-muted small">結束日期</Form.Label>
                                            <div style={{ zIndex: 100, position: "relative" }}>
                                                <DatePicker
                                                    selected={endDate}
                                                    onChange={date => setEndDate(date)}
                                                    className="form-control w-100"
                                                    dateFormat="yyyy-MM-dd"
                                                    placeholderText="結束日期"
                                                />
                                            </div>
                                        </div>
                                    </Form.Group>

                                    {/* 移動版搜尋輸入 */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold mb-2">關鍵字搜尋</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="搜尋類型、日期、公司、車牌、服務項目..."
                                            value={searchText}
                                            onChange={e => setSearchText(e.target.value)}
                                            className="mb-2"
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
                            </>
                        )}

                        {/* 資料表格容器 - 桌面版 */}
                        <div
                            ref={tableRef}
                            className={`table-responsive ${isMobile ? 'table-container-mobile' : ''}`}
                            onClick={handleTableClick}
                        >
                            <Table striped bordered hover className="mb-0">
                                <thead>
                                    <tr className={isMobile ? "bg-light" : ""}>
                                        <th style={isMobile ? { width: "60px" } : {}}>類型</th>
                                        <th style={isMobile ? { width: "95px" } : {}}>日期</th>
                                        <th style={isMobile ? { width: "65px" } : {}}>公司</th>
                                        <th style={isMobile ? { width: "80px" } : {}}>車牌</th>
                                        {!isMobile && <th>車種</th>}
                                        <th style={isMobile ? { width: "auto" } : {}}>服務項目</th>
                                        {!isMobile && <th>備註</th>}
                                        <th style={isMobile ? { width: "70px" } : {}}>金額</th>
                                        <th style={isMobile ? { width: "60px" } : {}}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRecords.map((record, index) => (
                                        <tr
                                            key={index}
                                            className={record.timestamp === recentlyAddedId ? 'highlight-new-record' : ''}
                                        >
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
                                                    const quantity = typeof item === 'string' ? 1 : (item.quantity || 1);  // 處理舊記錄
                                                    return (
                                                        <div key={idx} className={isMobile ? "item-mobile" : ""}>
                                                            • {itemName} {quantity > 1 ? `x${quantity}` : ''} - ${itemPrice * quantity}
                                                        </div>
                                                    );
                                                })}
                                            </td>
                                            {!isMobile && <td>{record.remarks || ''}</td>}
                                            <td className="text-end">${calculateTotal(record.items).toLocaleString()}</td>
                                            <td>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => handleEdit(record, record.companyId, record.vehicleId)}
                                                >
                                                    編輯
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => deleteRecord(record)}
                                                >
                                                    刪除
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={isMobile ? 7 : 9} className="text-center">沒有找到符合條件的記錄</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                            <div style={{ height: "20px" }}></div>
                            {renderPagination()}
                        </div>

                        {/* 卡片視圖容器 - 移動版 */}
                        {isMobile && (
                            <div className="card-view-container">
                                {currentRecords.length === 0 ? (
                                    <div className="text-center p-4 bg-light rounded">
                                        沒有找到符合條件的記錄
                                    </div>
                                ) : (
                                    currentRecords.map((record, index) => (
                                        <div
                                            key={index}
                                            className={`record-card ${record.timestamp === recentlyAddedId ? 'highlight-new-record' : ''}`}
                                        >
                                            <div className="record-card-header">
                                                <div className="record-card-company">{record.companyName}</div>
                                                <div className="record-card-date">{record.date}</div>
                                            </div>
                                            <div className="record-card-type">
                                                {getPaymentTypeText(record.payment_type)}
                                            </div>
                                            <div className="record-card-plate">
                                                車牌：{record.vehicle.plate}
                                                {record.vehicle.type && <span> ({record.vehicle.type})</span>}
                                            </div>

                                            {record.remarks && (
                                                <div className="record-card-remarks">
                                                    備註：{record.remarks}
                                                </div>
                                            )}

                                            <div className="record-card-items">
                                                {record.items.map((item, idx) => {
                                                    const itemName = typeof item === 'string' ? item : item.name;
                                                    const itemPrice = typeof item === 'string' ? 0 : item.price;
                                                    const quantity = typeof item === 'string' ? 1 : (item.quantity || 1);  // 處理舊記錄
                                                    return (
                                                        <div key={idx} className="record-card-item">
                                                            • {itemName} {quantity > 1 ? `x${quantity}` : ''} - ${itemPrice * quantity}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="record-card-total">
                                                總金額：${calculateTotal(record.items).toLocaleString()}
                                            </div>

                                            <div className="record-card-action">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => handleEdit(record, record.companyId, record.vehicleId)}
                                                >
                                                    編輯
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => deleteRecord(record)}
                                                >
                                                    刪除
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {renderPagination()}
                            </div>
                        )}

                        {/* 移動版底部固定按鈕 */}
                        {isMobile && (
                            <div className="mobile-bottom-nav">
                                <Button
                                    variant="primary"
                                    onClick={() => setShowAddRecord(true)}
                                >
                                    <span className="btn-icon">+</span>
                                    新增紀錄
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={exportToExcel}
                                >
                                    <FaFileExcel className="btn-icon" />
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
                            <Modal.Body style={{ overflow: 'hidden' }}>
                                <CompanyManager
                                    data={data}
                                    setData={setData}
                                    database={database}
                                    onSave={onSave}
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
                            <Modal.Body style={{ overflow: 'hidden' }}>
                                <VehicleManager
                                    data={data}
                                    companyId={selectedCompany}
                                    setData={setData}
                                    database={database}
                                    onSave={onSave}
                                />
                            </Modal.Body>
                        </Modal>

                        {/* 新增/編輯記錄對話框 */}
                        <Modal
                            show={showAddRecord}
                            onHide={handleCloseAddRecord}
                            size="lg"
                            fullscreen={isMobile}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>{editingRecord ? '編輯紀錄' : '新增紀錄'}</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <AddRecordForm
                                    data={data}
                                    setData={setData}
                                    database={database}
                                    companyId={editingRecord ? editingRecord.companyId : (selectedCompany !== 'all' ? selectedCompany : '')}
                                    vehicleId={editingRecord ? editingRecord.vehicleId : (selectedVehicle !== 'all' ? selectedVehicle : '')}
                                    editingRecord={editingRecord}
                                    onSave={onSave}
                                />
                            </Modal.Body>
                        </Modal>

                        {/* 服務項目管理對話框 */}
                        <Modal
                            show={showWashItemManager}
                            onHide={() => setShowWashItemManager(false)}
                            size="lg"
                            fullscreen={isMobile}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>服務項目管理</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <WashItemManager
                                    database={database}
                                    onSave={onSave}
                                />
                            </Modal.Body>
                        </Modal>
                    </>
                )}
            </Container>

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
        </>
    );
}

export default Home; 