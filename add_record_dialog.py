# add_record_dialog.py
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle, QInputDialog)

from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QPalette, QColor, QIcon, QIntValidator
from style_sheet import StyleSheet
from database import Database
import qtawesome as qta
from company_manager_dialog import CompanyManagerDialog
from vehicle_manager_dialog import VehicleManagerDialog
from wash_item_manager_dialog import WashItemManagerDialog
class AddRecordDialog(QDialog):
    def __init__(self, parent=None, data=None, current_company=None, current_vehicle=None):
        super().__init__(parent)
        self.setWindowTitle("新增紀錄")
        self.setStyleSheet(StyleSheet.MAIN_STYLE)
        self.setMinimumWidth(800)
        self.data = data
        self.current_company = current_company
        self.current_vehicle = current_vehicle
        self.database = parent.database if parent else None
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
            if not self.database:
                return []
            # 從 Firebase 載入洗車項目
            items = self.database.get_wash_items()
            if not items:
                default_items = [
                    "引擎清洗",
                    "車身清洗",
                    "輪胎清洗",
                    "車斗清洗",
                    "內裝清洗"
                ]
                self.database.save_wash_items(default_items)
                return default_items
            return items
        except Exception as e:
            print(f"載入洗車項目時發生錯誤：{str(e)}")
            return []

    def save_wash_items(self, items):
        try:
            if self.database:
                self.database.save_wash_items(items)
        except Exception as e:
            print(f"儲存洗車項目時發生錯誤：{str(e)}")

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

        # 洗車項目
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

        # 校正項目
        calibration_layout = QHBoxLayout()
        calibration_layout.setContentsMargins(0, 0, 0, 0)
        
        # 名稱輸入
        self.calibration_name = QLineEdit()
        self.calibration_name.setPlaceholderText("請輸入校正項目名稱")
        self.calibration_name.setFixedWidth(200)
        
        # 金額輸入
        self.calibration_price = QLineEdit()
        self.calibration_price.setPlaceholderText("請輸入金額")
        self.calibration_price.setValidator(QIntValidator(0, 999999))
        self.calibration_price.setFixedWidth(150)
        
        # 添加到布局
        calibration_layout.addWidget(QLabel("校正項目:"))
        calibration_layout.addWidget(self.calibration_name)
        calibration_layout.addWidget(QLabel("金額:"))
        calibration_layout.addWidget(self.calibration_price)
        calibration_layout.addWidget(QLabel("元"))
        calibration_layout.addStretch()
        
        layout.addLayout(calibration_layout)

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
        """設置洗車項目勾選框"""
        # 清除現有的勾選框
        while self.items_layout.count():
            item = self.items_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        # 重新建立勾選框
        self.wash_items_checkboxes = {}
        for item in self.wash_items:
            # 處理新格式（字典）和舊格式（字串）
            if isinstance(item, dict):
                item_name = item["name"]
                checkbox = QCheckBox(f"{item_name} - ${item['price']}")
                checkbox.setProperty("item_data", item)  # 儲存完整的項目資料
            else:
                item_name = item
                checkbox = QCheckBox(item_name)
                checkbox.setProperty("item_data", {"name": item, "price": 0})

            checkbox.setStyleSheet("""
                QCheckBox {
                    margin-right: 10px;
                }
            """)
            self.wash_items_checkboxes[item_name] = checkbox
            self.items_layout.addWidget(checkbox)
        self.items_layout.addStretch()

    def manage_wash_items(self):
        """管理洗車項目"""
        dialog = WashItemManagerDialog(self)
        if dialog.exec():
            self.wash_items = dialog.get_wash_items()
            self.setup_wash_items()
            if hasattr(self, 'save_wash_items'):
                self.save_wash_items(self.wash_items)

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
        """獲取已選擇的洗車項目"""
        selected_items = []
        for checkbox in self.wash_items_checkboxes.values():
            if checkbox.isChecked():
                item_data = checkbox.property("item_data")
                if isinstance(item_data, dict):
                    selected_items.append(item_data["name"])
                else:
                    selected_items.append(item_data)
        return selected_items

    def get_record_data(self):
        """獲取記錄數據"""
        items = []
        
        # 收集所有服務項目
        for checkbox in self.wash_items_checkboxes.values():
            if checkbox.isChecked():
                item_data = checkbox.property("item_data")
                if isinstance(item_data, dict):
                    items.append({
                        "name": item_data["name"],
                        "price": item_data["price"]
                    })
        
        # 添加校正項目（如果有填寫）
        calibration_name = self.calibration_name.text().strip()
        calibration_price = self.calibration_price.text().strip()
        if calibration_name and calibration_price:
            try:
                items.append({
                    "name": calibration_name,
                    "price": int(calibration_price)
                })
            except ValueError:
                pass

        record_data = {
            "company_id": self.company_combo.currentData(),
            "vehicle_id": self.vehicle_combo.currentData(),
            "date": self.date_edit.date().toString("yyyy-MM-dd"),
            "items": items,
            "remarks": self.remarks_edit.toPlainText()
        }
        return record_data

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

    def update_wash_items(self):
        """更新洗車項目"""
        if hasattr(self, 'wash_items_checkboxes'):
            # 保存當前已選中的項目
            selected_items = self.get_selected_items()
            # 重新設置勾選框
            self.setup_wash_items()
            # 恢復之前選中的項目
            for item_text, checkbox in self.wash_items_checkboxes.items():
                if item_text in selected_items:
                    checkbox.setChecked(True)
