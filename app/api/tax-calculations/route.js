import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create Supabase client with anon key (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Input validation schema
const validateTaxCalculationInput = (data) => {
  const errors = [];

  // Validate job_title
  if (!data.job_title || typeof data.job_title !== 'string') {
    errors.push('job_title is required and must be a string');
  } else if (data.job_title.trim().length === 0) {
    errors.push('job_title cannot be empty');
  } else if (data.job_title.length > 100) {
    errors.push('job_title must be 100 characters or less');
  }

  // Validate county
  if (!data.county || typeof data.county !== 'string') {
    errors.push('county is required and must be a string');
  } else if (data.county.trim().length === 0) {
    errors.push('county cannot be empty');
  } else if (data.county.length > 100) {
    errors.push('county must be 100 characters or less');
  }

  // Validate salary_input
  if (data.salary_input === undefined || data.salary_input === null) {
    errors.push('salary_input is required');
  } else if (typeof data.salary_input !== 'number' || isNaN(data.salary_input)) {
    errors.push('salary_input must be a valid number');
  } else if (data.salary_input <= 0) {
    errors.push('salary_input must be greater than 0');
  } else if (data.salary_input > 10000000) {
    errors.push('salary_input must be less than 10,000,000');
  }

  // Validate salary_period
  const validPeriods = ['yearly', 'monthly', 'weekly'];
  if (!data.salary_period || typeof data.salary_period !== 'string') {
    errors.push('salary_period is required and must be a string');
  } else if (!validPeriods.includes(data.salary_period)) {
    errors.push(`salary_period must be one of: ${validPeriods.join(', ')}`);
  }

  return errors;
};

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationErrors = validateTaxCalculationInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Sanitize input data
    const sanitizedData = {
      job_title: body.job_title.trim(),
      county: body.county.trim(),
      salary_input: Number(body.salary_input),
      salary_period: body.salary_period,
      created_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { error } = await supabase
      .from('tax_calculations')
      .insert(sanitizedData);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Tax calculation saved successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('API route error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}