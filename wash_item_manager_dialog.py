from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QPalette, QColor, QIcon, QIntValidator
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle, QInputDialog)
from style_sheet import StyleSheet

class WashItemManagerDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("洗車項目管理")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(600)
        self.wash_items = []
        self.parent = parent
        if hasattr(parent, 'wash_items'):
            self.wash_items = parent.wash_items.copy()
        if hasattr(parent, 'database'):
            self.database = parent.database
        self.setup_ui()
        self.load_items()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        # 項目列表
        self.item_list = QListWidget()
        self.item_list.itemClicked.connect(self.item_selected)
        layout.addWidget(self.item_list)

        # 輸入表單
        form_layout = QFormLayout()
        
        # 名稱輸入
        self.item_input = QLineEdit()
        self.item_input.setPlaceholderText("請輸入服務項目名稱")
        form_layout.addRow("服務項目名稱:", self.item_input)
        
        # 金額輸入
        self.price_input = QLineEdit()
        self.price_input.setPlaceholderText("請輸入服務金額")
        self.price_input.setValidator(QIntValidator(0, 999999))  # 限制只能輸入數字
        form_layout.addRow("服務金額:", self.price_input)
        
        layout.addLayout(form_layout)

        # 按鈕區域
        button_layout = QHBoxLayout()
        add_btn = QPushButton("新增項目")
        edit_btn = QPushButton("編輯項目")
        delete_btn = QPushButton("刪除項目")
        add_btn.clicked.connect(self.add_item)
        edit_btn.clicked.connect(self.edit_item)
        delete_btn.clicked.connect(self.delete_item)
        button_layout.addWidget(add_btn)
        button_layout.addWidget(edit_btn)
        button_layout.addWidget(delete_btn)
        layout.addLayout(button_layout)

        self.setLayout(layout)

    def load_items(self):
        """載入洗車項目到列表"""
        self.item_list.clear()
        for item in self.wash_items:
            # 檢查項目是否為新格式（字典）
            if isinstance(item, dict):
                display_text = f"{item['name']} - ${item['price']}"
                list_item = QListWidgetItem(display_text)
                list_item.setData(Qt.UserRole, item)  # 儲存完整的項目資料
            else:
                # 處理舊格式的資料（字串）
                list_item = QListWidgetItem(f"{item} - $0")
                list_item.setData(Qt.UserRole, {"name": item, "price": 0})
            self.item_list.addItem(list_item)

    def item_selected(self, item):
        """當選擇項目時觸發"""
        self.current_item = item
        item_data = item.data(Qt.UserRole)
        if isinstance(item_data, dict):
            self.item_input.setText(item_data["name"])
            self.price_input.setText(str(item_data["price"]))
        else:
            self.item_input.setText(item_data)
            self.price_input.setText("0")
        self.item_input.setFocus()

    def update_database(self):
        """更新 Firebase 資料庫"""
        if hasattr(self, 'database'):
            try:
                self.database.save_wash_items(self.wash_items)
            except Exception as e:
                QMessageBox.warning(self, "錯誤", f"儲存到資料庫時發生錯誤：{str(e)}")

    def edit_item(self):
        """編輯選中的項目"""
        current_item = self.item_list.currentItem()
        if not current_item:
            QMessageBox.warning(self, "錯誤", "請先選擇要編輯的項目")
            return

        new_name = self.item_input.text().strip()
        new_price = self.price_input.text().strip()

        if not new_name:
            QMessageBox.warning(self, "錯誤", "項目名稱不能為空")
            return

        try:
            new_price = int(new_price) if new_price else 0
        except ValueError:
            QMessageBox.warning(self, "錯誤", "金額必須為數字")
            return

        old_item = current_item.data(Qt.UserRole)
        
        # 如果名稱和金額都沒有變更，則不需要更新
        if old_item["name"] == new_name and old_item["price"] == new_price:
            return

        new_item = {
            "name": new_name,
            "price": old_item["price"]  # 預設保持原有金額
        }

        # 只有在金額欄位有輸入時才更新金額
        if new_price != old_item["price"]:
            new_item["price"] = new_price

        # 檢查是否有重複的項目名稱（排除自己）
        if new_name != old_item["name"] and any(
            (isinstance(item, dict) and item["name"] == new_name) or 
            (isinstance(item, str) and item == new_name) 
            for item in self.wash_items
        ):
            QMessageBox.warning(self, "錯誤", "已存在相同名稱的項目")
            return

        # 找到要更新的項目索引
        idx = -1
        for i, item in enumerate(self.wash_items):
            if isinstance(item, dict):
                if item["name"] == old_item["name"] and item["price"] == old_item["price"]:
                    idx = i
                    break
            else:  # 處理舊格式的字串項目
                if item == old_item["name"]:
                    idx = i
                    break
                
        if idx == -1:
            QMessageBox.warning(self, "錯誤", "找不到要編輯的項目")
            return

        # 更新項目
        self.wash_items[idx] = new_item
        current_item.setText(f"{new_name} - ${new_item['price']}")
        current_item.setData(Qt.UserRole, new_item)

        # 更新資料庫
        self.update_database()

        # 更新父視窗
        if hasattr(self.parent, 'wash_items'):
            self.parent.wash_items = self.wash_items.copy()
        if hasattr(self.parent, 'update_wash_items'):
            self.parent.update_wash_items()
        if hasattr(self.parent, 'setup_wash_items'):
            self.parent.setup_wash_items()

    def add_item(self):
        """新增洗車項目"""
        new_name = self.item_input.text().strip()
        new_price = self.price_input.text().strip()

        if not new_name:
            QMessageBox.warning(self, "錯誤", "項目名稱不能為空")
            return

        if not new_price:
            QMessageBox.warning(self, "錯誤", "請輸入服務金額")
            return

        try:
            new_price = int(new_price)
        except ValueError:
            QMessageBox.warning(self, "錯誤", "金額必須為數字")
            return

        # 檢查是否有重複的項目名稱
        if any(item["name"] == new_name for item in self.wash_items):
            QMessageBox.warning(self, "錯誤", "已存在相同名稱的項目")
            return

        # 新增項目
        new_item = {"name": new_name, "price": new_price}
        self.wash_items.append(new_item)
        list_item = QListWidgetItem(f"{new_name} - ${new_price}")
        list_item.setData(Qt.UserRole, new_item)
        self.item_list.addItem(list_item)
        self.item_input.clear()
        self.price_input.clear()
        
        # 更新資料庫
        self.update_database()
        
        # 更新父視窗
        if hasattr(self.parent, 'wash_items'):
            self.parent.wash_items = self.wash_items.copy()
        if hasattr(self.parent, 'update_wash_items'):
            self.parent.update_wash_items()
        if hasattr(self.parent, 'setup_wash_items'):
            self.parent.setup_wash_items()

    def delete_item(self):
        """刪除選中的項目"""
        current_item = self.item_list.currentItem()
        if not current_item:
            QMessageBox.warning(self, "錯誤", "請先選擇要刪除的項目")
            return

        reply = QMessageBox.question(
            self,
            "確認刪除",
            f"確定要刪除「{current_item.text()}」嗎？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            item_data = current_item.data(Qt.UserRole)
            self.wash_items.remove(item_data)
            self.item_list.takeItem(self.item_list.row(current_item))
            self.item_input.clear()
            self.price_input.clear()
            if hasattr(self, 'current_item'):
                delattr(self, 'current_item')
            
            # 更新資料庫
            self.update_database()
            
            # 更新父視窗
            if hasattr(self.parent, 'wash_items'):
                self.parent.wash_items = self.wash_items.copy()
            if hasattr(self.parent, 'update_wash_items'):
                self.parent.update_wash_items()
            if hasattr(self.parent, 'setup_wash_items'):
                self.parent.setup_wash_items()

    def get_wash_items(self):
        """獲取當前的洗車項目列表"""
        return self.wash_items.copy()
