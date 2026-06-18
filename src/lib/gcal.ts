import { supabase } from './supabase';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

let cachedToken: string | null = null;

/**
 * Perform Google Sign-In via Supabase OAuth to obtain access token with Google Calendar scope
 */
export async function signInWithGoogleForCalendar(): Promise<{ token: string; user: any }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        redirectTo: window.location.origin
      }
    });
    
    if (error) throw error;

    // After OAuth redirection, the session will hold the provider_token (Google Access Token)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token || null;
    
    if (!token) {
      throw new Error('Access token not found in Supabase session. Make sure Google OAuth is configured.');
    }
    
    cachedToken = token;
    return { token, user: session.user };
  } catch (error) {
    console.error('Google Calendar OAuth error:', error);
    throw error;
  }
}

/**
 * Log out and clear cached token
 */
export async function logoutGoogleCalendar(): Promise<void> {
  await supabase.auth.signOut();
  cachedToken = null;
}

/**
 * Get the cached access token
 */
export function getGoogleAccessToken(): string | null {
  return cachedToken;
}

/**
 * Fetch calendar events from the primary calendar
 */
export async function fetchGoogleCalendarEvents(token: string): Promise<GoogleCalendarEvent[]> {
  try {
    const nowStr = new Date();
    nowStr.setDate(nowStr.getDate() - 30); // get events from past 30 days up to next 60 days
    const maxStr = new Date();
    maxStr.setDate(maxStr.getDate() + 60);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${nowStr.toISOString()}&timeMax=${maxStr.toISOString()}&maxResults=100`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return (data.items || []) as GoogleCalendarEvent[];
  } catch (error) {
    console.error('Failed to fetch events from Google Calendar:', error);
    throw error;
  }
}

/**
 * Insert a session / event into the primary Google Calendar
 */
export async function createGoogleCalendarEvent(
  token: string,
  event: {
    summary: string;
    description: string;
    location: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  }
): Promise<GoogleCalendarEvent> {
  try {
    const startDateTime = `${event.date}T${event.startTime}:00`;
    const endDateTime = `${event.date}T${event.endTime}:00`;

    const requestBody = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo'
      }
    };

    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar Insert Error: ${response.status} - ${errText}`);
    }

    const created = await response.json();
    return created as GoogleCalendarEvent;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
}

/**
 * Delete an event from the primary Google Calendar
 */
export async function deleteGoogleCalendarEvent(token: string, eventId: string): Promise<void> {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      throw new Error(`Google Calendar Delete Error: ${response.status} - ${errText}`);
    }
  } catch (error) {
    console.error('Failed to delete event:', error);
    throw error;
  }
}
