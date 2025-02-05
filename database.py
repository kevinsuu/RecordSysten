# database.py
import os
import sys
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime
import json

class Database:
    def __init__(self):
        # 檢查是否已經初始化
        if not firebase_admin._apps:
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
        self.root = db.reference()

    def save_data(self, data):
        """儲存所有資料"""
        try:
            # 儲存資料到 Firebase
            self.root.child('companies').set(data.get('companies', {}))
            return True
        except Exception as e:
            print(f"儲存失敗：{e}")
            return False
            
    def save_wash_items(self, items):
        """儲存洗車項目"""
        try:
            self.root.child('wash_items').set(items)
            return True
        except Exception as e:
            print(f"儲存失敗：{e}")
            return False
            
    def get_wash_items(self):
        """獲取洗車項目"""
        try:
            items = self.root.child('wash_items').get()
            return items if items else []
        except Exception as e:
            print(f"讀取失敗：{e}")
            return []

    def get_all_data(self):
        """獲取所有資料"""
        try:
            # 從 Firebase 讀取資料
            data = self.root.get()
            if not data:
                return {"companies": {}}
            return data
        except Exception as e:
            print(f"讀取失敗：{e}")
            return {"companies": {}}