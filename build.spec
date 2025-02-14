# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('firebase-key.json', '.')],  # 將 firebase-key.json 打包進去
    hiddenimports=[
        'firebase_admin',
        'firebase_admin.credentials',
        'firebase_admin.db',
        'firebase_admin._auth_utils',
        'firebase_admin._token_gen',
        'firebase_admin._utils',
        'firebase_admin.exceptions',
        'google.cloud',
        'google.api_core',
        'google.auth',
        'google.auth.transport',
        'google.auth.transport.requests',
        'google.oauth2',
        'google.oauth2.credentials',
        'google.oauth2.service_account',
        'grpc',
        'requests',
        'urllib3',
        'cachecontrol',
        'certifi',
        'chardet',
        'idna',
        'msgpack',
        'requests_toolbelt'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='RecordSystem',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # 改回 False 以隱藏命令行窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None
)