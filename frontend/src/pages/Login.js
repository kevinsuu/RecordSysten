import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
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
                if (email !== 'sjs47311@gmail.com') {
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

    return (
        <Container className="d-flex align-items-center justify-content-center vh-100">
            <Row className="justify-content-center w-100">
                <Col xs={12} md={6} lg={4}>
                    <Card className="shadow">
                        <Card.Body className="p-4">
                            <div className="text-center mb-4">
                                <img src={logo} alt="Logo" className="mb-3" style={{ width: '80px', height: '80px' }} />
                                <h2 className="fw-bold">電子紀錄系統</h2>
                                <p className="text-muted">請登入後繼續使用</p>
                            </div>

                            {error && (
                                <Alert variant="danger" className="mb-3">
                                    {error}
                                </Alert>
                            )}

                            <Button
                                variant="outline-primary"
                                size="lg"
                                className="w-100 d-flex align-items-center justify-content-center gap-2"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                            >
                                <FaGoogle />
                                使用 Google 帳號登入
                                {loading && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Login; 