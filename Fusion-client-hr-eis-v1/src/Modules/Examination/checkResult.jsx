import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Paper,
  Text,
  Grid,
  Select,
  Button,
  Loader,
  Center,
  ScrollArea,
  Box,
  Alert,
  Title,
  Stack,
} from "@mantine/core";
import axios from "axios";
import InstiLogo from "../../assets/Insti_logo.svg";
import { get_result_semesters, check_result, download_grades } from "./routes/examinationRoutes";

export default function CheckResult() {
  const [selection, setSelection] = useState(null);
  const [semesters, setSemesters] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [spi, setSpi] = useState(0);
  const [cpi, setCpi] = useState(0);
  const [su, setSu] = useState(0);
  const [tu, setTu] = useState(0);
  const [show, setShow] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [studentInfo, setStudentInfo] = useState({
    name: "",
    rollNumber: "",
    programme: "",
    branch: "",
    academicYear: ""
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchSemesters() {
      try {
        const token = localStorage.getItem("authToken");
        const { data } = await axios.get(get_result_semesters, {
          headers: { Authorization: `Token ${token}` },
        });
        if (data.success) {
          setSemesters(data.semesters);
        } else {
          setError(data.message || "Could not load semesters");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch semesters");
      }
    }

    fetchSemesters();
  }, []);

  // 2) Build Select options
  const semesterOptions = useMemo(
    () =>
      semesters.map(({ semester_no, semester_type, label }) => ({
        value: JSON.stringify({ no: semester_no, type: semester_type }),
        label,
      })),
    [semesters]
  );

  const handleSearch = async () => {
    if (!selection) {
      setError("Please select a semester.");
      return;
    }
    setError("");
    setLoading(true);
    setShow(false);

    const { no: semester_no, type: semester_type } = JSON.parse(selection);

    try {
      const token = localStorage.getItem("authToken");
      const { data } = await axios.post(
        check_result,
        { semester_no, semester_type },
        { headers: { Authorization: `Token ${token}` } }
      );
      if (!data.success) {
        setError(data.message || "Cannot fetch results.");
      } else {
        setCourses(data.courses || []);
        setSpi(parseFloat(data.spi) || 0);
        setCpi(parseFloat(data.cpi) || 0);
        setSu(parseInt(data.su, 10) || 0);
        setTu(parseInt(data.tu, 10) || 0);
        
        if (data.student_info) {
          const studentData = {
            name: data.student_info.name || data.student_info.student_name || '',
            rollNumber: data.student_info.roll_number || data.student_info.roll_no || '',
            programme: data.student_info.programme || 'B.Tech',
            branch: data.student_info.branch || '',
            academicYear: data.student_info.academic_year || ''
          };
          setStudentInfo(studentData);
        } else {
          const userData = JSON.parse(localStorage.getItem('user'));
          if (userData) {
            setStudentInfo({
              name: userData.name || userData.username || '',
              rollNumber: userData.roll_no || '',
              programme: userData.programme || 'B.Tech',
              branch: userData.department || '',
              academicYear: ''
            });
          }
        }
        
        setShow(true);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to fetch result. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!selection) {
      setError("Please select a semester first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { no: semester_no, type: semester_type } = JSON.parse(selection);
      const token = localStorage.getItem("authToken");
      
      // Call backend API to generate PDF
      const response = await axios.post(
        download_grades,
        { 
          semester_no, 
          semester_type,
          student_info: studentInfo,
          courses: courses,
          spi: spi,
          cpi: cpi,
          su: su,
          tu: tu
        },
        { 
          headers: { 
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob' 
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create proper filename with summer semester mapping
      let semesterLabel;
      if (semester_type && semester_type.toLowerCase().includes('summer')) {
        const summerMapping = {
          2: "Summer1",
          4: "Summer2", 
          6: "Summer3",
          8: "Summer4",
          10: "Summer5",
          12: "Summer6"
        };
        semesterLabel = summerMapping[semester_no] || `Summer${semester_no}`;
      } else {
        semesterLabel = `sem${semester_no}`;
      }
      
      const fileName = `result_${studentInfo.rollNumber}_${semesterLabel}.pdf`;
      link.download = fileName;
      link.title = `Result - ${studentInfo.name} - ${semesterLabel}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      if (pdfError.response?.status === 404) {
        setError("PDF generation service not available. Please contact administrator.");
      } else {
        setError("Failed to generate PDF. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder p={isMobile ? "sm" : "lg"} radius="md">
      <Paper p={isMobile ? "sm" : "md"}>
        <Title order={3} mb="md" size={isMobile ? "h4" : "h3"}>Check Result</Title>
        {error && <Alert color="red" mb="md">{error}</Alert>}

        <Grid>
          <Grid.Col xs={12} sm={6} md={4} lg={3}>
            <Select
              label="Semester"
              placeholder="Select semester"
              data={semesterOptions}
              value={selection}
              onChange={setSelection}
              required
            />
          </Grid.Col>
        </Grid>

        <Box mt="md">
          <Button onClick={handleSearch} disabled={loading} size={isMobile ? "xs" : "sm"}>
            View Result
          </Button>
        </Box>

        {loading && (
          <Center mt="lg">
            <Loader size="lg" variant="dots" />
          </Center>
        )}

        {show && !loading && (
          <>
            <Box 
              id="printable-report" 
              mt="xl"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000000',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12px',
                lineHeight: '1.4',
                color: '#000000',
                width: '100%',
                maxWidth: '100vw',
                overflowX: 'auto',
                margin: '0',
                boxSizing: 'border-box',
                '@media (max-width: 768px)': {
                  border: '2px solid #000000',
                  fontSize: '10px'
                }
              }}
            >

              <Box 
                className="header-section"
                style={{
                  padding: isMobile ? '15px 8px' : '20px 10px',
                  borderBottom: '2px solid #000000',
                  position: 'relative',
                  minHeight: isMobile ? '60px' : '80px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >

                <img 
                  src={InstiLogo} 
                  alt="College Logo" 
                  className="responsive-logo"
                  style={{ 
                    position: 'absolute',
                    left: isMobile ? '10px' : '120px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: isMobile ? '35px' : '60px', 
                    height: isMobile ? '35px' : '60px',
                    objectFit: 'contain'
                  }} 
                />
                
                <Box style={{ textAlign: 'center', margin: '0 auto', padding: isMobile ? '0 45px' : '0 80px' }}>
                  <Title 
                    order={1} 
                    className="responsive-title"
                    style={{
                      fontSize: isMobile ? '12px' : '16px',
                      fontWeight: 'bold',
                      margin: '0 0 8px 0',
                      fontFamily: '"Times New Roman", Times, serif',
                      color: '#000000',
                      lineHeight: '1.2'
                    }}
                  >
                    PDPM Indian Institute of Information Technology, Design &<br />
                    Manufacturing, Jabalpur
                  </Title>
                  <Text 
                    className="responsive-subtitle"
                    style={{
                      fontSize: isMobile ? '9px' : '12px',
                      fontWeight: 'bold',
                      margin: '0 0 8px 0',
                      color: '#000000'
                    }}
                  >
                    (An Institute of National Importance under MoE, Govt. of India)
                  </Text>
                  <Text 
                    className="responsive-subtitle"
                    style={{
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      margin: '0',
                      color: '#000000'
                    }}
                  >
                    Semester Grade Report / Marksheet
                  </Text>
                </Box>
              </Box>             
              <Box className="student-info" style={{ padding: isMobile ? '15px 10px' : '20px', borderBottom: '1px solid #000000' }}>
                <Grid gutter={0}>
                  <Grid.Col span={isMobile ? 12 : 6}>
                    <Stack spacing={isMobile ? 4 : 8}>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', margin: '0', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 'bold' }}>Name of Student:</span> {studentInfo.name}
                      </Text>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', margin: '0', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 'bold' }}>Programme:</span> {studentInfo.programme}
                      </Text>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', margin: '0', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 'bold' }}>Semester:</span> {(() => {
                          if (!selection) return 'VI';
                          const selectedOption = semesterOptions.find(option => option.value === selection);
                          if (selectedOption) {
                            const label = selectedOption.label;
                            if (label.toLowerCase().includes('summer')) {
                              return label;
                            } else {
                              const selectedSemester = JSON.parse(selection);
                              return selectedSemester.no || 'VI';
                            }
                          }
                          const selectedSemester = JSON.parse(selection);
                          return selectedSemester.no || 'VI';
                        })()}
                      </Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={isMobile ? 12 : 6}>
                    <Stack spacing={isMobile ? 4 : 8}>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', margin: '0', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 'bold' }}>Roll No.:</span> {studentInfo.rollNumber}
                      </Text>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', margin: '0', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 'bold' }}>Branch:</span> {studentInfo.branch}
                      </Text>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', margin: '0', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 'bold' }}>Academic Year:</span> {studentInfo.academicYear}
                      </Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Box>

              {/* Course Table */}
              <Box className="course-table" style={{ padding: isMobile ? '10px 5px' : '15px' }}>
                <ScrollArea style={{ width: '100%' }}>
                  <table 
                    style={{
                      width: '100%',
                      minWidth: isMobile ? '320px' : '600px',
                      borderCollapse: 'collapse',
                      border: '1px solid #000000',
                      fontSize: isMobile ? '8px' : '11px',
                      fontFamily: '"Times New Roman", Times, serif'
                    }}
                  >
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{
                        border: '1px solid #000000',
                        padding: isMobile ? '4px 2px' : '8px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '7px' : '10px',
                        lineHeight: '1.1',
                        width: '8%'
                      }}>
                        S.<br />No.
                      </th>
                      <th style={{
                        border: '1px solid #000000',
                        padding: isMobile ? '4px 2px' : '8px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '7px' : '10px',
                        lineHeight: '1.1',
                        width: '15%'
                      }}>
                        Course<br />Code
                      </th>
                      <th style={{
                        border: '1px solid #000000',
                        padding: isMobile ? '4px 2px' : '8px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '7px' : '10px',
                        lineHeight: '1.1',
                        width: '37%'
                      }}>
                        Course Title
                      </th>
                      <th style={{
                        border: '1px solid #000000',
                        padding: isMobile ? '4px 2px' : '8px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '7px' : '10px',
                        lineHeight: '1.1',
                        width: '12%'
                      }}>
                        Credits
                      </th>
                      <th style={{
                        border: '1px solid #000000',
                        padding: isMobile ? '4px 2px' : '8px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '7px' : '10px',
                        lineHeight: '1.1',
                        width: '10%'
                      }}>
                        Grade
                      </th>
                      <th style={{
                        border: '1px solid #000000',
                        padding: isMobile ? '4px 2px' : '8px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '7px' : '10px',
                        lineHeight: '1.1',
                        width: '18%'
                      }}>
                        Grade<br />Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, index) => (
                      <tr key={index}>
                        <td style={{
                          border: '1px solid #000000',
                          padding: isMobile ? '3px 2px' : '6px 4px',
                          textAlign: 'center',
                          fontSize: isMobile ? '8px' : '11px'
                        }}>
                          {index + 1}
                        </td>
                        <td style={{
                          border: '1px solid #000000',
                          padding: isMobile ? '3px 2px' : '6px 4px',
                          textAlign: 'center',
                          fontSize: isMobile ? '8px' : '11px',
                          fontWeight: 'bold'
                        }}>
                          {course.course_id?.course_code || course.coursecode || 'N/A'}
                        </td>
                        <td style={{
                          border: '1px solid #000000',
                          padding: isMobile ? '3px 2px' : '6px 4px',
                          fontSize: isMobile ? '8px' : '11px',
                          textAlign: 'left',
                          lineHeight: '1.3'
                        }}>
                          {course.course_id?.course_name || course.coursename || 'N/A'}
                        </td>
                        <td style={{
                          border: '1px solid #000000',
                          padding: isMobile ? '3px 2px' : '6px 4px',
                          textAlign: 'center',
                          fontSize: isMobile ? '8px' : '11px'
                        }}>
                          {course.course_id?.credits || course.credits || 0}
                        </td>
                        <td style={{
                          border: '1px solid #000000',
                          padding: isMobile ? '3px 2px' : '6px 4px',
                          textAlign: 'center',
                          fontSize: isMobile ? '8px' : '11px',
                          fontWeight: 'bold'
                        }}>
                          {course.grade || 'N/A'}
                        </td>
                        <td style={{
                          border: '1px solid #000000',
                          padding: isMobile ? '3px 2px' : '6px 4px',
                          textAlign: 'center',
                          fontSize: isMobile ? '8px' : '11px'
                        }}>
                          {course.grade_points || course.points || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </ScrollArea>

                {/* Summary Section */}
                <Box 
                  className="summary-section"
                  mt="lg" 
                  style={{ 
                    borderTop: '2px solid #000000', 
                    paddingTop: isMobile ? '10px' : '15px',
                    fontSize: isMobile ? '10px' : '12px'
                  }}
                >
                  {/* Two-column layout: Credits on left, SPI/CPI on right */}
                  <Box style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '10px' : '0'
                  }}>
                    {/* Left side - Credits */}
                    <Box style={{ flex: 1 }}>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#000000' }}>
                        Total Credits Registered: {tu}
                      </Text>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', margin: '0', color: '#000000' }}>
                        Semester Credits Earned: {su}
                      </Text>
                    </Box>
                    
                    {/* Right side - SPI and CPI stacked */}
                    <Box style={{ flex: 1, textAlign: isMobile ? 'left' : 'right' }}>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#000000' }}>
                        SPI: {spi.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', margin: '0', color: '#000000' }}>
                        CPI: {cpi.toFixed(1)}
                      </Text>
                    </Box>
                  </Box>
                </Box>

                {/* Footer */}
                <Box className="footer" mt="md" style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: isMobile ? '8px' : '10px', color: '#666666', margin: '0' }}>
                    This is a computer-generated document. Generated on {new Date().toLocaleDateString('en-IN')}
                  </Text>
                </Box>
              </Box>
            </Box>

            {/* Download Button Only */}
            <Center mt="lg" className="download-button-container">
              <Button 
                onClick={downloadPDF} 
                variant="filled"
                size={isMobile ? "md" : "lg"}
                style={{
                  fontSize: isMobile ? '14px' : '16px',
                  padding: isMobile ? '8px 16px' : '12px 24px'
                }}
              >
                Download PDF
              </Button>
            </Center>
          </>
        )}
      </Paper>
    </Card>
  );
}
