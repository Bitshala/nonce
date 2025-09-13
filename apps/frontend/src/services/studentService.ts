// src/services/studentService.ts
import type { ApiStudentRecord, StudentData, StudentBackground } from '../types/student';
const baseUrl = import.meta.env.VITE_API_BASE_URL;
// Helper to transform raw API response into a structured StudentData object
const transformStudentData = (rawData: ApiStudentRecord[]): StudentData | null => {
  if (!rawData || rawData.length === 0) return null;

  const latestRecord = rawData.find(record => record.week > 0) || rawData[0];

  const transformedData: StudentData = {
    name: latestRecord.name.replace('_', ' '),
    email: latestRecord.mail,
    group: latestRecord.group_id,
    ta: latestRecord.ta,
    weeklyData: rawData.map(record => ({
      week: record.week,
      attendance: record.attendance === 'yes',
      gdScore: {
        fa: record.fa,
        fb: record.fb,
        fc: record.fc,
        fd: record.fd
      },
      bonusScore: {
        attempt: record.bonus_attempt,
        good: record.bonus_answer_quality,
        followUp: record.bonus_follow_up
      },
      exerciseScore: {
        Submitted: record.exercise_submitted === 'yes',
        privateTest: record.exercise_test_passing === 'yes',
        goodStructure: record.exercise_good_structure === 'yes',
        goodDoc: record.exercise_good_documentation === 'yes'
      },
      total: record.total,
      group: record.group_id,
      ta: record.ta
    }))
  };
  return transformedData;
};

export const fetchStudentData = async (name: string): Promise<StudentData | null> => {
  try {
    const encodedName = encodeURIComponent(name);
    const response = await fetch(`${baseUrl}/individual_data/${encodedName}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Student not found');
      }
      throw new Error(`Server error: ${response.status}`);
    }

    const rawData: ApiStudentRecord[] = await response.json();
    return transformStudentData(rawData);
  } catch (error) {
    console.error('Error fetching student data:', error);
    throw error; // Re-throw to be caught by the component
  }
};



export const fetchStudentBackgroundData = async (email: string): Promise<StudentBackground | null> => {
  try {
    const response = await fetch(`${baseUrl}/data/${email}`);

    if (!response.ok) {
      if (response.status === 404) {
         console.warn(`No background data found for email: ${email}`);
         return null;
      }
      throw new Error(`Failed to fetch background data: ${response.status}`);
    }

    const data: StudentBackground = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching background data:', error);
    throw error;
  }
};

export const fetchStudentRepoLink = async (week: number, studentName: string, cohort_name: string): Promise<string | null> => {
  try {
    // Assuming your backend endpoint looks like /api/student-repo/week/name
    // Adjust the URL if your actual API endpoint is different
    const response = await fetch(`${baseUrl}/students/${week}/${encodeURIComponent(studentName)}/${encodeURIComponent(cohort_name)}/`);

    if (!response.ok) {
      console.error(`Server Error ${response.status} fetching repo link for week ${week}, student ${studentName}`);
      return null;
    }

    const data = await response.json();
    return data.url || null; 
  } catch (err) {
    console.error("fetchStudentRepoLink error:", err);
    return null;
  }
};


  export const fetchGithubUsername =  async(name:string): Promise<string | null> => {
    try {
      // Assuming your backend endpoint looks like /api/student-repo/week/name
      // Adjust the URL if your actual API endpoint is different
      const response = await fetch(`${baseUrl}/student/github/${encodeURIComponent(name)}`);

      if (!response.ok) {
        console.error(`Server Error ${response.status} fetching github for student ${name}`);
        return null;
      }

      const data = await response.json();
      const username = data.split('/').pop();
      return username || null; 
    } catch (err) {
      console.error("fetchStudentRepoLink error:", err);
      return null;
    }
}
  