import React, { useEffect, useState } from "react";
import InboxTable from "../../components/tables/InboxTable";
import { get_appraisal_inbox } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import { fetchHrCollection } from "../../services/hrService";

function AppraisalInbox() {
  const [inboxData, setInboxData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchAppraisalInbox = async () => {
      try {
        const data = await fetchHrCollection(
          get_appraisal_inbox,
          "appraisal_inbox",
        );
        setInboxData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchAppraisalInbox(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <InboxTable title="Appraisal Inbox" data={inboxData} formType="appraisal" />
  );
}

export default AppraisalInbox;
