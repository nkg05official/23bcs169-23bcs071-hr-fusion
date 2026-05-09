import React, { useEffect, useState } from "react";
import { Title } from "@mantine/core";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";

import "./Table.css"; // Ensure this path is correct
import { EmptyTable } from "./EmptyTable";

const TrackTable = ({ title, data, exampleItems }) => {
  // header contains the column names id name designation submissionDate view track
  const headers = [
    "Record Id",
    "Receive Date",
    "Forward Date",
    "Remarks",
    "Sender's username",

    "Receiver's name",
    "Receiver's Designation",
  ];

  return (
    <div className="app-container">
      <HrBreadcrumbs items={exampleItems} />

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
                  <td>
                    {item.receive_date && (
                      <>
                        {item.receive_date.split("T")[0]} {/* Date part */}
                        <br />
                        {item.receive_date.split("T")[1].split(".")[0]}{" "}
                        {/* Time part */}
                      </>
                    )}
                  </td>
                  <td>
                    {item.forward_date && (
                      <>
                        {item.forward_date.split("T")[0]} {/* Date part */}
                        <br />
                        {item.forward_date.split("T")[1].split(".")[0]}{" "}
                        {/* Time part */}
                      </>
                    )}
                  </td>
                  <td>{item.remarks}</td>
                  <td>{item.current_id}</td>

                  <td>{item.receiver_id}</td>
                  <td>{item.receive_design}</td>
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

export default TrackTable;
