import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Briefcase, RefreshCw, Home, Shield, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#FAF9F4] via-white to-[#F3F4F6] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
   

            {/* Main content */}
            <div className="px-4 py-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#15803D] to-[#0f5c2f] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Service Temporarily Unavailable</h2>
                <p className="text-slate-600 leading-relaxed max-w-md mx-auto text-sm">
                  We're experiencing a technical issue with <span className="text-black">OFFICE</span>{' '}<span className="text-[#15803D]">RIDES</span>.
                  Our IT team has been notified and is working to restore service quickly.
                </p>
                <p className="text-slate-500 text-xs">
                  For urgent office commutes, please contact your HR department or use alternative transportation arrangements.
                </p>
              </div>

              {/* Trust indicators for office context */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 bg-[#FAF9F4] rounded-lg border border-[#F3F4F6]">
                  <Shield className="w-6 h-6 text-[#15803D] mx-auto mb-1" />
                  <div className="text-xs font-semibold text-slate-900">Secure</div>
                  <div className="text-xs text-slate-500">Your data is protected</div>
                </div>
                <div className="text-center p-3 bg-[#FAF9F4] rounded-lg border border-[#F3F4F6]">
                  <Users className="w-6 h-6 text-[#15803D] mx-auto mb-1" />
                  <div className="text-xs font-semibold text-slate-900">Reliable</div>
                  <div className="text-xs text-slate-500">Trusted by businesses</div>
                </div>
                <div className="text-center p-3 bg-[#FAF9F4] rounded-lg border border-[#F3F4F6]">
                  <Clock className="w-6 h-6 text-[#15803D] mx-auto mb-1" />
                  <div className="text-xs font-semibold text-slate-900">24/7 Support</div>
                  <div className="text-xs text-slate-500">Always available</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="bg-[#15803D] hover:bg-[#0f5c2f] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Connection
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-[#F3F4F6] text-[#1F2937] hover:bg-[#FAF9F4] px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Incident ID: {Date.now().toString(36).toUpperCase()} • Estimated resolution: 5-10 minutes
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;