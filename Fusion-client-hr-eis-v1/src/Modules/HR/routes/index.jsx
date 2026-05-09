import React from "react";
import { Routes, Route } from "react-router-dom";
import HrDashboard from "../pages/Hr_Dashboard";
import LeavePage from "../pages/LeavePage";
import CPDA_ADVANCE from "../pages/CPDA_ADVANCE";
import LTC from "../pages/LTC";
import Appraisal from "../pages/Appraisal";
import CpdaClaim from "../pages/CPDA_Claim";
import FormView from "../pages/FormView";
import CpdaAdvanceView from "../pages/CPDA_ADVANCEPageComp/CPDA_ADVANCEView";
import LeaveFormView from "../pages/LeavePageComp/LeaveFormView";
import LeaveFilehandle from "../pages/LeavePageComp/Leave_file_handle";
import LeaveHandleResponsibility from "../pages/LeavePageComp/Leave_Handle_Responsibility";
import AdminLeaveManagement from "../pages/LeavePageComp/AdminLeaveManagement";
import OfflineLeaveForm from "../pages/LeavePageComp/OfflineLeaveForm";
import ViewEmployeeLB from "../pages/LeavePageComp/ViewEmployeeLB";
import AdminLeaveRequests from "../pages/LeavePageComp/AdminLeaveRequests";

export default function HRRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HrDashboard />} />
      <Route path="leave/file_handler/:id" element={<LeaveFilehandle />} />
      <Route path="leave/view/:id" element={<LeaveFormView />} />
      <Route
        path="leave/handle_responsibility/:id"
        element={<LeaveHandleResponsibility />}
      />
      <Route path="leave/*" element={<LeavePage />} />
      <Route path="cpda_adv/view/:id" element={<CpdaAdvanceView />} />
      <Route path="cpda_adv/*" element={<CPDA_ADVANCE />} />
      <Route path="ltc/*" element={<LTC />} />
      <Route path="appraisal/*" element={<Appraisal />} />
      <Route path="cpda_claim/*" element={<CpdaClaim />} />
      <Route path="FormView/*" element={<FormView />} />
      <Route path="admin_leave/*" element={<AdminLeaveManagement />} />
      <Route
        path="admin_leave/view_employees_leave_balance/*"
        element={<ViewEmployeeLB />}
      />
      <Route
        path="admin_leave/review_leave_requests/*"
        element={<AdminLeaveRequests />}
      />
      <Route
        path="admin_leave/manage_offline_leave_form/*"
        element={<OfflineLeaveForm />}
      />
    </Routes>
  );
}