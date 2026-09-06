import React from 'react';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import { logger } from '../services/logger';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary', 'Caught component render error', {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoToPOS = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onGoToPOS) {
      this.props.onGoToPOS();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#F3F6FA] text-[#18202B] select-none">
          <div className="glass-surface p-8 sm:p-10 rounded-[36px] shadow-2xl max-w-md w-full flex flex-col items-center text-center border border-white/95">
            {/* EAT & DRINK Official Logo */}
            <div className="bg-white px-4 py-2 rounded-2xl border border-[#D8E1EC] shadow-sm mb-5">
              <img 
                src="/eat-and-drink.png" 
                alt="EAT & DRINK" 
                className="h-12 w-auto object-contain" 
              />
            </div>

            {/* Subtle Alert Badge */}
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-200">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>

            {/* Clear, truthful error messaging */}
            <h2 className="text-base font-black text-[#18202B] tracking-tight uppercase">
              Temporary POS Error
            </h2>
            <p className="text-xs text-[#697586] font-medium mt-1.5 mb-6 leading-relaxed">
              We couldn't load this screen.
              <br />
              <strong className="text-[#18202B] font-semibold">Your saved sales records have not been modified.</strong>
            </p>

            {/* Action Buttons: Retry and Go To POS */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full py-3 px-6 glass-btn-coral text-white rounded-full text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>RETRY</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoToPOS}
                className="w-full py-2.5 px-6 glass-pill text-[#18202B] hover:text-[#FF5B4A] rounded-full text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>GO TO POS</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
