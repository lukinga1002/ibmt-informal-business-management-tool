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
import { DEMO_MODE } from '@/lib/demoMode';
import DemoBanner from '@/components/ibmt/DemoBanner';
import ModuleGate from '@/components/gates/ModuleGate';
import WorkspaceGuard from '@/components/gates/WorkspaceGuard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
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
import CouncilAgents from '@/pages/rent/council/Agents';
import LandlordMandates from '@/pages/rent/landlord/Mandates';
import LandlordListings from '@/pages/rent/landlord/Listings';
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
import LandlordLeases from '@/pages/rent/landlord/Leases';
import LandlordLeaseNew from '@/pages/rent/landlord/LeaseNew';
import LandlordTaxStatement from '@/pages/rent/landlord/TaxStatement';
import LeaseDetail from '@/pages/rent/lease/Detail';
import PublicLease from '@/pages/lease/Public';
import LandlordRegister from '@/pages/rent/landlord/Register';
import LandlordMigrate from '@/pages/rent/landlord/Migrate';
import AssistedRegister from '@/pages/rent/assisted/Register';
import WardVerification from '@/pages/rent/ward/Verification';
import RegistrationCertificate from '@/pages/rent/certificate/Own';
import PublicCertificate from '@/pages/certificate/Public';

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
      <Route path="/rent" element={<RentHub />} />
      <Route path="/cert/:certificateNo" element={<PublicCertificate />} />
      <Route path="/lease/:code" element={<PublicLease />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Delivery notes — platform admin only */}
      <Route
        path="/handover"
        element={
          <WorkspaceGuard adminOnly>
            <Handover />
          </WorkspaceGuard>
        }
      />

      {/* Shared workspace shell: one navigation, one identity, one product */}
      <Route element={<AppShell />}>
        {/* Rental workspaces — each one guarded by role */}
        <Route path="/rent/landlord" element={<WorkspaceGuard allow={['landlord']}><LandlordDashboard /></WorkspaceGuard>} />
        <Route path="/rent/landlord/portfolio" element={<WorkspaceGuard allow={['landlord']}><LandlordPortfolio /></WorkspaceGuard>} />
        <Route path="/rent/landlord/tenancies" element={<WorkspaceGuard allow={['landlord']}><LandlordTenancies /></WorkspaceGuard>} />
        <Route path="/rent/landlord/money" element={<WorkspaceGuard allow={['landlord']}><LandlordMoney /></WorkspaceGuard>} />
        <Route path="/rent/landlord/leases" element={<WorkspaceGuard allow={['landlord']}><LandlordLeases /></WorkspaceGuard>} />
        <Route path="/rent/landlord/lease/new" element={<WorkspaceGuard allow={['landlord']}><LandlordLeaseNew /></WorkspaceGuard>} />
        <Route path="/rent/landlord/tax" element={<WorkspaceGuard allow={['landlord']}><LandlordTaxStatement /></WorkspaceGuard>} />
        <Route path="/rent/landlord/mandates" element={<WorkspaceGuard allow={['landlord']}><LandlordMandates /></WorkspaceGuard>} />
        <Route path="/rent/landlord/listings" element={<WorkspaceGuard allow={['landlord', 'agent']}><LandlordListings /></WorkspaceGuard>} />
        <Route path="/rent/council/agents" element={<WorkspaceGuard allow={['council_official', 'district_commissioner']}><CouncilAgents /></WorkspaceGuard>} />
        <Route path="/rent/lease/:leaseId" element={<WorkspaceGuard allow={['landlord', 'tenant']}><LeaseDetail /></WorkspaceGuard>} />
        <Route path="/rent/landlord/cases" element={<WorkspaceGuard allow={['landlord']}><LandlordCases /></WorkspaceGuard>} />
        <Route path="/rent/landlord/register" element={<WorkspaceGuard allow={['landlord']}><LandlordRegister /></WorkspaceGuard>} />
        <Route path="/rent/landlord/migrate" element={<WorkspaceGuard allow={['landlord']}><LandlordMigrate /></WorkspaceGuard>} />
        <Route path="/rent/certificate/:caseId" element={<WorkspaceGuard allow={['landlord', 'tenant']}><RegistrationCertificate /></WorkspaceGuard>} />

        <Route path="/rent/tenant" element={<WorkspaceGuard allow={['tenant']}><TenantDashboard /></WorkspaceGuard>} />
        <Route path="/rent/tenant/find" element={<WorkspaceGuard allow={['tenant']}><TenantFind /></WorkspaceGuard>} />
        <Route path="/rent/tenant/lease" element={<WorkspaceGuard allow={['tenant']}><TenantLease /></WorkspaceGuard>} />
        <Route path="/rent/tenant/pay" element={<WorkspaceGuard allow={['tenant']}><TenantPay /></WorkspaceGuard>} />
        <Route path="/rent/tenant/register" element={<WorkspaceGuard allow={['tenant']}><TenantRegister /></WorkspaceGuard>} />
        <Route path="/rent/tenant/cases" element={<WorkspaceGuard allow={['tenant']}><TenantCases /></WorkspaceGuard>} />

        <Route path="/rent/agent" element={<WorkspaceGuard allow={['agent']}><AgentDashboard /></WorkspaceGuard>} />
        <Route path="/rent/assisted/register" element={<WorkspaceGuard allow={['agent', 'mtaa_officer', 'landlord']}><AssistedRegister /></WorkspaceGuard>} />
        <Route path="/rent/ward" element={<WorkspaceGuard allow={['mtaa_officer']}><WardDashboard /></WorkspaceGuard>} />
        <Route path="/rent/ward/verification" element={<WorkspaceGuard allow={['mtaa_officer']}><WardVerification /></WorkspaceGuard>} />
        <Route path="/rent/council" element={<WorkspaceGuard allow={['council_official', 'district_commissioner', 'regional_commissioner']}><RentCouncilDashboard /></WorkspaceGuard>} />

        {/* Parked modules — the flag decides, never the link */}
        <Route path="/operator" element={<ModuleGate flag="operator_module"><OperatorDashboard /></ModuleGate>} />
        <Route path="/operator/onboarding" element={<ModuleGate flag="operator_module"><OperatorOnboarding /></ModuleGate>} />
        <Route path="/operator/receipts" element={<ModuleGate flag="operator_module"><OperatorReceipts /></ModuleGate>} />
        <Route path="/operator/money" element={<ModuleGate flag="expenses_module"><OperatorMoney /></ModuleGate>} />
        <Route path="/operator/operations" element={<ModuleGate flag="operator_module"><OperatorOperations /></ModuleGate>} />
        <Route path="/operator/settings" element={<ModuleGate flag="operator_module"><OperatorSettings /></ModuleGate>} />

        <Route path="/consumer" element={<ModuleGate flag="consumer_module"><ConsumerDashboard /></ModuleGate>} />
        <Route path="/consumer/cases" element={<ModuleGate flag="consumer_module"><ConsumerCases /></ModuleGate>} />
        <Route path="/consumer/contributions" element={<ModuleGate flag="contributions_module"><ConsumerContributions /></ModuleGate>} />
        <Route path="/consumer/settings" element={<ModuleGate flag="consumer_module"><ConsumerSettings /></ModuleGate>} />

        <Route path="/council" element={<ModuleGate flag="events_module"><CouncilDashboard /></ModuleGate>} />
        <Route path="/council/permits" element={<ModuleGate flag="permits_module"><CouncilPermits /></ModuleGate>} />
        <Route path="/council/complaints" element={<ModuleGate flag="events_module"><CouncilComplaints /></ModuleGate>} />

        <Route path="/tra" element={<ModuleGate flag="tra_module"><TraOverview /></ModuleGate>} />
        <Route path="/tra/access" element={<ModuleGate flag="tra_module"><TraAccess /></ModuleGate>} />
        <Route path="/rent/tra" element={<ModuleGate flag="tra_module"><RentTraDashboard /></ModuleGate>} />
        <Route path="/rent/manager" element={<ModuleGate flag="property_manager_module"><ManagerDashboard /></ModuleGate>} />
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
              {DEMO_MODE && <DemoBanner />}
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