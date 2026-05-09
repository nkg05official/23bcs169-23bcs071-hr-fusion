import React, { useEffect, useState, useRef } from "react";
import { Tabs, Button, Flex, Text, Loader, Container } from "@mantine/core";
import { CaretCircleLeft, CaretCircleRight } from "@phosphor-icons/react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomBreadcrumbs from "../../../components/Breadcrumbs"; // Your breadcrumbs component
import classes from "./LeavePage.module.css"; // Add your styles here
import LeaveForm from "./LeavePageComp/LeaveForm";
// import LeaveArchive from "./LeavePageComp/LeaveArchive";
import LeaveInbox from "./LeavePageComp/LeaveInbox";
import LeaveRequests from "./LeavePageComp/LeaveRequests";
import HrBreadcrumbs from "../components/HrBreadcrumbs";
import LeaveBalanceButton from "./LeavePageComp/LeaveBalanceButton";

const tabItems = [
  { title: "Leave Form", path: "/hr/leave/leaveform" },
  { title: "Leave Requests", path: "/hr/leave/leaverequests" },
  { title: "Leave Inbox", path: "/hr/leave/leaveinbox" },
  // { title: "Leave Archive", path: "/hr/leave/leavearchive" },
];

function Leave() {
  const [activeTab, setActiveTab] = useState("0");
  const [loading, setLoading] = useState(false);
  const tabsListRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  //scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Leave Management", path: "/hr/leave" },
  ];
  // Set active tab based on the current URL
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
    handleTabChange(String(newIndex));
    tabsListRef.current.scrollBy({
      left: direction === "next" ? 50 : -50,
      behavior: "smooth",
    });
  };

  // Fetch any necessary leave data
  useEffect(() => {
    const fetchLeaveData = async () => {
      setLoading(true);
      try {
        // Fetch leave data here if needed
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchLeaveData();
  }, []);

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      <LeaveBalanceButton />
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
          <Tabs value={activeTab} onChange={handleTabChange}>
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
                  onClick={() => handleTabChange(String(index))} // Trigger navigation on click
                >
                  <Text>{item.title}</Text>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </div>
        <Button
          style={{ marginLeft: "85px" }}
          onClick={() => handleButtonChange("next")}
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
          {activeTab === "0" && <LeaveForm />}
          {activeTab === "1" && <LeaveRequests />}
          {activeTab === "2" && <LeaveInbox />}
          {/* {activeTab === "3" && <LeaveArchive />} */}
        </div>
      )}
    </>
  );
}

export default Leave;
