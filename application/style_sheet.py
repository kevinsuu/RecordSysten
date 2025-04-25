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
