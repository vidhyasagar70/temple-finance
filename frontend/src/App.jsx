import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleGuard } from './components/layout/RoleGuard';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { PangalisListPage } from './pages/Pangalis/PangalisListPage';
import { PangaliDetailPage } from './pages/Pangalis/PangaliDetailPage';
import { VariCollectionPage } from './pages/VariCollection/VariCollectionPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
import { SirpiExpensesPage } from './pages/SirpiExpenses/SirpiExpensesPage';
import { FestivalsListPage } from './pages/Festivals/FestivalsListPage';
import { FestivalDetailPage } from './pages/Festivals/FestivalDetailPage';
import { TempleFundListPage } from './pages/TempleFund/TempleFundListPage';
import { FundDetailPage } from './pages/TempleFund/FundDetailPage';
import { DonationsPage } from './pages/Donations/DonationsPage';
import { UsersPage } from './pages/Users/UsersPage';
import ContributionsPage from './pages/Contributions/ContributionsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

import {
  Percent,
  BookOpen,
  FileText,
  Settings,
} from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Pangalis Module */}
            <Route path="/pangalis" element={<PangalisListPage />} />
            <Route path="/pangalis/:id" element={<PangaliDetailPage />} />

            {/* Core Financial Modules */}
            <Route path="/vari-collection" element={<VariCollectionPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/sirpi-expenses" element={<SirpiExpensesPage />} />
            <Route path="/festivals" element={<FestivalsListPage />} />
            <Route path="/festivals/:id" element={<FestivalDetailPage />} />
            <Route path="/temple-fund" element={<TempleFundListPage />} />
            <Route path="/temple-fund/:id" element={<FundDetailPage />} />
            <Route path="/donations" element={<DonationsPage />} />

            {/* Remaining Placeholder Modules */}
            <Route path="/contributions" element={<ContributionsPage />} />
            <Route
              path="/interest"
              element={
                <PlaceholderPage
                  title="Interest"
                  description="Interest calculation logic and ledger entries."
                  icon={Percent}
                />
              }
            />
            <Route
              path="/ledger"
              element={
                <PlaceholderPage
                  title="Central Ledger"
                  description="Immutable single-source-of-truth transaction history."
                  icon={BookOpen}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <PlaceholderPage
                  title="Financial Reports"
                  description="Audit logs, trial balance, and financial year statements."
                  icon={FileText}
                />
              }
            />

            {/* Admin-Only Routes */}
            <Route
              path="/users"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <UsersPage />
                </RoleGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <PlaceholderPage
                    title="System Settings"
                    description="Temple configuration, financial years, and master categories."
                    icon={Settings}
                  />
                </RoleGuard>
              }
            />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
