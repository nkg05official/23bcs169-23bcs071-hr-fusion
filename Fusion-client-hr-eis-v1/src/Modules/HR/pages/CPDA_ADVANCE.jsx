import React, { useEffect, useState, useRef } from "react";
import { Tabs, Button, Flex, Text, Loader, Container } from "@mantine/core";
import { CaretCircleLeft, CaretCircleRight } from "@phosphor-icons/react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomBreadcrumbs from "../../../components/Breadcrumbs";
import classes from "./CPDA_ADVANCEPage.module.css";
import Cpda_ADVANCEForm from "./CPDA_ADVANCEPageComp/CPDA_ADVANCEForm";
import Cpda_ADVANCERequests from "./CPDA_ADVANCEPageComp/Cpda_ADVANCERequests";
import Cpda_ADVANCEInbox from "./CPDA_ADVANCEPageComp/Cpda_ADVANCEInbox";
import Cpda_ADVANCEArchive from "./CPDA_ADVANCEPageComp/Cpda_ADVANCEArchive";
import HrBreadcrumbs from "../components/HrBreadcrumbs";

// Define paths for each tab
const tabItems = [
  { title: "CPDA Adv Form", path: "/hr/cpda_adv/adv_form" },
  { title: "CPDA Adv Requests", path: "/hr/cpda_adv/adv_requests" },
  { title: "CPDA Adv Inbox", path: "/hr/cpda_adv/adv_inbox" },
  { title: "CPDA Adv Archive", path: "/hr/cpda_adv/adv_archive" },
];

function CPDA_ADVANCE() {
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
    { title: "CPDA Adv Management", path: "/hr/cpda_adv" },
  ];
  // Update active tab based on current URL
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingTab = tabItems.findIndex((tab) =>
      currentPath.includes(tab.path.split("/").pop()),
    );
    setActiveTab(matchingTab !== -1 ? String(matchingTab) : "0");
  }, [location.pathname]);

  // Handle tab change by clicking on a tab
  const handleTabChange = (index) => {
    setActiveTab(index);
    navigate(tabItems[index].path);
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

  // Fetch any necessary CPDA_ADVANCE data
  useEffect(() => {
    const fetchCpda_ADVANCEData = async () => {
      setLoading(true);
      try {
        // Fetch CPDA_ADVANCE data here if needed
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchCpda_ADVANCEData();
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
                  onClick={() => handleTabChange(String(index))}
                >
                  <Text>{item.title}</Text>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </div>
        <Button
          style={{ marginLeft: "345px" }}
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
          {activeTab === "0" && <Cpda_ADVANCEForm />}
          {activeTab === "1" && <Cpda_ADVANCERequests />}
          {activeTab === "2" && <Cpda_ADVANCEInbox />}
          {activeTab === "3" && <Cpda_ADVANCEArchive />}
        </div>
      )}
    </>
  );
}

export default CPDA_ADVANCE;
