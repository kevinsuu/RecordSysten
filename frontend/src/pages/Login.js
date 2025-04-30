import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FaGoogle } from 'react-icons/fa';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import logo from '../assets/image.png';

const Login = ({ accessDenied }) => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // 如果接收到訪問拒絕的狀態，設置相應的錯誤消息
    useEffect(() => {
        if (accessDenied) {
            setError('此 Google 帳號沒有權限訪問系統，僅限授權用戶使用。');
        }
    }, [accessDenied]);


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
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    position: relative;
                }
                
                .login-container {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    box-shadow: 
                        0 4px 24px -1px rgba(0, 0, 0, 0.1),
                        0 2px 8px -1px rgba(0, 0, 0, 0.06);
                    padding: 40px;
                    width: 380px;
                    position: relative;
                    z-index: 2;
                    border: 1px solid rgba(255, 255, 255, 0.8);
                }
                
                .login-logo {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 24px;
                    display: block;
                    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
                    transition: transform 0.3s ease;
                }
                
                .login-logo:hover {
                    transform: scale(1.05);
                }
                
                .login-title {
                    color: #2d3748;
                    text-align: center;
                    margin-bottom: 32px;
                    font-size: 1.75rem;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                }
                
                .google-btn {
                    width: 100%;
                    padding: 14px;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: #4285f4;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 12px rgba(66, 133, 244, 0.2);
                    font-weight: 500;
                }
                
                .google-btn:hover {
                    background: #3574e2;
                    box-shadow: 0 4px 20px rgba(66, 133, 244, 0.3);
                    transform: translateY(-2px);
                }
                
                .google-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
                }
                
                .google-btn:disabled {
                    background-color: #a0aec0;
                    box-shadow: none;
                    transform: none;
                }
                
                .alert {
                    border: none;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    padding: 1rem;
                    margin-bottom: 24px;
                    background-color: #fff5f5;
                    color: #c53030;
                    border-left: 4px solid #fc8181;
                }
                
                @media (max-width: 768px) {
                    .login-container {
                        width: 90%;
                        max-width: 360px;
                        padding: 32px 24px;
                        margin: 16px;
                    }
                    
                    .login-logo {
                        width: 80px;
                        height: 80px;
                        margin-bottom: 20px;
                    }
                    
                    .login-title {
                        font-size: 1.5rem;
                        margin-bottom: 24px;
                    }
                    
                    .google-btn {
                        padding: 12px;
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