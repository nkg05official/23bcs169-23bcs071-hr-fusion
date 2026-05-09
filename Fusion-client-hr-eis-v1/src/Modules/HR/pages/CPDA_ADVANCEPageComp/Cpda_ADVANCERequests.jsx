import React, { useEffect, useState } from "react";
import RequestsTable from "../../components/tables/RequestsTable";
import { get_cpda_adv_requests } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import { fetchHrCollection } from "../../services/hrService";

function Cpda_ADVANCERequests() {
  const [requestData, setRequestData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchCPDARequests = async () => {
      try {
        const data = await fetchHrCollection(
          get_cpda_adv_requests,
          "cpda_adv_requests",
        );
        setRequestData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDARequests(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return <RequestsTable title="CPDA Adv Requests" data={requestData} />;
}

export default Cpda_ADVANCERequests;
