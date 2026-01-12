import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveRiver, getSavedRivers, deleteSavedRiver } from '@/lib/db';
import { getRiverData, searchUSGSSites, POPULAR_RIVERS } from '@/lib/river';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('id');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const popular = searchParams.get('popular') === 'true';
    const saved = searchParams.get('saved') === 'true';

    // Get specific river data
    if (siteId) {
      const data = await getRiverData(siteId);
      return NextResponse.json({ river: data });
    }

    // Search for nearby USGS sites
    if (lat && lon) {
      const sites = await searchUSGSSites(parseFloat(lat), parseFloat(lon));
      return NextResponse.json({ sites });
    }

    // Get popular rivers
    if (popular) {
      return NextResponse.json({ rivers: POPULAR_RIVERS });
    }

    // Get user's saved rivers
    if (saved) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const rivers = getSavedRivers(user.id);
      return NextResponse.json({ rivers });
    }

    return NextResponse.json({ rivers: POPULAR_RIVERS });
  } catch (error) {
    console.error('Rivers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch rivers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.river_name?.trim()) {
      return NextResponse.json({ error: 'River name required' }, { status: 400 });
    }

    saveRiver(user.id, {
      river_name: data.river_name.trim(),
      usgs_site_id: data.usgs_site_id,
      latitude: data.latitude,
      longitude: data.longitude,
      notes: data.notes
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rivers POST error:', error);
    return NextResponse.json({ error: 'Failed to save river' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const riverId = searchParams.get('id');

    if (!riverId) {
      return NextResponse.json({ error: 'River ID required' }, { status: 400 });
    }

    deleteSavedRiver(user.id, parseInt(riverId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rivers DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete river' }, { status: 500 });
  }
}
