# API Documentation

This document provides a comprehensive overview of all API endpoints used in the admin frontend application and their locations in the codebase.

## Base URL Configuration

The API base URL is configured via environment variable:
- **Environment Variable**: `VITE_API_BASE_URL`
- **Default/Example**: `http://localhost:8081`
- **Configuration File**: <mcfile name=".env" path="/Users/tusharvyas/Documents/GitHub/admin.fe/.env"></mcfile>

## API Endpoints

### Authentication Endpoints

#### POST `/login`
**Purpose**: Email-based login authentication  
**Used in**: <mcfile name="auth.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/auth.ts"></mcfile> (line 122)  
**Function**: <mcsymbol name="loginWithEmail" filename="auth.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/auth.ts" startline="118" type="function"></mcsymbol>  
**Request Body**: `{ gmail: string }`  
**Response**: `{ token: string }`

#### POST `/switch_cohort`
**Purpose**: Switch between different cohorts  
**Used in**: 
- <mcfile name="CohortSelection.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/CohortSelection.tsx"></mcfile> (line 52)
- <mcfile name="studentCohortSelector.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Students/studentCohortSelector.tsx"></mcfile> (line 111)

**Request Headers**: `Authorization: Bearer {token}`  
**Request Body**: Cohort selection data

### Student Data Endpoints

#### GET `/individual_data/{name}`
**Purpose**: Fetch individual student data by name  
**Used in**: <mcfile name="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts"></mcfile> (line 46)  
**Function**: <mcsymbol name="fetchStudentData" filename="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts" startline="43" type="function"></mcsymbol>  
**Parameters**: `name` (URL encoded)  
**Response**: `ApiStudentRecord[]`

#### GET `/individual_data_email/{email}`
**Purpose**: Fetch individual student data by email  
**Used in**: Multiple instruction pages
- <mcfile name="InstructionsWeekOne.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Students/InstructionsWeekOne.tsx"></mcfile> (line 61)
- <mcfile name="InstructionsWeekTwo.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Students/InstructionsWeekTwo.tsx"></mcfile> (line 61)
- <mcfile name="InstructionsWeekThree.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Students/InstructionsWeekThree.tsx"></mcfile> (line 61)
- <mcfile name="InstructionsWeekFour.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Students/InstructionsWeekFour.tsx"></mcfile> (line 61)
- <mcfile name="InstructionsWeekFive.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Students/InstructionsWeekFive.tsx"></mcfile> (line 61)

**Parameters**: `email` (URL encoded)  
**Response**: Student data array

#### GET `/data/{email}`
**Purpose**: Fetch student background data  
**Used in**: <mcfile name="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts"></mcfile> (line 67)  
**Function**: <mcsymbol name="fetchStudentBackgroundData" filename="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts" startline="65" type="function"></mcsymbol>  
**Parameters**: `email`  
**Response**: `StudentBackground`

#### GET `/student/github/{name}`
**Purpose**: Fetch GitHub username for a student  
**Used in**: <mcfile name="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts"></mcfile> (line 109)  
**Function**: <mcsymbol name="fetchGithubUsername" filename="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts" startline="105" type="function"></mcsymbol>  
**Parameters**: `name` (URL encoded)  
**Response**: GitHub username string

#### GET `/students/{week}/{studentName}/{cohort_name}/`
**Purpose**: Fetch student repository link for specific week  
**Used in**: 
- <mcfile name="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts"></mcfile> (line 89)
- <mcfile name="StudentRow.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/components/table/StudentRow.tsx"></mcfile> (line 126)

**Function**: <mcsymbol name="fetchStudentRepoLink" filename="studentService.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/studentService.ts" startline="85" type="function"></mcsymbol>  
**Parameters**: `week`, `studentName` (URL encoded), `cohort_name` (URL encoded)  
**Response**: Repository URL string

### Weekly Data Endpoints

#### GET `/weekly_data/{cohort_name}/{week}`
**Purpose**: Fetch weekly student data for a specific cohort and week  
**Used in**: <mcfile name="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx"></mcfile> (line 82)  
**Function**: <mcsymbol name="fetchWeeklyData" filename="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx" startline="81" type="function"></mcsymbol>  
**Parameters**: `cohort_name`, `week`  
**Response**: `ApiStudentEntry[]`

#### POST `/weekly_data/{cohort_name}/{week}`
**Purpose**: Update weekly student data  
**Used in**: <mcfile name="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx"></mcfile> (line 297)  
**Request Body**: Updated student data  
**Headers**: `Content-Type: application/json`

#### GET `/attendance/weekly_counts/{week}`
**Purpose**: Fetch weekly attendance counts  
**Used in**: <mcfile name="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx"></mcfile> (line 148)  
**Function**: <mcsymbol name="getWeeklyData" filename="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx" startline="147" type="function"></mcsymbol>  
**Parameters**: `week`  
**Response**: Weekly attendance data

### Student Management Endpoints

#### POST `/students/{cohort_name}`
**Purpose**: Add new student to cohort  
**Used in**: <mcfile name="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx"></mcfile> (line 352)  
**Request Body**: Student data object  
**Headers**: `Content-Type: application/json`

#### POST `/del/{cohort_name}/{week}`
**Purpose**: Delete student from specific week  
**Used in**: <mcfile name="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx"></mcfile> (line 402)  
**Function**: <mcsymbol name="handleDeleteStudent" filename="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx" startline="368" type="function"></mcsymbol>  
**Request Body**: Student data to delete  
**Headers**: `Content-Type: application/json`

### Results and Statistics Endpoints

#### GET `/students/{cohort_name}/total_scores`
**Purpose**: Fetch total scores for all students in cohort  
**Used in**: <mcfile name="ResultPage.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/ResultPage.tsx"></mcfile> (line 33)  
**Function**: <mcsymbol name="fetchResults" filename="ResultPage.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/ResultPage.tsx" startline="30" type="function"></mcsymbol>  
**Parameters**: `cohort_name`  
**Response**: Array of student results with scores

#### GET `/count/students`
**Purpose**: Get total count of students  
**Used in**: <mcfile name="TableView.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/TableView.tsx"></mcfile> (line 176)  
**Response**: Student count number

### Feedback Endpoints

#### GET `/feedback/{cohort_name}`
**Purpose**: Fetch feedback data for cohort  
**Used in**: <mcfile name="Feedback.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Feedback.tsx"></mcfile> (line 156)  
**Function**: <mcsymbol name="fetchFeedbacks" filename="Feedback.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/Feedback.tsx" startline="150" type="function"></mcsymbol>  
**Parameters**: `cohort_name`  
**Response**: Feedback data array

## External API Integrations

### Discord OAuth
**Purpose**: Authentication via Discord  
**URL**: `https://discord.com/oauth2/authorize`  
**Used in**: <mcfile name="auth.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/auth.ts"></mcfile> (line 73)  
**Function**: <mcsymbol name="redirectToDiscordAuth" filename="auth.ts" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/services/auth.ts" startline="62" type="function"></mcsymbol>

### GitHub Stats
**Purpose**: External GitHub statistics  
**URL**: `https://ghstats.bitcoinsearch.xyz/result`  
**Used in**: <mcfile name="StudentDetailPage.tsx" path="/Users/tusharvyas/Documents/GitHub/admin.fe/src/pages/StudentDetailPage.tsx"></mcfile> (line 88)

## Common Patterns

### Error Handling
Most API calls include error handling with try-catch blocks and console error logging.

### Authentication
Some endpoints require authentication headers:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### URL Encoding
Student names and emails are URL encoded when used as path parameters using `encodeURIComponent()`.

### Local Storage Integration
- Cohort selection stored in `selected_cohort_db_path`
- Authentication tokens stored in `bitshala_token`
- User data stored with keys like `user_email`, `user_username`

## Environment Variables Required

- `VITE_API_BASE_URL` - Base URL for the API server
- `VITE_AUTH_TOKEN_TA` - Authentication token for TAs
- `VITE_AUTH_TOKEN_PARTICIPANT` - Authentication token for participants
- `VITE_DISCORD_CLIENT_ID` - Discord OAuth client ID
- `VITE_DISCORD_TA_REDIRECT_URI` - Discord redirect URI for TAs
- `VITE_DISCORD_PARTICIPANT_REDIRECT_URI` - Discord redirect URI for participants