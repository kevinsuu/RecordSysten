from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QComboBox, 
                            QTableWidget, QTableWidgetItem, QHeaderView, 
                            QMessageBox, QLineEdit, QDateEdit, QDialog,
                            QFormLayout, QTextEdit, QListWidget, QCheckBox,
                            QListWidgetItem, QMenu, QScrollArea, QFileDialog,
                            QStyle, QInputDialog)
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QPalette, QColor, QIcon
class CompanyDialog(QDialog):
    def __init__(self, parent=None, company_data=None):
        super().__init__(parent)
        self.setWindowTitle("公司資料")
        self.setMinimumWidth(400)
        self.company_data = company_data
        self.setup_ui()
        if company_data:
            self.load_company_data()

    def setup_ui(self):
        layout = QFormLayout()
        layout.setSpacing(15)
        self.name_edit = QLineEdit()
        self.name_edit.setMaxLength(30)
        self.name_edit.setPlaceholderText("請輸入公司名稱（最多30個字）")
        layout.addRow("公司名稱:", self.name_edit)
        self.tax_id_edit = QLineEdit()
        self.tax_id_edit.setPlaceholderText("請輸入統一編號")
        self.tax_id_edit.setMaxLength(8)
        layout.addRow("統一編號:", self.tax_id_edit)
        self.phone_edit = QLineEdit()
        self.phone_edit.setPlaceholderText("請輸入電話")
        layout.addRow("電話:", self.phone_edit)
        self.address_edit = QLineEdit()
        self.address_edit.setPlaceholderText("請輸入地址")
        layout.addRow("地址:", self.address_edit)
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
