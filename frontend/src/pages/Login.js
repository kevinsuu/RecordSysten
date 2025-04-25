import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form } from 'react-bootstrap';
import { FaGoogle, FaUser, FaLock } from 'react-icons/fa';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import logo from '../assets/image.png';

const Login = ({ accessDenied }) => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // 如果接收到訪問拒絕的狀態，設置相應的錯誤消息
    useEffect(() => {
        if (accessDenied) {
            setError('此 Google 帳號沒有權限訪問系統，僅限授權用戶使用。');
        }
    }, [accessDenied]);

    useEffect(() => {
        // 檢查視窗大小
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // 添加移動版樣式
    useEffect(() => {
        const addLoginStyles = () => {
            const styleEl = document.createElement('style');
            styleEl.innerHTML = `
                @media (max-width: 768px) {
                    .login-container {
                        width: 90% !important;
                        padding: 30px 20px !important;
                        margin-top: 20px !important;
                    }
                    .google-btn {
                        width: 100% !important;
                        font-size: 1rem !important;
                        padding: 12px !important;
                        margin-bottom: 20px !important;
                    }
                    .login-title {
                        font-size: 1.5rem !important;
                        margin-bottom: 25px !important;
                    }
                    .form-group {
                        margin-bottom: 15px !important;
                    }
                    .login-btn {
                        width: 100% !important;
                        padding: 12px !important;
                        font-size: 1rem !important;
                        margin-top: 10px !important;
                    }
                }
            `;
            document.head.appendChild(styleEl);
            return () => {
                document.head.removeChild(styleEl);
            };
        };

        const cleanup = addLoginStyles();
        return cleanup;
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError(null);

            const auth = getAuth();
            console.log("Firebase Auth 初始化狀態:", auth);

            const provider = new GoogleAuthProvider();

            // 設置自定義參數，可能有助於解決一些身份驗證問題
            provider.setCustomParameters({
                prompt: 'select_account',
                login_hint: 'user@example.com'
            });

            // 使用帶有重定向的版本作為備選
            try {
                const result = await signInWithPopup(auth, provider);

                // 檢查登入的 email 是否為指定帳號
                const email = result.user.email;
                if (email !== process.env.REACT_APP_LOGIN_ACCOUNT1 && email !== process.env.REACT_APP_LOGIN_ACCOUNT2) {
                    // 如果不是允許的電子郵件，則登出並顯示錯誤
                    await auth.signOut();
                    throw new Error('此 Google 帳號沒有權限訪問系統。');
                }
            } catch (popupError) {
                console.warn("彈出式登入失敗，嘗試使用重定向方式:", popupError);
                // 如果彈出視窗失敗，可能是由於瀏覽器阻止或其他原因
                // 嘗試使用重定向方法
                // 注意：此方法需要在 App.js 中額外處理重定向回來的邏輯
                // import { signInWithRedirect, getRedirectResult } from "firebase/auth";
                // await signInWithRedirect(auth, provider);
                throw popupError; // 仍然拋出錯誤以保持錯誤處理流程
            }

            // 登入成功後由 App.js 中的 onAuthStateChanged 處理導航
        } catch (error) {
            console.error('登入失敗:', error);
            // 顯示更詳細的錯誤信息
            setError(`錯誤代碼: ${error.code || '訪問權限錯誤'}, 錯誤信息: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 處理帳號密碼登入
    const handleCredentialLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            // 檢查電子郵件是否為允許的帳戶
            if (email !== process.env.REACT_APP_LOGIN_ACCOUNT1 && email !== process.env.REACT_APP_LOGIN_ACCOUNT2) {
                throw new Error('此帳號沒有權限訪問系統');
            }

            // 這裡可以添加密碼驗證邏輯
            // 例如，如果密碼不正確，拋出錯誤
            if (password !== process.env.REACT_APP_LOGIN_PASSWORD) {
                throw new Error('密碼不正確');
            }

            // 登入成功後，可以設置本地存儲或 Cookie
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userEmail', email);

            // 重新加載頁面或重定向到主頁
            window.location.href = '/';

        } catch (error) {
            console.error('登入失敗:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
            <div className="login-container" style={{
                width: isMobile ? '90%' : '400px',
                padding: '40px',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                backgroundColor: 'white'
            }}>
                <h2 className="login-title" style={{ textAlign: 'center', marginBottom: '30px', color: '#3a3a3a' }}>車輛管理系統登入</h2>

                {error && (
                    <Alert variant="danger" className="mb-3">
                        {error}
                    </Alert>
                )}

                <Button
                    className="google-btn"
                    onClick={handleGoogleLogin}
                    style={{
                        backgroundColor: '#4285F4',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        width: '100%',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '1rem' : '0.9rem',
                        borderRadius: '5px'
                    }}
                    disabled={loading}
                >
                    <FaGoogle style={{ marginRight: '10px' }} /> 使用 Google 登入
                    {loading && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
                </Button>

                <div style={{ textAlign: 'center', margin: '15px 0', color: '#777', fontSize: '0.9rem' }}>
                    或使用帳號密碼登入
                </div>

                <Form onSubmit={handleCredentialLogin}>
                    <Form.Group className="form-group mb-3" controlId="formEmail">
                        <Form.Label style={{ fontSize: '0.9rem', color: '#555' }}>電子郵件</Form.Label>
                        <div style={{ position: 'relative' }}>
                            <FaUser style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                            <Form.Control
                                type="email"
                                placeholder="請輸入電子郵件"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ paddingLeft: '35px' }}
                            />
                        </div>
                    </Form.Group>

                    <Form.Group className="form-group mb-3" controlId="formPassword">
                        <Form.Label style={{ fontSize: '0.9rem', color: '#555' }}>密碼</Form.Label>
                        <div style={{ position: 'relative' }}>
                            <FaLock style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                            <Form.Control
                                type="password"
                                placeholder="請輸入密碼"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ paddingLeft: '35px' }}
                            />
                        </div>
                    </Form.Group>

                    <Button
                        type="submit"
                        className="login-btn"
                        style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '10px 0',
                            width: '100%',
                            marginTop: '15px',
                            cursor: 'pointer',
                            fontSize: isMobile ? '1rem' : '0.9rem'
                        }}
                        disabled={loading}
                    >
                        登入
                        {loading && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
                    </Button>
                </Form>
            </div>
        </div>
    );
};

export default Login; 