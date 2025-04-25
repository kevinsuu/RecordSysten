import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();

// 過濾掉 react-beautiful-dnd 的 defaultProps 警告
const originalConsoleWarn = console.warn;
console.warn = function filterWarnings(msg, ...args) {
  if (typeof msg === 'string' && msg.includes('defaultProps')) {
    return;
  }
  originalConsoleWarn(msg, ...args);
};
