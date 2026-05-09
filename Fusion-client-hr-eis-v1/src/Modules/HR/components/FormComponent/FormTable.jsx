// src/Modules/HR/components/FormComponent/FormTable.jsx
import React from "react";
import { useNavigate } from "react-router-dom"; // Use for navigation
import "./FormTable.css";
import { Eye, MapPin } from "@phosphor-icons/react";

const FormTable = ({ headers, data }) => {
  const navigate = useNavigate(); // React Router navigation hook

  const handleViewClick = (view) => {
    // navigate(`/leave-form-view/${formId}`);  // Redirect to the form view
    navigate(view); // Redirect to the form view
  };

  return (
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
                  onClick={() => handleViewClick(item.view)}
                >
                  <Eye size={20} />
                  View
                </span>
              </td>
              <td>
                <span className="text-link">
                  <MapPin size={20} />
                  Track
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FormTable;
