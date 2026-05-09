import React, { useEffect, useState } from "react";
import RequestsTable from "../../components/tables/RequestsTable";
import { get_ltc_requests } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path

function LTCRequests() {
  const [requestData, setRequestData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchLTCRequests = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(get_ltc_requests, {
          headers: { Authorization: `Token ${token}` },
        });
        const data = await response.json();
        setRequestData(data.ltc_requests); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchLTCRequests(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return <RequestsTable title="LTC Requests" data={requestData} />;
}

export default LTCRequests;
