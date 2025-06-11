import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// 使用環境變量中的Firebase配置
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 初始化 Firebase
let app;
let database;
let auth;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase 初始化失敗:", error);
}

// Google 登入
export const signInWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error('Google 登入失敗:', error);
        throw error;
    }
};

// 獲取所有資料
export const getAllData = async () => {
    try {
        // 直接獲取companies資料
        const companiesSnapshot = await get(ref(database, 'companies'));
        const companies = companiesSnapshot.val() || {};

        // 獲取wash_items資料 (如果需要)
        const washItemsSnapshot = await get(ref(database, 'wash_items'));
        const washItems = washItemsSnapshot.val() || {};

        // 獲取wash_groups資料 (如果有)
        const washGroupsSnapshot = await get(ref(database, 'wash_groups'));
        const washGroups = washGroupsSnapshot.val() || {};

        // 返回組合後的資料結構
        return {
            companies: companies,
            wash_items: washItems,
            wash_groups: washGroups
        };
    } catch (error) {
        console.error('獲取資料時發生錯誤:', error);
        throw error;
    }
};

// 儲存資料
export const saveData = async (path, data) => {
    try {
        await set(ref(database, path), data);
    } catch (error) {
        console.error('儲存資料時發生錯誤:', error);
        throw error;
    }
};

// 新增公司
export const addCompany = async (company) => {
    try {
        const newCompanyRef = push(ref(database, 'companies'));
        await set(newCompanyRef, company);
        return newCompanyRef.key;
    } catch (error) {
        console.error('新增公司時發生錯誤:', error);
        throw error;
    }
};

// 更新公司
export const updateCompany = async (companyId, company) => {
    try {
        await set(ref(database, `companies/${companyId}`), company);
    } catch (error) {
        console.error('更新公司時發生錯誤:', error);
        throw error;
    }
};

// 刪除公司
export const deleteCompany = async (companyId) => {
    try {
        await remove(ref(database, `companies/${companyId}`));
    } catch (error) {
        console.error('刪除公司時發生錯誤:', error);
        throw error;
    }
};

// 新增車輛
export const addVehicle = async (companyId, vehicle) => {
    try {
        const newVehicleRef = push(ref(database, `companies/${companyId}/vehicles`));
        await set(newVehicleRef, vehicle);
        return newVehicleRef.key;
    } catch (error) {
        console.error('新增車輛時發生錯誤:', error);
        throw error;
    }
};

// 更新車輛
export const updateVehicle = async (companyId, vehicleId, vehicle) => {
    try {
        await set(ref(database, `companies/${companyId}/vehicles/${vehicleId}`), vehicle);
    } catch (error) {
        console.error('更新車輛時發生錯誤:', error);
        throw error;
    }
};

// 刪除車輛
export const deleteVehicle = async (companyId, vehicleId) => {
    try {
        await remove(ref(database, `companies/${companyId}/vehicles/${vehicleId}`));
    } catch (error) {
        console.error('刪除車輛時發生錯誤:', error);
        throw error;
    }
};

// 新增紀錄
export const addRecord = async (companyId, vehicleId, record) => {
    try {
        const vehicleRef = ref(database, `companies/${companyId}/vehicles/${vehicleId}`);
        const snapshot = await get(vehicleRef);
        const vehicle = snapshot.val();
        const records = vehicle.records || [];
        records.push(record);
        await set(ref(database, `companies/${companyId}/vehicles/${vehicleId}/records`), records);
    } catch (error) {
        console.error('新增紀錄時發生錯誤:', error);
        throw error;
    }
};

// 刪除紀錄
export const deleteRecord = async (companyId, vehicleId, recordIndex) => {
    try {
        const vehicleRef = ref(database, `companies/${companyId}/vehicles/${vehicleId}`);
        const snapshot = await get(vehicleRef);
        const vehicle = snapshot.val();
        const records = vehicle.records || [];
        records.splice(recordIndex, 1);
        await set(ref(database, `companies/${companyId}/vehicles/${vehicleId}/records`), records);
    } catch (error) {
        console.error('刪除紀錄時發生錯誤:', error);
        throw error;
    }
};

// 登出用戶
export const signOut = async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('登出時發生錯誤:', error);
        throw error;
    }
};

// 更新排序索引
export const updateSortIndex = async (path, sortIndex) => {
    try {
        await set(ref(database, `${path}/sort_index`), sortIndex);
    } catch (error) {
        console.error('更新排序索引時發生錯誤:', error);
        throw error;
    }
};

// 保存公式計算器歷史記錄
export const saveFormulaHistory = async (historyData) => {
    try {
        // 獲取當前歷史記錄
        const historyRef = ref(database, 'formula_history');
        const snapshot = await get(historyRef);
        let historyList = snapshot.val() || [];

        // 確保歷史記錄是數組
        if (!Array.isArray(historyList)) {
            console.warn('歷史記錄不是數組，重置為空數組');
            historyList = [];
        }

        console.log('現有歷史記錄數量:', historyList.length);

        // 添加新記錄，並附上時間戳
        const newRecord = {
            ...historyData,
            timestamp: Date.now()
        };

        console.log('新記錄:', newRecord);

        // 如果已經有10條記錄，移除最舊的一條
        let updatedHistory = [...historyList];
        if (updatedHistory.length >= 10) {
            updatedHistory.shift(); // 移除最舊的記錄
            console.log('移除最舊的記錄，剩餘數量:', updatedHistory.length);
        }

        // 添加新記錄
        updatedHistory.push(newRecord);
        console.log('添加新記錄後的數量:', updatedHistory.length);

        // 保存更新後的歷史記錄
        await set(ref(database, 'formula_history'), updatedHistory);
        console.log('保存完成');

        return updatedHistory;
    } catch (error) {
        console.error('保存公式歷史記錄時發生錯誤:', error);
        // 將錯誤詳情記錄到控制台，便於調試
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            database: database ? 'initialized' : 'not initialized'
        });
        throw error;
    }
};

// 獲取公式計算器歷史記錄
export const getFormulaHistory = async () => {
    try {
        console.log('正在獲取歷史記錄...');
        const historyRef = ref(database, 'formula_history');
        const snapshot = await get(historyRef);
        const data = snapshot.val();

        // 確保返回的是數組
        if (!data) {
            console.log('沒有歷史記錄數據，返回空數組');
            return [];
        }

        if (!Array.isArray(data)) {
            console.warn('歷史記錄數據不是數組格式:', data);
            return [];
        }

        console.log(`獲取到 ${data.length} 條歷史記錄`);
        return data;
    } catch (error) {
        console.error('獲取公式歷史記錄時發生錯誤:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            database: database ? 'initialized' : 'not initialized'
        });
        // 出錯時返回空數組而不是拋出錯誤，避免頁面崩潰
        return [];
    }
};

// 新增 wash_groups 相關功能
export const createWashGroup = async (groupName) => {
    try {
        const groupId = Date.now().toString();
        await set(ref(database, `wash_groups/${groupId}`), {
            id: groupId,
            name: groupName,
            items: [],
            sort_index: 0
        });
        return groupId;
    } catch (error) {
        console.error('建立洗車分組時發生錯誤:', error);
        throw error;
    }
};

export const updateWashGroup = async (groupId, groupData) => {
    try {
        await set(ref(database, `wash_groups/${groupId}`), groupData);
        return true;
    } catch (error) {
        console.error('更新洗車分組時發生錯誤:', error);
        throw error;
    }
};

export const deleteWashGroup = async (groupId) => {
    try {
        await remove(ref(database, `wash_groups/${groupId}`));
        return true;
    } catch (error) {
        console.error('刪除洗車分組時發生錯誤:', error);
        throw error;
    }
};

export const addItemToGroup = async (groupId, itemId) => {
    try {
        const groupRef = ref(database, `wash_groups/${groupId}`);
        const snapshot = await get(groupRef);

        if (snapshot.exists()) {
            const group = snapshot.val();
            const items = group.items || [];

            // 檢查項目是否已存在於群組中
            if (!items.includes(itemId)) {
                items.push(itemId);
                await set(ref(database, `wash_groups/${groupId}/items`), items);
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error('將項目加入分組時發生錯誤:', error);
        throw error;
    }
};

export const removeItemFromGroup = async (groupId, itemId) => {
    try {
        const groupRef = ref(database, `wash_groups/${groupId}`);
        const snapshot = await get(groupRef);

        if (snapshot.exists()) {
            const group = snapshot.val();
            const items = group.items || [];

            const updatedItems = items.filter(id => id !== itemId);
            await set(ref(database, `wash_groups/${groupId}/items`), updatedItems);

            return true;
        }

        return false;
    } catch (error) {
        console.error('從分組移除項目時發生錯誤:', error);
        throw error;
    }
};

export { database, auth };
export default app; 