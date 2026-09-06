import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('POS Application Runtime Error:', error, errorInfo);
  }

  handleReload = () => {
    // Clear potentially corrupted session data and reload
    try {
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.update().catch(() => {});
          }
        });
      }
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#F3F6FA] text-[#18202B] select-none">
          <div className="glass-surface p-8 sm:p-10 rounded-[36px] shadow-2xl max-w-md w-full flex flex-col items-center text-center border border-white/95">
            <div className="bg-white p-3 rounded-3xl border border-[#D8E1EC] shadow-sm mb-4">
              <img 
                src="/eat-and-drink.png" 
                alt="EAT & DRINK" 
                className="h-12 w-auto object-contain" 
              />
            </div>

            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2 border border-rose-200">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>

            <h2 className="text-base font-black text-[#18202B]">POS System Recovered</h2>
            <p className="text-xs text-[#697586] font-medium mt-1 mb-6 leading-relaxed">
              A temporary interface error occurred. Your sales records in Supabase remain 100% safe. Click below to refresh.
            </p>

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 glass-btn-coral text-white rounded-full text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 stroke-[2.5]" />
              <span>RELOAD POS SYSTEM</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
