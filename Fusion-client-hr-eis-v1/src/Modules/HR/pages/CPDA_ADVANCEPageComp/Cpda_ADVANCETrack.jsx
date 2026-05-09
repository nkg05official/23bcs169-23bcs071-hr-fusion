import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import TrackTable from "../../components/tables/TrackTable";
import { fetchHrTrackHistory } from "../../services/hrService";

function Cpda_ADVANCETrack() {
  const { id } = useParams();
  const [trackData, setTrackData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  const currentPath = window.location.pathname;
  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "CPDA Adv Management", path: "/hr/cpda_adv" },

    { title: "Track", path: `${currentPath}` },
  ];

  useEffect(() => {
    const fetchCPDATrack = async () => {
      try {
        const data = await fetchHrTrackHistory(id);
        setTrackData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDATrack(); // Ensure function is called
  }, [id]);

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <TrackTable
      title="CPDA Adv Track"
      data={trackData}
      exampleItems={exampleItems}
    />
  );
}

export default Cpda_ADVANCETrack;
