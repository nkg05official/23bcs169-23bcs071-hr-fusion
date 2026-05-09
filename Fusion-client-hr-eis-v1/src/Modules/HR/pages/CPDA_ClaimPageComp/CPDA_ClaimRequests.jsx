import React, { useEffect, useState } from "react";
import RequestsTable from "../../components/tables/RequestsTable";
import { get_cpda_claim_requests } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import { fetchHrCollection } from "../../services/hrService";

function CPDA_ClaimRequests() {
  const [requestData, setRequestData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchCPDAClaimRequests = async () => {
      try {
        const data = await fetchHrCollection(
          get_cpda_claim_requests,
          "cpda_claim_requests",
        );
        setRequestData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDAClaimRequests(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return <RequestsTable title="CPDA Claim Requests" data={requestData} />;
}

export default CPDA_ClaimRequests;
