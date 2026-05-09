import { useEffect, useState } from "react";
import { Flex } from "@mantine/core";
import { useDispatch, useSelector } from "react-redux";

import CustomBreadcrumbs from "../../components/Breadcrumbs";
import ModuleTabs from "../../components/moduleTabs";
import RegisteredCourses from "./RegisteredCourses";
import AvailableCourses from "./AvailableCourses";
import PreRegistration from "./PreRegistration";
import FinalRegistration from "./FinalRegistration";
import StudentCourses from "./StudentCourses";
import DeletePreRegistration from "./DeletePreRegistration";
import AcademicCalendar from "./AcademicCalendar";
import GenerateStudentList from "./GenerateStudentList";
import ViewRollList from "./ViewRollList";
import AllocateCourses from "./AllocateCourses";
import VerifyStudentRegistration from "./VerifyStudentRegistration";
import SwayamRegistration from "./SwayamRegistration";
import AllotCourses from "./AllotCourses";
import { setActiveTab_ } from "../../redux/moduleslice";
import { Faculty_TA_Dashboard } from "./Faculty_TA_Dashboard";
import StudentAddDropReplace from "./StudentAddDropReplace";
import AdminReplacementDashboard from "./AdminReplacementDashboard";
import AdminDropDashboard from "./AdminDropDashboard";
import AdminAddDashboard from "./AdminAddDashboard";
import StudentCalendar from "./StudentCalendar";
import AdminStudentDashboard from "./AdminStudentDashboard";
import StudentCourseFeedbackForm from "./FeedbackForm/StudentCourseFeedbackForm";
import AdminFeedbackView from "./FeedbackForm/AdminFeedbackView";
import AdminBatchChange from "./AdminBatchChange";
import AdminPromoteSemester from "./AdminPromoteSemester";
import InstructorDashboard from "./FeedbackForm/InstructorDashboard";

function AcademicPage() {
  const [activeTab, setActiveTab] = useState("0");
  const role = useSelector((state) => state.user.role);
  const dispatch = useDispatch();

  useEffect(()=>{
    dispatch(setActiveTab_(tabItems?tabItems[activeTab].title:""))
  },[])

  let tabItems;
  let tabComponents;

  if (role === "acadadmin" || role === "studentacadadmin") {
    tabItems = [
      { title: "Student Courses" },
      { title: "Delete Pre-Registration" },
      { title: "Academic Calendar" },
      { title: "Generate Student List" },
      { title: "Allocate Courses" },
      { title: "Verify Student Registration" },
      { title: "Allot Courses" },
      { title: "Replacement Allocation" },
      { title: "Add BL Courses" },
      { title: "Drop Courses" },
      { title: "Student Dashboard"},
      { title: "Feedback Responses"},
      { title: "Batch/Branch Change"},
      { title: "Promote Students"},
    ];
    tabComponents = [
      StudentCourses,
      DeletePreRegistration,
      AcademicCalendar,
      GenerateStudentList,
      AllocateCourses,
      VerifyStudentRegistration,
      AllotCourses,
      AdminReplacementDashboard,
      AdminAddDashboard,
      AdminDropDashboard,
      AdminStudentDashboard,
      AdminFeedbackView,
      AdminBatchChange,
      AdminPromoteSemester
    ];
  } else if (role === "student") {
    tabItems = [
      { title: "Registered Courses" },
      { title: "Available Courses" },
      { title: "Academic Calender" },
      { title: "Pre-Registration" },
      { title: "Final-Registration" },
      { title: "Swayam Registration" },
      { title: "Add / Drop" },
      // { title: "Feedback Form" },
    ];
    tabComponents = [
      RegisteredCourses,
      AvailableCourses,
      StudentCalendar,
      PreRegistration,
      FinalRegistration,
      SwayamRegistration,
      StudentAddDropReplace,
      // StudentCourseFeedbackForm
    ];
  } else if (
    role === "faculty" ||
    role === "Associate Professor" ||
    role === "Assistant Professor" ||
    role === "Professor"
  ) {
    tabItems = [{ title: "View Roll List"},{title: "TA management"}, {title: "Course Feedback"}];
    tabComponents = [ViewRollList, Faculty_TA_Dashboard, InstructorDashboard];
  } else {
    tabItems = [{ title: "Registered Courses" },];
    tabComponents = [RegisteredCourses];
  }

  const ActiveComponent = tabComponents[parseInt(activeTab, 10)];

  return (
    <>
      <CustomBreadcrumbs />
      <Flex justify="space-between" align="center" mt="lg">
        <ModuleTabs
          tabs={tabItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </Flex>
      <ActiveComponent mt="xl" />
    </>
  );
}

export default AcademicPage;
