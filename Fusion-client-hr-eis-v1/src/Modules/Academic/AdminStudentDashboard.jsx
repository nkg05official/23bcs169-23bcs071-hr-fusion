import React,{useState} from 'react'
import {Card,TextInput,Button,Loader,Notification,Table,Space,Text} from '@mantine/core'
import axios from 'axios'
import { StudentSearchRoute } from '../../routes/academicRoutes'

export default function AdminStudentDashboard(){
  const [rollNo,setRollNo]=useState('')
  const [info,setInfo]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  const search=async()=>{
    setLoading(true)
    setError('')
    setInfo(null)
    try{
      const token=localStorage.getItem('authToken')
      const {data}=await axios.post(
        StudentSearchRoute,
        {rollno:rollNo},
        {headers:{Authorization:`Token ${token}`}}
      )
      setInfo(data)
    }catch(err){
      setError(err.response?.data?.error||'Student not found')
    }finally{
      setLoading(false)
    }
  }

  return (
    <Card>
      <TextInput
        label="Roll Number"
        placeholder="Enter roll number"
        value={rollNo}
        onChange={e=>setRollNo(e.currentTarget.value.toUpperCase())}
        mb="sm"
      />
      <Button fullWidth onClick={search} disabled={!rollNo||loading}>
        {loading?<Loader size="xs"/>:'Search Student'}
      </Button>
      {error&&<>
        <Space h="sm"/>
        <Notification color="red">{error}</Notification>
      </>}
      {info&&<>
        <Space h="lg"/>
        <Text weight={600} mb="sm">Student Details</Text>
        <Table verticalSpacing="md" highlightOnHover>
          <tbody>
            {Object.entries(info).map(([k,v])=>(
              <tr key={k}>
                <td style={{fontWeight:500,textTransform:'capitalize'}}>
                  {k.replace(/_/g,' ')}
                </td>
                <td>{v??'—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>}
    </Card>
  )
}
