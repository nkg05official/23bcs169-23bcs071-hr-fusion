import React, { useEffect, useState } from "react";
import { Title } from "@mantine/core";
import { useNavigate } from "react-router-dom"; // Use for navigation
import { Eye, MapPin } from "@phosphor-icons/react";

import "./Table.css"; // Ensure this path is correct
import { EmptyTable } from "./EmptyTable";

const RequestsTable = ({ title, data }) => {
  const navigate = useNavigate();
  // header contains the column names id name designation submissionDate view track
  const headers = ["ID", "Name", "Designation", "Submission Date", "View"];

  const handleViewClick = (view) => {
    navigate(`./view/${view}`);
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
          title="No new requests found!"
          message="There is no new request available. Please check back later."
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
                  <td>{item.name}</td>
                  <td>{item.designation}</td>
                  <td>{item.submissionDate}</td>
                  <td>
                    <span
                      className="text-link"
                      onClick={() => handleViewClick(item.id)}
                    >
                      <Eye size={20} />
                      View
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

export default RequestsTable;
