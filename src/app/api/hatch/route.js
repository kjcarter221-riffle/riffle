import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createHatchReport, getHatchReports, getRecentHatchReports } from '@/lib/db';
import { sanitizeText, sanitizeCoordinates } from '@/lib/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

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

    // Rate limit hatch reports
    const rateCheck = checkRateLimit(`hatch:${user.id}`, RATE_LIMITS.api);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const data = await request.json();

    if (!data.river_name?.trim()) {
      return NextResponse.json({ error: 'River name required' }, { status: 400 });
    }

    if (!data.hatch_type?.trim()) {
      return NextResponse.json({ error: 'Hatch type required' }, { status: 400 });
    }

    // Validate hatch intensity
    const validIntensities = ['light', 'moderate', 'heavy', 'spinner_fall'];
    const intensity = validIntensities.includes(data.hatch_intensity) ? data.hatch_intensity : 'moderate';

    // Sanitize coordinates
    const coords = sanitizeCoordinates(data.latitude, data.longitude);

    const reportId = await createHatchReport(user.id, {
      river_name: sanitizeText(data.river_name),
      location_name: sanitizeText(data.location_name),
      latitude: coords.lat,
      longitude: coords.lon,
      hatch_type: sanitizeText(data.hatch_type),
      hatch_intensity: intensity,
      flies_working: sanitizeText(data.flies_working),
      water_temp: data.water_temp,
      water_clarity: sanitizeText(data.water_clarity),
      flow_rate: sanitizeText(data.flow_rate),
      notes: sanitizeText(data.notes)
    });

    return NextResponse.json({ success: true, reportId });
  } catch (error) {
    console.error('Hatch POST error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
