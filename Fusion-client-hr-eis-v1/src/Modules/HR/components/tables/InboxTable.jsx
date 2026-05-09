import React, { useEffect, useState } from "react";
import { Title } from "@mantine/core";
import { useNavigate } from "react-router-dom"; // Use for navigation
import { Eye, MapPin } from "@phosphor-icons/react";
import "./Table.css"; // Ensure this path is correct
import { EmptyTable } from "./EmptyTable";
import LeaveTrackView from "../../pages/LeavePageComp/LeaveTrack";

const InboxTable = ({ title, data, formType }) => {
  const navigate = useNavigate();

  const headers = ["FileID", "User", "Designation", "Date", "View", "Track"];

  const handleViewClick = (id) => {
    const viewUrlMap = {
      leave: `/hr/leave/file_handler/${id}`,
      cpda_adv: `/hr/cpda_adv/file_handler/${id}`,
      ltc: `/hr/ltc/file_handler/${id}`,
      cpda_claim: `/hr/cpda_claim/file_handler/${id}`,
      appraisal: `/hr/appraisal/file_handler/${id}`,
    };
    navigate(viewUrlMap[formType]); // Default to leaveform if formType is not matched
  };
  const handleTrackClick = (id) => {
    const trackUrlMap = {
      leave: `/hr/FormView/leaveform_track/${id}`,
      cpda_adv: `/hr/FormView/cpda_adv_track/${id}`,
      ltc: `/hr/FormView/ltc_track/${id}`,
      cpda_claim: `/hr/FormView/cpda_claim_track/${id}`,
      appraisal: `/hr/FormView/appraisal_track/${id}`,
    };

    navigate(trackUrlMap[formType]); // Default to leaveform_track if formType is not matched
  };

  return (
    <div className="app-container">
      <Title
        order={2}
        className="hr-table-title"
      >
        {title}
      </Title>
      {data.length == 0 && (
        <EmptyTable
          title="No new Inbox requests found!"
          message="There is no new Inbox request available. Please check back later."
        />
      )}
      {headers.length > 0 && data.length > 0 ? (
        <div className="form-table-container">
          <table className="form-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="table-header">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr className="table-row" key={index}>
                  <td>{item.id}</td>
                  <td>{item.sent_by_user}</td>
                  <td>{item.sent_by_designation}</td>
                  <td>{item.upload_date}</td>
                  <td>
                    <span
                      className="text-link"
                      // onClick={() => handleViewClick(`/hr/FormView/leaveform`)}
                      onClick={() => handleViewClick(item.id)}
                    >
                      <Eye size={20} />
                      View
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-link"
                      onClick={() => handleTrackClick(item.id)}
                    >
                      <MapPin size={20} />
                      Track
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="loading-spinner"></div>
      )}
    </div>
  );
};

export default InboxTable;
