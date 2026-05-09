import { useEffect, useState } from "react";
import axios from "axios";
import { generate_transcript, download_grades } from "../routes/examinationRoutes";
import {
  Title,
  Paper,
  Text,
  Button,
  Loader,
  Box,
  Grid,
  Alert,
  ScrollArea,
  Stack
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import "../styles/transcript.css";
import InstiLogo from "../../../assets/Insti_logo.svg";

function StudentTranscript({ student, semester, onBack }) {
  const userRole = useSelector((state) => state.user.role);
  const [transcriptData, setTranscriptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [spi, setSpi] = useState(0);
  const [cpi, setCpi] = useState(0);
  const [su, setSu] = useState(0);
  const [tu, setTu] = useState(0);
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    rollNumber: "",
    programme: "",
    branch: "",
    academicYear: ""
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!student?.id_id || !semester) {
      setError("Invalid student data");
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found!");
      setLoading(false);
      return;
    }

    const { no: semester_no, type: semester_type } = semester;
    
    axios
      .post(
        generate_transcript,
        {
          Role: userRole,
          student: student.id_id,
          semester: JSON.stringify(semester),
        },
        { headers: { Authorization: `Token ${token}` } }
      )
      .then((response) => {
        const data = response.data;
        
        if (!data) {
          setError("No data received from server.");
        } else {
          const processedCourses = data.courses_grades ? 
            Object.values(data.courses_grades).map(course => ({
              course_id: {
                course_code: course.course_code,
                course_name: course.course_name,
                credits: course.credit || 0
              },
              coursecode: course.course_code,
              coursename: course.course_name,
              credits: course.credit || 0,
              grade: course.grade,
              grade_points: course.points || 0,
              points: course.points || 0
            })) : [];

          setCourses(processedCourses);
          setSpi(parseFloat(data.spi) || 0);
          setCpi(parseFloat(data.cpi) || 0);
          setSu(parseInt(data.su, 10) || 0);
          setTu(parseInt(data.tu, 10) || 0);

          const userData = JSON.parse(localStorage.getItem('user')) || {};
          setStudentInfo({
            name: data.student_name || data.name || student.name || userData.name || userData.username || '',
            rollNumber: data.roll_number || student.id_id || userData.roll_no || '',
            programme: data.programme || student.programme || userData.programme || 'B.Tech',
            branch: data.branch || student.branch || userData.department || 'N/A',
            academicYear: data.academic_year || student.academic_year || userData.academic_year || '2023-24'
          });
          
          setTranscriptData(data);
        }
      })
      .catch((err) => setError("Error fetching transcript: " + err.message))
      .finally(() => setLoading(false));
  }, [student, semester, userRole]);

  const generatePDF = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found!");
      return;
    }

    try {
      setLoading(true);
      
      const { no: semester_no, type: semester_type } = semester;

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

      // Same download logic as checkResult
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create proper filename with summer semester mapping
      let semesterLabel;
      if (semester_type && semester_type.toLowerCase().includes('summer')) {
        // Map semester numbers to correct summer labels
        const summerMapping = {
          2: "Summer1",
          4: "Summer2", 
          6: "Summer3",
          8: "Summer4"
        };
        semesterLabel = summerMapping[semester_no] || `Summer${semester_no}`;
      } else {
        // Regular semester - just use the number
        semesterLabel = `sem${semester_no}`;
      }
      
      const fileName = `transcript_${studentInfo.rollNumber}_${semesterLabel}.pdf`;
      link.download = fileName;
      // Set title attribute to help with PDF metadata
      link.title = `Transcript - ${studentInfo.name} - ${semesterLabel}`;
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

  if (loading)
    return (
      <Box style={{ textAlign: 'center', padding: '2rem' }}>
        <Loader size="lg" />
        <Text mt="md">Loading transcript data...</Text>
      </Box>
    );

  if (error)
    return (
      <Box style={{ padding: '2rem' }}>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          {error}
        </Alert>
        <Button leftSection={<IconArrowLeft size={16} />} variant="outline" onClick={onBack} mt="md">
          Back to List
        </Button>
      </Box>
    );

  if (!transcriptData || !courses.length)
    return (
      <Box style={{ padding: '2rem' }}>
        <Paper p="md" withBorder>
          <Text align="center" size="lg">
            Marks not yet submitted.
          </Text>
        </Paper>
        <Button leftSection={<IconArrowLeft size={16} />} variant="outline" onClick={onBack} mt="md">
          Back to List
        </Button>
      </Box>
    );

  return (
    <>
      {/* Back button and Download PDF outside the main content */}
      <Box mb="md" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Button leftSection={<IconArrowLeft size={16} />} variant="outline" onClick={onBack}>
          Back to List
        </Button>
        <Button onClick={generatePDF} disabled={loading} style={{ backgroundColor: '#1E90FF', color: 'white' }}>
          Download PDF
        </Button>
      </Box>

      <Box 
        id="printable-transcript" 
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
          boxSizing: 'border-box'
        }}
        sx={{
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
                    if (!semester) return 'N/A';
                    
                    if (semester.type && semester.type.toLowerCase().includes('summer')) {
                      const summerMapping = {
                        2: "Summer 1",
                        4: "Summer 2", 
                        6: "Summer 3",
                        8: "Summer 4"
                      };
                      return summerMapping[semester.no] || `Summer ${semester.no}`;
                    } else {
                      return semester.no || 'N/A';
                    }
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
      </Box>
        <Box 
          style={{ 
            borderTop: '2px solid #000000', 
            padding: isMobile ? '15px 10px' : '20px',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <Box style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', fontWeight: 'bold' }}>
              Total Credits Registered: {tu}
            </Text>
            <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', fontWeight: 'bold' }}>
              Semester Credits Earned: {su}
            </Text>
          </Box>
          <Box style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', fontWeight: 'bold' }}>
              SPI: {spi.toFixed(1)}
            </Text>
            <Text style={{ fontSize: isMobile ? '10px' : '12px', color: '#000000', fontWeight: 'bold' }}>
              CPI: {cpi.toFixed(1)}
            </Text>
          </Box>
        </Box>
        <Box style={{ 
          borderTop: '1px solid #000000', 
          padding: '10px', 
          textAlign: 'center',
          fontSize: isMobile ? '8px' : '10px',
          fontStyle: 'italic'
        }}>
          This is a computer-generated document. Generated on {new Date().toLocaleDateString('en-IN')}
        </Box>
      </Box>
    </>
  );
}

export default StudentTranscript;
