// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import GlobalStyles from "@mui/material/GlobalStyles";
import Box from "@mui/material/Box";
import theme from "./components/Theme";

// Public
import Login from "./components/Login.jsx";

// Super Admin
import SuperAdminDashboard from "./components/SuperAdminDashboard.jsx";
import ManageBusinesses from "./components/ManageBusinesses.jsx";
import CreateBusiness from "./components/CreateBusiness.jsx";
import EditBusiness from "./components/EditBusiness.jsx";
import ManageServices from "./components/ManageServices";
import CreateService from "./components/CreateService";
import EditService from "./components/EditService";
import ManageCategories from "./components/ManageCategories.jsx";
import ManageDetails from "./components/ManageDetails.jsx";
import CreateCategory from "./components/CreateCategory.jsx";
import EditCategory from "./components/EditCategory.jsx";
import ManageItems from "./components/ManageItems.jsx";
import CreateItem from "./components/CreateItem.jsx";
import EditItem from "./components/EditItem.jsx";
import EditBranchForm from "./components/EditBranchForm";

// Business Admin / Branch Manager / Employee
import BusinessAdminDashboard from "./components/BusinessAdminDashboard.jsx";
import BranchManagerDashboard from "./components/BranchManagerDashboard.jsx";
import BranchSelector from "./components/BranchSelector";

// Ops pages + Layout
import BusinessAdminLayout from "./components/BusinessAdminLayout";
import ClientsPage from "./components/ClientsPage";
import CreateClient from "./components/CreateClient.jsx";
import EditClient from "./components/EditClient.jsx";
import OrdersPage from "./components/OrdersPage.jsx";
import CreateOrder from "./components/CreateOrder.jsx";
import OrderDetail from "./components/OrderDetail.jsx";

// Catalog BA/BM
import ManageServicesBusiness from "./components/ManageServicesBusiness.jsx";
import ManageCategoriesBusiness from "./components/ManageCategoriesBusiness.jsx";
import ManageItemsBusiness from "./components/ManageItemsBusiness.jsx";
import CreateItemBusiness from "./components/CreateItemBusiness.jsx";
import EditItemBusiness from "./components/EditItemBusiness.jsx";

// Create Users
import EmployeeForm from "./components/EmployeeForm.jsx";
import EmployeesPage from "./components/EmployeesPage.jsx";
import BusinessInfo from "./components/BusinessInfo.jsx";
import BusinessSchedulePage from "./components/BusinessSchedulePage.jsx";
import ClientPortalLogin from "./components/ClientPortalLogin.jsx";
import ClientPortal from "./components/ClientPortal.jsx";
import ManageClientConfig from "./components/ManageClientConfig.jsx";
import ManagePromotions from "./components/ManagePromotions.jsx";
import ProductionView from "./components/ProductionView.jsx";
import ClientProfile from "./components/ClientProfile.jsx";
import OperationalPanel from "./components/OperationalPanel.jsx";
import CashCut from "./components/CashCut.jsx";
import Reports from "./components/Reports.jsx";
import Expenses from "./components/Expenses.jsx";
import ClientBehaviorReport from "./components/ClientBehaviorReport.jsx";
import ProfitabilityReport from "./components/ProfitabilityReport.jsx";

// Clinic vertical
import ClinicLayout from "./components/clinic/ClinicLayout.jsx";
import ClinicKanban from "./components/clinic/ClinicKanban.jsx";
import ClinicPatients from "./components/clinic/ClinicPatients.jsx";
import ClinicPatientProfile from "./components/clinic/ClinicPatientProfile.jsx";
import ClinicCalendar from "./components/clinic/ClinicCalendar.jsx";
import ClinicServices from "./components/clinic/ClinicServices.jsx";
import ClinicPayments from "./components/clinic/ClinicPayments.jsx";
import ClinicUsers from "./components/clinic/ClinicUsers.jsx";
import ClinicAdminDashboard from "./components/clinic/ClinicAdminDashboard.jsx";
import ManageAgencies from "./components/ManageAgencies.jsx";
import AgencyAdminDashboard from "./components/AgencyAdminDashboard.jsx";

// Patient portal
import PatientLogin from "./components/patient/PatientLogin.jsx";
import PatientLayout from "./components/patient/PatientLayout.jsx";
import PatientAppointments from "./components/patient/PatientAppointments.jsx";
import PatientPayments from "./components/patient/PatientPayments.jsx";
import PatientRecords from "./components/patient/PatientRecords.jsx";

const inputGlobalStyles = (
  <GlobalStyles
    styles={{
      "html, body, #root": {
        margin: 0,
        padding: 0,
        height: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      },
      body: { overflowY: "hidden" },
    }}
  />
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      {inputGlobalStyles}
      <CssBaseline />
      <Box sx={{ height: "100vh", width: "100%", overflowY: "auto" }}>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* SUPER ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
            <Route
              path="/super-admin-dashboard"
              element={<SuperAdminDashboard />}
            />
            <Route path="/manage-businesses" element={<ManageBusinesses />} />
            <Route path="/create-business" element={<CreateBusiness />} />
            <Route
              path="/edit-business/:businessId"
              element={<EditBusiness />}
            />
            <Route path="/edit-branch/:branchId" element={<EditBranchForm />} />

            <Route path="/manage-services" element={<ManageServices />} />
            <Route path="/create-service" element={<CreateService />} />
            <Route path="/edit-service/:serviceId" element={<EditService />} />

            <Route
              path="/manage-categories/:serviceId"
              element={<ManageCategories />}
            />
            <Route path="/manage-details" element={<ManageDetails />} />
            <Route
              path="/create-category/:serviceId"
              element={<CreateCategory />}
            />
            <Route
              path="/edit-category/:categoryId"
              element={<EditCategory />}
            />

            <Route path="/manage-items/:categoryId" element={<ManageItems />} />
            <Route path="/create-item/:categoryId" element={<CreateItem />} />
            <Route path="/edit-item/:itemId" element={<EditItem />} />
          </Route>

          {/* BUSINESS ADMIN: select branch + dashboard */}
          <Route element={<ProtectedRoute allowedRoles={["business_admin"]} />}>
            <Route path="/select-branch" element={<BranchSelector />} />
          </Route>

          {/* BUSINESS ADMIN + BRANCH MANAGER: dashboard compartido */}
          <Route element={<ProtectedRoute allowedRoles={["business_admin", "branch_manager"]} />}>
            <Route path="/business-admin-dashboard" element={<BusinessAdminDashboard />} />
            <Route path="/branch-manager-dashboard" element={<Navigate to="/business-admin-dashboard" replace />} />
            <Route path="/business-info" element={<BusinessInfo />} />
            <Route path="/business-schedule" element={<BusinessSchedulePage />} />
            <Route path="/manage-client-config" element={<ManageClientConfig />} />
            <Route path="/manage-promotions" element={<ManagePromotions />} />
          </Route>

          {/* PORTAL DEL CLIENTE (público) */}
          <Route path="/client-portal" element={<ClientPortalLogin />} />
          <Route path="/client-portal/dashboard" element={<ClientPortal />} />

          {/* CREATE USERS (BA + BM) */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["business_admin", "branch_manager"]}
              />
            }
          >
            <Route path="/create-employee" element={<EmployeeForm />} />

            {/* ✅ Alias de seguridad: si el botón o alguien navega a /create-user */}
            <Route
              path="/create-user"
              element={<Navigate to="/create-employee" replace />}
            />
          </Route>

          {/* OPERATIONS (BA + BM + EMPLOYEE) */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["business_admin", "branch_manager", "employee"]}
              />
            }
          >
            <Route element={<BusinessAdminLayout />}>
              <Route
                path="/manager-panel"
                element={<Navigate to="/panel-operativo" replace />}
              />
              <Route path="/panel-operativo" element={<OperationalPanel />} />

              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:clientId" element={<ClientProfile />} />
              <Route path="/create-client" element={<CreateClient />} />
              <Route path="/edit-client/:clientId" element={<EditClient />} />

              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetail />} />
              <Route path="/produccion" element={<ProductionView />} />
              <Route path="/create-order/:clientId" element={<CreateOrder />} />
              <Route path="/corte-de-caja" element={<CashCut />} />
              <Route path="/reportes" element={<Reports />} />
              <Route path="/gastos" element={<Expenses />} />
              <Route path="/reportes/clientes" element={<ClientBehaviorReport />} />
              <Route path="/reportes/rentabilidad" element={<ProfitabilityReport />} />

              <Route path="/employees" element={<EmployeesPage />} />

              {/* Catalog (BA + BM) */}
              <Route
                path="/manage-services-business"
                element={<ManageServicesBusiness />}
              />
              <Route
                path="/manage-categories-business/:serviceId"
                element={<ManageCategoriesBusiness />}
              />
              <Route
                path="/manage-items-business/:categoryId"
                element={<ManageItemsBusiness />}
              />
              <Route
                path="/create-item-business/:categoryId"
                element={<CreateItemBusiness />}
              />
              <Route
                path="/edit-item-business/:itemId"
                element={<EditItemBusiness />}
              />
            </Route>
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />

          {/* AGENCY ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={["agency_admin"]} />}>
            <Route path="/agency-admin-dashboard" element={<AgencyAdminDashboard />} />
          </Route>

          {/* SUPER ADMIN — Agencies management */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
            <Route path="/manage-agencies" element={<ManageAgencies />} />
          </Route>

          {/* CLINIC VERTICAL */}
          <Route element={<ProtectedRoute allowedRoles={["business_admin", "branch_manager", "employee", "super_admin"]} />}>
            <Route path="/clinic" element={<ClinicLayout />}>
              <Route index element={<Navigate to="/clinic/kanban" replace />} />
              <Route path="kanban" element={<ClinicKanban />} />
              <Route path="patients" element={<ClinicPatients />} />
              <Route path="patients/:patientId" element={<ClinicPatientProfile />} />
              <Route path="calendar" element={<ClinicCalendar />} />
              <Route path="services" element={<ClinicServices />} />
              <Route path="payments" element={<ClinicPayments />} />
              <Route path="users" element={<ClinicUsers />} />
              <Route path="admin" element={<ClinicAdminDashboard />} />
            </Route>
          </Route>

          {/* ── Patient Portal ── */}
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<Navigate to="/patient/appointments" replace />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route path="payments" element={<PatientPayments />} />
            <Route path="records" element={<PatientRecords />} />
          </Route>
        </Routes>
      </Box>
    </ThemeProvider>
  );
}

export default App;
