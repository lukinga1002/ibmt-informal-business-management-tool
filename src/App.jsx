import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { I18nProvider } from '@/i18n/I18nContext';
import { IBMTProvider } from '@/api/IBMTContext';
// Add page imports here
import Landing from '@/pages/Landing';
import Verify from '@/pages/Verify';
import Ussd from '@/pages/Ussd';
import Documents from '@/pages/Documents';
import DataRights from '@/pages/DataRights';
import Handover from '@/pages/Handover';
import AppShell from '@/components/shell/AppShell';

import OperatorDashboard from '@/pages/operator/Dashboard';
import OperatorOnboarding from '@/pages/operator/Onboarding';
import OperatorReceipts from '@/pages/operator/Receipts';
import OperatorMoney from '@/pages/operator/Money';
import OperatorOperations from '@/pages/operator/Operations';
import OperatorSettings from '@/pages/operator/Settings';

import ConsumerDashboard from '@/pages/consumer/Dashboard';
import ConsumerCases from '@/pages/consumer/Cases';
import ConsumerContributions from '@/pages/consumer/Contributions';
import ConsumerSettings from '@/pages/consumer/Settings';

import CouncilDashboard from '@/pages/council/Dashboard';
import CouncilPermits from '@/pages/council/Permits';
import CouncilComplaints from '@/pages/council/Complaints';

import TraOverview from '@/pages/tra/Overview';
import TraAccess from '@/pages/tra/Access';

import RentHub from '@/pages/rent/RentHub';
import LandlordDashboard from '@/pages/rent/landlord/Dashboard';
import LandlordPortfolio from '@/pages/rent/landlord/Portfolio';
import LandlordTenancies from '@/pages/rent/landlord/Tenancies';
import LandlordMoney from '@/pages/rent/landlord/Money';
import LandlordCases from '@/pages/rent/landlord/Cases';
import TenantDashboard from '@/pages/rent/tenant/Dashboard';
import TenantFind from '@/pages/rent/tenant/Find';
import TenantLease from '@/pages/rent/tenant/Lease';
import TenantPay from '@/pages/rent/tenant/Pay';
import TenantRegister from '@/pages/rent/tenant/Register';
import TenantCases from '@/pages/rent/tenant/Cases';
import AgentDashboard from '@/pages/rent/agent/Dashboard';
import ManagerDashboard from '@/pages/rent/manager/Dashboard';
import WardDashboard from '@/pages/rent/ward/Dashboard';
import RentCouncilDashboard from '@/pages/rent/council/Dashboard';
import RentTraDashboard from '@/pages/rent/tra/Dashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Public screens */}
      <Route path="/" element={<Landing />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/ussd" element={<Ussd />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/data-rights" element={<DataRights />} />
      <Route path="/handover" element={<Handover />} />
      <Route path="/rent" element={<RentHub />} />

      {/* Shared workspace shell: one navigation, one identity, both modules */}
      <Route element={<AppShell />}>
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/operator/onboarding" element={<OperatorOnboarding />} />
        <Route path="/operator/receipts" element={<OperatorReceipts />} />
        <Route path="/operator/money" element={<OperatorMoney />} />
        <Route path="/operator/operations" element={<OperatorOperations />} />
        <Route path="/operator/settings" element={<OperatorSettings />} />

        <Route path="/consumer" element={<ConsumerDashboard />} />
        <Route path="/consumer/cases" element={<ConsumerCases />} />
        <Route path="/consumer/contributions" element={<ConsumerContributions />} />
        <Route path="/consumer/settings" element={<ConsumerSettings />} />

        <Route path="/council" element={<CouncilDashboard />} />
        <Route path="/council/permits" element={<CouncilPermits />} />
        <Route path="/council/complaints" element={<CouncilComplaints />} />

        <Route path="/tra" element={<TraOverview />} />
        <Route path="/tra/access" element={<TraAccess />} />

        <Route path="/rent/landlord" element={<LandlordDashboard />} />
        <Route path="/rent/landlord/portfolio" element={<LandlordPortfolio />} />
        <Route path="/rent/landlord/tenancies" element={<LandlordTenancies />} />
        <Route path="/rent/landlord/money" element={<LandlordMoney />} />
        <Route path="/rent/landlord/cases" element={<LandlordCases />} />

        <Route path="/rent/tenant" element={<TenantDashboard />} />
        <Route path="/rent/tenant/find" element={<TenantFind />} />
        <Route path="/rent/tenant/lease" element={<TenantLease />} />
        <Route path="/rent/tenant/pay" element={<TenantPay />} />
        <Route path="/rent/tenant/register" element={<TenantRegister />} />
        <Route path="/rent/tenant/cases" element={<TenantCases />} />

        <Route path="/rent/agent" element={<AgentDashboard />} />
        <Route path="/rent/manager" element={<ManagerDashboard />} />
        <Route path="/rent/ward" element={<WardDashboard />} />
        <Route path="/rent/council" element={<RentCouncilDashboard />} />
        <Route path="/rent/tra" element={<RentTraDashboard />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <I18nProvider>
            <IBMTProvider>
              <ScrollToTop />
              <AuthenticatedApp />
            </IBMTProvider>
          </I18nProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App