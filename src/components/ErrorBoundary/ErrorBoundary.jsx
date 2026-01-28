import React from 'react';
import './ErrorBoundary.css';

/**
 * 全局错误边界 - 捕获 React 渲染错误，防止白屏/闪退
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] 捕获到渲染错误:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-content">
                        <div className="error-boundary-icon">X</div>
                        <h1 className="error-boundary-title">哎呀，出错了</h1>
                        <p className="error-boundary-message">
                            {this.state.error?.message || '发生了未知错误'}
                        </p>
                        <div className="error-boundary-actions">
                            <button
                                className="error-boundary-btn primary"
                                onClick={this.handleReload}
                            >
                                刷新页面
                            </button>
                            <button
                                className="error-boundary-btn secondary"
                                onClick={this.handleReset}
                            >
                                尝试恢复
                            </button>
                        </div>
                        {/* 调试信息 - vConsole 可见 */}
                        <details className="error-boundary-details">
                            <summary>查看详细信息</summary>
                            <pre>{this.state.error?.stack}</pre>
                            <pre>{this.state.errorInfo?.componentStack}</pre>
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
