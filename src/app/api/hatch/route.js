import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createHatchReport, getHatchReports, getRecentHatchReports } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const river = searchParams.get('river');
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let reports;
    if (river) {
      reports = await getHatchReports({ river_name: river, days, limit, offset });
    } else {
      reports = await getRecentHatchReports(limit);
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Hatch GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to submit a report' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.river_name?.trim()) {
      return NextResponse.json({ error: 'River name required' }, { status: 400 });
    }

    if (!data.hatch_type?.trim()) {
      return NextResponse.json({ error: 'Hatch type required' }, { status: 400 });
    }

    const reportId = await createHatchReport(user.id, {
      river_name: data.river_name.trim(),
      location_name: data.location_name,
      latitude: data.latitude,
      longitude: data.longitude,
      hatch_type: data.hatch_type,
      hatch_intensity: data.hatch_intensity || 'moderate',
      flies_working: data.flies_working,
      water_temp: data.water_temp,
      water_clarity: data.water_clarity,
      flow_rate: data.flow_rate,
      notes: data.notes
    });

    return NextResponse.json({ success: true, reportId });
  } catch (error) {
    console.error('Hatch POST error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
