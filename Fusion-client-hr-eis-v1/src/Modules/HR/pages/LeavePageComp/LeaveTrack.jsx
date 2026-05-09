import React, { useEffect, useState } from "react";

import { get_form_track } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import { useParams } from "react-router-dom";
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import TrackTable from "../../components/tables/TrackTable";

function LeaveTrack() {
  const { id } = useParams();
  const [trackData, setTrackData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state
  const admin = new URLSearchParams(window.location.search).get("admin");
  const [exampleItems, setExampleItems] = useState([]);
  useEffect(() => {
    if (admin) {
      setExampleItems([
        { title: "Home", path: "/dashboard" },
        { title: "Human Resources", path: "/hr" },
        { title: "Admin Leave Management", path: "/hr/admin_leave" },

        { title: "Track", path: `${currentPath}?admin=true` },
        // { title: "Handle Leave", path: `/hr/leave/handle/${id}` },
      ]);
    } else {
      setExampleItems([
        { title: "Home", path: "/dashboard" },
        { title: "Human Resources", path: "/hr" },
        { title: "Leave Management", path: "/hr/leave" },
        { title: "Track", path: `${currentPath}` },
      ]);
    }
  }, [admin]);

  const currentPath = window.location.pathname;
  useEffect(() => {
    const fetchLeaveTrack = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${get_form_track(id)}`, {
          headers: { Authorization: `Token ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Failed to fetch leave track");
        }

        const payload = data?.data ?? data;
        const fileHistory = Array.isArray(payload?.file_history)
          ? payload.file_history
          : [];
        setTrackData(fileHistory);
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setTrackData([]);
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchLeaveTrack(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent loadingMsg="Fetching Leave Track..." />;
  }

  return (
    <TrackTable
      title="Leave Track"
      exampleItems={exampleItems}
      data={trackData}
    />
  );
}

export default LeaveTrack;
