import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Container,
  Paper,
  Group,
  Button,
  TextInput,
  Select,
  Modal,
  FileInput,
  Progress,
  Alert,
  Stepper,
  Textarea,
  Text,
  Stack,
  Card,
  ThemeIcon,
  Badge,
  Grid,
  Box,
  ActionIcon,
  Flex,
  Table,
  Switch,
  Tooltip,
  ScrollArea,
  Title,
  Checkbox,
} from "@mantine/core";
import {
  Plus,
  Download,
  Upload,
  FileXls,
  Users,
  User,
  GraduationCap,
  Check,
  CaretLeft,
  CaretRight,
  X,
  Info,
  MagnifyingGlass,
  Funnel,
  PencilSimple,
  Database,
  Warning,
  Trash,
} from "@phosphor-icons/react";
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  processExcelUpload,
  saveStudentsBatch,
  addSingleStudent,
  createBatch,
  deleteBatch,
  updateStudent,
  deleteStudent,
} from "../api/api";
import axios from "axios";
import { host } from "../../../routes/globalRoutes";

const customTableStyles = `
  .student-allocation-table .mantine-Badge-root {
    overflow: visible !important;
    text-overflow: unset !important;
    white-space: nowrap !important;
    max-width: none !important;
    width: auto !important;
  }
  
  .student-allocation-table .mantine-Badge-inner {
    overflow: visible !important;
    text-overflow: unset !important;
    white-space: nowrap !important;
  }
  
  .student-allocation-table td {
    vertical-align: top !important;
    word-wrap: break-word !important;
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: unset !important;
  }
  
  .student-allocation-table th {
    text-align: center !important;
    font-weight: 600 !important;
    background-color: #f8f9fa !important;
    white-space: nowrap !important;
    overflow: visible !important;
  }
  
  .auto-width-table {
    table-layout: auto !important;
    width: 100% !important;
  }
  
  .auto-width-table td,
  .auto-width-table th {
    width: auto !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    word-wrap: break-word !important;
    max-width: none !important;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  .sync-indicator {
    animation: pulse 2s ease-in-out infinite;
  }
  
  .content-container {
    animation: fadeIn 0.3s ease-in-out;
  }
`;

const PROGRAMME_TYPES = {
  UG: "ug",
  PG: "pg",
  PHD: "phd",
};

const STUDENT_FIELDS_CONFIG = {
  jeeAppNo: {
    label: "JEE App. No. / CCMT Roll No.",
    placeholder: "Enter JEE application number or CCMT roll number",
    required: false,
    backendField: "jee_app_no",
    excelColumns: [
      "jee app. no / ccmt roll no",
      "jee app. no / ccmt roll no.",
      "jee main application number",
      "jee app. no.",
      "jee app. no./ccmt roll. no.",
      "jee app. no. / ccmt roll no.",
      "jee app no / ccmt roll no",
      "jee app no/ccmt roll no",
      "jee application number",
      "ccmt roll no",
      "ccmt roll number", 
      "jeeprep",
      "jee app no",
      "isprep",
      "application number",
      "app no",
      "app. no.",
      "application no",
      "jee roll no",
      "jee roll number",
    ],
  },
  specialization: {
    label: "Specialization",
    placeholder: "Select specialization",
    required: true,
    type: "select",
    backendField: "specialization", 
    options: [
      { value: "AI & ML", label: "AI & ML" },
      { value: "Data Science", label: "Data Science" },
      { value: "Communication and Signal Processing", label: "Communication and Signal Processing" },
      { value: "Nanoelectronics and VLSI Design", label: "Nanoelectronics and VLSI Design" },
      { value: "Power & Control", label: "Power & Control" },
      { value: "Design", label: "Design" },
      { value: "CAD/CAM", label: "CAD/CAM" },
      { value: "Manufacturing and Automation", label: "Manufacturing and Automation" },
      { value: "Mechatronics", label: "Mechatronics" },
    ],
    excelColumns: [
      "specialization",
      "specialisation", 
      "stream",
      "track",
    ],
    showForProgrammes: ["PG", "PHD"],
  },
  name: {
    label: "Full Name",
    placeholder: "Enter full name",
    required: true,
    backendField: "name", 
    excelColumns: ["name", "student name", "full name"],
  },
  fname: {
    label: "Father Name",
    placeholder: "Enter father's name",
    required: true,
    backendField: "father_name",
    excelColumns: [
      "father's name",
      "father name",
      "fname",
      "Father Name",
      "Father's Name",
      "father_name",
      "fatherName",
    ],
  },
  mname: {
    label: "Mother Name",
    placeholder: "Enter mother's name",
    required: true,
    backendField: "mother_name",
    excelColumns: [
      "mother's name",
      "mother name",
      "mname",
      "Mother Name",
      "Mother's Name",
      "mother_name",
      "motherName",
    ],
  },

  gender: {
    label: "Gender",
    placeholder: "Select gender",
    required: true,
    type: "select",
    backendField: "gender", 
    options: [
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Other", label: "Other" },
    ],
    excelColumns: ["gender", "sex"],
  },
  category: {
    label: "Category",
    placeholder: "Select category",
    required: true,
    type: "select",
    backendField: "category",
    options: [
      { value: "General", label: "General" },
      { value: "OBC-NCL", label: "Other Backward Class (Non-Creamy Layer)" },
      { value: "SC", label: "Scheduled Caste" },
      { value: "ST", label: "Scheduled Tribe" },
      { value: "GEN-EWS", label: "Economically Weaker Section (GEN-EWS)" },
    ],
    excelColumns: ["category", "caste", "reservation"],
  },
  minority: {
    label: "Minority",
    placeholder: "Enter minority status",
    required: false,
    backendField: "minority",
    excelColumns: ["minority", "minority status", "religious minority"],
  },
  allottedGender: {
    label: "Allotted Gender",
    placeholder: "Select allotted gender",
    required: false,
    type: "select",
    backendField: "allotted_gender",
    options: [
      { value: "Gender-Neutral", label: "Gender-Neutral" },
      { value: "Female-Only (including Supernumerary)", label: "Female-Only (including Supernumerary)" },
    ],
    excelColumns: ["allotted gender"],
  },
  allottedCategory: {
    label: "Allotted Category",
    placeholder: "Select allotted category",
    required: false,
    type: "select",
    backendField: "allotted_category",
    options: [
      { value: "OPNO", label: "OPNO" },
      { value: "OPPH", label: "OPPH" },
      { value: "EWNO", label: "EWNO" },
      { value: "EWPH", label: "EWPH" },
      { value: "BCNO", label: "BCNO" },
      { value: "BCPH", label: "BCPH" },
      { value: "SCNO", label: "SCNO" },
      { value: "SCPH", label: "SCPH" },
      { value: "STNO", label: "STNO" },
    ],
    excelColumns: ["allottedcat", "allotted category"],
  },
  pwd: {
    label: "PWD (Person with Disability)",
    placeholder: "Select PWD status",
    required: true,
    type: "select",
    backendField: "pwd",
    options: [
      { value: "YES", label: "Yes" },
      { value: "NO", label: "No" },
    ],
    excelColumns: ["pwd", "disability", "person with disability"],
  },

  branch: {
    label: "Branch",
    placeholder: "Select branch",
    required: true,
    type: "select",
    backendField: "branch",
    options: [
      { value: "Computer Science and Engineering", label: "Computer Science and Engineering" },
      { value: "Electronics and Communication Engineering", label: "Electronics and Communication Engineering" },
      { value: "Mechanical Engineering", label: "Mechanical Engineering" },
      { value: "Smart Manufacturing", label: "Smart Manufacturing" },
      { value: "Design", label: "Design" },
    ],
    excelColumns: [
      "discipline",
      "branch",
      "brtd",
      "brnm",
      "brcd",
      "department",
    ],
  },

  address: {
    label: "Address",
    placeholder: "Enter complete address",
    required: true,
    type: "textarea",
    backendField: "address",
    excelColumns: [
      "full address",
      "address",
      "permanent address",
      "home address",
    ],
  },

  phoneNumber: {
    label: "Phone Number",
    placeholder: "Enter phone number",
    required: false,
    backendField: "phone_number",
    excelColumns: [
      "mobileno",
      "phone",
      "mobile",
      "contact number",
      "phone number",
      "mobile no",
    ],
  },

  dob: {
    label: "Date of Birth",
    placeholder: "Select date of birth",
    required: false,
    type: "date",
    backendField: "date_of_birth",
    excelColumns: [
      "date of birth",
      "dob",
      "birth date",
      "Date of Birth",
      "DOB",
      "date_of_birth",
      "dateOfBirth",
    ],
  },
  jeeRank: {
    label: "AI Rank",
    placeholder: "Enter AI rank",
    required: false,
    type: "number",
    backendField: "ai_rank",
    excelColumns: [
      "ai rank",
      "jee rank",
      "jee main rank",
      "rank",
      "AI Rank",
      "AI rank",
      "ai_rank",
      "aiRank",
      "JEE Rank",
    ],
  },
  categoryRank: {
    label: "Category Rank",
    placeholder: "Enter category rank",
    required: false,
    type: "number",
    backendField: "category_rank",
    excelColumns: ["category rank", "cat rank"],
  },

  fatherOccupation: {
    label: "Father's Occupation",
    placeholder: "Enter father's occupation",
    required: false,
    backendField: "father_occupation", 
    excelColumns: ["father's occupation", "father occupation"],
  },
  fatherMobile: {
    label: "Father's Mobile",
    placeholder: "Enter father's mobile number",
    required: false,
    backendField: "father_mobile", 
    excelColumns: ["father mobile number", "father mobile", "father phone"],
  },
  motherOccupation: {
    label: "Mother's Occupation",
    placeholder: "Enter mother's occupation",
    required: false,
    backendField: "mother_occupation", 
    excelColumns: ["mother's occupation", "mother occupation"],
  },
  motherMobile: {
    label: "Mother's Mobile",
    placeholder: "Enter mother's mobile number",
    required: false,
    backendField: "mother_mobile", 
    excelColumns: ["mother mobile number", "mother mobile", "mother phone"],
  },
  state: {
    label: "State",
    placeholder: "Enter state",
    required: false,
    backendField: "state", 
    excelColumns: ["state", "state name"],
  },
  rollNumber: {
    label: "Institute Roll Number",
    placeholder: "Enter institute roll number",
    required: false,
    backendField: "roll_number", 
    excelColumns: [
      "institute roll number",
      "roll number",
      "rollno",
      "Institute Roll Number",
      "Roll Number",
      "roll_number",
      "rollNumber",
    ],
  },
  instituteEmail: {
    label: "Institute Email ID",
    placeholder: "Enter institute email",
    required: false,
    type: "email",
    backendField: "institute_email", 
    excelColumns: [
      "institute email id",
      "institute email",
      "official email",
      "Institute Email ID",
      "Institute Email",
      "institute_email",
      "instituteEmail",
    ],
  },
  alternateEmail: {
    label: "Alternate Email",
    placeholder: "Enter alternate email",
    required: false,
    type: "email",
    backendField: "personal_email",
    excelColumns: [
      "Alternate Email ID",
      "alternate email id",
      "alternate email",
      "Alternate Email",
      "student alternate email",
    ],
  },
  parentEmail: {
    label: "Parent's Email",
    placeholder: "Enter parent's email",
    required: false,
    type: "email",
    backendField: "parent_email",
    excelColumns: [
      "Parent Email",
      "parent email",
      "parent's email",
      "guardian email",
      "Parent's Email",
      "parent_email",
      "parentEmail",
    ],
  },
  bloodGroup: {
    label: "Blood Group",
    placeholder: "Select blood group",
    required: false,
    type: "select",
    backendField: "blood_group",
    options: [
      { value: "A+", label: "A+" },
      { value: "A-", label: "A-" },
      { value: "B+", label: "B+" },
      { value: "B-", label: "B-" },
      { value: "AB+", label: "AB+" },
      { value: "AB-", label: "AB-" },
      { value: "O+", label: "O+" },
      { value: "O-", label: "O-" },
      { value: "Other", label: "Other" },
    ],
    excelColumns: [
      "Blood Group",
      "blood group", 
      "blood_group", 
      "bloodGroup"
    ],
  },
  bloodGroupRemarks: {
    label: "Blood Group Remarks",
    placeholder: "Enter blood group details",
    required: false,
    type: "text",
    backendField: "blood_group_remarks",
    excelColumns: ["blood group remarks", "blood_group_remarks", "bloodGroupRemarks"],
  },
  country: {
    label: "Country",
    placeholder: "Enter country",
    required: false,
    backendField: "country",
    excelColumns: [
      "Country",  
      "country", 
      "nation", 
      "Nation", 
      "COUNTRY"
    ],
  },
  nationality: {
    label: "Nationality", 
    placeholder: "Enter nationality",
    required: false,
    backendField: "nationality",
    excelColumns: [
      "Nationality",  
      "nationality", 
      "NATIONALITY", 
      "Citizen", 
      "citizenship"
    ],
  },
  admissionMode: {
    label: "Admission Mode",
    placeholder: "Select admission mode",
    required: false,
    type: "select",
    backendField: "admission_mode",
    options: [
      { value: "Direct Institute advertisement", label: "Direct Institute advertisement" },
      { value: "CCMT Counselling", label: "CCMT Counselling" },
      { value: "JoSAA/CSAB Counselling", label: "JoSAA/CSAB Counselling" },
      { value: "UCEED Counselling", label: "UCEED Counselling" },
      { value: "Study In India (SII) Counselling", label: "Study In India (SII) Counselling" },
      { value: "DASA Counselling", label: "DASA Counselling" },
      { value: "Any other (remarks)", label: "Any other (remarks)" },
    ],
    excelColumns: [
      "Admission Mode",
      "admission mode", 
      "admission_mode", 
      "admissionMode"
    ],
  },
  admissionModeRemarks: {
    label: "Admission Mode Remarks",
    placeholder: "Enter admission mode remarks",
    required: false,
    backendField: "admission_mode_remarks",
    excelColumns: [
      "Admission Mode Remarks",
      "admission mode remarks", 
      "admission_mode_remarks", 
      "admissionModeRemarks"
    ],
  },
  pwdCategory: {
    label: "PwD Category",
    placeholder: "Select PwD category",
    required: false,
    type: "select",
    backendField: "pwd_category",
    options: [
      { value: "Locomotor Disability", label: "Locomotor Disability" },
      { value: "Low vision Disability", label: "Low vision Disability" },
      { value: "Deaf Disability", label: "Deaf Disability" },
      { value: "Cerebral Palsy", label: "Cerebral Palsy" },
      { value: "Dyslexia", label: "Dyslexia" },
      { value: "Amputee (Both Hand)", label: "Amputee (Both Hand)" },
      { value: "Deafness", label: "Deafness" },
      { value: "Any other (remarks)", label: "Any other (remarks)" },
    ],
    excelColumns: [
      "PwD Category",  
      "pwd category", 
      "pwd_category", 
      "pwdCategory", 
      "disability category"
    ],
  },
  pwdCategoryRemarks: {
    label: "PwD Category Remarks",
    placeholder: "Enter PwD category remarks",
    required: false,
    backendField: "pwd_category_remarks",
    excelColumns: ["pwd category remarks", "pwd_category_remarks", "pwdCategoryRemarks"],
  },
  incomeGroup: {
    label: "Income Group",
    placeholder: "Select income group",
    required: false,
    type: "select",
    backendField: "income_group",
    options: [
      { value: "Between 0 to 2 Lakh", label: "Between 0 to 2 Lakh" },
      { value: "Between 2 to 4 Lakh", label: "Between 2 to 4 Lakh" },
      { value: "Between 4 to 6 Lakh", label: "Between 4 to 6 Lakh" },
      { value: "Between 6 to 8 Lakh", label: "Between 6 to 8 Lakh" },
      { value: "More than 8 Lakh", label: "More than 8 Lakh" },
    ],
    excelColumns: [
      "Income Group",  
      "income group", 
      "income_group", 
      "incomeGroup"
    ],
  },
  income: {
    label: "Income",
    placeholder: "Enter income (whole numbers only)",
    required: false,
    type: "number",
    backendField: "income",
    excelColumns: [
      "Income",  
      "income", 
      "annual income", 
      "family income"
    ],
  },
  reportedStatus: {
    label: "Status",
    placeholder: "Student reporting status",
    required: false,
    type: "select",
    backendField: "reported_status",
    systemField: true,
    options: [
      { value: "NOT_REPORTED", label: "Not Reported" },
      { value: "REPORTED", label: "Reported" },
      { value: "WITHDRAWAL", label: "Withdrawal" },
    ],
    excelColumns: [
      "Status",
      "status", 
      "reported status", 
      "reporting status"
    ],
  },
};

const INITIAL_FORM_DATA = {
  jeeAppNo: "",
  specialization: "",
  name: "",
  fname: "",
  mname: "",
  gender: "",
  category: "",
  minority: "",
  pwd: "NO",
  branch: "",
  address: "",

  phoneNumber: "",
  alternateEmail: "",
  dob: "",
  jeeRank: "",
  categoryRank: "",

  allottedGender: "",
  allottedCategory: "",
  fatherOccupation: "",
  fatherMobile: "",
  motherOccupation: "",
  motherMobile: "",
  state: "",
  rollNumber: "",
  instituteEmail: "",
  parentEmail: "",
  bloodGroup: "",
  bloodGroupRemarks: "",
  country: "",
  nationality: "",
  admissionMode: "",
  admissionModeRemarks: "",
  pwdCategory: "",
  pwdCategoryRemarks: "",
  incomeGroup: "",
  income: "",
};

const AdminUpcomingBatch = () => {
  const getCurrentBatchYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (currentMonth >= 7) {
      return currentYear;
    } else {
      return currentYear - 1;
    }
  };

  // Automatically adds new years in July, separate for UG/PG/PHD
  const getBatchYearOptions = (programmeType) => {
    const currentBatchYear = getCurrentBatchYear();
    const options = [];
    const baseStartYear = 2016;
    let startYear, endYear;
    
    switch (programmeType) {
      case PROGRAMME_TYPES.UG:
        startYear = Math.max(baseStartYear, currentBatchYear - 3);
        endYear = currentBatchYear;
        break;
      case PROGRAMME_TYPES.PG:
        startYear = Math.max(baseStartYear, currentBatchYear - 1);
        endYear = currentBatchYear;
        break;
      case PROGRAMME_TYPES.PHD:
        startYear = Math.max(baseStartYear, currentBatchYear - 5);
        endYear = currentBatchYear;
        break;
      default:
        startYear = baseStartYear;
        endYear = currentBatchYear;
    }

    for (let year = endYear; year >= startYear; year--) {
      const academicYear = batchYearToAcademicYear(year);
      options.push({
        value: year.toString(),
        label: `${year} (Academic Year: ${academicYear})`
      });
    }
    
    return options;
  };

  const getViewAcademicYearOptions = () => {
    const currentBatchYear = getCurrentBatchYear();
    const options = [];

    for (let year = currentBatchYear; year >= currentBatchYear - 5; year--) {
      const academicYear = batchYearToAcademicYear(year);
      options.push({
        value: year.toString(),
        label: academicYear
      });
    }
    
    return options;
  };

  const isViewingCurrentYear = () => {
    const currentYear = getCurrentBatchYear();
    return viewAcademicYear === currentYear;
  };

  const batchYearToAcademicYear = (batchYear) => {
    const year = parseInt(batchYear, 10);
    return `${year}-${(year + 1).toString().slice(-2)}`;
  };

  const academicYearToBatchYear = (academicYear) => {
    if (typeof academicYear === 'number') return academicYear;
    if (typeof academicYear === 'string' && academicYear.includes('-')) {
      return parseInt(academicYear.split('-')[0], 10);
    }
    return parseInt(academicYear, 10);
  };

  const getCurrentAcademicYearString = () => {
    return batchYearToAcademicYear(getCurrentBatchYear());
  };

  const normalizeBatchData = (batchData) => {
    return batchData.map(batch => {
      const totalSeats = batch.totalSeats || batch.total_seats || 0;
      const filledSeats = batch.filledSeats || batch.filled_seats || batch.student_count || 0;
      const availableSeats = Math.max(0, totalSeats - filledSeats);
      
      return {
        ...batch,
        year: academicYearToBatchYear(batch.year), 
        totalSeats,
        filledSeats,
        availableSeats,
        name: batch.name || batch.programme || "Unknown",
      };
    });
  };

  const showWorkflowGuidance = (errorType, details = {}) => {
    switch (errorType) {
      case 'curriculum_required':
        notifications.show({
          title: "🎯 Setup Required: Step 1 of 3",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Create a curriculum first:</strong>
              </Text>
              <Text size="xs" color="gray.7">
                1. Go to Programme Curriculum → Admin Curriculum<br/>
                2. Click "Add Curriculum" to create a new curriculum<br/>
                3. Set status to "Working" when ready<br/>
                4. Then come back to create batches
              </Text>
            </div>
          ),
          color: "blue",
          autoClose: 12000,
          style: {
            backgroundColor: '#e3f2fd',
            borderColor: '#90caf9',
            color: '#1565c0',
          },
        });
        break;
        
      case 'batches_required':
        notifications.show({
          title: "Setup Required: Step 2 of 3", 
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Create batches for {details.academicYear || 'current year'}:</strong>
              </Text>
              <Text size="xs" color="gray.7">
                1. Curriculum ✅ (completed)<br/>
                2. Create batches and assign curriculum to each<br/>
                3. Then upload student data
              </Text>
            </div>
          ),
          color: "blue",
          autoClose: 10000,
          style: {
            backgroundColor: '#e3f2fd',
            borderColor: '#90caf9',
            color: '#1565c0',
          },
        });
        break;
        
      case 'curriculum_assignment_required':
        notifications.show({
          title: "🎯 Setup Required: Step 2b of 3",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Assign curriculum to batches:</strong>
              </Text>
              <Text size="xs" color="gray.7">
                1. Curriculum ✅ (completed)<br/>
                2. Batches ✅ (completed)<br/>
                3. Assign curriculum to: {details.batchNames}<br/>
                4. Then upload student data
              </Text>
            </div>
          ),
          color: "orange",
          autoClose: 12000,
          style: {
            backgroundColor: '#fff3cd',
            borderColor: '#ffeaa7',
            color: '#856404',
          },
        });
        break;
        
      case 'ready_for_students':
        notifications.show({
          title: "🎉 Ready for Step 3!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>All prerequisites completed:</strong>
              </Text>
              <Text size="xs" color="gray.7">
                1. Curriculum ✅<br/>
                2. Batches ✅<br/>
                3. Curriculum Assignment ✅<br/>
                You can now upload student data!
              </Text>
            </div>
          ),
          color: "green",
          autoClose: 8000,
          style: {
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            color: '#155724',
          },
        });
        break;
    }
  };

  // Proactive validation check before attempting student operations

  const BRANCH_MAPPINGS = {
    'computer science and engineering': ['CSE', 'Computer Science and Engineering', 'Computer Science', 'CS'],
    'cse': ['CSE', 'Computer Science and Engineering', 'Computer Science', 'CS'],
    'electronics and communication engineering': ['ECE', 'Electronics and Communication Engineering', 'Electronics', 'EC'],
    'ece': ['ECE', 'Electronics and Communication Engineering', 'Electronics', 'EC'],
    'mechanical engineering': ['ME', 'Mechanical Engineering', 'Mechanical', 'Mech'],
    'me': ['ME', 'Mechanical Engineering', 'Mechanical', 'Mech'],
    'smart manufacturing': ['SM', 'Smart Manufacturing'],
    'sm': ['SM', 'Smart Manufacturing'],
    'design': ['Design', 'Des.', 'DES', 'Des'],
    'des': ['Design', 'Des.', 'DES', 'Des'],
  };

  const normalizeBranchName = (branchName) => {
    if (!branchName) return null;
    const normalized = branchName.toLowerCase().trim();
    return BRANCH_MAPPINGS[normalized] || [branchName];
  };

  const getBatchForBranch = (targetBranch, batchesToSearch) => {
    if (!targetBranch || !batchesToSearch || batchesToSearch.length === 0) return null;
    
    const targetVariants = normalizeBranchName(targetBranch);
    
    return batchesToSearch.find(batch => {
      const batchBranch = (batch.discipline || batch.branch || '').trim();
      if (!batchBranch) return false;
      
      const batchVariants = normalizeBranchName(batchBranch);

      return targetVariants.some(target => 
        batchVariants.some(batchVar => 
          target.toLowerCase() === batchVar.toLowerCase()
        )
      );
    });
  };

  const getBatchForBranchTransfer = (targetBranch, targetYear = null, programmeType = null, allBatches = null) => {
    if (!targetBranch) return null;

    const batchesToSearch = allBatches || getCurrentBatches();
    if (!batchesToSearch || batchesToSearch.length === 0) return null;

    const targetVariants = normalizeBranchName(targetBranch);

    // Filter batches by programme type if specified
    let filteredBatches = batchesToSearch;
    if (programmeType) {
      filteredBatches = batchesToSearch.filter(batch => {
        const batchProgramme = (batch.programme || '').toLowerCase();
        switch (programmeType) {
          case 'ug':
            return batchProgramme.includes('b.tech') || batchProgramme.includes('b.des');
          case 'pg':
            return batchProgramme.includes('m.tech') || batchProgramme.includes('m.des');
          case 'phd':
            return batchProgramme.includes('phd') || batchProgramme.includes('ph.d');
          default:
            return true;
        }
      });
    }

    if (targetYear) {
      filteredBatches = filteredBatches.filter(batch => batch.year === parseInt(targetYear));
    }
    const exactMatch = filteredBatches.find(batch => {
      const batchBranch = (batch.discipline || batch.branch || '').trim();
      if (!batchBranch) return false;
      
      const batchVariants = normalizeBranchName(batchBranch);
      return targetVariants.some(target => 
        batchVariants.some(batchVar => 
          target.toLowerCase() === batchVar.toLowerCase()
        )
      );
    });

    return exactMatch || null;
  };

  const getAvailableTargetBatches = (currentBatch, transferType = 'batch_change') => {
    const allBatches = [...ugBatches, ...pgBatches, ...phdBatches];
    
    return allBatches.filter(batch => {
      if (batch.id === currentBatch?.id) return false;
      const availableSeats = (batch.totalSeats || 0) - (batch.filledSeats || 0);
      if (availableSeats <= 0) return false;

      switch (transferType) {
        case 'batch_change':
          return batch.discipline === currentBatch?.discipline;
        
        case 'branch_change':
          const currentProgrammeType = getCurrentProgrammeType(currentBatch);
          const batchProgrammeType = getCurrentProgrammeType(batch);
          return batchProgrammeType === currentProgrammeType && 
                 batch.discipline !== currentBatch?.discipline;
        
        case 'programme_change':
          const currentProgramme = getCurrentProgrammeType(currentBatch);
          const targetProgramme = getCurrentProgrammeType(batch);
          return targetProgramme !== currentProgramme;
        
        default:
          return true;
      }
    }).sort((a, b) => {
      if (a.programme !== b.programme) {
        return a.programme.localeCompare(b.programme);
      }
      if (a.discipline !== b.discipline) {
        return a.discipline.localeCompare(b.discipline);
      }
      return b.year - a.year; // Latest year first
    });
  };

  // Function to handle student batch/branch transfer
  const handleBatchBranchTransfer = async (studentData, transferDetails) => {
    try {
      // Frontend validation only
      const transferValidation = validateTransferCompatibility(
        transferDetails.currentBatch, 
        transferDetails.newBatch, 
        transferDetails.transferType
      );
      
      if (!transferValidation.isValid) {
        throw new Error(transferValidation.message);
      }

      // Call backend - it handles everything
      const result = await performBatchBranchChangeAPI(studentData, transferDetails);

      // Show success notification
      notifications.show({
        title: "Transfer Successful",
        message: result.message || "Student transferred successfully",
        color: "green",
        autoClose: 5000,
      });

      // Refresh data from backend
      await fetchBatchData(); // Let backend provide updated counts

      // Remove from current view if needed
      if (selectedBatch && (selectedBatch.id === transferDetails.currentBatch?.id)) {
        setStudentList((prev) => 
          prev.filter(student => 
            (student.id || student.student_id) !== (studentData.id || studentData.student_id)
          )
        );
      }

      return { success: true, message: result.message };

    } catch (error) {
      notifications.show({
        title: "Transfer Error",
        message: `Failed to transfer student: ${error.message}`,
        color: "red",
      });
      return { success: false, error: error.message };
    }
  };

  const validateTransferCompatibility = (currentBatch, newBatch, transferType) => {
    if (!currentBatch || !newBatch) {
      return {
        isValid: false,
        message: "Both current and new batch information are required"
      };
    }

    // Same batch transfer not allowed
    if (currentBatch.id === newBatch.id) {
      return {
        isValid: false,
        message: "Cannot transfer student to the same batch"
      };
    }

    const availableSeats = (newBatch.totalSeats || 0) - (newBatch.filledSeats || 0);
    if (availableSeats <= 0) {
      return {
        isValid: false,
        message: `Target batch ${newBatch.discipline} ${newBatch.year} has no available seats`
      };
    }

    // Validate based on transfer type
    switch (transferType) {
      case 'batch_change':
        // Same discipline, potentially different year
        if (currentBatch.discipline !== newBatch.discipline) {
          return {
            isValid: false,
            message: "Batch change requires same discipline. Use branch change for different disciplines."
          };
        }
        break;
      
      case 'branch_change':
        // Different discipline, same or different programme level
        if (currentBatch.discipline === newBatch.discipline) {
          return {
            isValid: false,
            message: "Branch change requires different discipline. Use batch change for same discipline."
          };
        }
        break;
      
      case 'programme_change':
        // Different programme (UG to PG, etc.)
        const currentProgramme = getCurrentProgrammeType(currentBatch);
        const newProgramme = getCurrentProgrammeType(newBatch);
        if (currentProgramme === newProgramme) {
          return {
            isValid: false,
            message: "Programme change requires different programme level."
          };
        }
        break;
    }

    return {
      isValid: true,
      message: "Transfer is valid"
    };
  };

  // Helper function to determine programme type from batch
  const getCurrentProgrammeType = (batch) => {
    if (!batch) return null;
    
    const programme = (batch.programme || '').toLowerCase();
    if (programme.includes('b.tech') || programme.includes('b.des')) {
      return 'ug';
    } else if (programme.includes('m.tech') || programme.includes('m.des')) {
      return 'pg';
    } else if (programme.includes('phd') || programme.includes('ph.d')) {
      return 'phd';
    }
    
    // Fallback based on programme_type field
    return batch.programme_type || 'ug';
  };

  const performBatchBranchChangeAPI = async (studentData, transferDetails) => {
    const token = localStorage.getItem("authToken");
    if (!token) throw new Error("Authentication token not found");

    const payload = {
      student_id: studentData.id || studentData.student_id,
      current_batch_id: transferDetails.currentBatch.id,
      new_batch_id: transferDetails.newBatch.id,
      transfer_type: transferDetails.transferType,
      reason: transferDetails.reason || 'Administrative transfer'
    };

    const response = await fetch(`${host}/academic-information/batch-branch-change/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Transfer failed' }));
      throw new Error(errorData.message || 'Failed to transfer student');
    }

    return await response.json();
  };

  const getCsrfToken = () => {
    const csrfCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : '';
  };

  const handleBranchTransfer = async (studentData, oldBatch, newBatch) => {
    return await handleBatchBranchTransfer(studentData, {
      currentBatch: oldBatch,
      newBatch: newBatch,
      transferType: 'branch_change',
      reason: 'Automatic branch transfer'
    });
  };

  const { userDetails } = useSelector((state) => state.user);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [activeSection, setActiveSection] = useState(PROGRAMME_TYPES.UG);
  const [ugBatches, setUgBatches] = useState([]);
  const [pgBatches, setPgBatches] = useState([]);
  const [phdBatches, setPhdBatches] = useState([]);
  const [batchData, setBatchData] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState(false);
  const [selectedBatchYear, setSelectedBatchYear] = useState(() => getCurrentBatchYear());
  const [viewAcademicYear, setViewAcademicYear] = useState(() => getCurrentBatchYear()); 

  useEffect(() => {
    const currentYear = getCurrentBatchYear();
    setSelectedBatchYear(currentYear);
    setViewAcademicYear(currentYear);
  }, [activeSection]);

  useEffect(() => {
    setNewBatchData(prev => ({
      ...prev,
      year: selectedBatchYear
    }));
  }, [selectedBatchYear]);

  const mapCategoryValue = (value) => {
    const categoryMapping = {
      "GEN": "General",
      "General": "General",
      "Other Backward Class (Non-Creamy Layer)": "OBC-NCL",
      "OBC-NCL": "OBC-NCL",
      "Scheduled Caste": "SC",
      "SC": "SC",
      "Scheduled Tribe": "ST", 
      "ST": "ST",
      "Economically Weaker Section": "GEN-EWS",
      "EWS": "GEN-EWS",
      "GEN-EWS": "GEN-EWS"
    };
    return categoryMapping[value] || value;
  };

  const mapGenderValue = (value) => {
    if (!value) return value;
    const genderMapping = {
      "MALE": "Male",
      "FEMALE": "Female", 
      "OTHER": "Other",
      "M": "Male",
      "F": "Female"
    };
    return genderMapping[value.toUpperCase()] || value;
  };

  const mapPwdValue = (value) => {
    if (!value) return value;
    const pwdMapping = {
      "YES": "YES",
      "NO": "NO",
      "Y": "YES",
      "N": "NO",
      "TRUE": "YES", 
      "FALSE": "NO",
      "1": "YES",
      "0": "NO"
    };
    return pwdMapping[value.toString().toUpperCase()] || value;
  };

  const mapAllottedCategoryValue = (value) => {
    if (!value) return value;
    return value;
  };

  const mapAllottedGenderValue = (value) => {
    if (!value) return value;
    const allottedGenderMapping = {
      "GENDER-NEUTRAL": "Gender-Neutral",
      "GENDER_NEUTRAL": "Gender-Neutral",
      "FEMALE-ONLY": "Female-Only (including Supernumerary)",
      "FEMALE_ONLY": "Female-Only (including Supernumerary)",
      "FEMALE-ONLY (INCLUDING SUPERNUMERARY)": "Female-Only (including Supernumerary)"
    };
    return allottedGenderMapping[value.toUpperCase()] || value;
  };

  // Clean up discipline/branch names by removing extra details in parentheses
  const cleanDisciplineName = (disciplineName) => {
    if (!disciplineName || typeof disciplineName !== 'string') {
      return disciplineName;
    }
    return disciplineName.replace(/\s*\([^)]*\)/g, '').trim();
  };

  // Helper function to parse backend duplicate errors and return user-friendly messages
  const parseDuplicateError = (error, context = "operation") => {
    let errorMessage = `Failed to ${context}`;
    let errorTitle = "Error";

    if (error.response?.data?.message) {
      const backendMessage = error.response.data.message.toLowerCase();

      if (
        backendMessage.includes("jee_app_no") &&
        backendMessage.includes("already exists")
      ) {
        errorTitle = "Duplicate JEE Application Number";
        errorMessage = context.includes("upload")
          ? "One or more JEE Application Numbers already exist in the database. Please check your Excel file and remove duplicates."
          : "This JEE Application Number already exists in the database. Please check and enter a different number.";
      }
      else if (
        backendMessage.includes("roll_number") &&
        backendMessage.includes("already exists")
      ) {
        errorTitle = "Duplicate Roll Number";
        errorMessage = context.includes("upload")
          ? "One or more Institute Roll Numbers already exist in the database. Please check your Excel file and remove duplicates."
          : "This Institute Roll Number already exists in the database. Please check and enter a different number.";
      }
      else if (
        backendMessage.includes("institute_email") &&
        backendMessage.includes("already exists")
      ) {
        errorTitle = "Duplicate Institute Email";
        errorMessage = context.includes("upload")
          ? "One or more Institute Email IDs already exist in the database. Please check your Excel file and remove duplicates."
          : "This Institute Email ID already exists in the database. Please check and enter a different email.";
      }
  
      else if (
        backendMessage.includes("duplicate key") ||
        backendMessage.includes("already exists")
      ) {
        errorTitle = "Duplicate Entries";
        errorMessage = context.includes("upload")
          ? "Some entries in your Excel file already exist in the database. Please check for duplicate JEE App Numbers, Roll Numbers, and Institute Emails."
          : "Some information you entered already exists in the database. Please check JEE App No, Roll Number, and Institute Email for duplicates.";
      }
      else {
        errorMessage = error.response.data.message || errorMessage;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { title: errorTitle, message: errorMessage };
  };

  const validateRequiredFields = (formData, isEditMode = false) => {
    let errors = {};

    const dropdownFields = [
      "gender",
      "category",
      "allottedGender",
      "allottedCategory",
      "pwd",
      "branch",
      "bloodGroup",
      "admissionMode",
      "pwdCategory",
      "incomeGroup",
      "categoryRank",
    ];

    Object.keys(STUDENT_FIELDS_CONFIG).forEach((fieldKey) => {
      const fieldConfig = STUDENT_FIELDS_CONFIG[fieldKey];

      if (isEditMode && dropdownFields.includes(fieldKey)) {
        return;
      }
      
      // Skip validation for fields that don't apply to current programme type
      if (fieldConfig.showForProgrammes) {
        const currentProgramType = activeSection.toUpperCase();
        if (!fieldConfig.showForProgrammes.includes(currentProgramType)) {
          return;
        }
      }

      if (fieldConfig.required) {
        const value = formData[fieldKey];
        const isEmpty = value === undefined || 
                       value === null || 
                       value === "" ||
                       (typeof value === 'string' && value.trim() === "");
        
        if (isEmpty) {
          console.log(`Field ${fieldKey} (${fieldConfig.label}) is missing or empty. Value:`, value);
          errors[fieldKey] = `${fieldConfig.label} is required`;
        }
      }
    });

    const universalErrors = applyUniversalValidation(formData, isEditMode);
    errors = { ...errors, ...universalErrors };

    return errors;
  };

  const validateCurrentStep = (formData, step, isEditMode = false) => {
    const errors = {};
    let fieldsToValidate = [];

    const dropdownFields = [
      "gender",
      "category",
      "allottedGender",
      "allottedCategory",
      "pwd",
      "branch",
      "categoryRank",
    ];

    switch (step) {
      case 0: 
        fieldsToValidate = ["name", "fname", "mname", "gender", "category"];
        break;
      case 1:
        fieldsToValidate = ["pwd", "jeeAppNo", "address"];
        break;
      case 2: 
        fieldsToValidate = ["branch"];
        break;
      default:
        return errors;
    }

    if (isEditMode) {
      fieldsToValidate = fieldsToValidate.filter(
        (field) => !dropdownFields.includes(field),
      );
    }

    fieldsToValidate.forEach((fieldKey) => {
      const fieldConfig = STUDENT_FIELDS_CONFIG[fieldKey];
      if (
        fieldConfig &&
        fieldConfig.required &&
        (!formData[fieldKey] || formData[fieldKey].trim() === "")
      ) {
        errors[fieldKey] = `${fieldConfig.label} is required`;
      }
    });

    return errors;
  };

  const handleStatusChange = (rollNo, newStatus) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student.rollNo === rollNo ? { ...student, status: newStatus } : student
      )
    );
  };

  const getCurrentAcademicYear = () => {
    return getCurrentAcademicYearString();
  };

  // Universal validation logic for PwD and Income fields
  const validatePwDFields = (formData) => {
    const errors = {};

    if ((formData.pwd === "YES" || formData.pwd === "Yes") && (!formData.pwdCategory || formData.pwdCategory.trim() === "")) {
      errors.pwdCategory = "PwD Category is required when PwD is Yes.";
    }

    if (formData.pwdCategory === "Any other (remarks)" && (!formData.pwdCategoryRemarks || formData.pwdCategoryRemarks.trim() === "")) {
      errors.pwdCategoryRemarks = "PwD Category remarks are required when 'Any other (remarks)' is selected.";
    }
    
    return errors;
  };

  const validateIncomeFields = (formData) => {
    const errors = {};
    
    if (formData.incomeGroup && formData.income) {
      const income = parseInt(formData.income);

      if (isNaN(income) || income < 0) {
        errors.income = "Income must be a valid positive number.";
        return errors;
      }

      switch (formData.incomeGroup) {
        case "Between 0 to 2 Lakh":
          if (income < 0 || income > 200000) {
            errors.income = "Income must be between 0 and 2,00,000 for the selected Income Group.";
          }
          break;
        case "Between 2 to 4 Lakh":
          if (income <= 200000 || income > 400000) {
            errors.income = "Income must be between 2,00,001 and 4,00,000 for the selected Income Group.";
          }
          break;
        case "Between 4 to 6 Lakh":
          if (income <= 400000 || income > 600000) {
            errors.income = "Income must be between 4,00,001 and 6,00,000 for the selected Income Group.";
          }
          break;
        case "Between 6 to 8 Lakh":
          if (income <= 600000 || income > 800000) {
            errors.income = "Income must be between 6,00,001 and 8,00,000 for the selected Income Group.";
          }
          break;
        case "More than 8 Lakh":
          if (income <= 800000) {
            errors.income = "Income must be more than 8,00,000 for the selected Income Group.";
          }
          break;
      }
    }
    
    return errors;
  };

  const validateAdmissionModeFields = (formData) => {
    const errors = {};

    if (formData.admissionMode === "Any other (remarks)" && (!formData.admissionModeRemarks || formData.admissionModeRemarks.trim() === "")) {
      errors.admissionModeRemarks = "Admission Mode remarks are required when 'Any other (remarks)' is selected.";
    }
    
    return errors;
  };

  const validateBloodGroupFields = (formData) => {
    const errors = {};

    if (formData.bloodGroup === "Other" && (!formData.bloodGroupRemarks || formData.bloodGroupRemarks.trim() === "")) {
      errors.bloodGroupRemarks = "Blood Group remarks are required when 'Other' is selected.";
    }
    
    return errors;
  };

  const validateEmailField = (email, fieldName) => {
    const errors = {};
    
    if (email && email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors[fieldName] = "Please enter a valid email address.";
      }
    }
    
    return errors;
  };

  const validatePhoneNumbers = (formData) => {
    const errors = {};

    if (formData.phoneNumber && formData.fatherMobile && 
        formData.phoneNumber.trim() === formData.fatherMobile.trim()) {
      errors.fatherMobile = "Father's mobile number cannot be the same as student's phone number.";
    }

    if (formData.phoneNumber && formData.motherMobile && 
        formData.phoneNumber.trim() === formData.motherMobile.trim()) {
      errors.motherMobile = "Mother's mobile number cannot be the same as student's phone number.";
    }

    if (formData.fatherMobile && formData.motherMobile && 
        formData.fatherMobile.trim() === formData.motherMobile.trim()) {
      errors.motherMobile = "Mother's mobile number cannot be the same as father's mobile number.";
    }
    
    return errors;
  };

  const applyUniversalValidation = (formData, isEditMode = false) => {
    let errors = {};
    
    // Apply PwD validation
    errors = { ...errors, ...validatePwDFields(formData) };
    
    // Apply Income validation
    errors = { ...errors, ...validateIncomeFields(formData) };
    
    // Apply Admission Mode validation
    errors = { ...errors, ...validateAdmissionModeFields(formData) };
    
    // Apply Blood Group validation
    errors = { ...errors, ...validateBloodGroupFields(formData) };
    
    // Apply Phone number validation
    errors = { ...errors, ...validatePhoneNumbers(formData) };
    
    // Apply Email validation
    if (formData.alternateEmail) {
      errors = { ...errors, ...validateEmailField(formData.alternateEmail, 'alternateEmail') };
    }
    if (formData.parentEmail) {
      errors = { ...errors, ...validateEmailField(formData.parentEmail, 'parentEmail') };
    }
    if (formData.instituteEmail) {
      errors = { ...errors, ...validateEmailField(formData.instituteEmail, 'instituteEmail') };
    }
    
    return errors;
  };




  const getDisplayBranchName = (branchName, branchCode) => {
    const branch = (branchName || branchCode || "").toLowerCase().trim();

    const branchMappings = {
      "computer science and engineering": "CSE",
      cse: "CSE",
      "computer science": "CSE",
      "electronics and communication engineering": "ECE",
      ece: "ECE",
      electronics: "ECE",
      "mechanical engineering": "ME",
      mechanical: "ME",
      me: "ME",
      "smart manufacturing": "SM",
      sm: "SM",
      manufacturing: "SM",
      design: "DES",
      bdes: "DES",
    };

    const matchedBranch = Object.entries(branchMappings).find(([key]) =>
      branch.includes(key),
    );
    if (matchedBranch) {
      const [, displayName] = matchedBranch;
      return displayName;
    }

    return branchName || branchCode || "Unknown";
  };


  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState(
    selectedBatchYear.toString(),
  );
  const [filterProgramme, setFilterProgramme] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [entryMode, setEntryMode] = useState("excel");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState([]);

  const [processedBatchData, setProcessedBatchData] = useState(null);
  const [allocationSummary, setAllocationSummary] = useState(null);
  const [showBatchPreview, setShowBatchPreview] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [manualFormData, setManualFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});

  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editTotalSeats, setEditTotalSeats] = useState("");
  const [seatsUpdateLoading, setSeatsUpdateLoading] = useState(false);

  const [editingRow, setEditingRow] = useState(null); 
  const [editFormData, setEditFormData] = useState({}); 
  const [showAddBatchModal, setShowAddBatchModal] = useState(false); 
  const [newBatchData, setNewBatchData] = useState({
    programme: "",
    discipline: "",
    year: selectedBatchYear,
    totalSeats: 60,
  });
  const [deletingBatchId, setDeletingBatchId] = useState(null); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteStudentConfirm, setShowDeleteStudentConfirm] =
    useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [updatingReportStatus, setUpdatingReportStatus] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);

  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isBulkReporting, setIsBulkReporting] = useState(false);

  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState({});
  const [exportFormat, setExportFormat] = useState("excel");
  const [isExporting, setIsExporting] = useState(false);
  const [selectAllFields, setSelectAllFields] = useState(true);

  const fetchBatchData = useCallback(async (showBackgroundSync = true) => {
    if (showBackgroundSync) {
      setBackgroundSync(true);
    }
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authorization token not found");   
      const response = await axios.get(
        `${host}/programme_curriculum/api/batches/sync/`,
        {
          headers: { Authorization: `Token ${token}` },
        },
      );

      if (response.data && response.data.success) {
        const allBatches = response.data.batches || [];

        const mappedBatches = allBatches.map(batch => ({
          id: batch.batch_id,
          name: batch.name,
          programme: batch.name,
          discipline: batch.discipline,
          displayBranch: batch.discipline,
          year: batch.year,
          totalSeats: batch.total_seats,
          total_seats: batch.total_seats,
          filledSeats: batch.filled_seats,
          filled_seats: batch.filled_seats,
          student_count: batch.filled_seats,
          availableSeats: batch.available_seats,
          available_seats: batch.available_seats,
          curriculum: batch.curriculum,
          curriculum_display: batch.curriculum_display,
          curriculum_name: batch.curriculum,
          curriculumId: batch.curriculum_id,
          curriculum_id: batch.curriculum_id,
          status: batch.status
        }));

        const categorizedBatches = categorizeBatchesByProgramme(mappedBatches);

        setUgBatches(categorizedBatches.ug);
        setPgBatches(categorizedBatches.pg);
        setPhdBatches(categorizedBatches.phd);

        const allBatchesUnified = [
          ...normalizeBatchData(categorizedBatches.ug),
          ...normalizeBatchData(categorizedBatches.pg),
          ...normalizeBatchData(categorizedBatches.phd)
        ];
        
        setBatchData({
          upcoming_batches: allBatchesUnified,
          current_batches: allBatchesUnified,
          ug: normalizeBatchData(categorizedBatches.ug),
          pg: normalizeBatchData(categorizedBatches.pg),
          phd: normalizeBatchData(categorizedBatches.phd)
        });

        await syncBatchData();
      } else {
        throw new Error(response.message || "Failed to fetch batch data");
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load batch data. Please try again.",
        color: "red",
      });

      setUgBatches([]);
      setPgBatches([]);
      setPhdBatches([]);
    } finally {
      setBackgroundSync(false);
    }
  }, []);

  const forceRefreshData = useCallback(async () => {
    setBackgroundSync(true);
    try {
      setUgBatches([]);
      setPgBatches([]);
      setPhdBatches([]);
      setBatchData(null);
      await fetchBatchData(true);
    } catch (error) {
      // Silently handle error
    } finally {
      setBackgroundSync(false);
    }
  }, [fetchBatchData]);

  const categorizeBatchesByProgramme = (allBatches) => {
    const categorized = {
      ug: [],
      pg: [],
      phd: [],
    };

    allBatches.forEach((batch) => {
      const programme = (batch.programme || "").trim();
      const name = (batch.name || "").trim();
      const discipline = (batch.discipline || "").toLowerCase();
      const displayBranch = (batch.displayBranch || "").toLowerCase();

      if (
        programme.startsWith("B.Tech") ||
        programme.startsWith("B.Design") ||
        name.startsWith("B.Tech") ||
        name.startsWith("B.Design") ||
        programme === "B.Tech" ||
        programme === "B.Des"
      ) {
        categorized.ug.push(batch);
      } else if (
        programme.startsWith("M.Tech") ||
        programme.startsWith("M.Des") ||
        name.startsWith("M.Tech") ||
        name.startsWith("M.Des") ||
        programme === "M.Tech" ||
        programme === "M.Des"
      ) {
        categorized.pg.push(batch);
      } else if (
        programme.startsWith("PhD") ||
        programme.startsWith("Phd") ||
        programme.toLowerCase().includes("phd") ||
        name.startsWith("PhD") ||
        name.startsWith("Phd") ||
        programme === "PhD"
      ) {
        categorized.phd.push(batch);
      } else {
        if (
          discipline.includes("phd") ||
          displayBranch.includes("phd") ||
          discipline.includes("doctor") ||
          name.toLowerCase().includes("phd")
        ) {
          categorized.phd.push(batch);
        } else if (
          discipline.includes("m.tech") ||
          discipline.includes("mtech") ||
          discipline.includes("m.des") ||
          discipline.includes("mdes") ||
          displayBranch.includes("mtech") ||
          displayBranch.includes("mdes") ||
          discipline.includes("master") ||
          name.toLowerCase().includes("m.")
        ) {
          categorized.pg.push(batch);
        } else {
          categorized.ug.push(batch);
        }
      }
    });

    return categorized;
  };

  useEffect(() => {
    fetchBatchData(false);
  }, [fetchBatchData]);

  useEffect(() => {
    setFilterProgramme("");
    syncBatchData();
  }, [activeSection]);

  // Handle editing student data mapping
  useEffect(() => {
    if (editingStudent && showAddModal && addMode === "manual") {
      const isFormEmpty = !manualFormData.name && !manualFormData.fname && !manualFormData.category;
      
      if (isFormEmpty) {
        const studentData = {};
        Object.keys(STUDENT_FIELDS_CONFIG).forEach((fieldKey) => {
        const fieldConfig = STUDENT_FIELDS_CONFIG[fieldKey];
        let value = "";

        if (
          editingStudent[fieldKey] !== undefined &&
          editingStudent[fieldKey] !== null &&
          editingStudent[fieldKey] !== ""
        ) {
          value = editingStudent[fieldKey];
          
          if (fieldKey === "category") {
            value = mapCategoryValue(value);
          } else if (fieldKey === "gender") {
            value = mapGenderValue(value);
          } else if (fieldKey === "pwd") {
            value = mapPwdValue(value);
          } else if (fieldKey === "allottedCategory") {
            value = mapAllottedCategoryValue(value);
          } else if (fieldKey === "allottedGender") {
            value = mapAllottedGenderValue(value);
          }
        }
        else if (fieldConfig.backendField && editingStudent[fieldConfig.backendField] !== undefined &&
          editingStudent[fieldConfig.backendField] !== null &&
          editingStudent[fieldConfig.backendField] !== "") {
          value = editingStudent[fieldConfig.backendField];

          if (fieldKey === "category") {
            value = mapCategoryValue(value);
          } else if (fieldKey === "gender") {
            value = mapGenderValue(value);
          } else if (fieldKey === "pwd") {
            value = mapPwdValue(value);
          } else if (fieldKey === "allottedCategory") {
            value = mapAllottedCategoryValue(value);
          } else if (fieldKey === "allottedGender") {
            value = mapAllottedGenderValue(value);
          }
        }
        else if (fieldConfig.excelColumns) {
          for (const excelCol of fieldConfig.excelColumns) {
            const colValue = editingStudent[excelCol];
            if (
              colValue !== undefined &&
              colValue !== null &&
              colValue !== ""
            ) {
              value = colValue;
              if (fieldKey === "category") {
                value = mapCategoryValue(value);
              } else if (fieldKey === "gender") {
                value = mapGenderValue(value);
              } else if (fieldKey === "pwd") {
                value = mapPwdValue(value);
              } else if (fieldKey === "allottedCategory") {
                value = mapAllottedCategoryValue(value);
              } else if (fieldKey === "allottedGender") {
                value = mapAllottedGenderValue(value);
              }
              break;
            }
          }
        }

        if (!value) {
          const specialMappings = {
            fname: [
              "father_name",
              "fatherName",
              "father",
              "Father Name",
              "Father's Name",
            ],
            mname: [
              "mother_name",
              "motherName",
              "mother",
              "Mother Name",
              "Mother's Name",
            ],
            name: ["Name", "student_name", "full_name", "fullName"],
            email: [
              "personal_email",
              "personalEmail",
              "Alternate_email_id",
              "Alternate Email ID",
            ],
            phoneNumber: [
              "phone_number",
              "phoneNumber",
              "mobile",
              "Mobile",
              "contact",
            ],
            dob: ["date_of_birth", "dateOfBirth", "Date of Birth", "DOB"],
            jeeRank: ["ai_rank", "aiRank", "AI rank", "AI Rank"],
            jeeAppNo: [
              "jee_app_no",
              "jeeAppNo",
              "application_no",
              "Application No",
              "JEE App. No. / CCMT Roll No.",
            ],
            address: ["Address", "permanent_address", "permanentAddress"],
            state: ["State", "home_state", "homeState"],
            gender: ["Gender"],
            category: ["Category"],
            allottedCategory: ["allottedcat", "allotted_category", "Allotted Cat"],
            allottedGender: ["allotted_gender", "Allotted Gender"],
            pwd: ["PWD"],
            branch: ["Branch", "discipline", "Discipline"],
            pwdCategoryRemarks: [
              "pwd_category_remarks", 
              "pwdCategoryRemarks", 
              "pwd category remarks"
            ],
            bloodGroupRemarks: [
              "blood_group_remarks", 
              "bloodGroupRemarks", 
              "blood group remarks"
            ],
            admissionModeRemarks: [
              "admission_mode_remarks", 
              "admissionModeRemarks", 
              "admission mode remarks"
            ],
            categoryRank: ["category_rank", "categoryRank", "cat rank"],
            rollNumber: ["roll_number", "rollNumber", "institute_roll_number"],
            instituteEmail: ["institute_email", "instituteEmail", "official_email"],
            alternateEmail: ["personal_email", "alternate_email", "alternateEmail"],
            parentEmail: ["parent_email", "parentEmail", "guardian_email"],
            fatherOccupation: ["father_occupation", "fatherOccupation"],
            fatherMobile: ["father_mobile", "fatherMobile", "father_phone"],
            motherOccupation: ["mother_occupation", "motherOccupation"],
            motherMobile: ["mother_mobile", "motherMobile", "mother_phone"],
            bloodGroup: ["blood_group", "bloodGroup"],
            country: ["Country", "nation"],
            nationality: ["Nationality", "citizenship"],
            admissionMode: ["admission_mode", "admissionMode"],
            pwdCategory: ["pwd_category", "pwdCategory", "disability_category"],
            incomeGroup: ["income_group", "incomeGroup"],
            income: ["Income", "annual_income", "family_income"],
            minority: ["Minority", "minority_status", "religious_minority"],
          };

          const variations = specialMappings[fieldKey] || [];

          for (const variation of variations) {
            if (
              editingStudent[variation] !== undefined &&
              editingStudent[variation] !== null &&
              editingStudent[variation] !== ""
            ) {
              value = editingStudent[variation];

              if (fieldKey === "category") {
                value = mapCategoryValue(value);
              }
              break;
            }
          }
        }

        studentData[fieldKey] = value || "";
      });

      setManualFormData(studentData);
      }
    }
  }, [editingStudent, showAddModal, addMode]);

  useEffect(() => {
    if (showExportModal && Object.keys(selectedFields).length === 0) {
      initializeSelectedFields();
    }
  }, [showExportModal]);

  const getCurrentBatches = () => {
    let allBatches;
    
    if (activeSection === "ug") allBatches = ugBatches || [];
    else if (activeSection === "pg") allBatches = pgBatches || [];
    else allBatches = phdBatches || [];

    if (allBatches.length > 0) {
    }

    const processedBatches = allBatches.map(batch => {
      const totalSeats = batch.totalSeats || batch.total_seats || 80;
      const filledSeats = batch.filledSeats || batch.filled_seats || batch.student_count || 0;
      const availableSeats = Math.max(0, totalSeats - filledSeats);
      
      return {
        ...batch,
        totalSeats,
        filledSeats,
        availableSeats,
        name: batch.name || batch.programme || "Unknown",
        curriculum: batch.curriculum || batch.curriculum_name || "N/A",
        curriculum_display: batch.curriculum_display,
        curriculumVersion: batch.curriculumVersion || batch.curriculum_version || null,
      };
    });
    
    // Filter out incomplete batches (those with missing essential data)
    const validBatches = processedBatches.filter(batch => {
      const hasYear = batch.year;
      const hasNameOrProgramme = (batch.name && batch.name.trim() !== "") || (batch.programme && batch.programme.trim() !== "");
      const hasDisciplineOrSeats = (batch.discipline && batch.discipline.trim() !== "") || batch.totalSeats > 0 || batch.filledSeats > 0;
      
      const isValid = hasYear && (hasNameOrProgramme || hasDisciplineOrSeats);

      return isValid;
    });
    return validBatches.filter(batch => batch.year === viewAcademicYear);
  };

  // Automatically sync batch data using backend API
  const syncBatchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${host}/programme_curriculum/api/batches/sync/`, {
        method: 'GET',
        headers: headers
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        // Map the sync API response to the expected format
        const mappedBatches = data.batches.map(batch => ({
          id: batch.batch_id,
          name: batch.name,
          programme: batch.name,
          discipline: batch.discipline,
          displayBranch: batch.discipline,
          year: batch.year,
          totalSeats: batch.total_seats,
          total_seats: batch.total_seats,
          filledSeats: batch.filled_seats,
          filled_seats: batch.filled_seats,
          student_count: batch.filled_seats,
          availableSeats: batch.available_seats,
          available_seats: batch.available_seats,
          curriculum: batch.curriculum,
          curriculum_display: batch.curriculum_display,
          curriculum_name: batch.curriculum,
          curriculumId: batch.curriculum_id,
          curriculum_id: batch.curriculum_id,
          status: batch.status
        }));
        
        setBatchData({
          upcoming_batches: mappedBatches,
          current_batches: mappedBatches,
          ug: mappedBatches.filter(b => b.name.includes('B.')),
          pg: mappedBatches.filter(b => b.name.includes('M.')),
          phd: mappedBatches.filter(b => b.name.toLowerCase().includes('phd'))
        });
        
      }
    } catch (error) {
    }
  };

  const filteredBatches = getCurrentBatches().filter((batch) => {
    const matchesSearch =
      searchQuery === "" ||
      batch.programme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.discipline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.displayBranch &&
        batch.displayBranch.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesYear =
      filterYear === "" || batch.year.toString() === filterYear;
    const matchesProgramme =
      filterProgramme === "" || batch.programme === filterProgramme;

    const matchesViewYear = batch.year === viewAcademicYear;

    return matchesSearch && matchesYear && matchesProgramme && matchesViewYear;
  });

  // Constants for field mapping
  const jeeAppKeys = [
    'jee_app_no',
    'jee_app_number',
    'application_number', 
    'app_no',
    'JEE App. No / CCMT Roll No',
    'JEE App. No./CCMT Roll. No.',
    'JEE App. No. / CCMT Roll No.',
    'JEE App No / CCMT Roll No',
    'Jee Main Application Number'
  ];
  
  const specializationKeys = [
    'Specialization',
    'specialization',
    'Specialisation',
    'specialisation',
    'Stream',
    'stream'
  ];

  // Handle file upload for Excel - Now connected to backend with enhanced programme detection
  const handleFileUpload = async (file) => {
    setUploadedFile(file);
    if (file) {
      setIsProcessing(true);
      setUploadProgress(10);

      try {
        setUploadProgress(30);


        const response = await processExcelUpload(file, activeSection);

        setUploadProgress(80);

        if (response.success) {
          const validStudents = response.valid_students || [];
          const invalidStudents = response.invalid_students || [];

          const transformStudentData = (student) => {
            const transformed = { ...student };
            
            for (const key of jeeAppKeys) {
              if (transformed[key] && !transformed.jeeAppNo) {
                transformed.jeeAppNo = transformed[key];
                break;
              }
            }
            
            for (const key of specializationKeys) {
              if (transformed[key] && !transformed.specialization) {
                transformed.specialization = transformed[key];
                break;
              }
            }
            
            return transformed;
          };

          const transformedValidStudents = validStudents.map(transformStudentData);
          const transformedInvalidStudents = invalidStudents.map(item => ({
            ...transformStudentData(item.data || item),
            _validation_error: item.error, 
            _row_number: item.row,
          }));
          
          setUploadProgress(100);

          notifications.show({
            title: "Success",
            message: `Excel file processed successfully! ${response.valid_records} valid records found.`,
            color: "green",
          });

          const allStudents = [...transformedValidStudents, ...transformedInvalidStudents];

          setExtractedData(allStudents);
          setShowPreview(true);
        } else {
          throw new Error(response.message || "Failed to process Excel file");
        }
      } catch (error) {
        setUploadProgress(0);

        const errorData = error.response?.data;
        const errorMessage = errorData?.message || errorData?.error || error.message;

        if (errorMessage?.includes("No working curriculums found")) {
          showWorkflowGuidance('curriculum_required');
        } else if (errorMessage?.includes("No active batches found")) {
          showWorkflowGuidance('batches_required', { 
            academicYear: getViewAcademicYearOptions()[0]?.label || 'current year'
          });
        } else if (errorMessage?.includes("have no curriculum assigned")) {
          const batchMatch = errorMessage.match(/assigned: (.+?)\./);
          const batchNames = batchMatch ? batchMatch[1] : "some batches";
          
          showWorkflowGuidance('curriculum_assignment_required', { batchNames });
        } else if (errorMessage?.includes("validation") || errorMessage?.includes("prerequisite")) {
          notifications.show({
            title: "📋 Validation Error",
            message: errorMessage,
            color: "red",
            autoClose: 8000,
            style: {
              backgroundColor: '#f8d7da',
              borderColor: '#f5c6cb',
              color: '#721c24',
            },
          });
        } else {
          notifications.show({
            title: " Upload Error",
            message: errorMessage || "Failed to process Excel file. Please check the format and try again.",
            color: "red",
            autoClose: 6000,
            style: {
              backgroundColor: '#f8d7da',
              borderColor: '#f5c6cb',
              color: '#721c24',
            },
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Function to apply case conversion rules
  const applyCaseConversion = (student) => {
    const convertedStudent = { ...student };
    const emailFields = [
      "email",
      "instituteEmail",
      "personalEmail",
      "personal_email",
      "institute_email",
    ];
    const fieldsToConvert = [
      "name",
      "fname",
      "mname",
      "father_name",
      "mother_name",
      "address",
      "state",
      "fatherOccupation",
      "father_occupation",
      "motherOccupation",
      "mother_occupation",
      "rollNumber",
      "roll_number",
    ];

    Object.keys(convertedStudent).forEach((key) => {
      const value = convertedStudent[key];

      if (typeof value === "string" && value.trim() !== "") {
        if (emailFields.includes(key)) {
          convertedStudent[key] = value.toLowerCase().trim();
          if (key === "instituteEmail" || key === "email") {
          }
        } else if (fieldsToConvert.includes(key)) {
          convertedStudent[key] = value.toUpperCase().trim();
          if (key === "name" || key === "rollNumber") {
          }
        } else {
          convertedStudent[key] = value.trim();
        }
      }
    });

    return convertedStudent;
  };

  // Export utility functions
  const getExportableFields = () => {
    const organizedFieldOrder = [
      // Basic Information
      'jeeAppNo',
      'rollNumber', 
      'name',
      'fname',
      'mname',
      
      // Demographics
      'gender',
      'category',
      'allottedCategory',
      'allottedGender',
      'minority',
      'dob',
      
      // PWD Information (grouped)
      'pwd',
      'pwdCategory',
      'pwdCategoryRemarks', // Remarks immediately after main field
      
      // Blood Group Information (grouped)
      'bloodGroup',
      'bloodGroupRemarks', // Remarks immediately after main field
      
      // Academic Information
      'branch',
      'specialization',
      'jeeRank',
      'categoryRank',
      
      // Admission Information (grouped)
      'admissionMode',
      'admissionModeRemarks', // Remarks immediately after main field
      
      // Contact Information
      'phoneNumber',
      'instituteEmail',
      'alternateEmail',
      'parentEmail',
      
      // Family Information
      'fatherOccupation',
      'fatherMobile',
      'motherOccupation',
      'motherMobile',
      
      // Financial Information (grouped)
      'incomeGroup',
      'income',
      
      // Location Information
      'country',
      'nationality',
      'state',
      'address',
      'reportedStatus',
    ];
    
    // Return fields in the organized order, filtering out non-existent fields
    return organizedFieldOrder
      .filter((key) => STUDENT_FIELDS_CONFIG[key] && !STUDENT_FIELDS_CONFIG[key].systemGenerated)
      .map((key) => ({
        key,
        label: STUDENT_FIELDS_CONFIG[key].label,
        type: STUDENT_FIELDS_CONFIG[key].type,
        systemField: STUDENT_FIELDS_CONFIG[key].systemField,
      }));
  };

  const initializeSelectedFields = () => {
    const fields = {};
    getExportableFields().forEach((field) => {
      fields[field.key] = !STUDENT_FIELDS_CONFIG[field.key].systemGenerated;
    });
    setSelectedFields(fields);
  };

  const handleSelectAllFields = (checked) => {
    const newSelectedFields = {};
    getExportableFields().forEach((field) => {
      newSelectedFields[field.key] = checked;
    });
    setSelectedFields(newSelectedFields);
    setSelectAllFields(checked);
  };

  const handleToggleAllFields = (event) => {
    const checked = event.currentTarget.checked;
    handleSelectAllFields(checked);
  };

  const handleFieldChange = (fieldKey, checked) => {
    const newSelectedFields = {
      ...selectedFields,
      [fieldKey]: checked,
    };
    setSelectedFields(newSelectedFields);

    const allFields = getExportableFields();
    const allSelected = allFields.every(
      (field) => newSelectedFields[field.key],
    );
    const noneSelected = allFields.every(
      (field) => !newSelectedFields[field.key],
    );

    if (allSelected) {
      setSelectAllFields(true);
    } else if (noneSelected) {
      setSelectAllFields(false);
    } else {
      setSelectAllFields(false);
    }
  };

  const prepareExportData = (students, selectedFieldKeys) => {
    const organizedFieldOrder = [
      'jeeAppNo',
      'rollNumber', 
      'name',
      'fname',
      'mname',
      'gender',
      'category',
      'allottedCategory',
      'allottedGender',
      'minority',
      'dob',
      'pwd',
      'pwdCategory',
      'pwdCategoryRemarks', // Grouped with pwdCategory
      'bloodGroup',
      'bloodGroupRemarks', // Grouped with bloodGroup
      'branch',
      'jeeRank',
      'categoryRank',
      'admissionMode',
      'admissionModeRemarks', // Grouped with admissionMode
      'phoneNumber',
      'instituteEmail',
      'alternateEmail',
      'parentEmail',
      'fatherOccupation',
      'fatherMobile',
      'motherOccupation',
      'motherMobile',
      'incomeGroup',
      'income',
      'country',
      'nationality',
      'state',
      'address',
      'reportedStatus',
    ];

    // Sort selected fields according to organized order
    const sortedFieldKeys = [
      ...organizedFieldOrder.filter((field) => selectedFieldKeys.includes(field)),
      ...selectedFieldKeys.filter((field) => !organizedFieldOrder.includes(field)),
    ];

    return students.map((student, index) => {
      const exportRow = {};

      exportRow["S.No"] = index + 1;

      sortedFieldKeys.forEach((fieldKey) => {
        const fieldConfig = STUDENT_FIELDS_CONFIG[fieldKey];
        let value = "";

        if (fieldKey === "fname") {
          value =
            student.fname ||
            student.father_name ||
            student["Father Name"] ||
            student["Father's Name"] ||
            student.fatherName ||
            student["father name"] ||
            student["father's name"] ||
            "";
        } else if (fieldKey === "mname") {
          value =
            student.mname ||
            student.mother_name ||
            student["Mother Name"] ||
            student["Mother's Name"] ||
            student.motherName ||
            student["mother name"] ||
            student["mother's name"] ||
            "";
        } else if (fieldKey === "email") {
          value =
            student.email ||
            student.personal_email ||
            student.personalEmail ||
            student["personal email"] ||
            student["Alternate Email ID"] ||
            student["Alternate email id"] ||
            student["alternate email"] ||
            student["email id"] ||
            "";
        } else if (fieldKey === "dob") {
          value =
            student.dob ||
            student.date_of_birth ||
            student.dateOfBirth ||
            student["Date of Birth"] ||
            student["date of birth"] ||
            student["birth date"] ||
            "";
        } else if (fieldKey === "jeeRank") {
          value =
            student.jeeRank ||
            student.ai_rank ||
            student.aiRank ||
            student["AI Rank"] ||
            student["ai rank"] ||
            student["AI rank"] ||
            student["jee rank"] ||
            student["jee main rank"] ||
            student.rank ||
            "";
        } else if (fieldKey === "rollNumber") {
          value =
            student.rollNumber ||
            student.roll_number ||
            student.rollno ||
            student["Institute Roll Number"] ||
            student["institute roll number"] ||
            student["Roll Number"] ||
            student["roll number"] ||
            "";
        } else if (fieldKey === "instituteEmail") {
          value =
            student.instituteEmail ||
            student.institute_email ||
            student["Institute Email ID"] ||
            student["institute email id"] ||
            student["institute email"] ||
            student["official email"] ||
            "";
        } else if (fieldKey === "reportedStatus") {
          // Handle reported status with proper labels
          const statusValue = student.reportedStatus || student.reported_status || "NOT_REPORTED";
          const statusLabels = {
            "NOT_REPORTED": "Not Reported",
            "REPORTED": "Reported", 
            "WITHDRAWAL": "Withdrawal"
          };
          value = statusLabels[statusValue] || statusValue;
        } else {
          value = student[fieldKey] || "";

          if (!value && fieldConfig.excelColumns) {
            for (const excelCol of fieldConfig.excelColumns) {
              if (student[excelCol]) {
                value = student[excelCol];
                break;
              }
              const exactMatch = Object.keys(student).find(
                (key) => key.toLowerCase() === excelCol.toLowerCase(),
              );
              if (exactMatch && student[exactMatch]) {
                value = student[exactMatch];
                break;
              }
            }
          }

          if (!value) {
            const variations = [
              fieldKey.toLowerCase(),
              fieldKey.replace(/([A-Z])/g, "_$1").toLowerCase(),
              fieldKey.replace(/([A-Z])/g, " $1").toLowerCase(),
              fieldConfig.label?.toLowerCase(),
            ];

            for (const variation of variations) {
              const exactMatch = Object.keys(student).find(
                (key) => key.toLowerCase() === variation,
              );
              if (exactMatch && student[exactMatch]) {
                value = student[exactMatch];
                break;
              }
            }
          }
        }

        if (typeof value === "string" && value.trim() !== "") {
          const emailFields = ["email", "instituteEmail", "personalEmail"];
          if (emailFields.includes(fieldKey)) {
            value = value.toLowerCase();
          } else if (
            [
              "name",
              "fname",
              "mname",
              "address",
              "state",
              "fatherOccupation",
              "motherOccupation",
              "rollNumber",
            ].includes(fieldKey)
          ) {
            value = value.toUpperCase();
          }
        }

        exportRow[fieldConfig.label] = value || "";

        if (
          !value &&
          ["fname", "mname", "name", "jeeRank"].includes(fieldKey)
        ) {
        }
      });

      return exportRow;
    });
  };

  const exportToExcel = (data, filename) => {
    const wb = XLSX.utils.book_new();

    if (data.length > 0) {
      const firstRow = data[0];
      const orderedKeys = [];

      if (firstRow["S.No"] !== undefined) {
        orderedKeys.push("S.No");
      }

      const priorityLabels = [
        "Institute Roll Number",
        "JEE App. No.",
        "Full Name",
        "Institute Email ID",
      ];
      priorityLabels.forEach((label) => {
        if (firstRow[label] !== undefined && !orderedKeys.includes(label)) {
          orderedKeys.push(label);
        }
      });

      Object.keys(firstRow).forEach((key) => {
        if (!orderedKeys.includes(key)) {
          orderedKeys.push(key);
        }
      });

      const orderedData = data.map((row) => {
        const orderedRow = {};
        orderedKeys.forEach((key) => {
          orderedRow[key] = row[key] || "";
        });
        return orderedRow;
      });

      const ws = XLSX.utils.json_to_sheet(orderedData, { header: orderedKeys });

      const colWidths = orderedKeys.map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Students");
    } else {
      const ws = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, "Students");
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      const blob = new Blob(["No data to export"], {
        type: "text/csv;charset=utf-8;",
      });
      saveAs(blob, `${filename}.csv`);
      return;
    }

    const firstRow = data[0];
    const orderedKeys = [];

    if (firstRow["S.No"] !== undefined) {
      orderedKeys.push("S.No");
    }

    const priorityLabels = [
      "Institute Roll Number",
      "JEE App. No.",
      "Full Name",
      "Institute Email ID",
    ];
    priorityLabels.forEach((label) => {
      if (firstRow[label] !== undefined && !orderedKeys.includes(label)) {
        orderedKeys.push(label);
      }
    });

    Object.keys(firstRow).forEach((key) => {
      if (!orderedKeys.includes(key)) {
        orderedKeys.push(key);
      }
    });

    const csvContent = [
      orderedKeys.join(","),
      ...data.map((row) =>
        orderedKeys
          .map((header) => {
            const value = row[header] || "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${filename}.csv`);
  };

  const handleStudentExport = async () => {
    const selectedFieldKeys = Object.keys(selectedFields).filter(
      (key) => selectedFields[key],
    );

    if (selectedFieldKeys.length === 0) {
      notifications.show({
        title: "No Fields Selected",
        message: "Please select at least one field to export.",
        color: "orange",
      });
      return;
    }

    setIsExporting(true);

    try {
      const filteredStudents = getFilteredStudents();
      const exportData = prepareExportData(filteredStudents, selectedFieldKeys);

      const filename = `${selectedBatch?.programme || "Students"}_${selectedBatch?.discipline || "Export"}_${new Date().toISOString().split("T")[0]}`;

      switch (exportFormat) {
        case "excel":
          exportToExcel(exportData, filename);
          break;
        case "csv":
          exportToCSV(exportData, filename);
          break;
        default:
          throw new Error("Invalid export format");
      }

      notifications.show({
        title: "Export Successful",
        message: `Data exported successfully as ${exportFormat.toUpperCase()}`,
        color: "green",
      });

      setShowExportModal(false);
    } catch (error) {
      notifications.show({
        title: "Export Failed",
        message: "Failed to export data. Please try again.",
        color: "red",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Filter students based on search query
  const getFilteredStudents = () => {
    if (!studentSearchQuery.trim()) {
      return studentList;
    }

    const query = studentSearchQuery.toLowerCase();
    return studentList.filter((student) => {
      return Object.values(student).some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  };

  const transformDataForDatabase = (studentList) => {
    return studentList.map((student) => {
      const transformedStudent = {};

      Object.keys(STUDENT_FIELDS_CONFIG).forEach((fieldKey) => {
        const fieldInfo = STUDENT_FIELDS_CONFIG[fieldKey];

        let fieldValue = student[fieldKey];

        if (!fieldValue && fieldInfo.backendField) {
          fieldValue = student[fieldInfo.backendField];
        }

        if (!fieldValue && fieldInfo.excelColumns) {
          for (const excelCol of fieldInfo.excelColumns) {
            if (student[excelCol]) {
              fieldValue = student[excelCol];
              break;
            }
            const exactMatch = Object.keys(student).find(
              (key) => key.toLowerCase() === excelCol.toLowerCase(),
            );
            if (exactMatch && student[exactMatch]) {
              fieldValue = student[exactMatch];
              break;
            }
          }
        }

        if (!fieldValue) {
          const variations = [
            fieldKey.toLowerCase(),
            fieldKey.replace(/([A-Z])/g, "_$1").toLowerCase(),
            fieldKey.replace(/([A-Z])/g, " $1").toLowerCase(),
            fieldInfo.label?.toLowerCase(),
          ];

          for (const variation of variations) {
            if (student[variation]) {
              fieldValue = student[variation];
              break;
            }
          }
        }

        // Extract specialization from batch name if not found in student data
        if (fieldKey === "specialization" && (!fieldValue || fieldValue === "")) {
          const studentBranch = student.branch || student.discipline || student.Discipline || "";
          const studentYear = student.year || student.Year || "";

          if (studentBranch && (studentBranch.includes("M.Tech") || studentBranch.includes("M.Des"))) {
            const extractedSpec = extractSpecializationFromBatchName(`${studentBranch} ${studentYear}`);
            if (extractedSpec) {
              fieldValue = extractedSpec;
            } else {
              if (studentBranch.includes("Design") || studentBranch === "Design") {
                fieldValue = "Design";
              } else if (studentBranch.includes("Mechatronics") || studentBranch === "Mechatronics") {
                fieldValue = "Mechatronics";
              }
            }
          } else if (studentBranch && !studentBranch.includes("B.Tech") && !studentBranch.includes("B.Des")) {
            if (studentBranch.includes("Design") || studentBranch === "Design") {
              fieldValue = "Design";
            } else if (studentBranch.includes("Mechatronics") || studentBranch === "Mechatronics") {
              fieldValue = "Mechatronics";
            }
          }
        }

        if (fieldKey === "dob" && fieldValue) {
          fieldValue = typeof fieldValue === 'string' ? fieldValue.split(' ')[0].split('T')[0] : fieldValue;
        }

        // Clean up branch/discipline names by removing extra details in parentheses
        if (fieldKey === "branch" && fieldValue) {
          fieldValue = cleanDisciplineName(fieldValue);
        }

        transformedStudent[fieldKey] = fieldValue || "";
        
        // Also set backend field if configured
        if (fieldInfo.backendField && fieldValue) {
          transformedStudent[fieldInfo.backendField] = fieldValue;
        }
      });

      Object.assign(
        transformedStudent,
        applyCaseConversion(transformedStudent),
      );

      // Handle additional backend field mappings (only for fields not already configured in STUDENT_FIELDS_CONFIG)
      // Most fields are now handled automatically via fieldInfo.backendField in the main loop above

      transformedStudent.id = student.id;
      transformedStudent._validation_error = student._validation_error;

      return transformedStudent;
    });
  };

  const PREVIEW_FIELD_ORDER = [
    'jeeAppNo',          // 1. JEE App No
    'rollNumber',        // 2. Roll Number  
    'name',              // 3. Name
    'gender',            // 4. Gender
    'category',          // 5. Category
    'allottedCategory',  // 6. Allotted Category
    'allottedGender',    // 7. Allotted Gender
    'minority',          // 8. Minority
    'pwd',               // 9. PWD Status
    'pwdCategory',       // 10. PWD Category
    'pwdCategoryRemarks',// 11. PWD Category Remarks
    'branch',            // 12. Branch/Discipline
    'specialization',    // 13. Specialization (PG/PhD only)
    'phoneNumber',       // 14. Mobile Number
    'instituteEmail',    // 15. Institute Email
    'alternateEmail',    // 16. Alternate Email
    'parentEmail',       // 17. Parent Email
    'fname',             // 17. Father Name
    'fatherOccupation',  // 18. Father Occupation
    'fatherMobile',      // 19. Father Mobile
    'mname',             // 20. Mother Name
    'motherOccupation',  // 21. Mother Occupation
    'motherMobile',      // 22. Mother Mobile
    'dob',               // 23. Date of Birth
    'bloodGroup',        // 24. Blood Group
    'bloodGroupRemarks', // 25. Blood Group Remarks
    'country',           // 26. Country
    'nationality',       // 27. Nationality
    'state',             // 28. State
    'address',           // 29. Address
    'admissionMode',     // 30. Admission Mode
    'admissionModeRemarks', // 31. Admission Mode Remarks
    'incomeGroup',       // 32. Income Group
    'income',            // 33. Income
    'jeeRank',           // 34. JEE Rank
    'categoryRank',      // 35. Category Rank
  ];

  // Student table column configuration for organized display
  const STUDENT_TABLE_COLUMNS = [
    { key: 'jeeAppNo', label: 'JEE Application', minWidth: '140px', fields: ['jeeAppNo', 'jee_app_no', 'Jee Main Application Number'] },
    { key: 'rollNumber', label: 'Roll Number', minWidth: '120px', fields: ['rollNumber', 'roll_number', 'Institute Roll Number'] },
    { key: 'name', label: 'Name', minWidth: '180px', fields: ['name', 'Name'] },
    { key: 'branch', label: 'Discipline', minWidth: '200px', fields: ['discipline', 'branch', 'Discipline'] },
    { key: 'specialization', label: 'Specialization', minWidth: '180px', fields: ['specialization', 'Specialization'] },
    { key: 'gender', label: 'Gender', minWidth: '80px', fields: ['gender', 'Gender'] },
    { key: 'category', label: 'Category', minWidth: '90px', fields: ['category', 'Category'] },
    { key: 'allottedCategory', label: 'Allotted Cat', minWidth: '100px', fields: ['allottedcat', 'allotted_category', 'Allotted Category'] },
    { key: 'allottedGender', label: 'Allotted Gender', minWidth: '120px', fields: ['allotted_gender', 'Allotted Gender'] },
    { key: 'minority', label: 'Minority', minWidth: '90px', fields: ['minority', 'Minority'] },
    { key: 'pwd', label: 'PwD', minWidth: '60px', fields: ['pwd', 'PWD'] },
    { key: 'pwdCategory', label: 'PwD Category', minWidth: '120px', fields: ['pwdCategory', 'pwd_category', 'PwD Category'] },
    { key: 'pwdCategoryRemarks', label: 'PwD Category Remarks', minWidth: '150px', fields: ['pwdCategoryRemarks', 'pwd_category_remarks', 'PwD Category Remarks'] },
    { key: 'phoneNumber', label: 'Mobile', minWidth: '120px', fields: ['phoneNumber', 'phone_number', 'mobile', 'Mobile No'] },
    { key: 'instituteEmail', label: 'Institute Email', minWidth: '200px', fields: ['instituteEmail', 'institute_email', 'Institute Email ID'] },
    { key: 'alternateEmail', label: 'Alternate Email', minWidth: '200px', fields: ['alternateEmail', 'personal_email', 'Alternate Email ID'] },
    { key: 'parentEmail', label: 'Parent Email', minWidth: '200px', fields: ['parentEmail', 'parent_email', 'Parent Email', "Parent's Email"] },
    { key: 'fname', label: "Father's Name", minWidth: '150px', fields: ['fname', 'father_name', "Father's Name"] },
    { key: 'fatherOccupation', label: "Father's Job", minWidth: '140px', fields: ['fatherOccupation', 'father_occupation', "Father's Occupation"] },
    { key: 'fatherMobile', label: 'Father Mobile', minWidth: '120px', fields: ['fatherMobile', 'father_mobile', 'Father Mobile Number'] },
    { key: 'mname', label: "Mother's Name", minWidth: '150px', fields: ['mname', 'mother_name', "Mother's Name"] },
    { key: 'motherOccupation', label: "Mother's Job", minWidth: '140px', fields: ['motherOccupation', 'mother_occupation', "Mother's Occupation"] },
    { key: 'motherMobile', label: 'Mother Mobile', minWidth: '120px', fields: ['motherMobile', 'mother_mobile', 'Mother Mobile Number'] },
    { key: 'dob', label: 'DOB', minWidth: '100px', fields: ['dob', 'date_of_birth', 'Date of Birth'] },
    { key: 'bloodGroup', label: 'Blood Group', minWidth: '100px', fields: ['bloodGroup', 'blood_group', 'Blood Group'] },
    { key: 'bloodGroupRemarks', label: 'Blood Group Remarks', minWidth: '150px', fields: ['bloodGroupRemarks', 'blood_group_remarks', 'Blood Group Remarks'] },
    { key: 'country', label: 'Country', minWidth: '100px', fields: ['country', 'Country'] },
    { key: 'nationality', label: 'Nationality', minWidth: '100px', fields: ['nationality', 'Nationality'] },
    { key: 'admissionMode', label: 'Admission Mode', minWidth: '150px', fields: ['admissionMode', 'admission_mode', 'Admission Mode'] },
    { key: 'admissionModeRemarks', label: 'Admission Mode Remarks', minWidth: '180px', fields: ['admissionModeRemarks', 'admission_mode_remarks', 'Admission Mode Remarks'] },
    { key: 'incomeGroup', label: 'Income Group', minWidth: '130px', fields: ['incomeGroup', 'income_group', 'Income Group'] },
    { key: 'income', label: 'Income', minWidth: '100px', fields: ['income', 'Income'] },
    { key: 'jeeRank', label: 'AI Rank', minWidth: '80px', fields: ['jeeRank', 'ai_rank', 'jee_rank', 'AI rank'] },
    { key: 'categoryRank', label: 'Category Rank', minWidth: '100px', fields: ['categoryRank', 'category_rank', 'Category Rank'] },
    { key: 'state', label: 'State', minWidth: '80px', fields: ['state', 'State'] },
    { key: 'address', label: 'Address', minWidth: '200px', fields: ['address', 'Address', 'Full Address'] },
  ];

  const getStudentFieldValue = (student, column) => {
    for (const fieldName of column.fields) {
      if (student.hasOwnProperty(fieldName) && student[fieldName] !== undefined && student[fieldName] !== null && student[fieldName] !== '') {
        let value = student[fieldName];
        
        // Clean discipline names
        if (column.key === 'branch') {
          value = cleanDisciplineName(value);
        }
        
        // Format dates
        if (column.key === 'dob' && typeof value === 'string') {
          value = value.split(' ')[0].split('T')[0];
        }
        
        return String(value).trim();
      }
    }
    
    return "-";
  };

  // Enhanced Excel upload with workflow validation
  const validateBatchPrerequisites = async (academicYear) => {
    try {
      const response = await fetch(`${host}/programme_curriculum/api/batches/validate_prerequisites/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ academic_year: academicYear })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return validateBatchPrerequisitesFrontend(academicYear);
      }
      
      const data = await response.json();
      
      if (!data.can_upload_students) {
        const errorMessages = data.missing_batches.slice(0, 5).map(batch => 
          `• ${batch.acronym} - ${batch.discipline}: ${batch.action_required}`
        ).join('\n');
        
        const additionalErrors = data.missing_batches.length > 5 ? 
          `\n... and ${data.missing_batches.length - 5} more missing batches` : '';
        
        notifications.show({
          title: "Batches Required",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Please create required batches first:</strong>
              </Text>
              <Text size="xs" style={{ whiteSpace: 'pre-line', color: '#721c24' }}>
                {errorMessages}{additionalErrors}
              </Text>
            </div>
          ),
          color: "red",
          autoClose: false,
        });
        return false;
      }
      
      return true;
    } catch (error) {
      if (error.message.includes('Unexpected token') || error.message.includes('<!doctype')) {
        return validateBatchPrerequisitesFrontend(academicYear);
      }
      
      return true; 
    }
  };

  const validateBatchPrerequisitesFrontend = () => {
    const currentBatches = getCurrentBatches();
    
    if (!currentBatches || currentBatches.length === 0) {
      notifications.show({
        title: "No Batches Found",
        message: "Please create batches first before uploading students.",
        color: "red",
        autoClose: false,
      });
      return false;
    }

    const currentYear = getCurrentBatchYear();
    const batchesForYear = currentBatches.filter(batch => batch.year === currentYear);
    
    if (batchesForYear.length === 0) {
      notifications.show({
        title: "No Batches for Current Year",
        message: `Please create batches for year ${currentYear} first.`,
        color: "red",
        autoClose: false,
      });
      return false;
    }
    
    return true;
  };

  // Validate Excel data before upload
  const validateExcelData = (data) => {
    const validationErrors = [];
    
    data.forEach((student, index) => {
      const rowNumber = index + 2;
      
      // Transform student data to standardized field names before validation
      const transformedStudent = {};
      Object.keys(STUDENT_FIELDS_CONFIG).forEach((fieldKey) => {
        const fieldInfo = STUDENT_FIELDS_CONFIG[fieldKey];
        let fieldValue = student[fieldKey];

        if (!fieldValue && fieldInfo.backendField) {
          fieldValue = student[fieldInfo.backendField];
        }

        if (!fieldValue && fieldInfo.excelColumns) {
          for (const excelCol of fieldInfo.excelColumns) {
            if (student[excelCol]) {
              fieldValue = student[excelCol];
              break;
            }
            const matchedKey = Object.keys(student).find(
              key => key.toLowerCase() === excelCol.toLowerCase()
            );
            if (matchedKey && student[matchedKey]) {
              fieldValue = student[matchedKey];
              break;
            }
          }
        }
        
        if (fieldValue) {
          transformedStudent[fieldKey] = fieldValue;
        }
      });

      const errors = applyUniversalValidation(transformedStudent, false);
      
      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, error]) => {
          validationErrors.push({
            row: rowNumber,
            student: student.name || student.Name || `Row ${rowNumber}`,
            field: STUDENT_FIELDS_CONFIG[field]?.label || field,
            error: error
          });
        });
      }

      // Validate dropdown values
      const dropdownValidations = {
        admissionMode: STUDENT_FIELDS_CONFIG.admissionMode.options.map(opt => opt.value),
        pwdCategory: STUDENT_FIELDS_CONFIG.pwdCategory.options.map(opt => opt.value), 
        incomeGroup: STUDENT_FIELDS_CONFIG.incomeGroup.options.map(opt => opt.value),
        bloodGroup: STUDENT_FIELDS_CONFIG.bloodGroup.options.map(opt => opt.value),
        allottedGender: STUDENT_FIELDS_CONFIG.allottedGender.options.map(opt => opt.value),
        allottedCategory: STUDENT_FIELDS_CONFIG.allottedCategory.options.map(opt => opt.value),
        gender: STUDENT_FIELDS_CONFIG.gender.options.map(opt => opt.value),
        category: STUDENT_FIELDS_CONFIG.category.options.map(opt => opt.value),
        pwd: STUDENT_FIELDS_CONFIG.pwd.options.map(opt => opt.value),
      };

      Object.entries(dropdownValidations).forEach(([fieldKey, validOptions]) => {
        const value = student[fieldKey];
        if (value && value.trim() !== "" && value !== "-" && !validOptions.includes(value)) {
          validationErrors.push({
            row: rowNumber,
            student: student.name || student.Name || `Row ${rowNumber}`,
            field: STUDENT_FIELDS_CONFIG[fieldKey]?.label || fieldKey,
            error: `Invalid value "${value}". Must be one of: ${validOptions.join(', ')}`
          });
        }
      });

      // Validate phone numbers for duplicates
      const phoneErrors = validatePhoneNumbers(student);
      if (Object.keys(phoneErrors).length > 0) {
        Object.entries(phoneErrors).forEach(([field, error]) => {
          validationErrors.push({
            row: rowNumber,
            student: student.name || student.Name || `Row ${rowNumber}`,
            field: STUDENT_FIELDS_CONFIG[field]?.label || field,
            error: error
          });
        });
      }
    });
    
    return validationErrors;
  };

  const handleExcelUpload = async () => {
    try {
      const dataToUpload = extractedData;

      if (!dataToUpload || dataToUpload.length === 0) {
        notifications.show({
          title: "Error",
          message: "No data to upload. Please process an Excel file first.",
          color: "red",
        });
        return;
      }

      // Validate Excel data before proceeding
      const excelValidationErrors = validateExcelData(dataToUpload);
      
      if (excelValidationErrors.length > 0) {
        const errorMessages = excelValidationErrors.slice(0, 10).map(error => 
          `• Row ${error.row} (${error.student}): ${error.field} - ${error.error}`
        ).join('\n');
        
        const additionalErrors = excelValidationErrors.length > 10 ? 
          `\n... and ${excelValidationErrors.length - 10} more validation errors` : '';
        
        notifications.show({
          title: "Upload Failed - Data Validation Errors",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Please fix the following errors in your Excel file:</strong>
              </Text>
              <Text size="xs" style={{ whiteSpace: 'pre-line', color: '#721c24' }}>
                {errorMessages}{additionalErrors}
              </Text>
            </div>
          ),
          color: "red",
          autoClose: false,
        });
        return;
      }
      const currentAcademicYear = getCurrentBatchYear();
      const canUpload = await validateBatchPrerequisites(currentAcademicYear);
      
      if (!canUpload) {
        return;
      }

      const currentBatches = getCurrentBatches();
      const batchValidationErrors = [];
      const studentBatchMap = new Map();
      
      for (const student of dataToUpload) {
        const studentBranch = student.branch || student.discipline || student.Branch || student.Discipline;
        const studentYear = getCurrentBatchYear(); 

        const matchingBatch = getBatchForBranch(studentBranch, currentBatches);

        let finalMatchingBatch = matchingBatch;
        if (!finalMatchingBatch) {
          finalMatchingBatch = currentBatches.find(batch => {
            const batchBranch = batch.discipline || batch.branch;
            return (
              batchBranch === studentBranch &&
              batch.year === studentYear
            );
          });
        }

        if (finalMatchingBatch && finalMatchingBatch.year !== studentYear) {
          finalMatchingBatch = null;
        }
        
        if (!finalMatchingBatch) {
          batchValidationErrors.push({
            student: student.name || student.Name || 'Unknown',
            branch: studentBranch,
            year: studentYear,
            message: `No existing batch found for ${studentBranch} ${studentYear}`
          });
        } else {
          const studentsForThisBatch = studentBatchMap.get(finalMatchingBatch.id) || [];
          studentsForThisBatch.push(student);
          studentBatchMap.set(finalMatchingBatch.id, studentsForThisBatch);
          
          const totalStudentsForBatch = (finalMatchingBatch.filledSeats || 0) + studentsForThisBatch.length;
          if (totalStudentsForBatch > finalMatchingBatch.totalSeats) {
            batchValidationErrors.push({
              student: student.name || student.Name || 'Unknown',
              branch: studentBranch,
              year: studentYear,
              message: `Batch ${studentBranch} ${studentYear} will exceed capacity (${totalStudentsForBatch}/${finalMatchingBatch.totalSeats})`
            });
          }
        }
      }

      if (batchValidationErrors.length > 0) {
        const errorMessages = batchValidationErrors.slice(0, 5).map(error => 
          `• ${error.student}: ${error.message}`
        ).join('\n');
        
        const additionalErrors = batchValidationErrors.length > 5 ? 
          `\n... and ${batchValidationErrors.length - 5} more errors` : '';
        
        notifications.show({
          title: "Upload Failed - Batch Validation Errors",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Cannot upload students. Please create required batches first:</strong>
              </Text>
              <Text size="xs" style={{ whiteSpace: 'pre-line', color: '#721c24' }}>
                {errorMessages}{additionalErrors}
              </Text>
            </div>
          ),
          color: "red",
          autoClose: false,
        });
        return;
      }

      const transformedData = transformDataForDatabase(dataToUpload);
      const response = await saveStudentsBatch(transformedData, activeSection);

      if (response.success) {
        const uploadCount =
          response.data.successful_uploads || response.data.saved_count || 0;

        notifications.show({
          title: "✅ Upload Successful",
          message: `${uploadCount} students uploaded to existing batches successfully!`,
          color: "green",
        });

        setShowAddModal(false);
        setAddMode(null);
        setUploadedFile(null);
        setExtractedData([]);
        setProcessedBatchData(null);
        setAllocationSummary(null);
        setShowBatchPreview(false);
        setShowPreview(false);

        setTimeout(() => {
          forceRefreshData();
        }, 500);
      } else {
        if (response.error_code === 'BATCH_NOT_FOUND') {
          notifications.show({
            title: "Batch Required",
            message: response.required_action || response.message,
            color: "red",
            autoClose: false,
          });
        } else if (response.error_code === 'BATCH_MATCHING_ERROR') {
          notifications.show({
            title: "Configuration Error",
            message: response.message,
            color: "red",
            autoClose: false,
          });
        } else {
          throw new Error(response.message || "Failed to upload students");
        }
      }
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || error.message;

      if (errorMessage?.includes("No working curriculums found")) {
        showWorkflowGuidance('curriculum_required');
      } else if (errorMessage?.includes("No active batches found")) {
        showWorkflowGuidance('batches_required', { 
          academicYear: getViewAcademicYearOptions()[0]?.label || 'current year'
        });
      } else if (errorMessage?.includes("have no curriculum assigned")) {
        const batchMatch = errorMessage.match(/assigned: (.+?)\./);
        const batchNames = batchMatch ? batchMatch[1] : "some batches";
        
        showWorkflowGuidance('curriculum_assignment_required', { batchNames });
      } else if (errorMessage?.includes("validation") || errorMessage?.includes("prerequisite")) {
        notifications.show({
          title: "📋 Validation Error",
          message: errorMessage,
          color: "red",
          autoClose: 8000,
          style: {
            backgroundColor: '#f8d7da',
            borderColor: '#f5c6cb',
            color: '#721c24',
          },
        });
      } else {
        const { title, message } = parseDuplicateError(error, "upload students");

        notifications.show({
          title,
          message,
          color: "red",
          autoClose: 8000,
        });
      }
    }
  };

  // Manual form navigation and submission
  const nextStep = async () => {
    if (currentStep < 3) {
      setErrors({});
      setCurrentStep(currentStep + 1);
    } else {
      try {
        const finalErrors = validateRequiredFields(
          manualFormData,
          !!editingStudent,
        );
        
        if (Object.keys(finalErrors).length > 0) {
          console.log("Validation failed. Errors:", finalErrors);
          console.log("Form data:", manualFormData);
          console.log("Active section:", activeSection);
          
          setErrors(finalErrors);
          const phoneErrors = Object.values(finalErrors).filter(error => 
            error.includes("mobile number cannot be the same") || 
            error.includes("phone number cannot be the same")
          );
          
          if (phoneErrors.length > 0) {
            notifications.show({
              title: "Duplicate Phone Number",
              message: phoneErrors[0],
              color: "red",
            });
          } else {
            const missingFields = Object.entries(finalErrors)
              .map(([field, error]) => `• ${STUDENT_FIELDS_CONFIG[field]?.label || field}: ${error}`)
              .join('\n');
            
            notifications.show({
              title: "Validation Error",
              message: (
                <div>
                  <Text size="sm" mb={8}>Please fill the following required fields:</Text>
                  <Text size="xs" style={{ whiteSpace: 'pre-line', color: '#721c24' }}>
                    {missingFields}
                  </Text>
                </div>
              ),
              color: "red",
              autoClose: 8000,
            });
          }
          return;
        }

        const transformedData = transformDataForDatabase([manualFormData]);

        if (!editingStudent) {
          const studentYear = selectedBatchYear;
          const canUpload = await validateBatchPrerequisites(studentYear);
          
          if (!canUpload) {
            return;
          }

          let allBatches;
          if (activeSection === "ug") allBatches = ugBatches || [];
          else if (activeSection === "pg") allBatches = pgBatches || [];
          else allBatches = phdBatches || [];

          const batchesForYear = allBatches.filter(batch => batch.year === studentYear);
          const studentBranch = manualFormData.branch;

          const matchingBatch = getBatchForBranch(studentBranch, batchesForYear);
          
          if (!matchingBatch) {
            const academicYearStr = batchYearToAcademicYear(studentYear);
            const availableBranches = batchesForYear.map(b => b.discipline || b.branch).filter(Boolean);
            
            notifications.show({
              title: "Cannot Add Student",
              message: (
                <div>
                  <Text size="sm" mb={8}>
                    <strong>No matching batch found.</strong>
                  </Text>
                  <Text size="xs" style={{ color: '#721c24' }}>
                    Looking for: {studentBranch} {studentYear} (Academic Year: {academicYearStr})
                  </Text>
                  <Text size="xs" style={{ color: '#856404', marginTop: '8px' }}>
                    Available: {availableBranches.length > 0 ? availableBranches.join(', ') : 'None for this year'}
                  </Text>
                </div>
              ),
              color: "red",
              autoClose: false,
            });
            return;
          }

          const totalStudentsForBatch = (matchingBatch.filledSeats || 0) + 1;
          if (totalStudentsForBatch > matchingBatch.totalSeats) {
            notifications.show({
              title: "Batch Full",
              message: `Batch ${studentBranch} ${studentYear} is full (${matchingBatch.filledSeats}/${matchingBatch.totalSeats} seats)`,
              color: "red",
              autoClose: 5000,
            });
            return;
          }
        }

        if (editingStudent) {
          const oldBranch = editingStudent.branch || editingStudent.Branch || editingStudent.discipline || editingStudent.Discipline;
          const newBranch = manualFormData.branch;
          const branchChanged = oldBranch && newBranch && oldBranch.toLowerCase().trim() !== newBranch.toLowerCase().trim();
          const updateData = { ...transformedData[0] };

          let targetBatch = null;
          if (branchChanged) {
            const currentBatches = activeSection === 'ug' ? ugBatches : 
                                 activeSection === 'pg' ? pgBatches : phdBatches;
            targetBatch = getBatchForBranch(newBranch, currentBatches);
            
            if (!targetBatch) {
              notifications.show({
                title: "Branch Transfer Warning",
                message: `No batch found for branch "${newBranch}". Student will be updated but may need manual batch assignment.`,
                color: "yellow",
                autoClose: 7000,
              });
            }
          }

          const response = await updateStudent(
            editingStudent.id || editingStudent.student_id,
            updateData,
          );

          if (response.success) {
            let successMessage = "Student updated successfully!";

            if (branchChanged && targetBatch) {
              await syncWithFusionBatchChange(updateData, selectedBatch, targetBatch, oldBranch, newBranch);
              successMessage = `Student successfully transferred from ${oldBranch} to ${newBranch}. Academic batch assignment and seat allocation updated automatically.`;
            } else if (branchChanged) {
              await syncBranchChangeWithFusion(updateData, oldBranch, newBranch);
              successMessage += ` Discipline updated to "${newBranch}". Academic batch assignment updated automatically.`;
            }
            
            notifications.show({
              title: branchChanged ? "Discipline Change Completed" : "Update Successful",
              message: successMessage,
              color: "green",
              autoClose: branchChanged ? 10000 : 4000,
            });

            setStudentList((prev) =>
              prev.map((student) => {
                if (
                  (student.id || student.student_id) ===
                  (editingStudent.id || editingStudent.student_id)
                ) {
                  const updatedStudent = { ...student, ...updateData };
                  setEditingStudent(updatedStudent);
                  return updatedStudent;
                }
                return student;
              }),
            );

            setShowAddModal(false);
            setEditingStudent(null);
            setCurrentStep(0);
            setManualFormData(INITIAL_FORM_DATA);
            setErrors({});

            setShowStudentModal(false);
            setSelectedBatch(null);

            forceRefreshData();
          } else {
            throw new Error(response.message || "Failed to update student");
          }
        } else {
          const response = await addSingleStudent(
            transformedData[0],
            activeSection,
          );

          if (response.success) {
            notifications.show({
              title: "Success",
              message: `Student added successfully! Roll Number: ${response.data.roll_number}, Institute Email: ${response.data.institute_email}`,
              color: "green",
            });

            setShowAddModal(false);
            setAddMode(null);
            setCurrentStep(0);
            setManualFormData(INITIAL_FORM_DATA);
            setErrors({});

            forceRefreshData();
          } else {
            if (response.error_code === 'BATCH_NOT_FOUND') {
              notifications.show({
                title: "Batch Required",
                message: response.required_action || response.message,
                color: "red",
                autoClose: false,
              });
            } else if (response.error_code === 'BATCH_MATCHING_ERROR') {
              notifications.show({
                title: "Configuration Error", 
                message: response.message,
                color: "red",
                autoClose: false,
              });
            } else {
              throw new Error(response.message || "Failed to add student");
            }
          }
        }
      } catch (error) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.message || errorData?.error || error.message;

        if (errorMessage?.includes("No working curriculums found")) {
          showWorkflowGuidance('curriculum_required');
        } else if (errorMessage?.includes("No active batches found")) {
          showWorkflowGuidance('batches_required', { 
            academicYear: getViewAcademicYearOptions()[0]?.label || 'current year'
          });
        } else if (errorMessage?.includes("have no curriculum assigned")) {
          const batchMatch = errorMessage.match(/assigned: (.+?)\./);
          const batchNames = batchMatch ? batchMatch[1] : "some batches";
          
          showWorkflowGuidance('curriculum_assignment_required', { batchNames });
        } else if (errorMessage?.includes("validation") || errorMessage?.includes("prerequisite")) {
          notifications.show({
            title: "📋 Validation Error",
            message: errorMessage,
            color: "red",
            autoClose: 8000,
            style: {
              backgroundColor: '#f8d7da',
              borderColor: '#f5c6cb',
              color: '#721c24',
            },
          });
        } else {
          const operationType = editingStudent ? "update student" : "add student";
          const { title, message } = parseDuplicateError(error, operationType);

          notifications.show({
            title,
            message,
            color: "red",
            autoClose: 8000,
          });
        }
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setErrors({}); 
      setCurrentStep(currentStep - 1);
    }
  };


  // ==================== CRUD OPERATIONS ====================

  // CREATE - Add new batch
  const handleAddBatch = async () => {
    try {
      if (
        !newBatchData.programme ||
        !newBatchData.discipline ||
        !newBatchData.totalSeats
      ) {
        notifications.show({
          title: "Validation Error",
          message: "Please fill all required fields",
          color: "red",
        });
        return;
      }

      const batchToAdd = {
        ...newBatchData,
        id: Date.now(),
        year: parseInt(newBatchData.year, 10),
        totalSeats: parseInt(newBatchData.totalSeats, 10),
        filledSeats: 0,
        availableSeats: parseInt(newBatchData.totalSeats, 10),
        programme_type: activeSection,
      };

      const updateBatches = (batches) => [...batches, batchToAdd];
      if (activeSection === "ug") setUgBatches(updateBatches);
      else if (activeSection === "pg") setPgBatches(updateBatches);
      else setPhdBatches(updateBatches);

      setShowAddBatchModal(false);
      setNewBatchData({
        programme: "",
        discipline: "",
        year: selectedBatchYear,
        totalSeats: 60,
      });

      try {
        const result = await createBatch(batchToAdd);

        if (result.success) {
          notifications.show({
            title: "Success",
            message: "New batch created successfully",
            color: "green",
          });

          forceRefreshData();
        } else {
          throw new Error(result.message || "Failed to create batch");
        }
      } catch (error) {
        const rollbackBatches = (batches) => batches.filter(b => b.id !== batchToAdd.id);
        if (activeSection === "ug") setUgBatches(rollbackBatches);
        else if (activeSection === "pg") setPgBatches(rollbackBatches);
        else setPhdBatches(rollbackBatches);

        notifications.show({
          title: "Error",
          message: error.message || "Failed to create batch",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to create batch",
        color: "red",
      });
    }
  };

  // DELETE - Execute delete
  const handleDeleteBatch = async () => {
    const batchToDelete = getCurrentBatches().find(b => b.id === deletingBatchId);
    
    try {
      const updateBatches = (batches) => batches.filter(b => b.id !== deletingBatchId);
      if (activeSection === "ug") setUgBatches(updateBatches);
      else if (activeSection === "pg") setPgBatches(updateBatches);
      else setPhdBatches(updateBatches);
      setShowDeleteConfirm(false);
      setDeletingBatchId(null);

      const result = await deleteBatch(deletingBatchId);

      if (result.success) {
        notifications.show({
          title: "✅ Batch Deleted Successfully",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>{result.message || "Batch deleted successfully"}</strong>
              </Text>
              {result.deleted_batch && (
                <Text size="xs" color="gray.7">
                  Deleted: {result.deleted_batch.name} ({result.deleted_batch.discipline_acronym || result.deleted_batch.discipline}) - {result.deleted_batch.year}
                </Text>
              )}
            </div>
          ),
          color: "green",
          autoClose: 6000,
          style: {
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            color: '#155724',
          },
        });
        forceRefreshData();
      } else {
        throw new Error(result.message || "Failed to delete batch");
      }
    } catch (error) {
      if (batchToDelete) {
        const rollbackBatches = (batches) => [...batches, batchToDelete];
        if (activeSection === "ug") setUgBatches(rollbackBatches);
        else if (activeSection === "pg") setPgBatches(rollbackBatches);
        else setPhdBatches(rollbackBatches);
      }

      notifications.show({
        title: "Error",
        message: error.message || "Failed to delete batch",
        color: "red",
      });
      setShowDeleteConfirm(false);
      setDeletingBatchId(null);
    }
  };

  // Helper function to get programme options based on active section
  const getProgrammeOptions = () => {
    if (activeSection === "ug") {
      return [
        { value: "B.Tech", label: "B.Tech" },
        { value: "B.Des", label: "B.Des" },
      ];
    } else if (activeSection === "pg") {
      return [
        { value: "M.Tech AI & ML", label: "M.Tech AI & ML" },
        { value: "M.Tech Data Science", label: "M.Tech Data Science" },
        { value: "M.Tech Communication and Signal Processing", label: "M.Tech Communication and Signal Processing" },
        { value: "M.Tech Nanoelectronics and VLSI Design", label: "M.Tech Nanoelectronics and VLSI Design" },
        { value: "M.Tech Power & Control", label: "M.Tech Power & Control" },
        { value: "M.Tech Design", label: "M.Tech Design" },
        { value: "M.Tech CAD/CAM", label: "M.Tech CAD/CAM" },
        { value: "M.Tech Manufacturing and Automation", label: "M.Tech Manufacturing and Automation" },
        { value: "M.Des", label: "M.Des" },
      ];
    } else {
      return [{ value: "PhD", label: "PhD" }];
    }
  };

  // Helper function to get discipline options based on programme
  const getDisciplineOptions = (programme) => {
    if (programme === "B.Tech") {
      return [
        {
          value: "Computer Science and Engineering",
          label: "Computer Science and Engineering",
        },
        {
          value: "Electronics and Communication Engineering",
          label: "Electronics and Communication Engineering",
        },
        { value: "Mechanical Engineering", label: "Mechanical Engineering" },
        { value: "Smart Manufacturing", label: "Smart Manufacturing" },
      ];
    } else if (programme && programme.startsWith("M.Tech")) {
      if (programme.includes("AI & ML")) {
        return [{ value: "Computer Science and Engineering", label: "Computer Science and Engineering" }];
      } else if (programme.includes("Data Science")) {
        return [{ value: "Computer Science and Engineering", label: "Computer Science and Engineering" }];
      } else if (programme.includes("Communication and Signal Processing")) {
        return [{ value: "Electronics and Communication Engineering", label: "Electronics and Communication Engineering" }];
      } else if (programme.includes("Nanoelectronics and VLSI Design")) {
        return [{ value: "Electronics and Communication Engineering", label: "Electronics and Communication Engineering" }];
      } else if (programme.includes("Power & Control")) {
        return [{ value: "Electronics and Communication Engineering", label: "Electronics and Communication Engineering" }];
      } else if (programme.includes("Design")) {
        return [{ value: "Design", label: "Design" }];
      } else if (programme.includes("CAD/CAM")) {
        return [{ value: "Mechanical Engineering", label: "Mechanical Engineering" }];
      } else if (programme.includes("Manufacturing and Automation")) {
        return [{ value: "Mechanical Engineering", label: "Mechanical Engineering" }];
      }
      return [
        {
          value: "Computer Science and Engineering",
          label: "Computer Science and Engineering",
        },
        {
          value: "Electronics and Communication Engineering",
          label: "Electronics and Communication Engineering",
        },
        { value: "Mechanical Engineering", label: "Mechanical Engineering" },
        { value: "Smart Manufacturing", label: "Smart Manufacturing" },
      ];
    } else if (programme === "B.Des" || programme === "M.Des") {
      return [{ value: "Design", label: "Design" }];
    } else if (programme === "PhD") {
      return [
        {
          value: "Computer Science and Engineering",
          label: "Computer Science and Engineering",
        },
        {
          value: "Electronics and Communication Engineering",
          label: "Electronics and Communication Engineering",
        },
        { value: "Mechanical Engineering", label: "Mechanical Engineering" },
        { value: "Smart Manufacturing", label: "Smart Manufacturing" },
        { value: "Design", label: "Design" },
      ];
    }
    return [];
  };

  // ==================== END CRUD OPERATIONS ====================

  // Generate Excel template with all unified fields
  const generateExcelTemplate = () => {
    const headers = [
      "Sno",
      "JEE App. No. / CCMT Roll No.",
      "Institute Roll Number",
      "Name",
      "Discipline",
      "Specialization",
      "Gender",
      "Category",
      "Minority",
      "PwD",
      "PwD Category",
      "PwD Category Remarks",
      "MobileNo",
      "Institute Email ID",
      "Alternate Email ID",
      "Parent Email",
      "Father's Name",
      "Father's Occupation",
      "Father Mobile Number",
      "Mother's Name",
      "Mother's Occupation",
      "Mother Mobile Number",
      "Date of Birth",
      "Blood Group",
      "Blood Group Remarks",
      "Country",
      "Nationality",
      "Admission Mode",
      "Admission Mode Remarks",
      "Income Group",
      "Income",
      "AI rank",
      "Category Rank",
      "allottedcat",
      "Allotted Gender",
      "State",
      "Full Address",
    ];

    const sampleData = [
      [
        1,
        "240310030189",
        "25BCS001",
        "PALLAVI ARAS",
        "Computer Science and Engineering (4 Years, Bachelor of Technology)",
        "",
        "Female",
        "General",
        "JAIN",
        "NO",
        "", // PwD Category - empty since PwD is NO
        "", // PwD Category Remarks - empty since PwD is NO
        "9229109424",
        "25bcs001@iiitdmj.ac.in",
        "ARAS15@GMAIL.COM",
        "parent.aras@gmail.com",
        "SACHIN ARAS",
        "Business",
        "1234567890",
        "SNIGDHA ARAS",
        "Teacher",
        "1234567890",
        "5/10/2005",
        "O+",
        "", // Blood Group Remarks - empty since blood group is standard
        "India",
        "Indian",
        "JoSAA/CSAB Counselling",
        "", // Admission Mode Remarks - empty since not "Any other"
        "Between 4 to 6 Lakh",
        "500000",
        "10356",
        "10356",
        "OPNO",
        "Female-Only (including Supernumerary)",
        "MADHYA PRADESH",
        "A 902 sterling skyline near mayank blue water park, indore, NA, Indore, MADHYA PRADESH, 452016",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data Template");

    const colWidths = headers.map((header) => ({
      wch: Math.max(header.length, 20),
    }));
    worksheet["!cols"] = colWidths;

    // Add data validation for dropdown fields
    const dropdownValidations = {
      'G': { // Gender column (moved right by one after adding Specialization)
        type: 'list',
        values: ['Male', 'Female', 'Other']
      },
      'H': { // Category column (moved right by one)
        type: 'list', 
        values: ['General', 'OBC-NCL', 'SC', 'ST', 'GEN-EWS']
      },
      'J': { // PwD column (moved right by one)
        type: 'list',
        values: ['YES', 'NO']
      },
      'K': { // PwD Category column (moved right by one)
        type: 'list',
        values: ['Locomotor Disability', 'Low vision Disability', 'Deaf Disability', 'Cerebral Palsy', 'Dyslexia', 'Amputee (Both Hand)', 'Deafness', 'Any other (remarks)']
      },
      'X': { // Blood Group column (moved right by one)
        type: 'list',
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Other']
      },
      'AB': { // Admission Mode column (moved right by one)
        type: 'list',
        values: ['Direct Institute advertisement', 'CCMT Counselling', 'JoSAA/CSAB Counselling', 'UCEED Counselling', 'Study In India (SII) Counselling', 'DASA Counselling', 'Any other (remarks)']
      },
      'AD': { // Income Group column (moved right by one)
        type: 'list',
        values: ['Between 0 to 2 Lakh', 'Between 2 to 4 Lakh', 'Between 4 to 6 Lakh', 'Between 6 to 8 Lakh', 'More than 8 Lakh']
      },
      'AH': { // Allotted Category column (moved right by one)
        type: 'list',
        values: ['OPNO', 'OPPH', 'EWNO', 'EWPH', 'BCNO', 'BCPH', 'SCNO', 'SCPH', 'STNO']
      },
      'AI': { // Allotted Gender column (moved right by one)
        type: 'list',
        values: ['Gender-Neutral', 'Female-Only (including Supernumerary)']
      }
    };

    XLSX.writeFile(
      workbook,
      `student_data_template_${activeSection.toUpperCase()}.xlsx`,
    );

    notifications.show({
      title: "Template Downloaded",
      message: `Excel template with updated fields and sample data for ${activeSection.toUpperCase()} students has been downloaded`,
      color: "green",
    });
  };
  // Helper function to extract specialization from batch name for PG programs
  const extractSpecializationFromBatchName = (batchName) => {
    if (!batchName) return null;

    if (batchName.includes("M.Des") || batchName.includes("B.Des") || batchName === "M.Des" || batchName === "B.Des") {
      return null;
    }

    if (batchName.includes("M.Tech")) {
      if (batchName.includes("AI & ML")) {
        return "AI & ML";
      }
      if (batchName.includes("Data Science")) {
        return "Data Science";
      }
      if (batchName.includes("Communication and Signal Processing")) {
        return "Communication and Signal Processing";
      }
      if (batchName.includes("Nanoelectronics and VLSI Design")) {
        return "Nanoelectronics and VLSI Design";
      }
      if (batchName.includes("Power & Control")) {
        return "Power & Control";
      }
      if (batchName.includes("Design")) {
        return "Design";
      }
      if (batchName.includes("CAD/CAM")) {
        return "CAD/CAM";
      }
      if (batchName.includes("Manufacturing and Automation")) {
        return "Manufacturing and Automation";
      }
      if (batchName.includes("Mechatronics")) {
        return "Mechatronics";
      }

      if (batchName.trim() === "M.Tech") {
        return null;
      }
    }
    
    return null;
  };

  // Helper function to filter students by specialization for PG programs
  const filterStudentsBySpecialization = (students, batch) => {
    const batchName = batch.name || batch.programme || "";
    const expectedSpecialization = extractSpecializationFromBatchName(batchName);

    if (batchName.includes("M.Des") || batchName.includes("B.Des") || batchName === "M.Des" || batchName === "B.Des") {
      return students;
    }

    if (!expectedSpecialization) {
      return students;
    }

    const filteredStudents = students.filter(student => {
      const studentSpecialization = student.specialization || student.specialisation || "";
      const studentDiscipline = student.discipline || "";
      const studentBranch = student.branch || "";
      
      // Try multiple field matches
      let matches = false;
      if (studentSpecialization && studentSpecialization.trim() !== "") {
        matches = studentSpecialization === expectedSpecialization || 
                 studentSpecialization.includes(expectedSpecialization) ||
                 expectedSpecialization.includes(studentSpecialization);
      } else if (studentDiscipline && studentDiscipline.trim() !== "") {
        matches = studentDiscipline === expectedSpecialization ||
                 studentDiscipline.includes(expectedSpecialization) ||
                 expectedSpecialization.includes(studentDiscipline);
      } else if (studentBranch && studentBranch.trim() !== "") {
        matches = studentBranch === expectedSpecialization ||
                 studentBranch.includes(expectedSpecialization) ||
                 expectedSpecialization.includes(studentBranch);
      }

      return matches;
    });
    
    return filteredStudents;
  };

  // Handle batch row click to fetch and display students
  const handleBatchRowClick = async (batch) => {
    setSelectedBatch(batch);
    setShowStudentModal(true);
    
    if (selectedBatch && selectedBatch.id === batch.id && showStudentModal) {
      return;
    }

    let students = batch.students || [];
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        notifications.show({
          title: "Authentication Error",
          message: "Please refresh the page and try again",
          color: "red",
        });
        return;
      }
      
      const response = await fetch(
        `${host}/programme_curriculum/api/batches/${batch.id}/students/`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        const uploadStudents = data.upload_students || [];
        const academicStudents = data.academic_students || [];
        const directStudents = data.students || [];

        const combinedStudents = [...uploadStudents, ...academicStudents, ...directStudents];
        
        if (combinedStudents.length === 0) {
          await tryFallbackStudentFetch(batch);
          return;
        }

        const seenStudents = new Set();
        students = combinedStudents.filter(student => {
          const identifier = student.id || 
                           student.student_id || 
                           student.jee_app_no || 
                           student.jeeAppNo ||
                           student.roll_number || 
                           student.rollNumber ||
                           student.institute_email ||
                           student.instituteEmail ||
                           `${student.name}_${student.dob || student.date_of_birth}`;
          
          if (seenStudents.has(identifier)) {
            return false;
          }
          
          seenStudents.add(identifier);
          return true;
        });

        // Apply specialization filtering for PG programs
        students = filterStudentsBySpecialization(students, batch);
      } else {
        await tryFallbackStudentFetch(batch);
        return;
      }
    } catch (error) {
      await tryFallbackStudentFetch(batch);
      return;
    }
    
    setStudentList(students);
  };

  // Fallback method to try alternative API endpoints when primary fails
  const tryFallbackStudentFetch = async (batch) => {
    const token = localStorage.getItem("authToken");
    
    try {
      const response = await fetch(
        `${host}/programme_curriculum/api/admin_batches/`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const targetBatch = data.find(b => b.id === batch.id);
        
        if (targetBatch) {
          let students = [];

          if (targetBatch.students) students.push(...targetBatch.students);
          if (targetBatch.upload_students) students.push(...targetBatch.upload_students);
          if (targetBatch.academic_students) students.push(...targetBatch.academic_students);

          const seenStudents = new Set();
          students = students.filter(student => {
            const identifier = student.id || student.student_id || student.jee_app_no || student.name;
            if (seenStudents.has(identifier)) return false;
            seenStudents.add(identifier);
            return true;
          });
          students = filterStudentsBySpecialization(students, batch);
          
          if (students.length > 0) {
            setStudentList(students);
            return;
          }
        }
      }

      setStudentList([]);
      
    } catch (error) {
      setStudentList([]);
    }
  };

  // API function to update student reported status
  const updateStudentStatus = async (requestData) => {
    try {
      const token = localStorage.getItem("authToken");
      
      const payload = {
        studentId: requestData.studentId,  
        reportedStatus: requestData.newStatus || requestData.reportedStatus, 
        batchId: requestData.batchId || selectedBatch?.id           
      };

      const response = await fetch(
        `${host}/programme_curriculum/api/admin_update_student_status/`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle reported status change for students
  const handleReportedStatusChange = async (studentId, newStatus) => {
    setUpdatingReportStatus(studentId);

    try {
      const requestData = {
        studentId: studentId,
        newStatus: newStatus,
        batchId: selectedBatch.id,
      };

      const result = await updateStudentStatus(requestData);

      if (result.success) {
        setStudentList((prev) =>
          prev.map((student) =>
            (student.id === studentId || student.student_id === studentId)
              ? { 
                  ...student, 
                  reportedStatus: newStatus,
                  reported_status: newStatus 
                }
              : student,
          ),
        );

        const updateBatchStudents = (batches) => {
          if (!Array.isArray(batches)) return [];
          return batches.map((batch) => {
            if (batch.id === selectedBatch.id) {
              const currentStudents = batch.students || [];
              return {
                ...batch,
                students: currentStudents.map((student) =>
                  student.id === studentId
                    ? { ...student, reportedStatus: newStatus, reported_status: newStatus }
                    : student,
                ),
              };
            }
            return batch;
          });
        };

        if (activeSection === PROGRAMME_TYPES.UG) {
          setUgBatches((prev) => updateBatchStudents(prev || []));
        } else if (activeSection === PROGRAMME_TYPES.PG) {
          setPgBatches((prev) => updateBatchStudents(prev || []));
        } else if (activeSection === PROGRAMME_TYPES.PHD) {
          setPhdBatches((prev) => updateBatchStudents(prev || []));
        }

        notifications.show({
          title: "Success",
          message: `Student status updated to ${newStatus.replace("_", " ")}`,
          color: "green",
        });

        forceRefreshData();
      } else {
        throw new Error(result.message || "Failed to update student status");
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update student status. Please try again.",
        color: "red",
      });
    } finally {
      setUpdatingReportStatus(null);
    }
  };


  // Helper function to get status display properties
  const getStatusProperties = (status) => {
    switch (status) {
      case "REPORTED":
        return { 
          color: "green", 
          variant: "filled", 
          icon: "✓", 
          label: "Reported" 
        };
      case "WITHDRAWAL":
        return { 
          color: "red", 
          variant: "filled", 
          icon: "⚠", 
          label: "Withdrawal" 
        };
      case "NOT_REPORTED":
      default:
        return { 
          color: "orange", 
          variant: "outline", 
          icon: "○", 
          label: "Not Reported" 
        };
    }
  };

  // Helper function to render status badge
  const getReportedStatusBadge = (status) => {
    const statusProps = getStatusProperties(status);
    return (
      <Badge
        color={statusProps.color}
        variant={statusProps.variant}
        size="xs"
        style={{
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {statusProps.label}
      </Badge>
    );
  };

  // Bulk selection functionality
  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    
    // Update "select all" state
    const allStudentIds = getFilteredStudents().map(student => student.id || student.student_id);
    setIsAllSelected(allStudentIds.length > 0 && allStudentIds.every(id => newSelected.has(id)));
  };

  const handleStudentSelect = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    const allStudentIds = getFilteredStudents().map(student => student.id || student.student_id);
    if (isAllSelected) {
      setSelectedStudents(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedStudents(new Set(allStudentIds));
      setIsAllSelected(true);
    }
  };

  // Generalized bulk status change function
  const handleBulkStatusChange = async (newStatus) => {
    if (selectedStudents.size === 0) {
      notifications.show({
        title: "No Selection",
        message: "Please select at least one student to update.",
        color: "orange",
      });
      return;
    }

    setIsBulkReporting(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      for (const studentId of selectedStudents) {
        const student = getFilteredStudents().find(s => (s.id || s.student_id) === studentId);
        if (student) {
          try {
            const result = await updateStudentStatus({
              studentId: studentId,
              reportedStatus: newStatus,
              batchId: selectedBatch.id,
            });

            if (result.success) {
              successCount++;
              setStudentList(prevList =>
                prevList.map(student =>
                  (student.id || student.student_id) === studentId
                    ? { ...student, reportedStatus: newStatus, reported_status: newStatus }
                    : student
                )
              );

              const updateBatchData = (batchArray) =>
                batchArray.map((batch) => ({
                  ...batch,
                  students: batch.students?.map((student) =>
                    (student.id || student.student_id) === studentId
                      ? { ...student, reportedStatus: newStatus, reported_status: newStatus }
                      : student
                  ),
                }));

              setUgBatches(updateBatchData);
              setPgBatches(updateBatchData);
              setPhdBatches(updateBatchData);
            } else {
              failureCount++;
            }
          } catch (error) {
            failureCount++;
          }
        }
      }

      const statusLabel = newStatus.replace('_', ' ').toLowerCase();
      
      // Show results notification
      if (successCount > 0 && failureCount === 0) {
        notifications.show({
          title: "Bulk Status Update Completed",
          message: `Successfully updated ${successCount} students to ${statusLabel}.`,
          color: "green",
        });

        forceRefreshData();
      } else if (successCount > 0 && failureCount > 0) {
        notifications.show({
          title: "Partial Success",
          message: `Updated ${successCount} students to ${statusLabel} successfully. ${failureCount} failed.`,
          color: "yellow",
        });

        forceRefreshData();
      } else {
        notifications.show({
          title: "Bulk Status Update Failed",
          message: `Failed to update students to ${statusLabel}. Please try again.`,
          color: "red",
        });
      }
      setSelectedStudents(new Set());
      setIsAllSelected(false);

    } catch (error) {
      notifications.show({
        title: "Error",
        message: "An error occurred during bulk status update. Please try again.",
        color: "red",
      });
    } finally {
      setIsBulkReporting(false);
    }
  };


  useEffect(() => {
    setSelectedStudents(new Set());
    setIsAllSelected(false);
  }, [selectedBatch]);


  // Handle Edit Student
  const handleEditStudent = (student) => {
    setEditingStudent(student);

    setShowStudentModal(false);
    setShowAddModal(true);
    setAddMode("manual");
    setCurrentStep(0); 

    notifications.show({
      title: "Edit Mode",
      message: `Editing student: ${student.Name || student.name || "Unknown"}`,
      color: "blue",
    });

    window.lastEditedStudent = student;
  };

  // Handle Delete Student
  const handleDeleteStudent = async (student) => {
    const studentName =
      student.Name || student.name || student.student_name || "Unknown";
    const studentId = student.id || student.student_id;

    if (!studentId) {
      notifications.show({
        title: "Error",
        message: "Cannot delete student: No valid ID found",
        color: "red",
      });
      return;
    }

    // Store student data and show confirmation modal
    setStudentToDelete({ id: studentId, name: studentName });
    setShowDeleteStudentConfirm(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    const { id: studentId, name: studentName } = studentToDelete;
    setDeletingStudent(studentId);

    try {
      const response = await deleteStudent(studentId);

      if (response.success) {
        setStudentList((prev) => {
          const updated = prev.filter(
            (s) => (s.id || s.student_id) !== studentId,
          );
          return updated;
        });

        const updateBatchStudents = (batches) => {
          if (!Array.isArray(batches)) return [];
          return batches.map((batch) => {
            if (batch.id === selectedBatch.id) {
              const currentCount =
                batch.studentCount || batch.students?.length || 0;
              const currentStudents = batch.students || [];
              const updatedBatch = {
                ...batch,
                students: currentStudents.filter(
                  (s) => (s.id || s.student_id) !== studentId,
                ),
                studentCount: Math.max(0, currentCount - 1),
              };
              return updatedBatch;
            }
            return batch;
          });
        };

        if (activeSection === PROGRAMME_TYPES.UG) {
          setUgBatches((prev) => updateBatchStudents(prev || []));
        } else if (activeSection === PROGRAMME_TYPES.PG) {
          setPgBatches((prev) => updateBatchStudents(prev || []));
        } else if (activeSection === PROGRAMME_TYPES.PHD) {
          setPhdBatches((prev) => updateBatchStudents(prev || []));
        }

        if (selectedBatch) {
          await fetchBatchData();
        }

        setShowStudentModal(false);
        setSelectedBatch(null);

        notifications.show({
          title: "Success",
          message: `Student "${studentName}" deleted successfully`,
          color: "green",
        });

        forceRefreshData();
      } else {
        throw new Error(response.message || "Failed to delete student");
      }
    } catch (error) {

      let errorMessage = "Failed to delete student";
      let errorTitle = "Error";

      if (
        error.message &&
        (error.message.includes("foreign key constraint") ||
          error.message.includes("violates foreign key constraint"))
      ) {
        errorTitle = "Cannot Delete Student";
        errorMessage = `Cannot delete student "${studentName}" because they have associated records in the system. This student may be referenced in other modules (Academic, Examination, etc.) or have associated data that must be removed first.`;
      } else if (error.response?.status === 500) {
        errorTitle = "Server Error (500)";
        const serverMessage =
          error.response?.data?.message || error.response?.data?.error || "";

        if (
          serverMessage.toLowerCase().includes("foreign key") ||
          serverMessage.toLowerCase().includes("constraint")
        ) {
          errorMessage = `Cannot delete student "${studentName}" due to database dependencies. This student may be referenced in other modules like Academic Records, Examination Data, or Course Enrollments.`;
        } else if (serverMessage.toLowerCase().includes("integrity")) {
          errorMessage = `Data integrity error: Student "${studentName}" cannot be deleted because they have dependent records in the system.`;
        } else {
          errorMessage = `Server error occurred while deleting student "${studentName}". ${serverMessage ? `Server says: ${serverMessage}` : "Please try again or contact support."}`;
        }
      } else if (error.response?.status === 403) {
        errorTitle = "Permission Denied";
        errorMessage = `You don't have permission to delete student "${studentName}". Please contact your administrator.`;
      } else if (error.response?.status === 404) {
        errorTitle = "Student Not Found";
        errorMessage = `Student "${studentName}" was not found. They may have already been deleted.`;
      } else if (error.response?.status === 400) {
        errorTitle = "Bad Request";
        errorMessage = `Invalid request to delete student "${studentName}". ${error.response?.data?.message || "Please check the data and try again."}`;
      } else {
        errorMessage = `Failed to delete student "${studentName}": ${error.message || "Unknown error"}`;
      }

      notifications.show({
        title: errorTitle,
        message: errorMessage,
        color: "red",
        autoClose: false, 
      });

      if (selectedBatch) {
      }
    } finally {
      setDeletingStudent(null);
      setShowDeleteStudentConfirm(false);
      setStudentToDelete(null);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customTableStyles }} />
      <Container 
        fluid 
        className="content-container"
        style={{ padding: "20px", maxWidth: "95vw" }}
      >
        {/* Section Tabs */}
        <Flex justify="flex-start" align="center" mb={10}>
          <Button
            variant={activeSection === "ug" ? "filled" : "outline"}
            style={{
              marginRight: "10px",
              backgroundColor:
                activeSection === "ug" ? "#3498db" : "transparent",
              color: activeSection === "ug" ? "white" : "#3498db",
              borderColor: "#3498db",
            }}
            onClick={() => setActiveSection("ug")}
          >
            UG: Undergraduate
          </Button>
          <Button
            variant={activeSection === "pg" ? "filled" : "outline"}
            style={{
              marginRight: "10px",
              backgroundColor:
                activeSection === "pg" ? "#3498db" : "transparent",
              color: activeSection === "pg" ? "white" : "#3498db",
              borderColor: "#3498db",
            }}
            onClick={() => setActiveSection("pg")}
          >
            PG: Post Graduate
          </Button>
          <Button
            variant={activeSection === "phd" ? "filled" : "outline"}
            style={{
              backgroundColor:
                activeSection === "phd" ? "#3498db" : "transparent",
              color: activeSection === "phd" ? "white" : "#3498db",
              borderColor: "#3498db",
            }}
            onClick={() => setActiveSection("phd")}
          >
            PhD: Doctor of Philosophy
          </Button>
        </Flex>
        <hr />

        {/* Top Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            marginTop: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {backgroundSync && (
              <div
                className="sync-indicator"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  padding: "4px 10px",
                  backgroundColor: "#e3f2fd",
                  border: "1px solid #2196f3",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "500",
                  color: "#1565c0"
                }}
              >
                <div 
                  style={{
                    width: "10px",
                    height: "10px",
                    border: "2px solid #2196f3",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}
                />
                Updating data...
              </div>
            )}
            <Button
              onClick={() => {
                setSelectedBatchYear(getCurrentBatchYear());
                setShowAddModal(true);
              }}
              style={{
                backgroundColor: "#3498db",
                color: "white",
                border: "none",
              }}
              leftSection={<Plus size={16} />}
            >
              Add Students
            </Button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <TextInput
              placeholder="Search by programme or discipline..."
              icon={<MagnifyingGlass size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minWidth: "250px" }}
            />
            <Select
              placeholder="Filter by Programme"
              icon={<Funnel size={16} />}
              data={
                activeSection === "ug"
                  ? [
                      { value: "", label: "All Programmes" },
                      { value: "B.Tech", label: "B.Tech" },
                      { value: "B.Des", label: "B.Des" },
                    ]
                  : [
                      { value: "", label: "All Programmes" },
                      { value: "M.Tech", label: "M.Tech" },
                      { value: "M.Des", label: "M.Des" },
                      { value: "PhD", label: "PhD" },
                    ]
              }
              value={filterProgramme}
              onChange={setFilterProgramme}
              style={{ minWidth: 150 }}
            />

            {/* Academic Year Selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                backgroundColor: "#e7f3ff",
                border: "1px solid #3498db",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#2c5282" }}>
                📅 Academic Year:
              </span>
              <Select
                value={viewAcademicYear.toString()}
                onChange={(value) => setViewAcademicYear(parseInt(value, 10))}
                data={getViewAcademicYearOptions()}
                style={{ width: "100px" }}
                size="xs"
                variant="unstyled"
                styles={{
                  input: {
                    fontWeight: 600,
                    color: "#2c5282",
                    fontSize: "14px",
                    padding: "0 4px",
                    minHeight: "auto",
                    height: "auto",
                  },
                  dropdown: {
                    fontSize: "14px",
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <Grid gutter="md">
          <Grid.Col span={12}>
            <div style={{ backgroundColor: "white", padding: "0px" }}>
              <Table
                style={{
                  backgroundColor: "white",
                  padding: "20px",
                  width: "100%",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      Discipline
                    </th>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      Batch Year
                    </th>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      Curriculum
                    </th>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      Total Seats
                    </th>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      Filled Seats
                    </th>
                    <th
                      style={{
                        padding: "15px 20px",
                        backgroundColor: "#C5E2F6",
                        color: "#3498db",
                        fontSize: "16px",
                        textAlign: "center",
                      }}
                    >
                      Available Seats
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.length > 0 ? (
                    filteredBatches.map((batch, index) => (
                      <tr
                        key={batch.id || `batch-${index}`}
                        style={{
                          cursor:
                            editingRow === batch.id ? "default" : "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onClick={
                          editingRow === batch.id
                            ? undefined
                            : () => handleBatchRowClick(batch)
                        }
                        onMouseEnter={
                          editingRow === batch.id
                            ? undefined
                            : (e) =>
                                (e.target.closest("tr").style.backgroundColor =
                                  "#f8f9fa")
                        }
                        onMouseLeave={
                          editingRow === batch.id
                            ? undefined
                            : (e) =>
                                (e.target.closest("tr").style.backgroundColor =
                                  "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: "black",
                            borderRight: "1px solid #d3d3d3",
                          }}
                        >
                          {editingRow === batch.id ? (
                            <Select
                              value={editFormData.programme}
                              onChange={(value) =>
                                setEditFormData({
                                  ...editFormData,
                                  programme: value,
                                })
                              }
                              data={getProgrammeOptions()}
                              size="sm"
                              style={{ minWidth: "120px" }}
                            />
                          ) : (
                            batch.name || batch.programme
                          )}
                        </td>
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: "black",
                            borderRight: "1px solid #d3d3d3",
                          }}
                        >
                          {editingRow === batch.id ? (
                            <Select
                              value={editFormData.discipline}
                              onChange={(value) =>
                                setEditFormData({
                                  ...editFormData,
                                  discipline: value,
                                })
                              }
                              data={getDisciplineOptions(
                                editFormData.programme,
                              )}
                              size="sm"
                              style={{ minWidth: "200px" }}
                            />
                          ) : (
                            <Badge variant="light" color="blue">
                              {batch.displayBranch ||
                                getDisplayBranchName(batch.discipline)}
                            </Badge>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: "black",
                            borderRight: "1px solid #d3d3d3",
                          }}
                        >
                          {editingRow === batch.id ? (
                            <TextInput
                              value={editFormData.year}
                              onChange={(event) =>
                                setEditFormData({
                                  ...editFormData,
                                  year: event.currentTarget.value,
                                })
                              }
                              size="sm"
                              style={{ width: "100px" }}
                              type="number"
                              min="2020"
                              max="2030"
                            />
                          ) : (
                            batch.year
                          )}
                        </td>
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: "black",
                            borderRight: "1px solid #d3d3d3",
                          }}
                        >
                          <Badge variant="light" color="cyan" size="sm">
                            {(() => {
                              const display = batch.curriculum_display || batch.curriculum || batch.curriculum_name || "N/A";
                              const version = batch.curriculumVersion || batch.curriculum_version;
                              function hasVersionInfo(display, version) {
                                if (!version) return false;
                                // Accept "vX", "V X", "version X", etc.
                                const regex = new RegExp(`\\bv?\\s*${version}\\b`, "i");
                                return regex.test(display);
                              }
                              if (version && !hasVersionInfo(display, version)) {
                                return `${display} v${version}`;
                              }
                              return display;
                            })()}
                          </Badge>
                        </td>
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: "black",
                            fontWeight: "500",
                            borderRight: "1px solid #d3d3d3",
                          }}
                        >
                          {editingRow === batch.id ? (
                            <TextInput
                              value={editFormData.totalSeats}
                              onChange={(event) =>
                                setEditFormData({
                                  ...editFormData,
                                  totalSeats: event.currentTarget.value,
                                })
                              }
                              size="sm"
                              style={{ width: "100px" }}
                              type="number"
                              min="0"
                              max="500"
                            />
                          ) : (
                            <Text weight={500}>{batch.totalSeats}</Text>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: batch.filledSeats > 0 ? "#16a34a" : "#6b7280",
                            borderRight: "1px solid #d3d3d3",
                            position: "relative",
                          }}
                        >
                          <div>
                            {batch.filledSeats}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            color: batch.availableSeats > 0 ? "green" : "red",
                            fontWeight: "500",
                            borderRight: "1px solid #d3d3d3",
                          }}
                        >
                          {batch.availableSeats}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          padding: "30px",
                          textAlign: "center",
                          color: "#666",
                        }}
                      >
                        {loading
                          ? "Loading batch data..."
                          : "No batches found matching your criteria"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Grid.Col>
        </Grid>

        {/* Add Students Modal */}
        <Modal
          opened={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setAddMode(null);
            setCurrentStep(0);
            setShowPreview(false);
            setExtractedData([]);
            setUploadedFile(null);
            setProcessedBatchData(null);
            setAllocationSummary(null);
            setShowBatchPreview(false);
          }}
          closeOnClickOutside={false}
          size="90vw"
          centered
          padding="md"
          radius="md"
          shadow="xl"
          styles={{
            modal: {
              maxWidth: isMobile ? "95vw" : "90vw",
              width: isMobile ? "95vw" : "90vw",
              maxHeight: isMobile ? "95vh" : "85vh",
              height: "auto",
              minHeight: "50vh",
              margin: "0 auto",
            },
            body: {
              padding: isMobile ? "8px" : "15px",
              paddingTop: isMobile ? "0px" : "5px",
              maxHeight: isMobile ? "85vh" : "75vh",
              overflow: "auto",
            },
            header: {
              padding: isMobile ? "8px 8px 0" : "12px 15px 0",
              borderBottom: "none",
            },
            close: {
              marginTop: "4px",
            },
          }}
        >
          {!addMode && (
            <Container size="lg" style={{ padding: 0 }}>
              <Stack spacing={isMobile ? "md" : "lg"} align="center">
                <Text
                  size={isMobile ? "lg" : "xl"}
                  ta="center"
                  color="#3498db"
                  weight={700}
                  style={{
                    fontSize: isMobile ? "18px" : "24px",
                    fontWeight: "bold",
                    marginBottom: isMobile ? "5px" : "8px",
                    marginTop: "0",
                  }}
                >
                  Select Student Data Entry Method
                </Text>

                {/* Batch Year Selection */}
                <Stack spacing="xs" style={{ width: "100%", marginBottom: "20px" }}>
                  <Group position="center" spacing="md">
                    <Select
                      value={selectedBatchYear.toString()}
                      onChange={(value) => setSelectedBatchYear(parseInt(value, 10))}
                      data={getBatchYearOptions(activeSection)}
                      style={{ width: isMobile ? "250px" : "300px" }}
                      placeholder="Select batch year"
                      size="sm"
                    />
                  </Group>
                  <Text size="xs" color="dimmed" ta="center">
                    {selectedBatchYear && `Academic Year: ${batchYearToAcademicYear(selectedBatchYear)}`}
                  </Text>
                </Stack>

                <Grid
                  gutter={isMobile ? "md" : "lg"}
                  style={{ width: "100%", marginTop: "10px" }}
                >
                  <Grid.Col span={isMobile ? 12 : 6}>
                    <Card
                      shadow="sm"
                      radius="lg"
                      padding={isMobile ? "md" : "xl"}
                      style={{
                        height: isMobile ? "180px" : "240px",
                        cursor: "pointer",
                        border: "2px solid transparent",
                        transition: "all 0.3s ease",
                      }}
                      onClick={() => setAddMode("excel")}
                      sx={() => ({
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 32px rgba(52, 152, 219, 0.15)",
                          borderColor: "#3498db",
                        },
                      })}
                    >
                      <Stack
                        align="center"
                        spacing="xs"
                        h="100%"
                        justify="center"
                      >
                        <ThemeIcon
                          size={isMobile ? 40 : 50}
                          radius="xl"
                          variant="light"
                          color="blue"
                        >
                          <FileXls size={isMobile ? 20 : 24} />
                        </ThemeIcon>
                        <Text size={isMobile ? "sm" : "md"} weight={600} mt={4}>
                          Excel Upload
                        </Text>
                        <Text
                          ta="center"
                          color="dimmed"
                          size="xs"
                          style={{ lineHeight: 1.3 }}
                        >
                          Upload Excel file to automatically extract and import
                          student data
                        </Text>
                        <Badge
                          color="green"
                          size={isMobile ? "xs" : "sm"}
                          mt={4}
                        >
                          AUTOMATED
                        </Badge>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={isMobile ? 12 : 6}>
                    <Card
                      shadow="sm"
                      radius="lg"
                      padding={isMobile ? "md" : "xl"}
                      style={{
                        height: isMobile ? "180px" : "240px",
                        cursor: "pointer",
                        border: "2px solid transparent",
                        transition: "all 0.3s ease",
                      }}
                      onClick={() => setAddMode("manual")}
                      sx={() => ({
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 32px rgba(52, 152, 219, 0.15)",
                          borderColor: "#3498db",
                        },
                      })}
                    >
                      <Stack
                        align="center"
                        spacing="xs"
                        h="100%"
                        justify="center"
                      >
                        <ThemeIcon
                          size={isMobile ? 40 : 50}
                          radius="xl"
                          variant="light"
                          color="blue"
                        >
                          <Users size={isMobile ? 20 : 24} />
                        </ThemeIcon>
                        <Text size={isMobile ? "sm" : "md"} weight={600} mt={4}>
                          Manual Entry
                        </Text>
                        <Text
                          ta="center"
                          color="dimmed"
                          size="xs"
                          style={{ lineHeight: 1.3 }}
                        >
                          Enter student details manually using step-by-step form
                        </Text>
                        <Badge
                          color="blue"
                          size={isMobile ? "xs" : "sm"}
                          mt={4}
                        >
                          STEP BY STEP
                        </Badge>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Container>
          )}

          {/* Excel Upload Mode */}
          {addMode === "excel" && (
            <Container size="lg" style={{ padding: 0 }}>
              <Stack spacing={isMobile ? "md" : "lg"}>
                <Group
                  position="apart"
                  style={{ marginBottom: isMobile ? "16px" : "24px" }}
                >
                  <Text
                    size={isMobile ? "md" : "lg"}
                    weight={700}
                    style={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      fontSize: isMobile ? "18px" : "22px",
                    }}
                  >
                    Excel Upload Mode
                  </Text>
                  <Button
                    variant="subtle"
                    size={isMobile ? "xs" : "sm"}
                    onClick={() => {
                      setAddMode(null);
                      setShowPreview(false);
                      setExtractedData([]);
                      setUploadedFile(null);
                      setProcessedBatchData(null);
                      setAllocationSummary(null);
                      setShowBatchPreview(false);
                    }}
                  >
                    <CaretLeft size={16} style={{ marginRight: "8px" }} />
                    Back
                  </Button>
                </Group>

                <Card
                  shadow="sm"
                  padding={isMobile ? "md" : "xl"}
                  radius="md"
                  style={{ border: "1px solid #e9ecef" }}
                >
                  <Stack spacing="md">
                    {/* Template Download Section */}
                    <div
                      style={{
                        backgroundColor: "#e3f2fd",
                        padding: "15px",
                        borderRadius: "8px",
                        border: "1px solid #2196f3",
                      }}
                    >
                      <Group position="apart" align="center">
                        <div>
                          <Text size="sm" weight={600} color="#1976d2">
                            📄 Download Excel Template
                          </Text>
                          <Text size="xs" color="#1976d2" mt={2}>
                            Download the standardized template with all required
                            fields for {activeSection.toUpperCase()} students
                          </Text>
                        </div>
                        <Button
                          size="sm"
                          variant="light"
                          color="blue"
                          leftSection={<Download size={16} />}
                          onClick={generateExcelTemplate}
                        >
                          Download Template
                        </Button>
                      </Group>
                    </div>

                    <FileInput
                      label="Upload Excel File"
                      description="Select an Excel file (.xlsx, .xls) containing student data using the template format"
                      placeholder="Click to select file"
                      icon={<Upload size={14} />}
                      value={uploadedFile}
                      onChange={handleFileUpload}
                      accept=".xlsx,.xls"
                    />

                    {isProcessing && (
                      <Stack spacing="xs">
                        <Text size="sm">Processing file...</Text>
                        <Progress value={uploadProgress} />
                      </Stack>
                    )}

                    {showBatchPreview &&
                      processedBatchData &&
                      !isProcessing && (
                        <Stack spacing="md">
                          <Alert color="green" icon={<Check size={16} />}>
                            Batch allocation completed!{" "}
                            {processedBatchData?.length || 0} students processed
                            with roll numbers and institute emails.
                          </Alert>

                          {allocationSummary && (
                            <Card
                              withBorder
                              padding="md"
                              style={{ backgroundColor: "#f8f9fa" }}
                            >
                              <Text
                                size="md"
                                weight={600}
                                color="#3498db"
                                mb="sm"
                              >
                                📊 Allocation Summary:
                              </Text>
                              <Grid>
                                <Grid.Col span={6}>
                                  <Text size="sm">
                                    <strong>Programme:</strong>{" "}
                                    {allocationSummary.programme || "N/A"}
                                  </Text>
                                  <Text size="sm">
                                    <strong>Year:</strong>{" "}
                                    {allocationSummary.year || "N/A"}
                                  </Text>
                                  <Text size="sm">
                                    <strong>Total Students:</strong>{" "}
                                    {allocationSummary.totalStudents || 0}
                                  </Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                  <Text size="sm" weight={600} mb="xs">
                                    Branch-wise Distribution:
                                  </Text>
                                  {allocationSummary.branchCounts &&
                                    typeof allocationSummary.branchCounts ===
                                      "object" &&
                                    Object.entries(
                                      allocationSummary.branchCounts,
                                    ).map(([branch, count]) => (
                                      <Text key={branch} size="sm">
                                        <Badge variant="light" mr="xs">
                                          {branch}
                                        </Badge>
                                        {count} students
                                      </Text>
                                    ))}
                                  {(!allocationSummary.branchCounts ||
                                    typeof allocationSummary.branchCounts !==
                                      "object") && (
                                    <Text size="sm" color="dimmed">
                                      No branch distribution available
                                    </Text>
                                  )}
                                </Grid.Col>
                              </Grid>
                            </Card>
                          )}

                          <Text size="md" weight={600} color="#3498db" mt="md">
                            🎓 Student Allocation Preview:
                          </Text>

                          <div
                            style={{
                              maxHeight: "400px",
                              overflowY: "auto",
                              overflowX: "auto",
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                            }}
                          >
                            <Table
                              striped
                              highlightOnHover
                              className="student-allocation-table"
                              style={{
                                minWidth: "1400px",
                                tableLayout: "fixed",
                                width: "100%",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      width: "120px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    Roll Number
                                  </th>
                                  <th style={{ width: "140px" }}>Name</th>
                                  <th style={{ width: "140px" }}>
                                    Father Name
                                  </th>
                                  <th style={{ width: "140px" }}>
                                    Mother Name
                                  </th>
                                  <th style={{ width: "200px" }}>Address</th>
                                  <th style={{ width: "130px" }}>
                                    JEE App. No.
                                  </th>
                                  {(activeSection === "pg" || activeSection === "phd") && (
                                    <th style={{ width: "140px" }}>
                                      Specialization
                                    </th>
                                  )}
                                  <th style={{ width: "100px" }}>
                                    Branch Code
                                  </th>
                                  <th style={{ width: "180px" }}>
                                    Institute Email
                                  </th>
                                  <th style={{ width: "120px" }}>Password</th>
                                  <th style={{ width: "80px" }}>Category</th>
                                  <th style={{ width: "60px" }}>PWD</th>
                                </tr>
                              </thead>
                              <tbody>
                                {processedBatchData.map((student, index) => (
                                  <tr key={index}>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        whiteSpace: "nowrap",
                                        overflow: "visible",
                                      }}
                                    >
                                      <Badge
                                        color="blue"
                                        variant="light"
                                        style={{
                                          fontSize: "11px",
                                          minWidth: "fit-content",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {student.rollNumber}
                                      </Badge>
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        wordWrap: "break-word",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {student.name}
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        wordWrap: "break-word",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {student.fname}
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        wordWrap: "break-word",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {student.mname || "N/A"}
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        fontSize: "11px",
                                        wordWrap: "break-word",
                                        lineHeight: "1.3",
                                        maxWidth: "200px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        position: "relative",
                                      }}
                                    >
                                      <Tooltip
                                        label={student.address || "N/A"}
                                        multiline
                                        width={300}
                                        disabled={
                                          !student.address ||
                                          student.address.length < 50
                                        }
                                      >
                                        <div
                                          style={{
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                          }}
                                        >
                                          {student.address || "N/A"}
                                        </div>
                                      </Tooltip>
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        fontSize: "12px",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {student.jeeAppNo || "N/A"}
                                    </td>
                                    {(activeSection === "pg" || activeSection === "phd") && (
                                      <td
                                        style={{
                                          padding: "8px 12px",
                                          fontSize: "11px",
                                        }}
                                      >
                                        <Badge
                                          color="blue"
                                          variant="light"
                                          style={{
                                            fontSize: "10px",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {student.specialization || "N/A"}
                                        </Badge>
                                      </td>
                                    )}
                                    <td style={{ padding: "8px 12px" }}>
                                      <Badge
                                        color="green"
                                        variant="light"
                                        style={{
                                          fontSize: "11px",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {student.branchCode}
                                      </Badge>
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        fontSize: "11px",
                                        fontFamily: "monospace",
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      {student.instituteEmail}
                                    </td>
                                    <td style={{ padding: "8px 12px" }}>
                                      <Badge
                                        color="orange"
                                        variant="light"
                                        style={{
                                          fontSize: "10px",
                                          fontFamily: "monospace",
                                          minWidth: "fit-content",
                                          whiteSpace: "nowrap",
                                          cursor: "pointer",
                                        }}
                                        title={`Full password: ${student.password}`}
                                      >
                                        {student.password}
                                      </Badge>
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {student.category}
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 12px",
                                        fontSize: "12px",
                                        textAlign: "center",
                                      }}
                                    >
                                      {student.pwd}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>

                          {/* Important Save Reminder */}
                          <Alert
                            color="orange"
                            icon={<Warning size={16} />}
                            styles={{
                              root: {
                                border: "2px solid #f59e0b",
                                backgroundColor: "#fef3c7",
                              },
                              title: { color: "#92400e", fontWeight: 600 },
                              message: { color: "#92400e" },
                            }}
                          >
                            <Text weight={600} size="md">
                              ⚠️ IMPORTANT: Data Not Saved Yet!
                            </Text>
                            <Text size="sm" mt={4}>
                              The students have been processed but{" "}
                              <strong>NOT YET SAVED</strong> to the database.
                              Click "Save Students" below to permanently add
                              them to the system.
                            </Text>
                          </Alert>

                          <Group position="center" mt="lg" spacing="md">
                            <Button
                              variant="outline"
                              color="blue"
                              onClick={() => {
                                setShowBatchPreview(false);
                                setProcessedBatchData(null);
                                setAllocationSummary(null);
                                setExtractedData([]);
                              }}
                            >
                              ← Back to Upload
                            </Button>
                            <Button
                              onClick={handleExcelUpload}
                              size="md"
                              style={{
                                backgroundColor: "#e74c3c",
                                fontSize: "16px",
                                padding: "12px 24px",
                                boxShadow: "0 4px 12px rgba(231, 76, 60, 0.3)",
                              }}
                            >
                              <Upload
                                size={16}
                                style={{ marginRight: "8px" }}
                              />
                              💾 SAVE STUDENTS TO DATABASE
                            </Button>
                          </Group>
                        </Stack>
                      )}

                    {/* Data Preview Section - After Excel Processing */}
                    {extractedData &&
                      extractedData.length > 0 &&
                      showPreview &&
                      !isProcessing &&
                      !showBatchPreview && (
                        <Stack spacing="md">
                          <Alert color="green" icon={<Check size={16} />}>
                            ✅ Excel file processed successfully!{" "}
                            {extractedData.length} records found.
                            {extractedData.filter((s) => !s._validation_error)
                              .length > 0 &&
                              ` (${extractedData.filter((s) => !s._validation_error).length} valid)`}
                            {extractedData.filter((s) => s._validation_error)
                              .length > 0 &&
                              ` (${extractedData.filter((s) => s._validation_error).length} need attention)`}
                          </Alert>

                          {/* Discipline Summary */}
                          <Card
                            withBorder
                            padding="md"
                            style={{ backgroundColor: "#f8f9fa" }}
                          >
                            <Text
                              size="md"
                              weight={600}
                              color="#3498db"
                              mb="sm"
                            >
                              📋 Data Preview ({extractedData.length} students):
                            </Text>

                            <ScrollArea style={{ height: 400 }}>
                              <Table striped highlightOnHover fontSize="sm">
                                <thead>
                                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                                    <th style={{ minWidth: "60px" }}>S.No</th>
                                    {PREVIEW_FIELD_ORDER
                                      .filter(fieldKey => {
                                        const field = STUDENT_FIELDS_CONFIG[fieldKey];
                                        if (!field || field.systemGenerated) return false;
                                        
                                        // Check if field should show for current program type
                                        if (field.showForProgrammes) {
                                          const currentProgramType = activeSection.toUpperCase();
                                          return field.showForProgrammes.includes(currentProgramType);
                                        }
                                        
                                        return true;
                                      })
                                      .map((fieldKey) => {
                                        const field = STUDENT_FIELDS_CONFIG[fieldKey];
                                        return (
                                          <th 
                                            key={fieldKey} 
                                            style={{ 
                                              minWidth: field.type === 'email' ? "200px" : 
                                                      fieldKey.includes('Remarks') || fieldKey.includes('address') || fieldKey.includes('Name') ? "150px" :
                                                      fieldKey.includes('Number') || fieldKey.includes('Mobile') ? "120px" : "100px"
                                            }}
                                          >
                                            {field.label}
                                          </th>
                                        );
                                      })}
                                    {extractedData.some(
                                      (student) => student._validation_error,
                                    ) && (
                                      <th
                                        style={{
                                          minWidth: "200px",
                                          color: "#e74c3c",
                                        }}
                                      >
                                        Validation Status
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {extractedData.map((student, index) => {
                                    const getFieldValue = (fieldKey) => {
                                      const fieldInfo = STUDENT_FIELDS_CONFIG[fieldKey];
                                      if (!fieldInfo) return "-";

                                      let fieldValue = null;

                                      // 1. Try direct field key first
                                      fieldValue = student[fieldKey];
                                      
                                      // 2. Try backend field mapping
                                      if (!fieldValue && fieldInfo.backendField) {
                                        fieldValue = student[fieldInfo.backendField];
                                      }
                                      
                                      // 3. Try configured excel column variations
                                      if (!fieldValue && fieldInfo.excelColumns) {
                                        for (const excelCol of fieldInfo.excelColumns) {
                                          // Try exact match first
                                          if (student[excelCol]) {
                                            fieldValue = student[excelCol];
                                            break;
                                          }
                                          // Try case-insensitive match
                                          const matchedKey = Object.keys(student).find(
                                            key => key.toLowerCase() === excelCol.toLowerCase()
                                          );
                                          if (matchedKey && student[matchedKey]) {
                                            fieldValue = student[matchedKey];
                                            break;
                                          }
                                        }
                                      }
                                      
                                      // 4. Clean and format the value
                                      if (fieldValue) {
                                        // Clean discipline names
                                        if (fieldKey === "branch") {
                                          fieldValue = cleanDisciplineName(fieldValue);
                                        }
                                        
                                        // Format dates
                                        if (fieldKey === "dob" && typeof fieldValue === 'string') {
                                          fieldValue = fieldValue.split(' ')[0].split('T')[0];
                                        }
                                        
                                        return String(fieldValue).trim();
                                      }
                                      
                                      return "-";
                                    };

                                    return (
                                      <tr
                                        key={index}
                                        style={
                                          student._validation_error
                                            ? { backgroundColor: "#fff3cd" }
                                            : {}
                                        }
                                      >
                                        <td>
                                          {student._row_number ||
                                            student.sno ||
                                            index + 1}
                                        </td>
                                        {PREVIEW_FIELD_ORDER
                                          .filter(fieldKey => {
                                            const field = STUDENT_FIELDS_CONFIG[fieldKey];
                                            if (!field || field.systemGenerated) return false;
                                    
                                            if (field.showForProgrammes) {
                                              const currentProgramType = activeSection.toUpperCase();
                                              return field.showForProgrammes.includes(currentProgramType);
                                            }
                                            
                                            return true;
                                          })
                                          .map((fieldKey) => (
                                            <td key={fieldKey}>
                                              {getFieldValue(fieldKey)}
                                            </td>
                                          ))}
                                        {student._validation_error && (
                                          <td
                                            style={{
                                              color: "#e74c3c",
                                              fontSize: "11px",
                                            }}
                                          >
                                            ⚠️ {student._validation_error}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </ScrollArea>
                          </Card>

                          <Group
                            position="center"
                            style={{ marginTop: "20px" }}
                          >
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowPreview(false);
                                setExtractedData([]);
                              }}
                              size="md"
                              style={{ fontSize: "16px", padding: "12px 24px" }}
                            >
                              ← Back to Upload
                            </Button>
                            <Button
                              onClick={async () => {
                                try {
                                  setIsProcessing(true);
                                  setShowPreview(false);

                                  const transformedData =
                                    transformDataForDatabase(extractedData);

                                  const response = await saveStudentsBatch(
                                    transformedData,
                                    activeSection,
                                  );

                                  if (response.success) {
                                    notifications.show({
                                      title: "Success",
                                      message: `${response.data.successful_uploads || response.data.saved_count || extractedData.length} students saved to database successfully!`,
                                      color: "green",
                                    });

                                    setExtractedData([]);
                                    setShowPreview(false);
                                    setShowAddModal(false);
                                    forceRefreshData();
                                  } else {
                                    throw new Error(
                                      response.message ||
                                        "Failed to save students",
                                    );
                                  }
                                } catch (error) {
                                  const { title, message } =
                                    parseDuplicateError(
                                      error,
                                      "save students to database",
                                    );

                                  notifications.show({
                                    title,
                                    message,
                                    color: "red",
                                    autoClose: 8000,
                                  });
                                } finally {
                                  setIsProcessing(false);
                                }
                              }}
                              size="md"
                              style={{
                                backgroundColor: "#28a745",
                                fontSize: "16px",
                                padding: "12px 24px",
                              }}
                            >
                              <Database
                                size={16}
                                style={{ marginRight: "8px" }}
                              />
                              Save Students to Database ({extractedData.length})
                            </Button>
                          </Group>
                        </Stack>
                      )}

                    {extractedData &&
                      extractedData.length > 0 &&
                      !isProcessing &&
                      !showBatchPreview &&
                      !showPreview && (
                        <Stack spacing="md">
                          <Alert color="blue" icon={<Info size={16} />}>
                            Raw data extracted. Processing for batch
                            allocation...
                          </Alert>
                        </Stack>
                      )}
                  </Stack>
                </Card>
              </Stack>
            </Container>
          )}

          {/* Manual Entry Mode */}
          {addMode === "manual" && (
            <Container size="lg" style={{ padding: 0 }}>
              <Stack spacing={isMobile ? "md" : "lg"}>
                <Group
                  position="apart"
                  style={{ marginBottom: isMobile ? "16px" : "24px" }}
                >
                  <Text
                    size={isMobile ? "md" : "lg"}
                    weight={700}
                    style={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      fontSize: isMobile ? "18px" : "22px",
                    }}
                  >
                    {editingStudent ? "Edit Student" : "Manual Entry Mode"}
                  </Text>
                  <Button
                    variant="subtle"
                    size={isMobile ? "xs" : "sm"}
                    onClick={() => {
                      if (editingStudent) {
                        setAddMode(null);
                        setEditingStudent(null);
                        setManualFormData(INITIAL_FORM_DATA);
                        setCurrentStep(0);
                        setErrors({});
                        setShowAddModal(false);
                        setShowStudentModal(true);
                      } else {
                        setAddMode(null);
                        setEditingStudent(null);
                        setManualFormData(INITIAL_FORM_DATA);
                        setCurrentStep(0);
                        setErrors({});
                        setShowAddModal(false);
                      }
                    }}
                  >
                    <CaretLeft size={16} style={{ marginRight: "8px" }} />
                    Back
                  </Button>
                </Group>

                <Card
                  shadow="sm"
                  padding={isMobile ? "md" : "xl"}
                  radius="md"
                  style={{ border: "1px solid #e9ecef" }}
                >
                  <Stepper active={currentStep} breakpoint="sm">
                    <Stepper.Step
                      label="Basic Info"
                      description="Personal information"
                      icon={<User size={18} />}
                    >
                      <Stack spacing="md" mt="lg">
                        <Title order={3} size="h4" weight={700} mb="md">
                          Basic Info
                        </Title>

                        {/* Name Field */}
                        <TextInput
                          label={STUDENT_FIELDS_CONFIG.name.label}
                          placeholder={STUDENT_FIELDS_CONFIG.name.placeholder}
                          value={manualFormData.name || ""}
                          onChange={(e) =>
                            setManualFormData({
                              ...manualFormData,
                              name: e.target.value,
                            })
                          }
                          required={STUDENT_FIELDS_CONFIG.name.required}
                          error={errors.name}
                        />

                        {/* Parent Names */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.fname.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.fname.placeholder
                              }
                              value={manualFormData.fname || ""}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  fname: e.target.value,
                                })
                              }
                              required={STUDENT_FIELDS_CONFIG.fname.required}
                              error={errors.fname}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.mname.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.mname.placeholder
                              }
                              value={manualFormData.mname || ""}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  mname: e.target.value,
                                })
                              }
                              required={STUDENT_FIELDS_CONFIG.mname.required}
                              error={errors.mname}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Gender and Category */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              label={STUDENT_FIELDS_CONFIG.gender.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.gender.placeholder
                              }
                              value={manualFormData.gender || ""}
                              onChange={(value) =>
                                setManualFormData({
                                  ...manualFormData,
                                  gender: value,
                                })
                              }
                              data={STUDENT_FIELDS_CONFIG.gender.options}
                              required={STUDENT_FIELDS_CONFIG.gender.required}
                              error={errors.gender}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              label={STUDENT_FIELDS_CONFIG.category.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.category.placeholder
                              }
                              value={manualFormData.category || ""}
                              onChange={(value) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    category: value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  category: value,
                                });
                              }}
                              data={STUDENT_FIELDS_CONFIG.category.options}
                              required={
                                STUDENT_FIELDS_CONFIG.category.required
                              }
                              error={errors.category}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Minority and PWD */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.minority.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.minority.placeholder
                              }
                              value={manualFormData.minority || ""}
                              onChange={(event) => {
                                const value = event.currentTarget.value;
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    minority: value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  minority: value,
                                });
                              }}
                              required={
                                STUDENT_FIELDS_CONFIG.minority.required
                              }
                              error={errors.minority}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              label={STUDENT_FIELDS_CONFIG.pwd.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.pwd.placeholder
                              }
                              value={manualFormData.pwd || ""}
                              onChange={(value) =>
                                setManualFormData({
                                  ...manualFormData,
                                  pwd: value,
                                })
                              }
                              data={STUDENT_FIELDS_CONFIG.pwd.options}
                              required={STUDENT_FIELDS_CONFIG.pwd.required}
                              error={errors.pwd}
                            />
                          </Grid.Col>

                          {/* PwD Category - Show only when PwD is YES */}
                          {manualFormData.pwd === "YES" && (
                            <Grid.Col span={isMobile ? 12 : 6}>
                              <Select
                                label={STUDENT_FIELDS_CONFIG.pwdCategory.label}
                                placeholder={STUDENT_FIELDS_CONFIG.pwdCategory.placeholder}
                                value={manualFormData.pwdCategory || ""}
                                onChange={(value) => {
                                  if (editingStudent) {
                                    setEditingStudent({
                                      ...editingStudent,
                                      pwdCategory: value,
                                    });
                                  }
                                  setManualFormData({
                                    ...manualFormData,
                                    pwdCategory: value,
                                  });
                                }}
                                data={STUDENT_FIELDS_CONFIG.pwdCategory.options}
                                error={errors.pwdCategory}
                              />
                            </Grid.Col>
                          )}

                          {/* PwD Category Remarks - Show only when "Any other (remarks)" is selected */}
                          {manualFormData.pwdCategory === "Any other (remarks)" && (
                            <Grid.Col span={isMobile ? 12 : 6}>
                              <TextInput
                                label={STUDENT_FIELDS_CONFIG.pwdCategoryRemarks.label}
                                placeholder={STUDENT_FIELDS_CONFIG.pwdCategoryRemarks.placeholder}
                                value={manualFormData.pwdCategoryRemarks || ""}
                                onChange={(e) => {
                                  if (editingStudent) {
                                    setEditingStudent({
                                      ...editingStudent,
                                      pwdCategoryRemarks: e.target.value,
                                    });
                                  }
                                  setManualFormData({
                                    ...manualFormData,
                                    pwdCategoryRemarks: e.target.value,
                                  });
                                }}
                                error={errors.pwdCategoryRemarks}
                              />
                            </Grid.Col>
                          )}
                        </Grid>

                        {/* Contact Information */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.phoneNumber.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.phoneNumber.placeholder
                              }
                              value={manualFormData.phoneNumber || ""}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  phoneNumber: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.phoneNumber.required
                              }
                              error={errors.phoneNumber}
                            />
                          </Grid.Col>

                        </Grid>
                      </Stack>
                    </Stepper.Step>

                    <Stepper.Step
                      label="Additional Info"
                      description="PWD, JEE & Address details"
                      icon={<GraduationCap size={18} />}
                    >
                      <Stack spacing="md" mt="lg">
                        <Title order={3} size="h4" weight={700} mb="md">
                          Additional Info
                        </Title>

                        {/* Date of Birth and Blood Group */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="date"
                              label={STUDENT_FIELDS_CONFIG.dob.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.dob.placeholder
                              }
                              value={manualFormData.dob || ""}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  dob: e.target.value,
                                })
                              }
                              required={STUDENT_FIELDS_CONFIG.dob.required}
                              error={errors.dob}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              label={STUDENT_FIELDS_CONFIG.bloodGroup.label}
                              placeholder={STUDENT_FIELDS_CONFIG.bloodGroup.placeholder}
                              value={manualFormData.bloodGroup || ""}
                              onChange={(value) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    bloodGroup: value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  bloodGroup: value,
                                });
                              }}
                              data={STUDENT_FIELDS_CONFIG.bloodGroup.options}
                              error={errors.bloodGroup}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Blood Group Remarks - Show only when "Other" is selected */}
                        {manualFormData.bloodGroup === "Other" && (
                          <Grid>
                            <Grid.Col span={isMobile ? 12 : 6}>
                              <TextInput
                                label={STUDENT_FIELDS_CONFIG.bloodGroupRemarks.label}
                                placeholder={STUDENT_FIELDS_CONFIG.bloodGroupRemarks.placeholder}
                                value={manualFormData.bloodGroupRemarks || ""}
                                onChange={(e) => {
                                  if (editingStudent) {
                                    setEditingStudent({
                                      ...editingStudent,
                                      bloodGroupRemarks: e.target.value,
                                    });
                                  }
                                  setManualFormData({
                                    ...manualFormData,
                                    bloodGroupRemarks: e.target.value,
                                  });
                                }}
                                error={errors.bloodGroupRemarks}
                              />
                            </Grid.Col>
                          </Grid>
                        )}

                        {/* Country and Nationality */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.country.label}
                              placeholder={STUDENT_FIELDS_CONFIG.country.placeholder}
                              value={manualFormData.country || ""}
                              onChange={(e) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    country: e.target.value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  country: e.target.value,
                                });
                              }}
                              error={errors.country}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.nationality.label}
                              placeholder={STUDENT_FIELDS_CONFIG.nationality.placeholder}
                              value={manualFormData.nationality || ""}
                              onChange={(e) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    nationality: e.target.value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  nationality: e.target.value,
                                });
                              }}
                              error={errors.nationality}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Admission Mode */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              key="admission-mode-field"
                              label={STUDENT_FIELDS_CONFIG.admissionMode.label}
                              placeholder={STUDENT_FIELDS_CONFIG.admissionMode.placeholder}
                              value={manualFormData.admissionMode || ""}
                              onChange={(value) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    admissionMode: value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  admissionMode: value,
                                });
                              }}
                              data={STUDENT_FIELDS_CONFIG.admissionMode.options}
                              error={errors.admissionMode}
                            />
                          </Grid.Col>

                          {/* Admission Mode Remarks - Show only when "Any other (remarks)" is selected */}
                          {manualFormData.admissionMode === "Any other (remarks)" && (
                            <Grid.Col span={isMobile ? 12 : 6}>
                              <TextInput
                                label={STUDENT_FIELDS_CONFIG.admissionModeRemarks.label}
                                placeholder={STUDENT_FIELDS_CONFIG.admissionModeRemarks.placeholder}
                                value={manualFormData.admissionModeRemarks || ""}
                                onChange={(e) => {
                                  if (editingStudent) {
                                    setEditingStudent({
                                      ...editingStudent,
                                      admissionModeRemarks: e.target.value,
                                    });
                                  }
                                  setManualFormData({
                                    ...manualFormData,
                                    admissionModeRemarks: e.target.value,
                                  });
                                }}
                                error={errors.admissionModeRemarks}
                              />
                            </Grid.Col>
                          )}
                        </Grid>

                        {/* Income Group and Income */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              label={STUDENT_FIELDS_CONFIG.incomeGroup.label}
                              placeholder={STUDENT_FIELDS_CONFIG.incomeGroup.placeholder}
                              value={manualFormData.incomeGroup || ""}
                              onChange={(value) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    incomeGroup: value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  incomeGroup: value,
                                });
                              }}
                              data={STUDENT_FIELDS_CONFIG.incomeGroup.options}
                              error={errors.incomeGroup}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="number"
                              label={STUDENT_FIELDS_CONFIG.income.label}
                              placeholder={STUDENT_FIELDS_CONFIG.income.placeholder}
                              value={manualFormData.income || ""}
                              onChange={(e) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    income: e.target.value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  income: e.target.value,
                                });
                              }}
                              error={errors.income}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Parent Email */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="email"
                              label={STUDENT_FIELDS_CONFIG.parentEmail.label}
                              placeholder={STUDENT_FIELDS_CONFIG.parentEmail.placeholder}
                              value={manualFormData.parentEmail || ""}
                              onChange={(e) => {
                                if (editingStudent) {
                                  setEditingStudent({
                                    ...editingStudent,
                                    parentEmail: e.target.value,
                                  });
                                }
                                setManualFormData({
                                  ...manualFormData,
                                  parentEmail: e.target.value,
                                });
                              }}
                              error={errors.parentEmail}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* JEE App No */}
                        <TextInput
                          label={STUDENT_FIELDS_CONFIG.jeeAppNo.label}
                          placeholder={
                            STUDENT_FIELDS_CONFIG.jeeAppNo.placeholder
                          }
                          value={manualFormData.jeeAppNo}
                          onChange={(e) =>
                            setManualFormData({
                              ...manualFormData,
                              jeeAppNo: e.target.value,
                            })
                          }
                          required={STUDENT_FIELDS_CONFIG.jeeAppNo.required}
                          error={errors.jeeAppNo}
                        />

                        {/* Address */}
                        <Textarea
                          label={STUDENT_FIELDS_CONFIG.address.label}
                          placeholder={
                            STUDENT_FIELDS_CONFIG.address.placeholder
                          }
                          value={manualFormData.address}
                          onChange={(e) =>
                            setManualFormData({
                              ...manualFormData,
                              address: e.target.value,
                            })
                          }
                          required={STUDENT_FIELDS_CONFIG.address.required}
                          error={errors.address}
                          minRows={3}
                        />

                        {/* State */}
                        <TextInput
                          label={STUDENT_FIELDS_CONFIG.state.label}
                          placeholder={STUDENT_FIELDS_CONFIG.state.placeholder}
                          value={manualFormData.state}
                          onChange={(e) =>
                            setManualFormData({
                              ...manualFormData,
                              state: e.target.value,
                            })
                          }
                          required={STUDENT_FIELDS_CONFIG.state.required}
                          error={errors.state}
                        />

                        {/* Father's Details */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={
                                STUDENT_FIELDS_CONFIG.fatherOccupation.label
                              }
                              placeholder={
                                STUDENT_FIELDS_CONFIG.fatherOccupation
                                  .placeholder
                              }
                              value={manualFormData.fatherOccupation}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  fatherOccupation: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.fatherOccupation.required
                              }
                              error={errors.fatherOccupation}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.fatherMobile.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.fatherMobile.placeholder
                              }
                              value={manualFormData.fatherMobile}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  fatherMobile: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.fatherMobile.required
                              }
                              error={errors.fatherMobile}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Mother's Details */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={
                                STUDENT_FIELDS_CONFIG.motherOccupation.label
                              }
                              placeholder={
                                STUDENT_FIELDS_CONFIG.motherOccupation
                                  .placeholder
                              }
                              value={manualFormData.motherOccupation}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  motherOccupation: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.motherOccupation.required
                              }
                              error={errors.motherOccupation}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.motherMobile.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.motherMobile.placeholder
                              }
                              value={manualFormData.motherMobile}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  motherMobile: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.motherMobile.required
                              }
                              error={errors.motherMobile}
                            />
                          </Grid.Col>
                        </Grid>
                      </Stack>
                    </Stepper.Step>

                    <Stepper.Step
                      label="Academic Info"
                      description="Branch & marks details"
                      icon={<GraduationCap size={18} />}
                    >
                      <Stack spacing="md" mt="lg">
                        <Title order={3} size="h4" weight={700} mb="md">
                          Academic Info
                        </Title>

                        {/* Branch Selection */}
                        <Select
                          label={STUDENT_FIELDS_CONFIG.branch.label}
                          placeholder={STUDENT_FIELDS_CONFIG.branch.placeholder}
                          value={manualFormData.branch || ""}
                          onChange={(value) => {
                            if (editingStudent) {
                              setEditingStudent({
                                ...editingStudent,
                                branch: value,
                              });
                            }
                            setManualFormData({
                              ...manualFormData,
                              branch: value,
                            });
                          }}
                          data={STUDENT_FIELDS_CONFIG.branch.options}
                          required={STUDENT_FIELDS_CONFIG.branch.required}
                          error={errors.branch}
                          searchable
                        />

                        {/* Specialization - Only for PG and PhD programmes */}
                        {(activeSection === "pg" || activeSection === "phd") && (
                          <Select
                            label={STUDENT_FIELDS_CONFIG.specialization.label}
                            placeholder={
                              STUDENT_FIELDS_CONFIG.specialization.placeholder
                            }
                            value={manualFormData.specialization || ""}
                            onChange={(value) => {
                              if (editingStudent) {
                                setEditingStudent({
                                  ...editingStudent,
                                  specialization: value,
                                });
                              }
                              setManualFormData({
                                ...manualFormData,
                                specialization: value,
                              });
                            }}
                            data={STUDENT_FIELDS_CONFIG.specialization.options}
                            required={STUDENT_FIELDS_CONFIG.specialization.required}
                            error={errors.specialization}
                            searchable
                            clearable
                          />
                        )}
                        {/* AI Rank and Category Rank */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="number"
                              label="AI Rank"
                              placeholder="Enter AI rank"
                              value={manualFormData.jeeRank}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  jeeRank: e.target.value,
                                })
                              }
                              required={STUDENT_FIELDS_CONFIG.jeeRank.required}
                              error={errors.jeeRank}
                              min={1}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="number"
                              label={STUDENT_FIELDS_CONFIG.categoryRank.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.categoryRank.placeholder
                              }
                              value={manualFormData.categoryRank}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  categoryRank: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.categoryRank.required
                              }
                              error={errors.categoryRank}
                              min={1}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Allotted Category and Gender */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              key="allotted-category-field"
                              label={STUDENT_FIELDS_CONFIG.allottedCategory.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.allottedCategory.placeholder
                              }
                              value={manualFormData.allottedCategory || ""}
                              onChange={(value) => {
                                setManualFormData({
                                  ...manualFormData,
                                  allottedCategory: value,
                                });
                              }}
                              data={STUDENT_FIELDS_CONFIG.allottedCategory.options.map(option => ({
                                value: option.value,
                                label: option.label
                              }))}
                              required={
                                STUDENT_FIELDS_CONFIG.allottedCategory.required
                              }
                              error={errors.allottedCategory}
                              searchable
                              clearable
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <Select
                              label={
                                STUDENT_FIELDS_CONFIG.allottedGender.label
                              }
                              placeholder={
                                STUDENT_FIELDS_CONFIG.allottedGender.placeholder
                              }
                              value={manualFormData.allottedGender || ""}
                              onChange={(value) =>
                                setManualFormData({
                                  ...manualFormData,
                                  allottedGender: value,
                                })
                              }
                              data={
                                STUDENT_FIELDS_CONFIG.allottedGender.options
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.allottedGender.required
                              }
                              error={errors.allottedGender}
                            />
                          </Grid.Col>
                        </Grid>

                        {/* Institute Details */}
                        <Grid>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              label={STUDENT_FIELDS_CONFIG.rollNumber.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.rollNumber.placeholder
                              }
                              value={manualFormData.rollNumber}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  rollNumber: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.rollNumber.required
                              }
                              error={errors.rollNumber}
                            />
                          </Grid.Col>
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="email"
                              label={STUDENT_FIELDS_CONFIG.instituteEmail.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.instituteEmail.placeholder
                              }
                              value={manualFormData.instituteEmail}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  instituteEmail: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.instituteEmail.required
                              }
                              error={errors.instituteEmail}
                            />
                          </Grid.Col>
                          
                          <Grid.Col span={isMobile ? 12 : 6}>
                            <TextInput
                              type="email"
                              label={STUDENT_FIELDS_CONFIG.alternateEmail.label}
                              placeholder={
                                STUDENT_FIELDS_CONFIG.alternateEmail.placeholder
                              }
                              value={manualFormData.alternateEmail || ""}
                              onChange={(e) =>
                                setManualFormData({
                                  ...manualFormData,
                                  alternateEmail: e.target.value,
                                })
                              }
                              required={
                                STUDENT_FIELDS_CONFIG.alternateEmail.required
                              }
                              error={errors.alternateEmail}
                            />
                          </Grid.Col>
                        </Grid>
                      </Stack>
                    </Stepper.Step>

                    <Stepper.Step
                      label="Review & Submit"
                      description="Verify details"
                      icon={<Check size={18} />}
                    >
                      <Stack spacing="lg" mt="lg">
                        <div style={{ textAlign: "center", marginBottom: "20px" }}>
                          <Title order={2} size="h3" weight={700} mb="xs" color="#2c3e50">
                            📋 Review & Submit
                          </Title>
                          <Text size="md" color="dimmed">
                            Please review all the information below before submitting
                          </Text>
                        </div>

                        {/* Basic Information Card */}
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            padding: "20px",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
                            <div style={{ 
                              backgroundColor: "#3498db", 
                              borderRadius: "50%", 
                              width: "32px", 
                              height: "32px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              marginRight: "12px"
                            }}>
                              <Text color="white" size="sm" weight={700}>👤</Text>
                            </div>
                            <Title order={4} weight={600} color="#2c3e50">
                              Basic Information
                            </Title>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>FULL NAME</Text>
                              <Text size="sm" weight={500}>{manualFormData.name || "Not provided"}</Text>
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>FATHER'S NAME</Text>
                              <Text size="sm" weight={500}>{manualFormData.fname || "Not provided"}</Text>
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>MOTHER'S NAME</Text>
                              <Text size="sm" weight={500}>{manualFormData.mname || "Not provided"}</Text>
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>GENDER</Text>
                              <Text size="sm" weight={500}>{manualFormData.gender || "Not selected"}</Text>
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>CATEGORY</Text>
                              <Text size="sm" weight={500}>{manualFormData.category || "Not selected"}</Text>
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>MINORITY</Text>
                              <Text size="sm" weight={500}>{manualFormData.minority || "Not specified"}</Text>
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>PWD STATUS</Text>
                              <Text size="sm" weight={500}>{manualFormData.pwd || "Not specified"}</Text>
                            </div>
                            {manualFormData.pwd === "YES" && manualFormData.pwdCategory && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>PWD CATEGORY</Text>
                                <Text size="sm" weight={500}>{manualFormData.pwdCategory}</Text>
                              </div>
                            )}
                            {manualFormData.pwdCategory === "Any other (remarks)" && manualFormData.pwdCategoryRemarks && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>PWD CATEGORY REMARKS</Text>
                                <Text size="sm" weight={500}>{manualFormData.pwdCategoryRemarks}</Text>
                              </div>
                            )}
                            {manualFormData.phoneNumber && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>PHONE NUMBER</Text>
                                <Text size="sm" weight={500}>{manualFormData.phoneNumber}</Text>
                              </div>
                            )}
                            {manualFormData.parentEmail && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>PARENT'S EMAIL</Text>
                                <Text size="sm" weight={500}>{manualFormData.parentEmail}</Text>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Additional Information Card */}
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            padding: "20px",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
                            <div style={{ 
                              backgroundColor: "#27ae60", 
                              borderRadius: "50%", 
                              width: "32px", 
                              height: "32px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              marginRight: "12px"
                            }}>
                              <Text color="white" size="sm" weight={700}>📄</Text>
                            </div>
                            <Title order={4} weight={600} color="#2c3e50">
                              Additional Information
                            </Title>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                            {manualFormData.dob && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>DATE OF BIRTH</Text>
                                <Text size="sm" weight={500}>{manualFormData.dob}</Text>
                              </div>
                            )}
                            {manualFormData.bloodGroup && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>BLOOD GROUP</Text>
                                <Text size="sm" weight={500}>{manualFormData.bloodGroup}</Text>
                              </div>
                            )}
                            {manualFormData.bloodGroupRemarks && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>BLOOD GROUP REMARKS</Text>
                                <Text size="sm" weight={500}>{manualFormData.bloodGroupRemarks}</Text>
                              </div>
                            )}
                            {manualFormData.country && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>COUNTRY</Text>
                                <Text size="sm" weight={500}>{manualFormData.country}</Text>
                              </div>
                            )}
                            {manualFormData.nationality && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>NATIONALITY</Text>
                                <Text size="sm" weight={500}>{manualFormData.nationality}</Text>
                              </div>
                            )}
                            {manualFormData.admissionMode && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>ADMISSION MODE</Text>
                                <Text size="sm" weight={500}>{manualFormData.admissionMode}</Text>
                              </div>
                            )}
                            {manualFormData.admissionMode === "Any other (remarks)" && manualFormData.admissionModeRemarks && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>ADMISSION MODE REMARKS</Text>
                                <Text size="sm" weight={500}>{manualFormData.admissionModeRemarks}</Text>
                              </div>
                            )}
                            {manualFormData.incomeGroup && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>INCOME GROUP</Text>
                                <Text size="sm" weight={500}>{manualFormData.incomeGroup}</Text>
                              </div>
                            )}
                            {manualFormData.income && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>INCOME</Text>
                                <Text size="sm" weight={500}>₹{parseInt(manualFormData.income).toLocaleString('en-IN')}</Text>
                              </div>
                            )}
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>JEE APPLICATION NO.</Text>
                              <Text size="sm" weight={500}>{manualFormData.jeeAppNo || "Not provided"}</Text>
                            </div>
                            {(activeSection === "pg" || activeSection === "phd") && manualFormData.specialization && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>SPECIALIZATION</Text>
                                <Text size="sm" weight={500}>{manualFormData.specialization}</Text>
                              </div>
                            )}
                            {manualFormData.address && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px", gridColumn: "1 / -1" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>ADDRESS</Text>
                                <Text size="sm" weight={500}>{manualFormData.address}</Text>
                              </div>
                            )}
                            {manualFormData.state && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>STATE</Text>
                                <Text size="sm" weight={500}>{manualFormData.state}</Text>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Family Information Card */}
                        {(manualFormData.fatherOccupation || manualFormData.fatherMobile || manualFormData.motherOccupation || manualFormData.motherMobile) && (
                          <div
                            style={{
                              backgroundColor: "#ffffff",
                              padding: "20px",
                              borderRadius: "12px",
                              border: "1px solid #e9ecef",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
                              <div style={{ 
                                backgroundColor: "#e67e22", 
                                borderRadius: "50%", 
                                width: "32px", 
                                height: "32px", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                marginRight: "12px"
                              }}>
                                <Text color="white" size="sm" weight={700}>👨‍👩‍👧‍👦</Text>
                              </div>
                              <Title order={4} weight={600} color="#2c3e50">
                                Family Information
                              </Title>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                              {manualFormData.fatherOccupation && (
                                <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                  <Text size="xs" weight={600} color="dimmed" mb={2}>FATHER'S OCCUPATION</Text>
                                  <Text size="sm" weight={500}>{manualFormData.fatherOccupation}</Text>
                                </div>
                              )}
                              {manualFormData.fatherMobile && (
                                <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                  <Text size="xs" weight={600} color="dimmed" mb={2}>FATHER'S MOBILE</Text>
                                  <Text size="sm" weight={500}>{manualFormData.fatherMobile}</Text>
                                </div>
                              )}
                              {manualFormData.motherOccupation && (
                                <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                  <Text size="xs" weight={600} color="dimmed" mb={2}>MOTHER'S OCCUPATION</Text>
                                  <Text size="sm" weight={500}>{manualFormData.motherOccupation}</Text>
                                </div>
                              )}
                              {manualFormData.motherMobile && (
                                <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                  <Text size="xs" weight={600} color="dimmed" mb={2}>MOTHER'S MOBILE</Text>
                                  <Text size="sm" weight={500}>{manualFormData.motherMobile}</Text>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Academic Information Card */}
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            padding: "20px",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
                            <div style={{ 
                              backgroundColor: "#9b59b6", 
                              borderRadius: "50%", 
                              width: "32px", 
                              height: "32px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              marginRight: "12px"
                            }}>
                              <Text color="white" size="sm" weight={700}>🎓</Text>
                            </div>
                            <Title order={4} weight={600} color="#2c3e50">
                              Academic Information
                            </Title>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                            <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                              <Text size="xs" weight={600} color="dimmed" mb={2}>BRANCH</Text>
                              <Text size="sm" weight={500}>{manualFormData.branch || "Not selected"}</Text>
                            </div>
                            {(activeSection === "pg" || activeSection === "phd") && manualFormData.specialization && (
                              <div style={{ padding: "8px", backgroundColor: "#e8f4fd", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>SPECIALIZATION</Text>
                                <Text size="sm" weight={500}>{manualFormData.specialization}</Text>
                              </div>
                            )}
                            {manualFormData.jeeRank && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>AI RANK</Text>
                                <Text size="sm" weight={500}>{manualFormData.jeeRank}</Text>
                              </div>
                            )}
                            {manualFormData.categoryRank && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>CATEGORY RANK</Text>
                                <Text size="sm" weight={500}>{manualFormData.categoryRank}</Text>
                              </div>
                            )}
                            {manualFormData.allottedCategory && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>ALLOTTED CATEGORY</Text>
                                <Text size="sm" weight={500}>{manualFormData.allottedCategory}</Text>
                              </div>
                            )}
                            {manualFormData.allottedGender && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>ALLOTTED GENDER</Text>
                                <Text size="sm" weight={500}>{manualFormData.allottedGender}</Text>
                              </div>
                            )}
                            {manualFormData.rollNumber && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>INSTITUTE ROLL NUMBER</Text>
                                <Text size="sm" weight={500}>{manualFormData.rollNumber}</Text>
                              </div>
                            )}
                            {manualFormData.instituteEmail && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>INSTITUTE EMAIL ID</Text>
                                <Text size="sm" weight={500}>{manualFormData.instituteEmail}</Text>
                              </div>
                            )}
                            {manualFormData.alternateEmail && (
                              <div style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                                <Text size="xs" weight={600} color="dimmed" mb={2}>ALTERNATE EMAIL</Text>
                                <Text size="sm" weight={500}>{manualFormData.alternateEmail}</Text>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Confirmation Message */}
                        <div
                          style={{
                            backgroundColor: "#d4edda",
                            padding: "15px",
                            borderRadius: "8px",
                            border: "1px solid #c3e6cb",
                            textAlign: "center",
                          }}
                        >
                          <Text size="sm" color="#155724" weight={500}>
                            ✅ Please verify all the information above is correct before submitting
                          </Text>
                        </div>
                      </Stack>
                    </Stepper.Step>
                  </Stepper>

                  <Group position="apart" mt="xl">
                    <Button
                      variant="default"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                    >
                      <CaretLeft size={16} style={{ marginRight: "8px" }} />
                      Previous
                    </Button>
                    <Button
                      onClick={nextStep}
                      style={{ backgroundColor: "#3498db" }}
                    >
                      {currentStep === 3
                        ? editingStudent
                          ? "Update"
                          : "Submit"
                        : "Next"}
                      {currentStep === 3 ? (
                        <Check size={16} style={{ marginLeft: "8px" }} />
                      ) : (
                        <CaretRight size={16} style={{ marginLeft: "8px" }} />
                      )}
                    </Button>
                  </Group>
                </Card>
              </Stack>
            </Container>
          )}
        </Modal>

        {/* Student List Modal */}
        <Modal
          opened={showStudentModal}
          onClose={() => {
            setShowStudentModal(false);
            setSelectedBatch(null);
            setStudentList([]);
            setStudentSearchQuery("");
            setShowExportModal(false);
          }}
          title={
            <Text size="lg" weight={600} color="#3498db">
              📋 Students in {selectedBatch?.displayBranch || "Branch"} -{" "}
              {selectedBatch?.programme} ({getCurrentAcademicYear()})
            </Text>
          }
          size="90vw"
          centered
          padding="md"
          styles={{
            modal: {
              maxWidth: "95vw",
              maxHeight: "90vh",
            },
            body: {
              padding: "20px",
              maxHeight: "75vh",
              overflow: "auto",
            },
          }}
        >
          <Stack spacing="md">
            {selectedBatch && (
              <Card
                withBorder
                padding="md"
                style={{ backgroundColor: "#f8f9fa" }}
              >
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm">
                      <strong>Programme:</strong> {selectedBatch.programme}
                    </Text>
                    <Text size="sm">
                      <strong>Branch:</strong> {selectedBatch.displayBranch}
                    </Text>
                    <Text size="sm">
                      <strong>Academic Year:</strong> {getCurrentAcademicYear()}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm">
                      <strong>Total Seats:</strong> {selectedBatch.totalSeats}
                    </Text>
                    <Text size="sm">
                      <strong>Filled Seats:</strong> {selectedBatch.filledSeats}
                    </Text>
                    <Text size="sm">
                      <strong>Available Seats:</strong>{" "}
                      {selectedBatch.availableSeats}
                    </Text>
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            {/* Search and Export Controls */}
            <Box
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                padding: "20px",
                border: "1px solid #e2e8f0",
              }}
            >
              <Group justify="space-between" align="center">
                <TextInput
                  placeholder="Search"
                  value={studentSearchQuery}
                  onChange={(event) =>
                    setStudentSearchQuery(event.currentTarget.value)
                  }
                  leftSection={<MagnifyingGlass size={18} color="#6b7280" />}
                  size="md"
                  radius="md"
                  style={{
                    flex: 1,
                    maxWidth: "450px",
                    fontSize: "14px",
                  }}
                  styles={{
                    input: {
                      border: "1px solid #d1d5db",
                      backgroundColor: "#ffffff",
                      "&:focus": {
                        borderColor: "#3b82f6",
                        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                      },
                    },
                  }}
                />
                <Group spacing="md">
                  <Text
                    size="sm"
                    color="#6b7280"
                    weight={500}
                    style={{ minWidth: "120px" }}
                  >
                    Showing {getFilteredStudents().length} of{" "}
                    {studentList.length} students
                  </Text>
                  {/* Bulk Status Change Buttons */}
                  {isViewingCurrentYear() && selectedStudents.size > 0 && (
                    <Group spacing="sm">
                      <Button
                        leftSection={<Check size={18} />}
                        onClick={() => handleBulkStatusChange("REPORTED")}
                        disabled={isBulkReporting}
                        loading={isBulkReporting}
                        variant="filled"
                        color="green"
                        size="md"
                        radius="md"
                        style={{
                          fontWeight: 500,
                          backgroundColor: "#16a34a",
                          minWidth: "130px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        Report ({selectedStudents.size})
                      </Button>
                      <Button
                        leftSection={<Warning size={18} />}
                        onClick={() => handleBulkStatusChange("WITHDRAWAL")}
                        disabled={isBulkReporting}
                        loading={isBulkReporting}
                        variant="filled"
                        color="red"
                        size="md"
                        radius="md"
                        style={{
                          fontWeight: 500,
                          backgroundColor: "#dc2626",
                          minWidth: "130px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        Withdraw ({selectedStudents.size})
                      </Button>
                    </Group>
                  )}
                  <Button
                    leftSection={<Download size={18} />}
                    onClick={() => setShowExportModal(true)}
                    disabled={studentList.length === 0}
                    variant="filled"
                    color="blue"
                    size="md"
                    radius="md"
                    style={{
                      fontWeight: 500,
                      backgroundColor: "#2563eb",
                      minWidth: "140px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Export Data
                  </Button>
                </Group>
              </Group>
            </Box>

            {studentList.length > 0 ? (
              <div
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <ScrollArea style={{ height: "70vh", width: "100%" }}>
                  <Table
                    striped
                    highlightOnHover
                    className="auto-width-table"
                    style={{
                      minWidth: "1800px",
                      fontSize: "13px",
                      tableLayout: "auto",
                    }}
                  >
                    <thead style={{ position: "sticky", top: 0, zIndex: 15 }}>
                      <tr
                        style={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e2e8f0",
                        }}
                      >
                        {/* S.No Column - Sticky */}
                        <th
                          style={{
                            padding: "16px 12px",
                            textAlign: "center",
                            color: "#1e293b",
                            minWidth: "60px",
                            position: "sticky",
                            left: "0px",
                            backgroundColor: "#f8fafc",
                            zIndex: 20,
                            borderRight: "2px solid #e2e8f0",
                            fontWeight: "bold",
                            fontSize: "13px",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          S.No
                        </th>
                        {/* Dynamic Column Headers from STUDENT_TABLE_COLUMNS */}
                        {STUDENT_TABLE_COLUMNS.map((column, index) => (
                          <th
                            key={column.key}
                            style={{
                              padding: "16px 12px",
                              textAlign: "center",
                              color: "#1e293b",
                              minWidth: column.minWidth,
                              fontWeight: "bold",
                              fontSize: "13px",
                              ...(index === 0 ? {
                                // JEE Application Number - First sticky column
                                position: "sticky",
                                left: "60px",
                                backgroundColor: "#f8fafc",
                                zIndex: 20,
                                borderRight: "2px solid #e2e8f0",
                                borderBottom: "2px solid #e2e8f0",
                              } : index === 1 ? {
                                // Roll Number - Second sticky column
                                position: "sticky", 
                                left: "200px",
                                backgroundColor: "#f8fafc",
                                zIndex: 20,
                                borderRight: "2px solid #e2e8f0",
                                borderBottom: "2px solid #e2e8f0",
                              } : {})
                            }}
                          >
                            {column.label}
                          </th>
                        ))}
                        {isViewingCurrentYear() && (
                          <th
                            style={{
                              padding: "16px 12px",
                              textAlign: "center",
                              color: "#1e293b",
                              minWidth: "150px",
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                              <span>Status</span>
                              <Checkbox
                                checked={isAllSelected}
                                indeterminate={
                                  selectedStudents.size > 0 && !isAllSelected
                                }
                                onChange={handleSelectAll}
                                size="sm"
                                color="blue"
                                label=""
                                aria-label="Select all students"
                              />
                            </div>
                          </th>
                        )}
                        {isViewingCurrentYear() && (
                          <th
                            style={{
                              padding: "16px 12px",
                              textAlign: "center",
                              color: "#1e293b",
                              minWidth: "150px",
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredStudents().map((student, index) => {
                        const uniqueKey = student.id || 
                                        student.student_id || 
                                        student.jee_app_no || 
                                        student.jeeAppNo ||
                                        student.roll_number || 
                                        student.rollNumber ||
                                        `student_${index}_${student.name}_${student.dob || student.date_of_birth}`;
                        
                        return (
                        <tr
                          key={uniqueKey}
                          style={{
                            cursor: "pointer",
                            transition: "background-color 0.2s ease",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f8fafc")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <td
                            style={{
                              padding: "14px 12px",
                              textAlign: "center",
                              position: "sticky",
                              left: "0px",
                              backgroundColor: "#ffffff",
                              zIndex: 10,
                              fontWeight: "bold",
                              borderRight: "2px solid #e5e7eb",
                              fontSize: "13px",
                              color: "#1f2937",
                            }}
                          >
                            {index + 1}
                          </td>
                          {/* Dynamic Data Columns from STUDENT_TABLE_COLUMNS */}
                          {STUDENT_TABLE_COLUMNS.map((column, colIndex) => (
                            <td
                              key={column.key}
                              style={{
                                padding: "14px 12px",
                                textAlign: colIndex === 0 || colIndex === 1 ? "left" : "center",
                                fontSize: "12px",
                                color: "#374151",
                                wordBreak: "break-word",
                                whiteSpace: "normal",
                                ...(colIndex === 0 ? {
                                  // JEE Application Number - First sticky column
                                  position: "sticky",
                                  left: "60px",
                                  backgroundColor: "#ffffff",
                                  zIndex: 10,
                                  borderRight: "2px solid #e5e7eb",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  color: "#111827",
                                } : colIndex === 1 ? {
                                  // Roll Number - Second sticky column
                                  position: "sticky",
                                  left: "200px",
                                  backgroundColor: "#ffffff",
                                  zIndex: 10,
                                  borderRight: "2px solid #e5e7eb",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  color: "#111827",
                                } : {})
                              }}
                            >
                              {colIndex === 1 && column.key === 'rollNumber' ? (
                                <Badge color="blue" variant="light" size="sm">
                                  {getStudentFieldValue(student, column)}
                                </Badge>
                              ) : (
                                getStudentFieldValue(student, column)
                              )}
                            </td>
                          ))}

                          {/* Status and Actions Columns */}
                          {isViewingCurrentYear() && (
                            <td
                              style={{
                                padding: "14px 12px",
                                textAlign: "center",
                                fontSize: "12px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                {getReportedStatusBadge(student.reportedStatus || student.reported_status || "NOT_REPORTED")}
                                <Checkbox
                                  checked={selectedStudents.has(student.id || student.student_id)}
                                  onChange={() => handleStudentSelect(student.id || student.student_id)}
                                  size="sm"
                                  color="blue"
                                  aria-label={`Select student ${student.name || student.rollNumber || student.roll_number}`}
                                />
                              </div>
                            </td>
                          )}
                          {isViewingCurrentYear() && (
                            <td
                              style={{
                                padding: "14px 12px",
                                textAlign: "center",
                                fontSize: "12px",
                              }}
                            >
                              <Flex gap="8px" justify="center" align="center">
                                <Select
                                  data={[
                                    { value: "REPORTED", label: "Reported" },
                                    { value: "NOT_REPORTED", label: "Not Reported" },
                                    { value: "WITHDRAWAL", label: "Withdrawal" },
                                  ]}
                                  value={student.reportedStatus || student.reported_status || "NOT_REPORTED"}
                                  onChange={(value) => handleReportedStatusChange(student.id || student.student_id, value)}
                                  size="xs"
                                  variant="filled"
                                  disabled={updatingReportStatus === (student.id || student.student_id)}
                                  style={{ minWidth: "100px" }}
                                />
                                <ActionIcon
                                  size="sm"
                                  variant="outline"
                                  color="blue"
                                  loading={
                                    editingStudent ===
                                    (student.id || student.student_id)
                                  }
                                  onClick={() => handleEditStudent(student)}
                                  style={{
                                    borderRadius: "6px",
                                  }}
                                >
                                  <PencilSimple size={14} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  variant="outline"
                                  color="red"
                                  loading={
                                    deletingStudent ===
                                    (student.id || student.student_id)
                                  }
                                  onClick={() => handleDeleteStudent(student)}
                                  style={{
                                    borderRadius: "6px",
                                  }}
                                >
                                  <X size={14} />
                                </ActionIcon>
                              </Flex>
                            </td>
                          )}
                        </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <Paper
                padding="xl"
                style={{ textAlign: "center", backgroundColor: "#f8f9fa" }}
              >
                <Text size="lg" color="dimmed">
                  No students found in this batch
                </Text>
                <Text size="sm" color="dimmed" mt="xs">
                  Students will appear here after they are uploaded and
                  allocated roll numbers
                </Text>
              </Paper>
            )}
          </Stack>
        </Modal>

        {/* Add New Batch Modal */}
        <Modal
          opened={showAddBatchModal}
          onClose={() => setShowAddBatchModal(false)}
          title="Add New Batch"
          size="md"
          centered
        >
          <Stack spacing="md">
            <Select
              label="Programme"
              placeholder="Select programme"
              value={newBatchData.programme}
              onChange={(value) =>
                setNewBatchData({ ...newBatchData, programme: value })
              }
              data={getProgrammeOptions()}
              required
            />

            <Select
              label="Discipline"
              placeholder="Select discipline"
              value={newBatchData.discipline}
              onChange={(value) =>
                setNewBatchData({ ...newBatchData, discipline: value })
              }
              data={getDisciplineOptions(newBatchData.programme)}
              disabled={!newBatchData.programme}
              required
            />

            <TextInput
              label="Academic Year"
              placeholder="Enter year"
              value={newBatchData.year}
              onChange={(event) =>
                setNewBatchData({
                  ...newBatchData,
                  year: event.currentTarget.value,
                })
              }
              type="number"
              min="2020"
              max="2030"
              required
            />

            <TextInput
              label="Total Seats"
              placeholder="Enter total seats"
              value={newBatchData.totalSeats}
              onChange={(event) =>
                setNewBatchData({
                  ...newBatchData,
                  totalSeats: event.currentTarget.value,
                })
              }
              type="number"
              min="1"
              max="500"
              required
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setShowAddBatchModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBatch}
                disabled={
                  !newBatchData.programme ||
                  !newBatchData.discipline ||
                  !newBatchData.totalSeats
                }
              >
                Add Batch
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title={
            <Flex align="center" gap="sm">
              <ThemeIcon color="red" size="lg">
                <Trash size={20} />
              </ThemeIcon>
              <Text size="lg" weight={600}>
                Confirm Delete Batch
              </Text>
            </Flex>
          }
          size="md"
          centered
        >
          <Stack spacing="md">
            {(() => {
              // Find the batch being deleted to show its details
              const batchToDelete = [...ugBatches, ...pgBatches, ...phdBatches]
                .find(batch => batch.id === deletingBatchId);
              
              return (
                <>
                  <Text>
                    Are you sure you want to delete this batch? This action cannot be undone.
                  </Text>
                  
                  {batchToDelete && (
                    <Card withBorder p="md" bg="gray.1">
                      <Text size="sm" weight={500} mb={8}>
                        Batch Details:
                      </Text>
                      <Text size="sm">
                        <strong>Name:</strong> {batchToDelete.name || `${batchToDelete.programme} ${batchToDelete.displayBranch || batchToDelete.discipline}`}
                      </Text>
                      <Text size="sm">
                        <strong>Discipline:</strong> {batchToDelete.displayBranch || batchToDelete.discipline}
                      </Text>
                      <Text size="sm">
                        <strong>Year:</strong> {batchToDelete.year}
                      </Text>
                      <Text size="sm">
                        <strong>Total Seats:</strong> {batchToDelete.totalSeats || 0}
                      </Text>
                      <Text size="sm">
                        <strong>Filled Seats:</strong> {batchToDelete.filledSeats || 0}
                      </Text>
                    </Card>
                  )}

                  <Alert icon={<Warning size={16} />} title="Deletion Restrictions" color="orange">
                    <Text size="sm">
                      • Cannot delete if this batch has enrolled students<br/>
                      • Cannot delete if ANY students exist in this discipline across ALL batches<br/>
                      • The entire discipline must be empty before deletion
                    </Text>
                  </Alert>
                </>
              );
            })()}

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                color="red" 
                onClick={handleDeleteBatch}
                leftSection={<Trash size={16} />}
              >
                Delete Batch
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Delete Student Confirmation Modal */}
        <Modal
          opened={showDeleteStudentConfirm}
          onClose={() => setShowDeleteStudentConfirm(false)}
          title="Confirm Delete Student"
          size="lg"
          centered
        >
          <Stack spacing="md">
            <Text>
              Are you sure you want to delete student{" "}
              <strong>"{studentToDelete?.name}"</strong>?
            </Text>
            <Text size="sm" color="dimmed">
              This action cannot be undone.
            </Text>
            <Text size="sm" color="orange">
              Note: If this student has associated records in other modules,
              deletion may not be possible due to database constraints.
            </Text>

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setShowDeleteStudentConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                loading={deletingStudent === studentToDelete?.id}
                onClick={confirmDeleteStudent}
              >
                Delete Student
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Export Modal */}
        <Modal
            opened={showExportModal}
            onClose={() => setShowExportModal(false)}
            title={
              <Group spacing="sm" align="center">
                <Download size={18} color="#2563eb" />
                <Text size="md" weight={600} color="#1f2937">
                  Export Student Data
                </Text>
              </Group>
            }
            size="lg"
            centered
            padding="lg"
            styles={{
              modal: {
                backgroundColor: "#ffffff",
                borderRadius: "8px",
              },
              header: {
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                padding: "16px 20px",
              },
              body: {
                padding: "20px",
              },
            }}
          >
            <Stack spacing="md">
              <Text size="sm" color="#6b7280">
                Select export format and fields for data analysis.
              </Text>

              {/* Export Format Selection */}
              <Group spacing="sm">
                <Button
                  variant={exportFormat === "excel" ? "filled" : "light"}
                  color={exportFormat === "excel" ? "teal" : "gray"}
                  onClick={() => setExportFormat("excel")}
                  leftSection={<FileXls size={16} />}
                  size="sm"
                  radius="md"
                >
                  Excel
                </Button>
                <Button
                  variant={exportFormat === "csv" ? "filled" : "light"}
                  color={exportFormat === "csv" ? "blue" : "gray"}
                  onClick={() => setExportFormat("csv")}
                  leftSection={<Download size={16} />}
                  size="sm"
                  radius="md"
                >
                  CSV
                </Button>
              </Group>

              {/* Field Selection */}
              <Stack spacing="sm">
                <Group justify="space-between" align="center">
                  <Text weight={500} size="sm" color="#374151">
                    Select Fields
                  </Text>
                  <Switch
                    label="Select All"
                    checked={selectAllFields}
                    onChange={handleToggleAllFields}
                    size="sm"
                    color="blue"
                    styles={{
                      label: {
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#374151",
                      },
                    }}
                  />
                </Group>

                <Box
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "12px",
                  }}
                >
                  <Grid gutter="xs">
                    {getExportableFields().map((field) => (
                      <Grid.Col span={6} key={field.key}>
                        <Switch
                          label={field.label}
                          checked={selectedFields[field.key] || false}
                          onChange={(event) =>
                            handleFieldChange(
                              field.key,
                              event.currentTarget.checked,
                            )
                          }
                          size="xs"
                          color="blue"
                          styles={{
                            label: {
                              fontSize: "12px",
                              fontWeight: 400,
                            },
                          }}
                        />
                      </Grid.Col>
                    ))}
                  </Grid>
                </Box>
              </Stack>

              {/* Export Summary & Actions */}
              <Group
                justify="space-between"
                align="center"
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Group spacing="lg">
                  <Text size="xs" color="#6b7280">
                    <Text component="span" weight={600} color="#1e40af">
                      {getFilteredStudents().length}
                    </Text>{" "}
                    records
                  </Text>
                  <Text size="xs" color="#6b7280">
                    <Text component="span" weight={600} color="#1e40af">
                      {Object.values(selectedFields).filter(Boolean).length}
                    </Text>{" "}
                    fields
                  </Text>
                  <Text size="xs" color="#6b7280">
                    Format:{" "}
                    <Text
                      component="span"
                      weight={600}
                      color="#1e40af"
                      style={{ textTransform: "uppercase" }}
                    >
                      {exportFormat}
                    </Text>
                  </Text>
                </Group>
                <Group spacing="sm">
                  <Button
                    variant="outline"
                    color="gray"
                    onClick={() => setShowExportModal(false)}
                    disabled={isExporting}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    leftSection={<Download size={16} />}
                    onClick={handleStudentExport}
                    loading={isExporting}
                    disabled={
                      Object.values(selectedFields).filter(Boolean).length === 0
                    }
                    size="sm"
                    color="blue"
                  >
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Modal>
      </Container>
    </>
  );
};

export default AdminUpcomingBatch;
