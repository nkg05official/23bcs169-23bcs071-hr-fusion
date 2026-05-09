import React, { useEffect, useState, useRef } from "react";
import { Tabs, Button, Flex, Text, Loader, Container } from "@mantine/core";
import { CaretCircleLeft, CaretCircleRight } from "@phosphor-icons/react";
import { useNavigate, useLocation } from "react-router-dom"; // Import these hooks
import CustomBreadcrumbs from "../../../components/Breadcrumbs";
import classes from "./AppraisalPage.module.css";
import AppraisalForm from "./AppraisalPageComp/AppraisalForm";
import AppraisalRequests from "./AppraisalPageComp/AppraisalRequests";
import AppraisalInbox from "./AppraisalPageComp/AppraisalInbox";
import AppraisalArchive from "./AppraisalPageComp/AppraisalArchive";
import HrBreadcrumbs from "../components/HrBreadcrumbs";

// Define paths for each tab
const tabItems = [
  { title: "Appraisal Form", path: "/hr/appraisal/appraisal_form" },
  { title: "Appraisal Requests", path: "/hr/appraisal/appraisal_requests" },
  { title: "Appraisal Inbox", path: "/hr/appraisal/appraisal_inbox" },
  { title: "Appraisal Archive", path: "/hr/appraisal/appraisal_archive" },
];

function Appraisal() {
  const [activeTab, setActiveTab] = useState("0");
  const [loading, setLoading] = useState(false);
  const tabsListRef = useRef(null);
  const navigate = useNavigate(); // Initialize navigate
  const location = useLocation(); // Initialize location

  //scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Appraisal Management", path: "/hr/appraisal" },
  ];

  // Update active tab based on current URL
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingTab = tabItems.findIndex((tab) =>
      currentPath.includes(tab.path.split("/").pop()),
    );
    setActiveTab(matchingTab !== -1 ? String(matchingTab) : "0");
  }, [location.pathname]);

  // Function to handle tab change by clicking on a tab
  const handleTabChange = (index) => {
    setActiveTab(index);
    navigate(tabItems[index].path); // Update the URL when the tab changes
  };

  const handleButtonChange = (direction) => {
    const newIndex =
      direction === "next"
        ? Math.min(+activeTab + 1, tabItems.length - 1)
        : Math.max(+activeTab - 1, 0);
    handleTabChange(String(newIndex)); // Use handleTabChange to update tab and URL
    tabsListRef.current.scrollBy({
      left: direction === "next" ? 50 : -50,
      behavior: "smooth",
    });
  };

  // Fetch any necessary Appraisal data
  // NOTE: Currently no server-side data is needed at the page level;
  // individual tab components fetch their own data. Keeping this hook
  // for future use (e.g. fetching appraisal cycle config).
  useEffect(() => {
    const fetchAppraisalData = async () => {
      setLoading(true);
      try {
        // Reserved: fetch appraisal cycle configuration or reviewer assignments here
      } catch (error) {
        // BUG FIX: Empty catch block replaced with error logging.
        // TODO: Replace with Mantine notifications once notifications are wired.
        console.error('[Appraisal] Failed to load appraisal data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppraisalData();
  }, []);

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      <Flex justify="flex-start" align="center" mt="lg">
        <Button
          style={{ marginRight: "20px" }}
          onClick={() => handleButtonChange("prev")}
          variant="default"
          p={0}
        >
          <CaretCircleLeft
            className={classes.fusionCaretCircleIcon}
            weight="light"
          />
        </Button>
        <div
          className={`${classes.fusionTabsContainer} ${classes.limitedWidthTabs}`}
          ref={tabsListRef}
        >
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List style={{ display: "flex", flexWrap: "nowrap" }}>
              {tabItems.map((item, index) => (
                <Tabs.Tab
                  value={`${index}`}
                  key={index}
                  className={
                    activeTab === `${index}`
                      ? classes.fusionActiveRecentTab
                      : ""
                  }
                  onClick={() => handleTabChange(String(index))} // Update onClick to change tab and URL
                >
                  <Text>{item.title}</Text>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </div>
        <Button
          // BUG FIX: Replaced hardcoded marginLeft: '320px' (broke layout on narrow screens)
          // with a responsive CSS class from the module stylesheet.
          className={classes.fusionTabNextButton}
          onClick={() => handleButtonChange('next')}
          variant="default"
          p={0}
        >
          <CaretCircleRight
            className={classes.fusionCaretCircleIcon}
            weight="light"
          />
        </Button>
      </Flex>
      {loading ? (
        <Container py="xl">
          <Loader size="lg" />
        </Container>
      ) : (
        <div className="fullWidthGrid">
          {activeTab === "0" && <AppraisalForm />}
          {activeTab === "1" && <AppraisalRequests />}
          {activeTab === "2" && <AppraisalInbox />}
          {activeTab === "3" && <AppraisalArchive />}
        </div>
      )}
    </>
  );
}

export default Appraisal;
