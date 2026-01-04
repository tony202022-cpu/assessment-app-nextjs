// app/api/report-data/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { attemptId } = await req.json();

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Missing attemptId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('attempts')
      .select(`
        id,
        user_id,
        competency_results
      `)
      .eq('id', attemptId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    // ✅ ALWAYS return a safe object shape
    return NextResponse.json({
      user_id: data.user_id ?? '—',
      competency_results: Array.isArray(data.competency_results)
        ? data.competency_results
        : [],
    });

  } catch (err) {
    console.error('report-data error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
