import React, { useState, useEffect } from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { FaGoogle } from 'react-icons/fa';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import logo from '../assets/image.png';

const Login = ({ accessDenied }) => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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
                .login-page {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background-color: #f8f9fa;
                    position: relative;
                    overflow: hidden;
                }
                
                .login-page::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                    z-index: 1;
                }
                
                .login-container {
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
                    padding: 40px;
                    width: 400px;
                    position: relative;
                    z-index: 2;
                }
                
                .login-logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    display: block;
                }
                
                .login-title {
                    color: #495057;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 1.5rem;
                    font-weight: 500;
                }
                
                .google-btn {
                    width: 100%;
                    padding: 12px;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background-color: #0d6efd;
                    border: none;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 6px rgba(13, 110, 253, 0.2);
                }
                
                .google-btn:hover {
                    background-color: #0b5ed7;
                    box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
                    transform: translateY(-1px);
                }
                
                .google-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
                }
                
                .google-btn:disabled {
                    background-color: #6c757d;
                    box-shadow: none;
                    transform: none;
                }
                
                .alert {
                    border-radius: 4px;
                    font-size: 0.9rem;
                }
                
                @media (max-width: 768px) {
                    .login-container {
                        width: 90%;
                        padding: 30px 20px;
                        margin: 20px;
                    }
                    
                    .login-logo {
                        width: 60px;
                        height: 60px;
                        margin-bottom: 15px;
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
            const provider = new GoogleAuthProvider();

            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await signInWithPopup(auth, provider);

            // 檢查登入的 email 是否為指定帳號
            const email = result.user.email;
            if (email !== process.env.REACT_APP_LOGIN_ACCOUNT1 && email !== process.env.REACT_APP_LOGIN_ACCOUNT2) {
                await auth.signOut();
                throw new Error('此 Google 帳號沒有權限訪問系統。');
            }
        } catch (error) {
            console.error('登入失敗:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <img src={logo} alt="系統 Logo" className="login-logo" />
                <h2 className="login-title">電子紀錄系統</h2>

                {error && (
                    <Alert variant="danger" className="mb-3">
                        {error}
                    </Alert>
                )}

                <Button
                    className="google-btn"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <FaGoogle /> 使用 Google 登入
                    {loading && <span className="spinner-border spinner-border-sm ms-2" />}
                </Button>
            </div>
        </div>
    );
};

export default Login; 