import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-extrabold text-navy-950">Something went wrong</h2>
            <p className="text-xs text-slate-500">
              A temporary interface issue occurred. Click reload to refresh the page.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-[#0A192F] hover:bg-navy-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
