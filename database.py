# database.py
import os
import sys
import time
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime
import json

class Database:
    def __init__(self):
        self.MAX_RETRIES = 3
        self.RETRY_DELAY = 1  # 秒
        
        # 檢查是否已經初始化
        if not firebase_admin._apps:
            try:
                # 取得正確的路徑
                if getattr(sys, 'frozen', False):
                    # 如果是打包後的執行檔
                    application_path = sys._MEIPASS
                else:
                    # 如果是直接執行 Python 檔案
                    application_path = os.path.dirname(os.path.abspath(__file__))
                    
                # 初始化 Firebase
                cred = credentials.Certificate(os.path.join(application_path, 'firebase-key.json'))
                firebase_admin.initialize_app(cred, {
                    'databaseURL': 'https://record-system-aa15c-default-rtdb.firebaseio.com'
                })
            except Exception as e:
                print(f"Firebase 初始化失敗：{e}")
                raise
        self.root = db.reference()

    def _retry_operation(self, operation):
        """執行操作並在失敗時重試"""
        for attempt in range(self.MAX_RETRIES):
            try:
                return operation()
            except Exception as e:
                if attempt == self.MAX_RETRIES - 1:  # 最後一次嘗試
                    print(f"操作失敗（重試{self.MAX_RETRIES}次後）：{e}")
                    raise
                print(f"操作失敗，正在重試（{attempt + 1}/{self.MAX_RETRIES}）：{e}")
                time.sleep(self.RETRY_DELAY)

    def save_data(self, data):
        """儲存所有資料"""
        def _save():
            self.root.child('companies').set(data.get('companies', {}))
            return True
        
        try:
            return self._retry_operation(_save)
        except Exception as e:
            print(f"儲存資料失敗：{e}")
            return False

    def save_wash_items(self, items):
        """儲存洗車項目"""
        def _save():
            self.root.child('wash_items').set(items)
            return True
        
        try:
            return self._retry_operation(_save)
        except Exception as e:
            print(f"儲存洗車項目失敗：{e}")
            return False

    def get_wash_items(self):
        """獲取洗車項目"""
        def _get():
            items = self.root.child('wash_items').get()
            return items if items else []
        
        try:
            return self._retry_operation(_get)
        except Exception as e:
            print(f"讀取洗車項目失敗：{e}")
            return []

    def get_all_data(self):
        """獲取所有資料"""
        def _get():
            data = self.root.get()
            return data if data else {"companies": {}}
        
        try:
            return self._retry_operation(_get)
        except Exception as e:
            print(f"讀取資料失敗：{e}")
            return {"companies": {}}

    def delete_record(self, company_id, vehicle_id, record_index):
        """刪除特定記錄"""
        def _delete():
            # 構建記錄的路徑
            record_path = f'companies/{company_id}/vehicles/{vehicle_id}/records/{record_index}'
            # 從 Firebase 中刪除記錄
            self.root.child(record_path).delete()
            return True
        
        try:
            return self._retry_operation(_delete)
        except Exception as e:
            print(f"刪除記錄失敗：{e}")
            return False