# company_manager_dialog.py
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle, QInputDialog)
import uuid
from PySide6.QtCore import Qt, QDate, Signal
from PySide6.QtGui import QFont, QPalette, QColor, QIcon
from company_dialog import CompanyDialog
from style_sheet import StyleSheet

class CompanyManagerDialog(QDialog):
    company_updated = Signal()  # 添加信号
    
    def __init__(self, parent=None, data=None):
        super().__init__(parent)
        self.setWindowTitle("公司管理")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(800)
        self.data = data or {"companies": {}}
        self.parent = parent
        self.setup_ui()
        self.load_companies()

    def save_and_update(self):
        """儲存資料並更新介面"""
        # 更新公司順序
        companies = {}
        for i in range(self.list_widget.count()):
            item = self.list_widget.item(i)
            company_id = item.data(Qt.UserRole)
            companies[company_id] = self.data["companies"][company_id]
            # 添加排序索引
            companies[company_id]["sort_index"] = i
        
        # 更新資料
        self.data["companies"] = companies
        
        if hasattr(self.parent, 'save_data'):
            self.parent.save_data()
        if hasattr(self.parent, 'update_company_combo'):
            self.parent.update_company_combo()
        if hasattr(self.parent, 'update_vehicle_combo'):
            self.parent.update_vehicle_combo()
        if hasattr(self.parent, 'update_table'):
            self.parent.update_table()
        self.load_companies()
        self.company_updated.emit()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        # 公司列表
        self.list_widget = QListWidget()
        self.list_widget.setDragDropMode(QListWidget.DragDropMode.InternalMove)  # 允許拖放排序
        self.list_widget.itemClicked.connect(self.company_selected)
        layout.addWidget(self.list_widget)

        # 按鈕區域
        button_layout = QHBoxLayout()
        add_btn = QPushButton("新增公司")
        edit_btn = QPushButton("編輯公司")
        delete_btn = QPushButton("刪除公司")
        
        add_btn.clicked.connect(self.add_company)
        edit_btn.clicked.connect(self.edit_company)
        delete_btn.clicked.connect(self.delete_company)
        
        button_layout.addWidget(add_btn)
        button_layout.addWidget(edit_btn)
        button_layout.addWidget(delete_btn)
        layout.addLayout(button_layout)

        self.setLayout(layout)

        # 連接拖放完成信號
        self.list_widget.model().rowsMoved.connect(self.on_rows_moved)

    def on_rows_moved(self, parent, start, end, destination, row):
        """當項目被拖放時觸發"""
        self.save_and_update()

    def load_companies(self):
        """載入公司列表"""
        self.list_widget.clear()
        
        # 根據 sort_index 排序公司
        sorted_companies = sorted(
            self.data["companies"].items(),
            key=lambda x: x[1].get("sort_index", float('inf'))
        )
        
        for company_id, company_data in sorted_companies:
            item = QListWidgetItem(f"{company_data['name']} ")
            item.setData(Qt.UserRole, company_id)
            self.list_widget.addItem(item)

    def company_selected(self, item):
        company_id = item.data(Qt.UserRole)
        company_data = self.data["companies"][company_id]

    def add_company(self):
        dialog = CompanyDialog(self)
        if dialog.exec():
            company_data = dialog.get_company_data()
            company_id = str(uuid.uuid4())
            company_data["vehicles"] = {}
            self.data["companies"][company_id] = company_data
            self.load_companies()
            self.save_and_update()
            self.company_updated.emit()

    def edit_company(self):
        current_item = self.list_widget.currentItem()
        if not current_item:
            QMessageBox.warning(self, "警告", "請先選擇要編輯的公司")
            return
            
        company_id = current_item.data(Qt.ItemDataRole.UserRole)
        if not company_id:
            return
            
        company_data = self.data["companies"][company_id]
        dialog = CompanyDialog(self, company_data)
        if dialog.exec():
            updated_data = dialog.get_company_data()
            # 保留原有的車輛資料
            updated_data["vehicles"] = company_data.get("vehicles", {})
            self.data["companies"][company_id].update(updated_data)
            self.load_companies()
            self.save_and_update()
            self.company_updated.emit()

    def delete_company(self):
        current_item = self.list_widget.currentItem()
        if not current_item:
            QMessageBox.warning(self, "警告", "請先選擇要刪除的公司")
            return
            
        company_id = current_item.data(Qt.ItemDataRole.UserRole)
        if not company_id:
            return
            
        reply = QMessageBox.question(
            self,
            "確認刪除",
            "確定要刪除這間公司嗎？這將會同時刪除該公司的所有車輛資料！",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            del self.data["companies"][company_id]
            self.load_companies()
            self.save_and_update()
            self.company_updated.emit()
