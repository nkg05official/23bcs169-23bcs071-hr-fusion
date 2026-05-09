import React, { useEffect, useState } from "react";
import RequestsTable from "../../components/tables/RequestsTable";
import { get_appraisal_requests } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import { fetchHrCollection } from "../../services/hrService";

function AppraisalRequests() {
  const [requestData, setRequestData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchAppraisalRequests = async () => {
      try {
        const data = await fetchHrCollection(
          get_appraisal_requests,
          "appraisal_requests",
        );
        setRequestData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchAppraisalRequests(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return <RequestsTable title="Appraisal Requests" data={requestData} />;
}

export default AppraisalRequests;
