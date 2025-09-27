# UK Tax Deduction Calculator

A responsive web application that calculates take-home pay after Income Tax and National Insurance deductions using official HMRC 2025/26 rates, with search queries stored in Supabase for analytics. 

## Live Demo

Visit the live application: [https://main.dduqo6mwyfoyl.amplifyapp.com/](https://main.dduqo6mwyfoyl.amplifyapp.com/)


### Prerequisites

- Node.js 18+ 
- npm 
- Supabase account
- Git

### Set Up

1. **Clone the repository**

   ```bash
   git clone https://github.com/princenchiba/tax-calculator.git
   cd tax-calculator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Supabase Setup**
- a. Create a new Supabase project
- b. Create a table named `tax_calculations` with the schema below:

   ```sql
   CREATE TABLE tax_calculations (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     job_title TEXT NOT NULL,
     county TEXT NOT NULL,
     salary_input NUMERIC NOT NULL,
     salary_period TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
  ```

4. **Set up environment variables**
   
   Create a `.env.local` file in the root directory and copy the supabase project URL and anon key to it as shown below:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **View App in browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)





