import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  Text,
  Loader,
  Center,
  Select,
  Button,
  Box,
} from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { semesterOptionsRoute, currentCourseRegistrationRoute, courseRegistrationReceiptRoute } from "../../routes/academicRoutes";
import { getProfileDataRoute } from "../../routes/dashboardRoutes";
import axios from "axios";
import FusionTable from "../../components/FusionTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RegisteredCourses() {
  const [courses, setCourses] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [semesterValue, setSemesterValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState({});
  
  const user = useSelector((state) => state.user);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      const getValueSafely = (obj, paths) => {
        for (const path of paths) {
          const value = path.split('.').reduce((o, p) => o?.[p], obj);
          if (value) return value;
        }
        return "";
      };

      const extractStudentData = (data) => {
        const userData = data?.user || data?.current?.[0]?.user || data;
        
        let batchFromPattern = "";
        const rollNumber = data?.profile?.id || userData?.roll_no || userData?.username;
        if (rollNumber && /^(\d{2})\w+/.test(rollNumber)) {
          const yearMatch = rollNumber.match(/^(\d{2})/);
          if (yearMatch) {
            batchFromPattern = `20${yearMatch[1]}`;
          }
        }
        
        return {
          name: getValueSafely(userData, ['first_name', 'name', 'username']) + 
                (userData?.last_name ? ` ${userData.last_name}` : ''),
          rollNo: data?.profile?.id || getValueSafely(userData, ['roll_no', 'username', 'id', 'student_id']) || 
                  getValueSafely(data, ['roll_no', 'id', 'student_id']),
          programme: getValueSafely(data, ['profile.programme.name', 'programme.name', 'programme']) || "B.Tech",
          batch: getValueSafely(data, ['profile.batch', 'batch', 'year', 'academic_year', 'joining_year']) || 
                 getValueSafely(userData, ['batch', 'year', 'academic_year', 'joining_year']) || 
                 batchFromPattern,
          department: getValueSafely(data, ['profile.department.name', 'department.name', 'department', 'branch']),
        };
      };

      try {
        if (user?.username && user.username !== 'User') {
          setStudentInfo(extractStudentData(user));
        }

        const token = localStorage.getItem("authToken");
        if (token) {
          try {
            const response = await axios.get(getProfileDataRoute, {
              headers: { Authorization: `Token ${token}` },
            });
            
            if (response.data) {
              const profileData = Array.isArray(response.data) ? response.data[0] : response.data;
              setStudentInfo(prev => ({ ...prev, ...extractStudentData(profileData) }));
            }
          } catch (error) {
            setStudentInfo(prev => ({ ...prev, ...extractStudentData(user) }));
          }
        }
      } catch (error) {
        setStudentInfo(extractStudentData(user));
      }
    };

    (async () => {
      try {
        await fetchStudentProfile();
        
        const token = localStorage.getItem("authToken");
        const optsRes = await axios.get(semesterOptionsRoute, {
          headers: { Authorization: `Token ${token}` },
        });
        const formattedOptions = optsRes.data.semesters.map(
          ({ semester_no, semester_type, label }) => ({
            value: JSON.stringify({ no: Number(semester_no), type: semester_type }),
            label,
          })
        );
        setSemesterOptions(formattedOptions);
        await fetchCourses(undefined, formattedOptions);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    })();
  }, [user]);

  const fetchCourses = async (semJson, opts = semesterOptions) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      let url = currentCourseRegistrationRoute;
      if (semJson) {
        const { no, type } = JSON.parse(semJson);
        const params = new URLSearchParams({
          semester: no.toString(),
          semester_type: type,
        });
        url += `?${params.toString()}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Token ${token}` },
      });

      setCourses(res.data.reg_data || []);

      setStudentInfo(prev => ({
        ...prev,
        semester: res.data.sem_no || prev.semester,
        semesterType: res.data.semester_type || prev.semesterType,
        name: user?.username?.replace(/[_\s]+$/, '') || prev.name,
        rollNo: user?.roll_no || prev.rollNo,
      }));
      axios.get(courseRegistrationReceiptRoute, {
        headers: { Authorization: `Token ${token}` },
      }).then(receiptResponse => {
        if (receiptResponse.data && receiptResponse.data.branch) {
          setStudentInfo(prev => ({
            ...prev,
            department: receiptResponse.data.branch,
          }));
        }
      }).catch(() => {
      });

      const semNoNum = Number(res.data.sem_no);
      const semType = res.data.semester_type;
      const newValue = JSON.stringify({ no: semNoNum, type: semType });

      if (opts.some((opt) => opt.value === newValue)) {
        setSemesterValue(newValue);
      } else {
        setSemesterValue("");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  const handleSemesterChange = (value) => {
    setSemesterValue(value);
    fetchCourses(value);
  };

  const rows = courses.map((course) => ({
    "Course Code": course.course_id?.code || "",
    "Course Name": course.course_id?.name || "",
    "Registration Type": course.registration_type || "",
    Semester: course.semester_id?.semester_no || "",
    Credits: course.course_id?.credit || 0,
    "Replaced By": course.replaced_by?.length > 0 
      ? course.replaced_by.map(r => `${r.code} - ${r.name} (${r.label})`).join(', ')
      : "-",
  }));

  const totalCredits = courses.reduce(
    (sum, c) => sum + (c.course_id?.credit || 0),
    0
  );

  const DownloadRegistration = () => {
    const printRows = [...courses];
    for (let i = 0; i < 2; i++) {
      printRows.push({
        course_id: { code: "", name: "", credit: "" },
        registration_type: ""
      });
    }

    const tableStyle = {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "11px",
      marginBottom: "20px",
      border: "1px solid #000"
    };

    const thStyle = {
      border: "1px solid #000",
      padding: "8px",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: "10px"
    };

    const tdStyle = {
      border: "1px solid #000",
      padding: "6px",
      fontSize: "10px"
    };

    const tdCenterStyle = {
      ...tdStyle,
      textAlign: "center"
    };

    const TableHeader = () => (
      <thead>
        <tr>
          <th style={thStyle}>S. No.</th>
          <th style={thStyle}>Course ID</th>
          <th style={thStyle}>Course Name</th>
          <th style={thStyle}>Credits</th>
          <th style={thStyle}>Registration Type</th>
          <th style={thStyle}>Remarks</th>
        </tr>
      </thead>
    );

    const TableRow = ({ course, index }) => (
      <tr key={index} style={{ minHeight: "25px" }}>
        <td style={tdCenterStyle}>{index + 1}</td>
        <td style={tdStyle}>{course.course_id?.code || ""}</td>
        <td style={tdStyle}>{course.course_id?.name || ""}</td>
        <td style={tdCenterStyle}>{course.course_id?.credit || ""}</td>
        <td style={tdCenterStyle}>{course.registration_type || ""}</td>
        <td style={tdStyle}></td>
      </tr>
    );

    return (
      <Box
        id="download-registration"
        className="download-registration"
        style={{
          display: "none",
          backgroundColor: "white",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.4",
          color: "black",
          width: "210mm",
          padding: "15mm",
        }}
      >
        <div style={{ marginBottom: "30px" }}>
          <div style={{ 
            textAlign: "center", 
            fontWeight: "bold", 
            fontSize: "14px", 
            marginBottom: "15px",
            borderBottom: "1px solid #000",
            paddingBottom: "5px"
          }}>
            STUDENT COPY
          </div>
          
          <div style={{ 
            fontSize: "11px", 
            marginBottom: "15px", 
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%"
          }}>
            <span><strong>Batch:</strong> {studentInfo.batch || ""}</span>
            <span><strong>Name:</strong> {studentInfo.name || ""}</span>
            <span><strong>Roll No.:</strong> {studentInfo.rollNo || ""}</span>
            <span><strong>Branch:</strong> {studentInfo.department || ""}</span>
            <span><strong>Semester:</strong> {studentInfo.semester || ""}</span>
          </div>

          <table style={tableStyle}>
            <TableHeader />
            <tbody>
              {printRows.map((course, index) => (
                <TableRow key={index} course={course} index={index} />
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>
            Total Credits:
          </div>

          <div style={{ fontSize: "9px", lineHeight: "1.3", marginBottom: "20px" }}>
            1. I have more than 75% attendance in the above mentioned subjects.<br/>
            2. The above courses do not clash with any other courses.<br/><br/>
            <strong>Additional notes:</strong><br/>
            <div style={{ borderBottom: "1px solid #000", margin: "10px 0", height: "15px" }}></div>
            <div style={{ borderBottom: "1px solid #000", margin: "10px 0", height: "15px" }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
            <div style={{ textAlign: "center", width: "180px" }}>
              <div style={{ borderBottom: "1px solid #000", height: "30px", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>Student's Signature</div>
            </div>
            <div style={{ textAlign: "center", width: "180px" }}>
              <div style={{ borderBottom: "1px solid #000", height: "30px", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>Admin's Signature</div>
            </div>
          </div>
        </div>

        <div style={{ 
          borderTop: "1px dotted #000", 
          margin: "20px 0", 
          textAlign: "center",
          position: "relative"
        }}>
          <span style={{ 
            padding: "0 10px", 
            fontSize: "8px",
            color: "#666"
          }}>
          </span>
        </div>

        <div>
          <div style={{ 
            textAlign: "center", 
            fontWeight: "bold", 
            fontSize: "14px", 
            marginBottom: "15px",
            borderBottom: "1px solid #000",
            paddingBottom: "5px"
          }}>
            ACADEMIC COPY
          </div>
          
          <div style={{ 
            fontSize: "11px", 
            marginBottom: "15px", 
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%"
          }}>
            <span><strong>Batch:</strong> {studentInfo.batch || ""}</span>
            <span><strong>Name:</strong> {studentInfo.name || ""}</span>
            <span><strong>Roll No.:</strong> {studentInfo.rollNo || ""}</span>
            <span><strong>Branch:</strong> {studentInfo.department || ""}</span>
            <span><strong>Semester:</strong> {studentInfo.semester || ""}</span>
          </div>

          <table style={tableStyle}>
            <TableHeader />
            <tbody>
              {printRows.map((course, index) => (
                <TableRow key={index} course={course} index={index} />
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>
            Total Credits:
          </div>

          <div style={{ fontSize: "9px", lineHeight: "1.3", marginBottom: "20px" }}>
            1. I have more than 75% attendance in the above mentioned subjects.<br/>
            2. The above courses do not clash with any other courses.<br/><br/>
            <strong>Additional notes:</strong><br/>
            <div style={{ borderBottom: "1px solid #000", margin: "10px 0", height: "15px" }}></div>
            <div style={{ borderBottom: "1px solid #000", margin: "10px 0", height: "15px" }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
            <div style={{ textAlign: "center", width: "180px" }}>
              <div style={{ borderBottom: "1px solid #000", height: "30px", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>Student's Signature</div>
            </div>
            <div style={{ textAlign: "center", width: "180px" }}>
              <div style={{ borderBottom: "1px solid #000", height: "30px", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>admin's Signature</div>
            </div>
          </div>
        </div>
      </Box>
    );
  };

  const handlePrint = () => {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    const filename = `Course_Registration_${dateStr}.pdf`;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'legal'
      });
      
      doc.setFont('helvetica');
      
      let yPosition = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('STUDENT COPY', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 3;
      doc.setLineWidth(0.3);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const fields = [
        `Batch: ${studentInfo.batch || ""}`,
        `Name: ${studentInfo.name || ""}`,
        `Roll No.: ${studentInfo.rollNo || ""}`,
        `Branch: ${studentInfo.department || ""}`,
        `Semester: ${studentInfo.semester || ""}`
      ];
      
      const tableWidth = pageWidth - 40;
      const tableStartX = 20;
      const tableEndX = pageWidth - 20;
      const availableWidth = tableEndX - tableStartX;
      
      const fieldWidths = fields.map(field => doc.getTextWidth(field));
      const totalTextWidth = fieldWidths.reduce((sum, width) => sum + width, 0);
      
      const remainingSpace = availableWidth - totalTextWidth;
      const numberOfGaps = fields.length - 1;
      const gapWidth = numberOfGaps > 0 ? remainingSpace / numberOfGaps : 0;
      
      let currentX = tableStartX;
      fields.forEach((field, index) => {
        doc.text(field, currentX, yPosition, { align: 'left' });
        currentX += fieldWidths[index] + gapWidth;
      });
      
      yPosition += 8;
      
      const tableData = [];
      
      courses.forEach((course, index) => {
        tableData.push([
          (index + 1).toString(),
          course.course_id?.code || "",
          course.course_id?.name || "",
          course.course_id?.credit?.toString() || "",
          course.registration_type || "",
          ""
        ]);
      });
      
      tableData.push([
        (courses.length + 1).toString(),
        "",
        "",
        "",
        "",
        ""
      ]);
      tableData.push([
        (courses.length + 2).toString(),
        "",
        "",
        "",
        "",
        ""
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['S. No.', 'Course ID', 'Course Name', 'Credits', 'Reg. Type', 'Remarks']],
        body: tableData,
        theme: 'grid',
        margin: { left: 20, right: 20 },
        tableWidth: pageWidth - 40,
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 8
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { },
          2: { },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Total Credits:', 20, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('1. I have more than 75% attendance in the above mentioned subjects.', 20, yPosition);
      doc.text('2. The above courses do not clash with any other courses.', 20, yPosition + 3);
      yPosition += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Additional notes:', 20, yPosition);
      yPosition += 5;
      
      doc.setLineWidth(0.3);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      const leftSigX = 50;
      const rightSigX = pageWidth - 70;
      
      doc.text('Student\'s Signature', leftSigX, yPosition + 8);
      doc.text('Admin\'s Signature', rightSigX, yPosition + 8);
      
      doc.setLineWidth(0.3);
      doc.line(20, yPosition + 5, leftSigX + 50, yPosition + 5);
      doc.line(rightSigX - 20, yPosition + 5, pageWidth - 20, yPosition + 5);
      
      yPosition += 15;
      
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setLineDashPattern([], 0);
      yPosition += 8;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ACADEMIC COPY', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 3;
      doc.setLineWidth(0.3);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const academicFields = [
        `Batch: ${studentInfo.batch || ""}`,
        `Name: ${studentInfo.name || ""}`,
        `Roll No.: ${studentInfo.rollNo || ""}`,
        `Branch: ${studentInfo.department || ""}`,
        `Semester: ${studentInfo.semester || ""}`
      ];
      
      const academicTableWidth = pageWidth - 40;
      const academicTableStartX = 20;
      const academicTableEndX = pageWidth - 20;
      const academicAvailableWidth = academicTableEndX - academicTableStartX;
      
      const academicFieldWidths = academicFields.map(field => doc.getTextWidth(field));
      const academicTotalTextWidth = academicFieldWidths.reduce((sum, width) => sum + width, 0);
      
      const academicRemainingSpace = academicAvailableWidth - academicTotalTextWidth;
      const academicNumberOfGaps = academicFields.length - 1;
      const academicGapWidth = academicNumberOfGaps > 0 ? academicRemainingSpace / academicNumberOfGaps : 0;
      
      let academicCurrentX = academicTableStartX;
      academicFields.forEach((field, index) => {
        doc.text(field, academicCurrentX, yPosition, { align: 'left' });
        academicCurrentX += academicFieldWidths[index] + academicGapWidth;
      });
      
      yPosition += 8;
      
      autoTable(doc, {
        startY: yPosition,
        head: [['S. No.', 'Course ID', 'Course Name', 'Credits', 'Reg. Type', 'Remarks']],
        body: tableData,
        theme: 'grid',
        margin: { left: 20, right: 20 },
        tableWidth: pageWidth - 40,
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 8
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { },
          2: { },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Total Credits:', 20, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('1. I have more than 75% attendance in the above mentioned subjects.', 20, yPosition);
      doc.text('2. The above courses do not clash with any other courses.', 20, yPosition + 3);
      yPosition += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Additional notes:', 20, yPosition);
      yPosition += 5;
      
      doc.setLineWidth(0.3);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      const academicLeftSigX = 50;
      const academicRightSigX = pageWidth - 70;
      
      doc.text('Student\'s Signature', academicLeftSigX, yPosition + 8);
      doc.text('Admin\'s Signature', academicRightSigX, yPosition + 8);
      
      doc.setLineWidth(0.3);
      doc.line(20, yPosition + 5, academicLeftSigX + 50, yPosition + 5);
      doc.line(academicRightSigX - 20, yPosition + 5, pageWidth - 20, yPosition + 5);
      
      doc.save(filename);
      
    } catch (error) {
      alert(`Error generating PDF: ${error.message}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: "200px" }}>
        <Loader size="lg" variant="dots" />
      </Center>
    );
  }

  if (error) {
    return <Text color="red">Error: {error.message}</Text>;
  }

  return (
    <>
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Text size="lg" weight={700} align="center" mb="md" color="#3B82F6">
          Registered Courses
        </Text>

        <Select
          label="Select Semester"
          placeholder="Select a semester"
          data={semesterOptions}
          value={semesterValue}
          onChange={handleSemesterChange}
          mb="md"
        />

        <div style={{ overflowX: "auto" }}>
          <FusionTable
            columnNames={[
              "Course Code",
              "Course Name",
              "Registration Type",
              "Semester",
              "Credits",
              "Replaced By",
            ]}
            elements={rows}
            width="100%"
          />
        </div>

        <Text size="md" weight={700} mt="md">
          Total Credits: {totalCredits}
        </Text>

        <Center mt="lg">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={courses.length === 0}
            leftSection={<IconPrinter size={16} />}
          >
            Download
          </Button>
        </Center>
      </Card>

      <DownloadRegistration />
    </>
  );
}