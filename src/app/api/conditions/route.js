import { NextResponse } from 'next/server';
import { getWeather, getMoonPhase, calculateFishingScore, getBestTimes } from '@/lib/conditions';
import { getRiverData, POPULAR_RIVERS, getWaterTempClassification, getFlowClassification } from '@/lib/river';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '39.7392');
    const lon = parseFloat(searchParams.get('lon') || '-104.9903');
    const riverId = searchParams.get('river');

    // Get weather
    const weather = await getWeather(lat, lon);
    const moonPhase = getMoonPhase();

    // Get river data if provided
    let riverData = null;
    if (riverId) {
      riverData = await getRiverData(riverId);
      if (riverData?.water_temp_f) {
        riverData.temp_classification = getWaterTempClassification(riverData.water_temp_f);
      }
      if (riverData?.discharge) {
        riverData.flow_classification = getFlowClassification(riverData.discharge);
      }
    }

    // Calculate overall score
    const conditions = calculateFishingScore(weather, moonPhase, riverData);
    const bestTimes = getBestTimes(weather, moonPhase);

    return NextResponse.json({
      weather,
      moonPhase,
      conditions,
      bestTimes,
      riverData,
      location: { lat, lon }
    });
  } catch (error) {
    console.error('Conditions error:', error);
    return NextResponse.json({ error: 'Failed to fetch conditions' }, { status: 500 });
  }
}
