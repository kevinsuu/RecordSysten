from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle, QInputDialog)
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QPalette, QColor, QIcon
from style_sheet import StyleSheet

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
        self.plate_edit = QLineEdit()
        self.plate_edit.setPlaceholderText("請輸入車牌號碼")
        layout.addRow("車牌號碼:", self.plate_edit)
        self.model_edit = QLineEdit()
        self.model_edit.setPlaceholderText("請輸入車型")
        layout.addRow("車型:", self.model_edit)
        self.type_combo = QComboBox()
        self.type_combo.addItems(["水泥攪拌車", "大貨車", "連結車", "其他"])
        layout.addRow("種類:", self.type_combo)
        self.remarks_edit = QTextEdit()
        self.remarks_edit.setPlaceholderText("請輸入備註（選填）")
        self.remarks_edit.setMinimumHeight(100)
        layout.addRow("備註:", self.remarks_edit)
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
