import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyBTb79ZPmqRc8s7LU1-zuRA0rUIKmTAISM",
    authDomain: "record-system-aa15c.firebaseapp.com",
    databaseURL: "https://record-system-aa15c-default-rtdb.firebaseio.com",
    projectId: "record-system-aa15c",
    storageBucket: "record-system-aa15c.firebasestorage.app",
    messagingSenderId: "893443841090",
    appId: "1:893443841090:web:ba67ceb1951ad832aa61db"
};

// 初始化 Firebase
let app;
let database;
let auth;

try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase 初始化成功:", app.name);

    database = getDatabase(app);
    auth = getAuth(app);

    // 檢查身份驗證是否正確初始化
    console.log("Firebase Auth 配置:", auth.config);
    console.log("Firebase 當前項目 ID:", app.options.projectId);
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

        // 返回組合後的資料結構
        return {
            companies: companies,
            wash_items: washItems
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

export { database, auth };
export default app; 