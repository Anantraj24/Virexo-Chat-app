import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400 mb-6 shadow-xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
            An unhandled UI error occurred. Please try reloading the application.
          </p>
          <Button onClick={this.handleReload} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
