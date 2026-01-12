import { NextResponse } from 'next/server';
import { getCurrentUser, isPro } from '@/lib/auth';
import {
  createJournalEntry, getJournalEntries, getJournalEntry,
  updateJournalEntry, deleteJournalEntry, getPublicJournalEntries
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';

    if (publicOnly) {
      const entries = getPublicJournalEntries(
        parseInt(searchParams.get('limit') || '20'),
        parseInt(searchParams.get('offset') || '0')
      );
      return NextResponse.json({ entries: entries.map(parseEntry) });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entryId = searchParams.get('id');
    if (entryId) {
      const entry = getJournalEntry(user.id, parseInt(entryId));
      return NextResponse.json({ entry: entry ? parseEntry(entry) : null });
    }

    const entries = getJournalEntries(
      user.id,
      parseInt(searchParams.get('limit') || '50'),
      parseInt(searchParams.get('offset') || '0')
    );

    return NextResponse.json({ entries: entries.map(parseEntry) });
  } catch (error) {
    console.error('Journal GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch journal' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check free tier limits
    if (!isPro(user)) {
      const entries = getJournalEntries(user.id, 100, 0);
      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyEntries = entries.filter(e =>
        e.created_at?.startsWith(thisMonth)
      );

      if (monthlyEntries.length >= 3) {
        return NextResponse.json({
          error: 'Free tier limit reached (3 entries/month). Upgrade to Pro for unlimited.',
          upgrade: true
        }, { status: 403 });
      }
    }

    const data = await request.json();

    if (!data.title?.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const entryId = createJournalEntry(user.id, {
      title: data.title.trim(),
      content: data.content || '',
      location_name: data.location_name,
      latitude: data.latitude,
      longitude: data.longitude,
      river_name: data.river_name,
      water_conditions: data.water_conditions,
      weather: data.weather,
      temperature: data.temperature,
      wind: data.wind,
      flies_used: data.flies_used,
      fish_caught: data.fish_caught || 0,
      species: data.species,
      is_public: data.is_public || false,
      photos: data.photos || [],
      trip_date: data.trip_date
    });

    return NextResponse.json({ success: true, entryId });
  } catch (error) {
    console.error('Journal POST error:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const { id, ...updates } = data;
    updateJournalEntry(user.id, id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Journal PUT error:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    deleteJournalEntry(user.id, parseInt(entryId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Journal DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}

function parseEntry(entry) {
  return {
    ...entry,
    photos: entry.photos ? JSON.parse(entry.photos) : [],
    is_public: Boolean(entry.is_public)
  };
}
