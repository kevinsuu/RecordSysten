import sys
import json
import uuid
from datetime import datetime
from pathlib import Path
from openpyxl import Workbook
import qtawesome as qta
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle)
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QPalette, QColor, QIcon

class StyleSheet:
    MAIN_STYLE = """
        QMainWindow, QDialog {
            background-color: #f0f0f0;
        }
        QLabel {
            font-size: 14px;
        }
        QPushButton {
            font-size: 14px;
            padding: 5px 15px;
            background-color: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
        }
        QPushButton:hover {
            background-color: #357abd;
        }
        QComboBox {
            font-size: 14px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: white;
        }
        QComboBox:hover {
            border-color: #4a90e2;
        }
        QLineEdit, QTextEdit {
            font-size: 14px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: white;
        }
        QLineEdit:focus, QTextEdit:focus {
            border-color: #4a90e2;
        }
        QTableWidget {
            font-size: 14px;
            background-color: white;
            border: 1px solid #ccc;
        }
        QHeaderView::section {
            background-color: #e0e0e0;
            padding: 5px;
            font-size: 14px;
            border: none;
            border-right: 1px solid #ccc;
            border-bottom: 1px solid #ccc;
        }
        QScrollArea, QScrollArea QWidget {
            background-color: #f0f0f0;
        }
        QCheckBox {
            font-size: 14px;
            padding: 5px;
            background-color: transparent;
        }
        QCheckBox:hover {
            background-color: #e0e0e0;
            border-radius: 4px;
        }
        QDateEdit {
            font-size: 14px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: white;
        }
        QDateEdit:hover {
            border-color: #4a90e2;
        }
    """

class CompanyManagerDialog(QDialog):
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
        self.parent.data = self.data
        self.parent.save_data()
        self.parent.update_company_combo()
        self.parent.update_vehicle_combo()
        self.parent.update_table()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        # 公司列表
        self.list_widget = QListWidget()
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

        # 確定和取消按鈕
        dialog_buttons = QHBoxLayout()

        layout.addLayout(dialog_buttons)

        self.setLayout(layout)

    def load_companies(self):
        self.list_widget.clear()
        for company_id, company_data in self.data["companies"].items():
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

class VehicleManagerDialog(QDialog):
    def __init__(self, parent=None, company_id=None, data=None):
        super().__init__(parent)
        self.setWindowTitle("車輛管理")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(800)
        self.company_id = company_id
        self.data = data
        self.parent = parent
        self.setup_ui()
        self.load_vehicles()

    def save_and_update(self):
        self.parent.data = self.data
        self.parent.save_data()
        self.parent.update_vehicle_combo()
        self.parent.update_table()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        # 車輛列表
        self.list_widget = QListWidget()
        self.list_widget.itemClicked.connect(self.vehicle_selected)
        layout.addWidget(self.list_widget)

        # 按鈕區域
        button_layout = QHBoxLayout()
        add_btn = QPushButton("新增車輛")
        edit_btn = QPushButton("編輯車輛")
        delete_btn = QPushButton("刪除車輛")
        add_btn.clicked.connect(self.add_vehicle)
        edit_btn.clicked.connect(self.edit_vehicle)
        delete_btn.clicked.connect(self.delete_vehicle)
        button_layout.addWidget(add_btn)
        button_layout.addWidget(edit_btn)
        button_layout.addWidget(delete_btn)
        layout.addLayout(button_layout)

        # 確定和取消按鈕
        dialog_buttons = QHBoxLayout()

        layout.addLayout(dialog_buttons)

        self.setLayout(layout)

    def load_vehicles(self):
        self.list_widget.clear()
        vehicles = self.data["companies"][self.company_id].get("vehicles", {})
        for vehicle_id, vehicle_data in vehicles.items():
            item = QListWidgetItem(f"{vehicle_data['plate']} ({vehicle_data['type']})")
            item.setData(Qt.UserRole, vehicle_id)
            self.list_widget.addItem(item)

    def vehicle_selected(self, item):
        vehicle_id = item.data(Qt.UserRole)
        vehicle_data = self.data["companies"][self.company_id]["vehicles"][vehicle_id]

    def add_vehicle(self):
        dialog = VehicleDialog(self)
        if dialog.exec():
            vehicle_data = dialog.get_vehicle_data()
            vehicle_id = str(uuid.uuid4())
            self.data["companies"][self.company_id]["vehicles"][vehicle_id] = vehicle_data
            self.load_vehicles()
            self.save_and_update()

    def edit_vehicle(self):
        current_item = self.list_widget.currentItem()
        if not current_item:
            QMessageBox.warning(self, "警告", "請先選擇要編輯的車輛")
            return
            
        vehicle_id = current_item.data(Qt.ItemDataRole.UserRole)
        if not vehicle_id:
            return
            
        vehicle_data = self.data["companies"][self.company_id]["vehicles"][vehicle_id]
        
        dialog = VehicleDialog(self, vehicle_data)
        if dialog.exec():
            updated_data = dialog.get_vehicle_data()
            self.data["companies"][self.company_id]["vehicles"][vehicle_id].update(updated_data)
            self.load_vehicles()
            self.save_and_update()

    def delete_vehicle(self):
        current_item = self.list_widget.currentItem()
        if not current_item:
            QMessageBox.warning(self, "警告", "請先選擇要刪除的車輛")
            return
            
        vehicle_id = current_item.data(Qt.ItemDataRole.UserRole)
        if not vehicle_id:
            return
            
        reply = QMessageBox.question(
            self,
            "確認刪除",
            "確定要刪除這台車輛嗎？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            del self.data["companies"][self.company_id]["vehicles"][vehicle_id]
            self.load_vehicles()
            self.save_and_update()

class CompanyDialog(QDialog):
    def __init__(self, parent=None, company_data=None):
        super().__init__(parent)
        self.setWindowTitle("公司資料")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(400)
        self.company_data = company_data
        self.setup_ui()
        if company_data:
            self.load_company_data()

    def setup_ui(self):
        layout = QFormLayout()
        layout.setSpacing(15)
        
        # 公司名稱
        self.name_edit = QLineEdit()
        self.name_edit.setMaxLength(30)  # 限制最多30個字
        self.name_edit.setPlaceholderText("請輸入公司名稱（最多30個字）")
        layout.addRow("公司名稱:", self.name_edit)
        
        # 統一編號
        self.tax_id_edit = QLineEdit()
        self.tax_id_edit.setPlaceholderText("請輸入統一編號")
        self.tax_id_edit.setMaxLength(8)
        layout.addRow("統一編號:", self.tax_id_edit)
        
        # 電話
        self.phone_edit = QLineEdit()
        self.phone_edit.setPlaceholderText("請輸入電話")
        layout.addRow("電話:", self.phone_edit)
        
        # 地址
        self.address_edit = QLineEdit()
        self.address_edit.setPlaceholderText("請輸入地址")
        layout.addRow("地址:", self.address_edit)

        # 按鈕
        button_layout = QHBoxLayout()
        save_btn = QPushButton("儲存")
        cancel_btn = QPushButton("取消")
        save_btn.clicked.connect(self.accept)
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(save_btn)
        button_layout.addWidget(cancel_btn)
        layout.addRow("", button_layout)

        self.setLayout(layout)

    def load_company_data(self):
        self.name_edit.setText(self.company_data.get("name", ""))
        self.tax_id_edit.setText(self.company_data.get("tax_id", ""))
        self.phone_edit.setText(self.company_data.get("phone", ""))
        self.address_edit.setText(self.company_data.get("address", ""))

    def get_company_data(self):
        return {
            "name": self.name_edit.text(),
            "tax_id": self.tax_id_edit.text(),
            "phone": self.phone_edit.text(),
            "address": self.address_edit.text(),
            "vehicles": {}
        }

class VehicleDialog(QDialog):
    def __init__(self, parent=None, vehicle_data=None):
        super().__init__(parent)
        self.setWindowTitle("車輛資料")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(400)
        self.vehicle_data = vehicle_data
        self.setup_ui()
        if vehicle_data:
            self.load_vehicle_data()

    def setup_ui(self):
        layout = QFormLayout()
        layout.setSpacing(15)
        
        # 車牌號碼
        self.plate_edit = QLineEdit()
        self.plate_edit.setPlaceholderText("請輸入車牌號碼")
        layout.addRow("車牌號碼:", self.plate_edit)
        
        # 車型
        self.model_edit = QLineEdit()
        self.model_edit.setPlaceholderText("請輸入車型")
        layout.addRow("車型:", self.model_edit)
        
        # 種類
        self.type_combo = QComboBox()
        self.type_combo.addItems(["水泥攪拌車", "大貨車", "連結車", "其他"])
        layout.addRow("種類:", self.type_combo)

        # 備註
        self.remarks_edit = QTextEdit()
        self.remarks_edit.setPlaceholderText("請輸入備註（選填）")
        self.remarks_edit.setMinimumHeight(100)
        layout.addRow("備註:", self.remarks_edit)

        # 按鈕
        button_layout = QHBoxLayout()
        save_btn = QPushButton("儲存")
        cancel_btn = QPushButton("取消")
        save_btn.clicked.connect(self.accept)
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(save_btn)
        button_layout.addWidget(cancel_btn)
        layout.addRow("", button_layout)

        self.setLayout(layout)

    def load_vehicle_data(self):
        self.plate_edit.setText(self.vehicle_data.get("plate", ""))
        self.model_edit.setText(self.vehicle_data.get("model", ""))
        type_index = self.type_combo.findText(self.vehicle_data.get("type", ""))
        if type_index >= 0:
            self.type_combo.setCurrentIndex(type_index)
        self.remarks_edit.setText(self.vehicle_data.get("remarks", ""))

    def get_vehicle_data(self):
        return {
            "plate": self.plate_edit.text(),
            "model": self.model_edit.text(),
            "type": self.type_combo.currentText(),
            "remarks": self.remarks_edit.toPlainText(),
            "records": []
        }

class AddRecordDialog(QDialog):
    def __init__(self, parent=None, data=None, current_company=None, current_vehicle=None):
        super().__init__(parent)
        self.setWindowTitle("新增紀錄")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(800)
        self.data = data
        self.current_company = current_company
        self.current_vehicle = current_vehicle
        self.wash_items = self.load_wash_items()
        self.setup_ui()
        
        # 初始化完成後更新車輛列表
        if self.company_combo.count() > 1:
            self.company_combo.setCurrentIndex(1)
            self.update_vehicles()
            if self.vehicle_combo.count() > 0:
                self.vehicle_combo.setCurrentIndex(0)
                
        # 連接公司選擇變更事件
        self.company_combo.currentIndexChanged.connect(self.on_company_changed)
        
    def on_company_changed(self, index):
        self.update_vehicles()

    def load_wash_items(self):
        try:
            with open('data/wash_items.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            default_items = [
                "引擎清洗",
                "車身清洗",
                "輪胎清洗",
                "車斗清洗",
                "內裝清洗"
            ]
            with open('data/wash_items.json', 'w', encoding='utf-8') as f:
                json.dump(default_items, f, ensure_ascii=False, indent=4)
            return default_items

    def save_wash_items(self, items):
        with open('data/wash_items.json', 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=4)

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        # 日期選擇
        date_layout = QHBoxLayout()
        self.date_edit = QDateEdit()
        self.date_edit.setDisplayFormat("yyyy/MM/dd")
        self.date_edit.setDate(QDate.currentDate())
        self.date_edit.setCalendarPopup(True)
        date_layout.addWidget(QLabel("日期:"))
        date_layout.addWidget(self.date_edit)
        date_layout.addStretch()
        layout.addLayout(date_layout)

        # 公司和車輛選擇
        selection_layout = QFormLayout()
        
        # 公司選擇
        company_layout = QHBoxLayout()
        self.company_combo = QComboBox()
        company_layout.addWidget(self.company_combo)
        manage_company_btn = QPushButton()
        manage_company_btn.setIcon(qta.icon('fa5s.cog'))
        manage_company_btn.setToolTip("管理公司")
        manage_company_btn.setStyleSheet("""
            QPushButton {
                border: none;
                background-color: transparent;
                padding: 0px;
                margin: 0px;
            }
            QPushButton:hover {
                background-color: #f0f0f0;
            }
        """)
        manage_company_btn.setFixedSize(24, 24)
        manage_company_btn.clicked.connect(self.manage_companies)
        company_layout.addWidget(manage_company_btn)
        selection_layout.addRow("公司:", company_layout)
        
        # 車輛選擇
        vehicle_layout = QHBoxLayout()
        self.vehicle_combo = QComboBox()
        vehicle_layout.addWidget(self.vehicle_combo)
        manage_vehicle_btn = QPushButton()
        manage_vehicle_btn.setIcon(qta.icon('fa5s.cog'))
        manage_vehicle_btn.setToolTip("管理車輛")
        manage_vehicle_btn.setStyleSheet("""
            QPushButton {
                border: none;
                background-color: transparent;
                padding: 0px;
                margin: 0px;
            }
            QPushButton:hover {
                background-color: #f0f0f0;
            }
        """)
        manage_vehicle_btn.setFixedSize(24, 24)
        manage_vehicle_btn.clicked.connect(self.manage_vehicles)
        vehicle_layout.addWidget(manage_vehicle_btn)
        selection_layout.addRow("車輛:", vehicle_layout)
        
        layout.addLayout(selection_layout)

        items_header = QHBoxLayout()
        items_header.addWidget(QLabel("服務項目:"))
        manage_items_btn = QPushButton()
        manage_items_btn.setIcon(qta.icon('fa5s.cog'))
        manage_items_btn.setToolTip("管理項目")
        manage_items_btn.setStyleSheet("""
            QPushButton {
                border: none;
                background-color: transparent;
                padding: 0px;
                margin: 0px;
            }
            QPushButton:hover {
                background-color: #f0f0f0;
            }
        """)
        manage_items_btn.setFixedSize(24, 24)
        manage_items_btn.clicked.connect(self.manage_wash_items)
        items_header.addWidget(manage_items_btn)
        items_header.addStretch()
        layout.addLayout(items_header)

        self.items_layout = QHBoxLayout()
        self.items_layout.setSpacing(20)
        self.setup_wash_items()
        layout.addLayout(self.items_layout)

        # 備註
        layout.addWidget(QLabel("備註:"))
        self.remarks_edit = QTextEdit()
        self.remarks_edit.setMaximumHeight(100)
        layout.addWidget(self.remarks_edit)

        # 按鈕
        button_layout = QHBoxLayout()
        ok_btn = QPushButton("確定")
        cancel_btn = QPushButton("取消")
        ok_btn.clicked.connect(self.accept)
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(ok_btn)
        button_layout.addWidget(cancel_btn)
        layout.addLayout(button_layout)

        self.setLayout(layout)
        self.load_companies()

    def setup_wash_items(self):
        # 清除現有的勾選框
        while self.items_layout.count():
            item = self.items_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        # 重新建立勾選框
        self.wash_items_checkboxes = {}
        for item in self.wash_items:
            checkbox = QCheckBox(item)
            checkbox.setStyleSheet("""
                QCheckBox {
                    margin-right: 10px;
                }
            """)
            self.wash_items_checkboxes[item] = checkbox
            self.items_layout.addWidget(checkbox)
        self.items_layout.addStretch()

    def manage_wash_items(self):
        dialog = WashItemManagerDialog(self, self.wash_items)
        if dialog.exec():
            self.wash_items = dialog.get_wash_items()
            self.save_wash_items(self.wash_items)
            self.setup_wash_items()

    def load_companies(self):
        self.company_combo.clear()
        self.company_combo.addItem("全部公司", "all")
        for company_id, company_data in self.data["companies"].items():
            self.company_combo.addItem(company_data["name"], company_id)

    def update_vehicles(self):
        self.vehicle_combo.clear()
        company_id = self.company_combo.currentData()
        if company_id and company_id != "all":
            vehicles = self.data["companies"][company_id].get("vehicles", {})
            for vehicle_id, vehicle_data in vehicles.items():
                self.vehicle_combo.addItem(f"{vehicle_data['plate']} ({vehicle_data['type']})", vehicle_id)

    def get_selected_items(self):
        return [cb.text() for cb in self.wash_items_checkboxes.values() if cb.isChecked()]

    def get_record_data(self):
        return {
            "company_id": self.company_combo.currentData(),
            "vehicle_id": self.vehicle_combo.currentData(),
            "date": self.date_edit.date().toString("yyyy-MM-dd"),
            "items": self.get_selected_items(),
            "remarks": self.remarks_edit.toPlainText()
        }

    def manage_companies(self):
        dialog = CompanyManagerDialog(self, self.data)
        dialog.exec()

    def manage_vehicles(self):
        company_id = self.company_combo.currentData()
        if company_id == "all":
            QMessageBox.warning(self, "警告", "請先選擇一個公司")
            return
            
        dialog = VehicleManagerDialog(self, company_id, self.data)
        dialog.exec()

class WashItemManagerDialog(QDialog):
    def __init__(self, parent=None, wash_items=None):
        super().__init__(parent)
        self.setWindowTitle("管理項目")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(400)
        self.wash_items = wash_items if wash_items else []
        self.setup_ui()
        self.load_items()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        self.item_list = QListWidget()
        self.item_list.itemClicked.connect(self.item_selected)
        layout.addWidget(self.item_list)

        # 編輯區域
        form_layout = QFormLayout()
        self.item_input = QLineEdit()
        self.item_input.setPlaceholderText("請輸入服務項目名稱")
        form_layout.addRow("服務項目名稱:", self.item_input)
        layout.addLayout(form_layout)

        # 按鈕區域
        button_layout = QHBoxLayout()
        
        add_btn = QPushButton("新增項目")
        add_btn.clicked.connect(self.add_item)
        button_layout.addWidget(add_btn)
        
        edit_btn = QPushButton("編輯項目")
        edit_btn.clicked.connect(self.edit_item)
        button_layout.addWidget(edit_btn)
        
        delete_btn = QPushButton("刪除項目")
        delete_btn.clicked.connect(self.delete_item)
        button_layout.addWidget(delete_btn)
        
        layout.addLayout(button_layout)

        self.setLayout(layout)

    def load_items(self):
        self.item_list.clear()
        for item in self.wash_items:
            self.item_list.addItem(item)

    def item_selected(self, item):
        self.item_input.setText(item.text())

    def add_item(self):
        item_name = self.item_input.text().strip()
        if not item_name:
            QMessageBox.warning(self, "錯誤", "項目名稱不能為空")
            return
        if item_name in self.wash_items:
            QMessageBox.warning(self, "錯誤", "項目名稱已存在")
            return
        self.wash_items.append(item_name)
        self.load_items()
        self.item_input.clear()
        if isinstance(self.parent(), (AddRecordDialog, MainWindow)):
            self.parent().save_wash_items(self.wash_items)
            if isinstance(self.parent(), AddRecordDialog):
                self.parent().setup_wash_items()

    def edit_item(self):
        current_item = self.item_list.currentItem()
        if not current_item:
            QMessageBox.warning(self, "錯誤", "請先選擇要編輯的項目")
            return
        
        new_name = self.item_input.text().strip()
        if not new_name:
            QMessageBox.warning(self, "錯誤", "項目名稱不能為空")
            return
            
        old_name = current_item.text()
        if new_name != old_name and new_name in self.wash_items:
            QMessageBox.warning(self, "錯誤", "項目名稱已存在")
            return
            
        idx = self.wash_items.index(old_name)
        self.wash_items[idx] = new_name
        self.load_items()
        if isinstance(self.parent(), (AddRecordDialog, MainWindow)):
            self.parent().save_wash_items(self.wash_items)
            if isinstance(self.parent(), AddRecordDialog):
                self.parent().setup_wash_items()

    def delete_item(self):
        current_item = self.item_list.currentItem()
        if not current_item:
            QMessageBox.warning(self, "錯誤", "請先選擇要刪除的服務項目")
            return
            
        item_name = current_item.text()
        reply = QMessageBox.question(
            self,
            "確認刪除",
            f"確定要刪除服務項目「{item_name}」嗎？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.wash_items.remove(item_name)
            self.load_items()
            self.item_input.clear()
            if isinstance(self.parent(), (AddRecordDialog, MainWindow)):
                self.parent().save_wash_items(self.wash_items)
                if isinstance(self.parent(), AddRecordDialog):
                    self.parent().setup_wash_items()

    def get_wash_items(self):
        return self.wash_items.copy()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("電子紀錄系統")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(1200)
        self.setMinimumHeight(800)
        
        # 先設置 UI
        self.setup_ui()
        
        # 再載入資料
        self.load_data()
        
        # 最後更新表格
        self.update_table()

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout()
        layout.setSpacing(20)
        central_widget.setLayout(layout)

        # 上方控制區域
        top_layout = QHBoxLayout()
        
        # 公司選擇區域
        company_layout = QHBoxLayout()
        company_layout.setSpacing(2)  # 設置更小的間距
        company_label = QLabel("公司:")
        self.company_combo = QComboBox()
        self.company_combo.addItem("全部公司", "all")
        self.company_combo.setMinimumWidth(150)
        manage_company_btn = QPushButton()
        manage_company_btn.setIcon(qta.icon('fa5s.cog'))
        manage_company_btn.setToolTip("管理公司")
        manage_company_btn.setStyleSheet("""
            QPushButton {
                border: none;
                background-color: transparent;
                padding: 0px;
                margin: 0px;
            }
            QPushButton:hover {
                background-color: #f0f0f0;
            }
        """)
        manage_company_btn.setFixedSize(24, 24)  # 設置固定大小
        manage_company_btn.clicked.connect(self.manage_companies)
        company_layout.addWidget(company_label)
        company_layout.addWidget(self.company_combo)
        company_layout.addWidget(manage_company_btn)
        
        # 車輛選擇區域
        vehicle_layout = QHBoxLayout()
        vehicle_layout.setSpacing(2)  # 設置更小的間距
        vehicle_label = QLabel("車輛:")
        self.vehicle_combo = QComboBox()
        self.vehicle_combo.addItem("全部車輛", "all")
        self.vehicle_combo.setMinimumWidth(150)
        manage_vehicle_btn = QPushButton()
        manage_vehicle_btn.setIcon(qta.icon('fa5s.cog'))
        manage_vehicle_btn.setToolTip("管理車輛")
        manage_vehicle_btn.setStyleSheet("""
            QPushButton {
                border: none;
                background-color: transparent;
                padding: 0px;
                margin: 0px;
            }
            QPushButton:hover {
                background-color: #f0f0f0;
            }
        """)
        manage_vehicle_btn.setFixedSize(24, 24)  # 設置固定大小
        manage_vehicle_btn.clicked.connect(self.manage_vehicles)
        vehicle_layout.addWidget(vehicle_label)
        vehicle_layout.addWidget(self.vehicle_combo)
        vehicle_layout.addWidget(manage_vehicle_btn)

        # 將公司和車輛選擇區域添加到頂部佈局
        selection_layout = QHBoxLayout()
        selection_layout.addLayout(company_layout)
        selection_layout.addSpacing(20)  # 公司和車輛選擇之間的間距
        selection_layout.addLayout(vehicle_layout)
        top_layout.addLayout(selection_layout)
        top_layout.addStretch()

        # 新增紀錄和匯出按鈕
        buttons_layout = QHBoxLayout()  # 改為 QHBoxLayout
        add_record_btn = QPushButton("新增紀錄")
        add_record_btn.setMinimumWidth(150)  # 稍微縮小寬度
        add_record_btn.clicked.connect(self.add_record)
        export_btn = QPushButton("匯出篩選資料")
        export_btn.setMinimumWidth(150)  # 稍微縮小寬度
        export_btn.clicked.connect(self.export_filtered_data)
        buttons_layout.addWidget(add_record_btn)
        buttons_layout.addWidget(export_btn)
        buttons_layout.setSpacing(10)  # 設置按鈕之間的間距
        buttons_layout.addStretch()  # 添加彈性空間
        top_layout.addLayout(buttons_layout)

        layout.addLayout(top_layout)

        # 搜尋區域
        search_layout = QHBoxLayout()
        
        # 日期範圍搜尋
        date_layout = QHBoxLayout()
        date_from_label = QLabel("日期從:")
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.setDate(QDate.currentDate().addYears(-1))  # 預設為一年前
        date_to_label = QLabel("到:")
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.setDate(QDate.currentDate())
        date_layout.addWidget(date_from_label)
        date_layout.addWidget(self.start_date)
        date_layout.addWidget(date_to_label)
        date_layout.addWidget(self.end_date)
        search_layout.addLayout(date_layout)

        # 搜尋欄位
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("搜尋服務項目、備註...")
        self.search_input.textChanged.connect(self.filter_records)
        search_layout.addWidget(self.search_input)

        # 清除搜尋按鈕
        clear_search_btn = QPushButton("清除搜尋")
        clear_search_btn.clicked.connect(self.clear_search)
        search_layout.addWidget(clear_search_btn)

        layout.addLayout(search_layout)

        # 表格
        self.records_table = QTableWidget()
        self.records_table.setColumnCount(7)  # 增加欄位
        self.records_table.setHorizontalHeaderLabels(["日期", "公司", "車號", "車輛種類", "服務項目", "備註", "操作"])
        header = self.records_table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.Fixed)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Fixed)
        header.setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        header.setSectionResizeMode(3, QHeaderView.ResizeMode.Fixed)  # 新增的車輛種類欄位
        header.setSectionResizeMode(4, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(5, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(6, QHeaderView.ResizeMode.Fixed)
        header.setMinimumSectionSize(100)
        header.resizeSection(0, 150)  # 日期
        header.resizeSection(1, 150)  # 公司
        header.resizeSection(2, 150)  # 車號
        header.resizeSection(3, 150)  # 車輛種類
        header.resizeSection(6, 150)  # 操作
        self.records_table.verticalHeader().setVisible(False)
        layout.addWidget(self.records_table)

        # 設置事件處理
        self.company_combo.currentIndexChanged.connect(self.update_vehicle_combo)
        self.company_combo.currentIndexChanged.connect(self.update_table)
        self.vehicle_combo.currentIndexChanged.connect(self.update_table)
        self.start_date.dateChanged.connect(self.filter_records)
        self.end_date.dateChanged.connect(self.filter_records)

    def update_company_combo(self):
        if not hasattr(self, 'company_combo'):
            return
            
        current_company = self.company_combo.currentData()
        self.company_combo.clear()
        self.company_combo.addItem("全部公司", "all")
        
        # 將公司按名稱排序
        sorted_companies = sorted(
            self.data["companies"].items(),
            key=lambda x: x[1]["name"]
        )
        
        for company_id, company_data in sorted_companies:
            self.company_combo.addItem(company_data["name"], company_id)
            
        # 嘗試恢復之前選擇的公司
        if current_company:
            index = self.company_combo.findData(current_company)
            if index >= 0:
                self.company_combo.setCurrentIndex(index)

    def update_vehicle_combo(self):
        if not hasattr(self, 'vehicle_combo'):
            return
            
        self.vehicle_combo.clear()
        self.vehicle_combo.addItem("全部車輛", "all")
        
        try:
            company_id = self.company_combo.currentData()
            if company_id and company_id != "all":
                company_data = self.data["companies"].get(company_id, {})
                if isinstance(company_data, dict) and "name" in company_data:
                    # 先取得所有車輛並排序
                    vehicles = []
                    for vehicle_id, vehicle_data in company_data.get("vehicles", {}).items():
                        if isinstance(vehicle_data, dict):
                            plate = vehicle_data.get("plate", "")
                            vehicle_type = vehicle_data.get("type", "")
                            vehicles.append((plate, vehicle_id, vehicle_data))
                    
                    # 按車牌排序
                    vehicles.sort(key=lambda x: x[0])
                    
                    # 添加到下拉選單
                    for plate, vehicle_id, vehicle_data in vehicles:
                        vehicle_type = vehicle_data.get("type", "")
                        self.vehicle_combo.addItem(f"{plate} ({vehicle_type})", vehicle_id)
                        
        except Exception as e:
            QMessageBox.warning(self, "錯誤", f"更新車輛列表時發生錯誤：{str(e)}")
            
        # 如果有之前的選擇，嘗試恢復
        if self.vehicle_combo.currentData():
            index = self.vehicle_combo.findData(self.vehicle_combo.currentData())
            if index >= 0:
                self.vehicle_combo.setCurrentIndex(index)

    def load_data(self):
        try:
            # 確保 data 資料夾存在
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            
            data_file = data_dir / 'washing_records.json'
            if data_file.exists():
                with open(data_file, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
            else:
                self.data = {"companies": {}}
                self.save_data()
                
        except (FileNotFoundError, json.JSONDecodeError):
            self.data = {"companies": {}}
            self.save_data()
            
        # 更新下拉選單
        self.update_company_combo()
        # 預設選擇「全部公司」
        self.company_combo.setCurrentIndex(0)
        # 更新車輛列表
        self.update_vehicle_combo()

    def save_data(self):
        # 確保 data 資料夾存在
        data_dir = Path('data')
        data_dir.mkdir(exist_ok=True)
        
        # 儲存資料
        data_file = data_dir / 'washing_records.json'
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=4)

    def add_record(self):
        # 創建新增記錄對話框，並傳入當前資料
        dialog = AddRecordDialog(
            parent=self,
            data=self.data,
            current_company=None,  # 不傳入當前選擇的公司
            current_vehicle=None   # 不傳入當前選擇的車輛
        )
        
        if dialog.exec():
            record_data = dialog.get_record_data()
            company_id = record_data["company_id"]
            vehicle_id = record_data["vehicle_id"]
            
            # 確保記錄陣列存在
            if "records" not in self.data["companies"][company_id]["vehicles"][vehicle_id]:
                self.data["companies"][company_id]["vehicles"][vehicle_id]["records"] = []
            
            # 建立新記錄
            new_record = {
                "date": record_data["date"],
                "items": record_data["items"],
                "remarks": record_data["remarks"]
            }
            
            # 添加記錄
            self.data["companies"][company_id]["vehicles"][vehicle_id]["records"].append(new_record)
            self.save_data()
            self.update_table()

    def delete_record(self, row):
        reply = QMessageBox.question(
            self,
            "確認刪除",
            "確定要刪除這筆紀錄嗎？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            company_id = self.company_combo.currentData()
            vehicle_id = self.vehicle_combo.currentData()
            
            # 如果是在"全部"視圖下，需要從表格中獲取實際的公司和車輛ID
            if company_id == 'all' or vehicle_id == 'all':
                # 從表格中獲取該行的實際公司和車輛ID
                table_company_id = self.records_table.item(row, 1).data(Qt.ItemDataRole.UserRole)
                table_vehicle_id = self.records_table.item(row, 2).data(Qt.ItemDataRole.UserRole)
                
                if table_company_id and table_vehicle_id:
                    company_id = table_company_id
                    vehicle_id = table_vehicle_id
                else:
                    QMessageBox.warning(self, "錯誤", "無法找到要刪除的記錄")
                    return
            
            # 獲取要刪除的記錄的日期
            date_to_delete = self.records_table.item(row, 0).text()
            
            # 找到對應的記錄並刪除
            records = self.data["companies"][company_id]["vehicles"][vehicle_id]["records"]
            for i, record in enumerate(records):
                if record["date"] == date_to_delete:
                    records.pop(i)
                    break
                    
            self.save_data()
            self.update_table()

    def manage_companies(self):
        dialog = CompanyManagerDialog(self, self.data)
        dialog.exec()

    def manage_vehicles(self):
        company_id = self.company_combo.currentData()
        if company_id == "all":
            QMessageBox.warning(self, "警告", "請先選擇一個公司")
            return
            
        dialog = VehicleManagerDialog(self, company_id, self.data)
        dialog.exec()

    def manage_wash_items(self):
        dialog = WashItemManagerDialog(self, self.load_wash_items())
        if dialog.exec():
            self.save_wash_items(dialog.get_wash_items())

    def save_wash_items(self, wash_items):
        with open('data/wash_items.json', 'w', encoding='utf-8') as f:
            json.dump(wash_items, f, ensure_ascii=False, indent=4)

    def update_table(self):
        self.records_table.setRowCount(0)
        company_id = self.company_combo.currentData()
        vehicle_id = self.vehicle_combo.currentData()
        records = []

        try:
            if company_id == "all":
                # 顯示所有公司的記錄
                for comp_id, company_data in self.data["companies"].items():
                    if isinstance(company_data, dict) and "name" in company_data:
                        company_name = company_data["name"]
                        for veh_id, vehicle_data in company_data.get("vehicles", {}).items():
                            if isinstance(vehicle_data, dict):
                                vehicle_plate = vehicle_data.get("plate", "")
                                vehicle_type = vehicle_data.get("type", "")  # 獲取車輛種類
                                for record in vehicle_data.get("records", []):
                                    records.append({
                                        "company_id": comp_id,
                                        "vehicle_id": veh_id,
                                        "company_name": company_name,
                                        "vehicle_plate": vehicle_plate,
                                        "vehicle_type": vehicle_type,  # 添加車輛種類
                                        **record
                                    })
            else:
                # 顯示特定公司的記錄
                company_data = self.data["companies"].get(company_id, {})
                if isinstance(company_data, dict) and "name" in company_data:
                    company_name = company_data["name"]
                    if vehicle_id == "all":
                        # 顯示該公司所有車輛的記錄
                        for veh_id, vehicle_data in company_data.get("vehicles", {}).items():
                            if isinstance(vehicle_data, dict):
                                vehicle_plate = vehicle_data.get("plate", "")
                                vehicle_type = vehicle_data.get("type", "")  # 獲取車輛種類
                                for record in vehicle_data.get("records", []):
                                    records.append({
                                        "company_id": company_id,
                                        "vehicle_id": veh_id,
                                        "company_name": company_name,
                                        "vehicle_plate": vehicle_plate,
                                        "vehicle_type": vehicle_type,  # 添加車輛種類
                                        **record
                                    })
                    else:
                        # 顯示特定車輛的記錄
                        vehicle_data = company_data.get("vehicles", {}).get(vehicle_id, {})
                        if isinstance(vehicle_data, dict):
                            vehicle_plate = vehicle_data.get("plate", "")
                            vehicle_type = vehicle_data.get("type", "")  # 獲取車輛種類
                            for record in vehicle_data.get("records", []):
                                records.append({
                                    "company_id": company_id,
                                    "vehicle_id": vehicle_id,
                                    "company_name": company_name,
                                    "vehicle_plate": vehicle_plate,
                                    "vehicle_type": vehicle_type,  # 添加車輛種類
                                    **record
                                })

            # 過濾日期範圍
            start_date = self.start_date.date().toString("yyyy-MM-dd")
            end_date = self.end_date.date().toString("yyyy-MM-dd")
            search_text = self.search_input.text().lower()

            filtered_records = []
            for record in records:
                if start_date <= record["date"] <= end_date:
                    # 搜尋服務項目和備註
                    items_text = " ".join(record.get("items", [])).lower()
                    remarks_text = record.get("remarks", "").lower()
                    if (not search_text or 
                        search_text in items_text or 
                        search_text in remarks_text):
                        filtered_records.append(record)

            # 按日期排序（最新的在最上面）
            filtered_records.sort(key=lambda x: x["date"], reverse=True)

            # 更新表格
            for record in filtered_records:
                row = self.records_table.rowCount()
                self.records_table.insertRow(row)
                
                # 日期
                date_item = QTableWidgetItem(record["date"])
                self.records_table.setItem(row, 0, date_item)
                
                # 公司
                company_item = QTableWidgetItem(record["company_name"])
                company_item.setData(Qt.ItemDataRole.UserRole, record["company_id"])
                self.records_table.setItem(row, 1, company_item)
                
                # 車號
                vehicle_item = QTableWidgetItem(record["vehicle_plate"])
                vehicle_item.setData(Qt.ItemDataRole.UserRole, record["vehicle_id"])
                self.records_table.setItem(row, 2, vehicle_item)
                
                # 車輛種類
                vehicle_type_item = QTableWidgetItem(record["vehicle_type"])
                self.records_table.setItem(row, 3, vehicle_type_item)
                
                # 服務項目
                items_item = QTableWidgetItem(", ".join(record.get("items", [])))
                self.records_table.setItem(row, 4, items_item)
                
                # 備註
                remarks_item = QTableWidgetItem(record.get("remarks", ""))
                self.records_table.setItem(row, 5, remarks_item)
                
                # 刪除按鈕
                delete_btn = QPushButton("刪除")
                delete_btn.setStyleSheet("""
                    QPushButton {
                        background-color: #ff4444;
                        color: white;
                        border: none;
                        padding: 5px;
                        border-radius: 3px;
                    }
                    QPushButton:hover {
                        background-color: #ff6666;
                    }
                """)
                delete_btn.clicked.connect(lambda checked, r=row: self.delete_record(r))
                self.records_table.setCellWidget(row, 6, delete_btn)

        except Exception as e:
            QMessageBox.warning(self, "錯誤", f"更新表格時發生錯誤：{str(e)}")

    def filter_records(self):
        search_text = self.search_input.text().lower()
        start_date = self.start_date.date().toString("yyyy-MM-dd")
        end_date = self.end_date.date().toString("yyyy-MM-dd")

        for row in range(self.records_table.rowCount()):
            hide = False
            
            # 檢查日期
            date_str = self.records_table.item(row, 0).text()
            record_date = QDate.fromString(date_str, "yyyy-MM-dd")
            if record_date < QDate.fromString(start_date, "yyyy-MM-dd") or record_date > QDate.fromString(end_date, "yyyy-MM-dd"):
                hide = True
            
            # 檢查搜尋文字
            if not hide and search_text:
                items_text = self.records_table.item(row, 4).text().lower()
                remarks_text = self.records_table.item(row, 5).text().lower()
                if search_text not in items_text and search_text not in remarks_text:
                    hide = True
            
            self.records_table.setRowHidden(row, hide)

    def clear_search(self):
        # 重置搜尋文字
        self.search_input.clear()
        
        # 重置日期範圍
        self.start_date.setDate(QDate.currentDate().addYears(-1))
        self.end_date.setDate(QDate.currentDate())
        
        # 重置公司選擇為「全部公司」
        self.company_combo.setCurrentIndex(0)
        
        # 重置車輛選擇為「全部車輛」
        self.vehicle_combo.setCurrentIndex(0)
        
        # 更新表格
        self.update_table()

    def export_filtered_data(self):
        # 取得目前顯示的資料
        rows = self.records_table.rowCount()
        visible_rows = sum(1 for row in range(rows) if not self.records_table.isRowHidden(row))
        
        if visible_rows == 0:
            QMessageBox.warning(self, "警告", "沒有可匯出的資料")
            return

        # 選擇儲存位置
        file_name, _ = QFileDialog.getSaveFileName(
            self,
            "選擇儲存位置",
            f"清洗紀錄_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            "Excel Files (*.xlsx)"
        )
        
        if not file_name:
            return

        try:
            # 創建工作簿和工作表
            wb = Workbook()
            ws = wb.active
            ws.title = "清洗紀錄"

            # 寫入標題
            headers = ["日期", "公司", "車號", "車輛種類", "服務項目", "備註"]
            for col, header in enumerate(headers, 1):
                ws.cell(row=1, column=col, value=header)

            # 寫入資料
            excel_row = 2
            for row in range(rows):
                if not self.records_table.isRowHidden(row):
                    date = self.records_table.item(row, 0).text()
                    company = self.records_table.item(row, 1).text()
                    plate = self.records_table.item(row, 2).text()
                    vehicle_type = self.records_table.item(row, 3).text()
                    items = self.records_table.item(row, 4).text()
                    remarks = self.records_table.item(row, 5).text()
                    
                    ws.cell(row=excel_row, column=1, value=date)
                    ws.cell(row=excel_row, column=2, value=company)
                    ws.cell(row=excel_row, column=3, value=plate)
                    ws.cell(row=excel_row, column=4, value=vehicle_type)
                    ws.cell(row=excel_row, column=5, value=items)
                    ws.cell(row=excel_row, column=6, value=remarks)
                    excel_row += 1

            # 調整欄寬
            for col in ws.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = (max_length + 2)
                ws.column_dimensions[column].width = adjusted_width

            # 儲存檔案
            wb.save(file_name)
            QMessageBox.information(self, "成功", "資料已成功匯出至 Excel")
        except Exception as e:
            QMessageBox.critical(self, "錯誤", f"匯出失敗：{str(e)}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
