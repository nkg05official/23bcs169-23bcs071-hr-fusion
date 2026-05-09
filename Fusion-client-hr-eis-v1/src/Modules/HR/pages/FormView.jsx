import React from "react";
import { Routes, Route } from "react-router-dom";
import LeaveFormView from "./LeavePageComp/LeaveFormView";
import LeaveInbox from "./LeavePageComp/LeaveTrack";
import LeaveInboxTrack from "./LeavePageComp/LeaveTrack";
import Cpda_ADVANCETrack from "./CPDA_ADVANCEPageComp/Cpda_ADVANCETrack";
import CPDA_ClaimTrack from "./CPDA_ClaimPageComp/CPDA_ClaimTrack";
import AppraisalTrack from "./AppraisalPageComp/AppraisalTrack";
import LTCTrack from "./LTCPageComp/LTCTrack";
// import LTCFormView from './LTCFormView'; // Ensure the path is correct

const FormView = () => {
  return (
    <Routes>
      <Route path="leaveform" element={<LeaveFormView />} />
      <Route path="leaveform_track/:id" element={<LeaveInboxTrack />} />
      <Route path="cpda_adv_track/:id" element={<Cpda_ADVANCETrack />} />
      <Route path="cpda_claim_track/:id" element={<CPDA_ClaimTrack />} />
      <Route path="ltc_track/:id" element={<LTCTrack />} />
      <Route path="appraisal_track/:id" element={<AppraisalTrack />} />

      {/* <Route path="/ltc" element={<LTCFormView />} /> */}
      {/* Add more routes as needed */}
    </Routes>
  );
};

export default FormView;
