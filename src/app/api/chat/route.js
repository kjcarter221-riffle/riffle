import { NextResponse } from 'next/server';
import { getCurrentUser, isPro } from '@/lib/auth';
import { saveChatMessage, getChatHistory, getJournalEntries } from '@/lib/db';
import { getWeather, getMoonPhase, calculateFishingScore } from '@/lib/conditions';
import { getRiverData } from '@/lib/river';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are Riffle, an expert AI fly fishing guide with decades of experience on rivers across North America. You help fly anglers with:

1. **Fly Selection** - Pattern recommendations based on conditions, hatches, and season
2. **Technique** - Presentations, drifts, casting approaches, nymphing vs dry fly
3. **Reading Water** - Where fish hold, how to approach different water types
4. **Hatches** - Matching the hatch, understanding insect life cycles
5. **Conditions Analysis** - How weather, water temp, and flow affect fishing
6. **Gear Advice** - Rod weights, tippet sizes, leader formulas

Your style:
- Knowledgeable but friendly, like a helpful guide
- Give specific, actionable advice (fly names, sizes, colors)
- Consider current conditions when they're provided
- Reference the user's history when relevant
- Keep responses concise but thorough (2-4 paragraphs)
- Use fly fishing terminology naturally

When given current conditions, incorporate them into every recommendation.

Common fly patterns you should know:
- Dries: Adams, Elk Hair Caddis, Parachute Adams, Blue Wing Olive, PMD, Royal Wulff, Stimulator, Griffith's Gnat
- Nymphs: Pheasant Tail, Hare's Ear, Prince Nymph, Copper John, Zebra Midge, RS2, Perdigon, Pat's Rubber Legs
- Emergers: Klinkhammer, Sparkle Dun, CDC Emerger, Soft Hackle, Barr's Emerger
- Streamers: Woolly Bugger, Sculpzilla, Circus Peanut, Sex Dungeon, Slumpbuster, Zonker
- Terrestrials: Dave's Hopper, Chernobyl Ant, Foam Beetle, Flying Ant`;

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to use the AI assistant' }, { status: 401 });
    }

    const { message, location, riverId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Build context from conditions
    let context = '';

    // Get weather and conditions if location provided
    if (location?.lat && location?.lon) {
      try {
        const weather = await getWeather(location.lat, location.lon);
        const moon = getMoonPhase();

        let riverData = null;
        if (riverId) {
          riverData = await getRiverData(riverId);
        }

        const conditions = calculateFishingScore(weather, moon, riverData);

        context += `\n\n--- CURRENT CONDITIONS ---
Location: ${location.name || 'User location'}
Weather: ${weather.weather}, ${weather.temperature}°F (feels like ${weather.feels_like}°F)
Wind: ${weather.wind_speed} mph from ${weather.wind_direction}
Clouds: ${weather.clouds}%
Barometric Pressure: ${weather.pressure} mb
Moon Phase: ${moon.name} ${moon.emoji}
Fishing Score: ${conditions.score}/100 (${conditions.rating})`;

        if (riverData) {
          context += `
River: ${riverData.site_name}
Flow: ${riverData.flow_display || 'N/A'}
Water Temp: ${riverData.water_temp_f ? riverData.water_temp_f + '°F' : 'N/A'}`;
        }
      } catch (e) {
        console.error('Context fetch error:', e);
      }
    }

    // Get user's recent journal entries for context
    try {
      const entries = await getJournalEntries(user.id, 5, 0);
      if (entries.length > 0) {
        const fliesUsed = [...new Set(entries.flatMap(e => e.flies_used?.split(',').map(f => f.trim()) || []))].filter(Boolean);
        const rivers = [...new Set(entries.map(e => e.river_name).filter(Boolean))];

        if (fliesUsed.length > 0 || rivers.length > 0) {
          context += `\n\n--- USER'S RECENT ACTIVITY ---`;
          if (rivers.length > 0) context += `\nRivers fished: ${rivers.slice(0, 5).join(', ')}`;
          if (fliesUsed.length > 0) context += `\nFlies used recently: ${fliesUsed.slice(0, 8).join(', ')}`;
        }
      }
    } catch (e) {
      console.error('History fetch error:', e);
    }

    // Save user message
    await saveChatMessage(user.id, 'user', message);

    // Get chat history
    const history = await getChatHistory(user.id, 10);

    // Build messages
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + context }
    ];

    // Add history
    for (const msg of history.slice(-8)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current message if not in history
    if (messages[messages.length - 1]?.content !== message) {
      messages.push({ role: 'user', content: message });
    }

    // Get AI response
    let response;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 1000,
          temperature: 0.7
        });
        response = completion.choices[0].message.content;
      } catch (e) {
        console.error('OpenAI error:', e);
        response = getFallbackResponse(message, context);
      }
    } else {
      response = getFallbackResponse(message, context);
    }

    // Save response
    await saveChatMessage(user.id, 'assistant', response);

    return NextResponse.json({
      message: response,
      isPro: isPro(user)
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

function getFallbackResponse(message, context) {
  const lower = message.toLowerCase();

  // Extract conditions if available
  const hasConditions = context.includes('CURRENT CONDITIONS');
  let conditionsNote = hasConditions ? '\n\nBased on your current conditions, ' : '';

  // Fly recommendations
  if (lower.includes('fly') || lower.includes('pattern') || lower.includes('what should i') || lower.includes('use')) {
    if (lower.includes('streamer')) {
      return `For streamers, here are my top picks:

**All-Around:** Woolly Bugger (black, olive) sizes 4-8 - the classic that never fails
**High Water:** Sculpzilla or Circus Peanut - bigger profile for murky conditions
**Clear Water:** Zonker or Slumpbuster in natural colors
**Aggressive Fish:** Sex Dungeon or Drunk & Disorderly - articulated for big reactions

**Technique Tips:**
- Strip-pause-strip retrieve works well
- Let it swing at the end of the drift
- Don't be afraid to throw it tight to the bank${conditionsNote}consider water clarity when choosing colors - darker water means darker flies.`;
    }

    if (lower.includes('dry') || lower.includes('surface')) {
      return `For dry fly fishing, match what you see on the water:

**Mayflies:** Parachute Adams (12-18), Blue Wing Olive (18-22), PMD (14-18)
**Caddis:** Elk Hair Caddis (14-18), X-Caddis, Goddard Caddis
**Attractors:** Royal Wulff, Stimulator, Chubby Chernobyl
**Small Stuff:** Griffith's Gnat (18-22) for midges

**Presentation Tips:**
- Upstream dead drift is key
- Use 5X-6X tippet for spooky fish
- Mend to eliminate drag
- Let the fly sit in the feeding lane${conditionsNote}overcast skies often mean better dry fly action.`;
    }

    if (lower.includes('nymph')) {
      return `Nymphing is the most consistent way to catch fish. Here's what works:

**Year-Round Producers:**
- Pheasant Tail (14-20) - matches many mayfly nymphs
- Hare's Ear (12-18) - buggy attractor pattern
- Zebra Midge (18-24) - deadly in tailwaters

**Modern Patterns:**
- Perdigon (16-20) - sinks fast, triggers strikes
- Jig Nymphs - ride hook-up, fewer snags
- Pat's Rubber Legs (6-10) - big protein for big fish

**Euro Nymphing Setup:**
- Tight line, no indicator
- Heavy point fly, lighter dropper
- Keep rod tip high, feel for takes${conditionsNote}adjust weight based on current speed.`;
    }

    // General fly advice
    return `Great question! Here's a versatile fly box approach:

**Must-Have Patterns:**
- Adams Parachute (14-18) - matches many mayflies
- Elk Hair Caddis (14-18) - essential dry
- Pheasant Tail (16-20) - year-round nymph
- Hare's Ear (14-18) - buggy attractor
- Woolly Bugger (6-10) - streamer essential
- Zebra Midge (18-22) - tailwater staple

**Seasonal Adjustments:**
- Spring: BWOs, Midges, March Browns
- Summer: PMDs, Caddis, Terrestrials
- Fall: BWOs, October Caddis, Streamers
- Winter: Midges, small nymphs, eggs

What specific water or species are you targeting?`;
  }

  // Conditions questions
  if (lower.includes('condition') || lower.includes('weather') || lower.includes('good day') || lower.includes('should i go')) {
    if (hasConditions) {
      const scoreMatch = context.match(/Fishing Score: (\d+)\/100 \((\w+)\)/);
      if (scoreMatch) {
        return `Based on current conditions, your fishing score is **${scoreMatch[1]}/100 (${scoreMatch[2]})**

${getConditionsAdvice(scoreMatch[2])}

**Key Factors:**
${context.includes('Pressure') ? '- Barometric pressure affects fish activity\n' : ''}${context.includes('Wind') ? '- Wind creates surface disturbance\n' : ''}${context.includes('Moon') ? '- Moon phase influences feeding times\n' : ''}
Would you like specific fly recommendations for these conditions?`;
      }
    }

    return `Weather significantly impacts fly fishing success:

**Ideal Conditions:**
- Barometric pressure: 1010-1020 mb (stable)
- Light wind: 5-12 mph breaks surface
- Overcast: 50-80% cloud cover
- Water temp: 50-65°F for trout

**Challenging Conditions:**
- High pressure = fish deep
- Strong wind = hard casting
- Bright sun = spooky fish
- Extreme temps = slow metabolism

Share your location and I can give you a real-time conditions report!`;
  }

  // Hatch questions
  if (lower.includes('hatch') || lower.includes('bwo') || lower.includes('caddis') || lower.includes('mayfly')) {
    return `Understanding hatches is key to fly selection:

**Blue Wing Olives (BWO)**
- Season: Spring & Fall, overcast days
- Size: 18-22
- Patterns: Parachute BWO, RS2, Sparkle Dun

**Caddis**
- Season: Late spring through fall
- Size: 14-18
- Patterns: Elk Hair Caddis, X-Caddis, LaFontaine Sparkle Pupa

**PMD (Pale Morning Dun)**
- Season: Summer mornings
- Size: 14-18
- Patterns: PMD Sparkle Dun, Parachute PMD

**Matching Tips:**
- Watch the water - see what's flying
- Check spider webs for recent hatches
- Start with emergers, move to dries
- Size matters more than exact pattern

What river or region are you fishing?`;
  }

  // Default
  return `I'm Riffle, your AI fly fishing guide! I can help with:

**Fly Selection**
"What flies should I use in October?"
"Best streamers for brown trout?"

**Conditions & Hatches**
"Is today a good day to fish?"
"What's hatching on the Madison right now?"

**Technique**
"How do I Euro nymph effectively?"
"Tips for fishing pocket water?"

**Reading Water**
"Where do trout hold in a riffle?"
"How do I approach a flat pool?"

Just ask me anything about fly fishing!`;
}

function getConditionsAdvice(rating) {
  switch (rating.toLowerCase()) {
    case 'excellent':
      return "Outstanding day to be on the water! Fish should be active and looking up. Expect good hatch activity.";
    case 'good':
      return "Solid fishing expected. Be observant for hatch activity and adjust your approach based on what you see.";
    case 'fair':
      return "Decent conditions. Focus on nymphing and subsurface patterns. Fish structure and deeper runs.";
    default:
      return "Challenging conditions. Try early morning or evening, fish deeper, and use subtle presentations.";
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clearChatHistory } = await import('@/lib/db');
    clearChatHistory(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 });
  }
}
