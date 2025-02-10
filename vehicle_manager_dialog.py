# vehicle_manager_dialog.py
import uuid
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QPalette, QColor, QIcon
from vehicle_dialog import VehicleDialog
from style_sheet import StyleSheet
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle, QInputDialog)

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
        if hasattr(self.parent, 'save_data'):
            self.parent.save_data()
        self.parent.update_vehicle_combo()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)

        self.list_widget = QListWidget()
        self.list_widget.itemClicked.connect(self.vehicle_selected)
        layout.addWidget(self.list_widget)

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

        self.setLayout(layout)

    def load_vehicles(self):
        self.list_widget.clear()
        vehicles = self.data["companies"][self.company_id].get("vehicles", {})
        for vehicle_id, vehicle_data in vehicles.items():
            display_text = f"{vehicle_data['plate']} ({vehicle_data['type']})"
            if vehicle_data.get("remarks"):
                display_text += f" - {vehicle_data['remarks']}"
            item = QListWidgetItem(display_text)
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
            if "records" in vehicle_data:
                updated_data["records"] = vehicle_data["records"]
            self.data["companies"][self.company_id]["vehicles"][vehicle_id].update(updated_data)
            self.load_vehicles()
            self.save_and_update()

    def delete_vehicle(self):
        current_item = self.list_widget.currentItem()
        if not current_item:
            QMessageBox.warning(self, "警告", "請先選擇要刪除的車輛")
            return
        vehicle_id = current_item.data(Qt.UserDataRole.UserRole)
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
