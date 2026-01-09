// USGS River Data Integration
// Uses the USGS Water Services API (free, no key required)

const USGS_API_BASE = 'https://waterservices.usgs.gov/nwis/iv';

// Common parameter codes
const PARAM_CODES = {
  DISCHARGE: '00060',      // Discharge (cubic feet per second)
  GAGE_HEIGHT: '00065',    // Gage height (feet)
  WATER_TEMP: '00010',     // Water temperature (°C)
  DISSOLVED_O2: '00300',   // Dissolved oxygen
};

export async function getRiverData(siteId) {
  try {
    const params = new URLSearchParams({
      format: 'json',
      sites: siteId,
      parameterCd: `${PARAM_CODES.DISCHARGE},${PARAM_CODES.GAGE_HEIGHT},${PARAM_CODES.WATER_TEMP}`,
      siteStatus: 'active',
    });

    const response = await fetch(`${USGS_API_BASE}?${params}`, {
      next: { revalidate: 900 } // Cache for 15 minutes
    });

    if (!response.ok) {
      throw new Error('USGS API request failed');
    }

    const data = await response.json();
    return parseUSGSResponse(data);
  } catch (error) {
    console.error('USGS API error:', error);
    return null;
  }
}

function parseUSGSResponse(data) {
  if (!data.value?.timeSeries?.length) {
    return null;
  }

  const result = {
    site_name: null,
    site_id: null,
    latitude: null,
    longitude: null,
    discharge: null,
    discharge_unit: 'cfs',
    gage_height: null,
    gage_height_unit: 'ft',
    water_temp_c: null,
    water_temp_f: null,
    last_updated: null,
    flow_status: 'unknown',
    flow_display: null,
  };

  for (const series of data.value.timeSeries) {
    const variable = series.variable.variableCode[0].value;
    const site = series.sourceInfo;
    const values = series.values[0]?.value;

    if (!result.site_name && site) {
      result.site_name = site.siteName;
      result.site_id = site.siteCode[0].value;
      result.latitude = site.geoLocation?.geogLocation?.latitude;
      result.longitude = site.geoLocation?.geogLocation?.longitude;
    }

    if (values?.length > 0) {
      const latest = values[values.length - 1];
      const value = parseFloat(latest.value);

      switch (variable) {
        case PARAM_CODES.DISCHARGE:
          result.discharge = value;
          result.last_updated = latest.dateTime;
          break;
        case PARAM_CODES.GAGE_HEIGHT:
          result.gage_height = value;
          break;
        case PARAM_CODES.WATER_TEMP:
          result.water_temp_c = value;
          result.water_temp_f = Math.round((value * 9/5) + 32);
          break;
      }
    }
  }

  // Determine flow status (simplified - would need historical data for accuracy)
  if (result.discharge !== null) {
    result.flow_display = `${result.discharge.toLocaleString()} cfs`;

    // These thresholds are generic - each river would have its own normal ranges
    if (result.discharge < 50) {
      result.flow_status = 'low';
    } else if (result.discharge > 2000) {
      result.flow_status = 'high';
    } else {
      result.flow_status = 'normal';
    }
  }

  return result;
}

// Search for USGS sites near a location
export async function searchUSGSSites(lat, lon, radius = 25) {
  try {
    const params = new URLSearchParams({
      format: 'json',
      bBox: `${lon - 0.5},${lat - 0.5},${lon + 0.5},${lat + 0.5}`,
      siteType: 'ST', // Stream sites
      siteStatus: 'active',
      hasDataTypeCd: 'iv', // Has instantaneous values
    });

    const response = await fetch(`${USGS_API_BASE}?${params}`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.value?.timeSeries?.length) {
      return [];
    }

    // Extract unique sites
    const sitesMap = new Map();
    for (const series of data.value.timeSeries) {
      const site = series.sourceInfo;
      if (site && !sitesMap.has(site.siteCode[0].value)) {
        sitesMap.set(site.siteCode[0].value, {
          site_id: site.siteCode[0].value,
          site_name: site.siteName,
          latitude: site.geoLocation?.geogLocation?.latitude,
          longitude: site.geoLocation?.geogLocation?.longitude,
        });
      }
    }

    return Array.from(sitesMap.values());
  } catch (error) {
    console.error('USGS site search error:', error);
    return [];
  }
}

// Popular fishing rivers with known USGS sites
export const POPULAR_RIVERS = [
  { name: 'Madison River, MT', site_id: '06041000', lat: 45.3469, lon: -111.5033 },
  { name: 'Yellowstone River, MT', site_id: '06192500', lat: 45.6372, lon: -110.5631 },
  { name: 'South Platte River, CO', site_id: '06701900', lat: 39.2225, lon: -105.2206 },
  { name: 'Arkansas River, CO', site_id: '07087050', lat: 38.5194, lon: -106.0431 },
  { name: 'San Juan River, NM', site_id: '09365000', lat: 36.8064, lon: -107.6456 },
  { name: 'Henry\'s Fork, ID', site_id: '13042500', lat: 44.4172, lon: -111.3422 },
  { name: 'Deschutes River, OR', site_id: '14092500', lat: 44.9818, lon: -121.2651 },
  { name: 'Bighorn River, MT', site_id: '06294000', lat: 45.9136, lon: -107.4672 },
  { name: 'Green River, UT', site_id: '09261000', lat: 40.9086, lon: -109.4225 },
  { name: 'Delaware River, NY', site_id: '01427510', lat: 41.7594, lon: -75.0583 },
  { name: 'Au Sable River, MI', site_id: '04137500', lat: 44.6883, lon: -84.1569 },
  { name: 'Pere Marquette, MI', site_id: '04122500', lat: 43.9119, lon: -86.0322 },
  { name: 'White River, AR', site_id: '07048600', lat: 36.3842, lon: -92.5888 },
  { name: 'Chattahoochee, GA', site_id: '02334430', lat: 33.9981, lon: -84.2855 },
  { name: 'Guadalupe River, TX', site_id: '08167500', lat: 29.8606, lon: -98.1494 },
];

// Get water temperature classification for fishing
export function getWaterTempClassification(tempF) {
  if (tempF === null || tempF === undefined) {
    return { status: 'unknown', note: 'Temperature data unavailable' };
  }

  if (tempF < 40) {
    return { status: 'cold', color: 'blue', note: 'Very cold - slow metabolism, use small flies, slow presentations' };
  } else if (tempF < 50) {
    return { status: 'cool', color: 'cyan', note: 'Cool - midges and BWOs likely, nymph deep' };
  } else if (tempF >= 50 && tempF <= 55) {
    return { status: 'ideal-cold', color: 'green', note: 'Ideal for trout - good activity expected' };
  } else if (tempF > 55 && tempF <= 62) {
    return { status: 'ideal', color: 'green', note: 'Prime range - peak feeding activity' };
  } else if (tempF > 62 && tempF <= 68) {
    return { status: 'warm', color: 'yellow', note: 'Getting warm - fish early AM and evening' };
  } else if (tempF > 68 && tempF <= 72) {
    return { status: 'stress', color: 'orange', note: 'Stress range - consider fishing elsewhere' };
  } else {
    return { status: 'danger', color: 'red', note: 'Too warm for trout - do not target' };
  }
}

// Flow classification
export function getFlowClassification(cfs, riverType = 'medium') {
  // These are simplified - each river has its own ideal ranges
  const thresholds = {
    small: { low: 30, ideal_low: 50, ideal_high: 200, high: 400 },
    medium: { low: 100, ideal_low: 200, ideal_high: 800, high: 1500 },
    large: { low: 500, ideal_low: 1000, ideal_high: 5000, high: 10000 },
  };

  const t = thresholds[riverType] || thresholds.medium;

  if (cfs < t.low) {
    return { status: 'low', color: 'yellow', note: 'Low water - fish holding in deeper pools, long leaders essential' };
  } else if (cfs >= t.ideal_low && cfs <= t.ideal_high) {
    return { status: 'ideal', color: 'green', note: 'Ideal flow - good wading and holding water' };
  } else if (cfs > t.high) {
    return { status: 'high', color: 'red', note: 'High water - dangerous wading, try streamers on banks' };
  } else if (cfs > t.ideal_high) {
    return { status: 'elevated', color: 'orange', note: 'Elevated flow - fish edges and slower water' };
  } else {
    return { status: 'normal', color: 'green', note: 'Normal conditions' };
  }
}
