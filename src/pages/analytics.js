/**
 * Analytics & Telemetry Service (Supabase-backed with LocalStorage Fallback)
 *
 * Tracks usage metrics, solves, and feedback in a shared Postgres
 * database via Supabase. If Supabase is not configured (offline / local dev),
 * seamlessly falls back to localStorage so the application remains fully functional.
 *
 * All data access is governed by Postgres Row Level Security (RLS) policies.
 */

import { sanitizeInputText } from '../utils/security.js';
import { getSupabase, isSupabaseConfigured } from '../utils/supabase-client.js';
import { authService } from '../utils/auth-service.js';

const SESSION_ID_KEY = 'rubix_current_session_id';

const FALLBACK_KEYS = {
  SESSIONS: 'rubix_sessions',
  EVENTS: 'rubix_events',
  SOLVES: 'rubix_solves',
  FEEDBACK: 'rubix_feedback',
};

class AnalyticsService {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this._sessionRecorded = false;
    this.initFallbackStorage();
  }

  initFallbackStorage() {
    if (!localStorage.getItem(FALLBACK_KEYS.SESSIONS)) {
      localStorage.setItem(FALLBACK_KEYS.SESSIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(FALLBACK_KEYS.EVENTS)) {
      localStorage.setItem(FALLBACK_KEYS.EVENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(FALLBACK_KEYS.SOLVES)) {
      localStorage.setItem(FALLBACK_KEYS.SOLVES, JSON.stringify([]));
    }
    if (!localStorage.getItem(FALLBACK_KEYS.FEEDBACK)) {
      localStorage.setItem(FALLBACK_KEYS.FEEDBACK, JSON.stringify([]));
    }
  }

  getOrCreateSessionId() {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  }

  async _recordSessionOnce() {
    if (this._sessionRecorded) return;
    this._sessionRecorded = true;

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('sessions').insert({
          id: this.sessionId,
          user_agent: navigator.userAgent.substring(0, 80),
          screen_width: window.innerWidth,
        });
        return;
      } catch (e) {
        console.warn('Analytics: failed to record session in Supabase', e);
      }
    }

    // LocalStorage fallback
    try {
      const sessions = JSON.parse(localStorage.getItem(FALLBACK_KEYS.SESSIONS) || '[]');
      sessions.push({
        id: this.sessionId,
        startTime: Date.now(),
        userAgent: navigator.userAgent.substring(0, 80),
        screenWidth: window.innerWidth,
      });
      if (sessions.length > 100) sessions.shift();
      localStorage.setItem(FALLBACK_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Fallback session recording error:', e);
    }
  }

  async trackEvent(eventName, payload = {}) {
    this._recordSessionOnce();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('events').insert({
          session_id: this.sessionId,
          event: String(eventName).slice(0, 60),
          payload,
        });
        return;
      } catch (e) {
        console.warn('Analytics: failed to track event in Supabase', e);
      }
    }

    // LocalStorage fallback
    try {
      const events = JSON.parse(localStorage.getItem(FALLBACK_KEYS.EVENTS) || '[]');
      events.push({
        sessionId: this.sessionId,
        event: eventName,
        timestamp: Date.now(),
        ...payload,
      });
      if (events.length > 300) events.shift();
      localStorage.setItem(FALLBACK_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
      console.warn('Analytics tracking fallback error:', e);
    }
  }

  async recordSolve({ moveCount, solveTimeMs, rawSolution, wasValid = true }) {
    this._recordSessionOnce();
    const userId = authService.getUserId();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('solves').insert({
          session_id: this.sessionId,
          user_id: userId,
          move_count: moveCount,
          solve_time_ms: solveTimeMs,
          raw_solution: rawSolution,
          was_valid: wasValid,
        });
        return;
      } catch (e) {
        console.warn('Analytics: failed to record solve in Supabase', e);
      }
    }

    // LocalStorage fallback
    try {
      const solves = JSON.parse(localStorage.getItem(FALLBACK_KEYS.SOLVES) || '[]');
      solves.push({
        id: 'slv_' + Date.now().toString(36),
        sessionId: this.sessionId,
        userId: userId,
        timestamp: Date.now(),
        moveCount,
        solveTimeMs,
        rawSolution,
        wasValid,
      });
      if (solves.length > 100) solves.shift();
      localStorage.setItem(FALLBACK_KEYS.SOLVES, JSON.stringify(solves));
    } catch (e) {
      console.warn('Fallback solve recording error:', e);
    }
  }

  async submitFeedback({ rating, category, comment }) {
    this._recordSessionOnce();
    const userId = authService.getUserId();
    const cleanRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const cleanCategory = sanitizeInputText(category || 'General', 100);
    const cleanComment = sanitizeInputText(comment || '', 1000);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('feedback')
          .insert({
            session_id: this.sessionId,
            user_id: userId,
            rating: cleanRating,
            category: cleanCategory,
            comment: cleanComment,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn('Analytics: failed to submit feedback in Supabase', e);
      }
    }

    // LocalStorage fallback
    try {
      const feedbacks = JSON.parse(localStorage.getItem(FALLBACK_KEYS.FEEDBACK) || '[]');
      const item = {
        id: 'fb_' + Date.now().toString(36),
        sessionId: this.sessionId,
        userId: userId,
        userEmail: authService.getEmail(),
        userName: authService.getDisplayName(),
        timestamp: Date.now(),
        rating: cleanRating,
        category: cleanCategory,
        comment: cleanComment,
      };
      feedbacks.unshift(item);
      if (feedbacks.length > 100) feedbacks.length = 100;
      localStorage.setItem(FALLBACK_KEYS.FEEDBACK, JSON.stringify(feedbacks));
      return item;
    } catch (e) {
      console.warn('Fallback feedback submission error:', e);
      return null;
    }
  }

  async getDashboardMetrics() {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const [
          { count: totalVisits },
          { data: recentSolves, count: totalSolves },
          { data: recentFeedback, count: feedbackCount },
          { data: profilesData, count: totalProfiles },
        ] = await Promise.all([
          supabase.from('sessions').select('id', { count: 'exact', head: true }),
          supabase
            .from('solves')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('feedback')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        const solves = recentSolves || [];
        const feedbacks = recentFeedback || [];
        const profiles = profilesData || [];

        // Build a map of profiles by id for fast lookup
        const profileMap = new Map();
        for (const p of profiles) {
          profileMap.set(p.id, p);
        }

        const avgMoves = solves.length > 0
          ? Math.round((solves.reduce((acc, s) => acc + (s.move_count || 0), 0) / solves.length) * 10) / 10
          : 20;

        const avgComputeTime = solves.length > 0
          ? Math.round(solves.reduce((acc, s) => acc + (s.solve_time_ms || 0), 0) / solves.length)
          : 15;

        const avgRating = feedbacks.length > 0
          ? Math.round((feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length) * 10) / 10
          : 4.8;

        const successfulSolutions = solves.filter(s => s.was_valid).length;
        const solveSuccessRate = solves.length > 0
          ? Math.round((successfulSolutions / solves.length) * 100)
          : 100;

        return {
          isLiveBackend: true,
          totalVisits: Math.max(totalVisits || 0, 1),
          totalSolves: totalSolves || 0,
          successfulSolutions,
          solveSuccessRate,
          avgMoves,
          avgComputeTime,
          avgRating,
          feedbackCount: feedbackCount || 0,
          registeredUsersCount: totalProfiles || profiles.length,
          registeredUsers: profiles.map(p => ({
            id: p.id,
            email: p.email,
            displayName: p.display_name || p.email?.split('@')[0] || 'User',
            createdAt: p.created_at,
          })),
          solves: solves.slice(0, 15).map(s => ({
            id: s.id,
            timestamp: new Date(s.created_at).getTime(),
            moveCount: s.move_count,
            solveTimeMs: s.solve_time_ms,
            rawSolution: s.raw_solution,
            userId: s.user_id,
            userEmail: s.user_id && profileMap.has(s.user_id) ? profileMap.get(s.user_id).email : null,
          })),
          feedbacks: feedbacks.slice(0, 50).map(f => {
            const prof = f.user_id ? profileMap.get(f.user_id) : null;
            return {
              id: f.id,
              timestamp: new Date(f.created_at).getTime(),
              rating: f.rating,
              category: f.category,
              comment: f.comment,
              userId: f.user_id,
              isGuest: !f.user_id,
              userEmail: prof?.email || null,
              userName: prof?.display_name || (prof?.email ? prof.email.split('@')[0] : 'Guest User'),
            };
          }),
        };
      } catch (e) {
        console.warn('Error fetching Supabase metrics, falling back to local:', e);
      }
    }

    // LocalStorage fallback computation
    try {
      const sessions = JSON.parse(localStorage.getItem(FALLBACK_KEYS.SESSIONS) || '[]');
      const solves = JSON.parse(localStorage.getItem(FALLBACK_KEYS.SOLVES) || '[]');
      const feedbacks = JSON.parse(localStorage.getItem(FALLBACK_KEYS.FEEDBACK) || '[]');

      const totalVisits = Math.max(sessions.length, 1);
      const totalSolves = solves.length;

      const avgMoves = totalSolves > 0
        ? Math.round((solves.reduce((acc, s) => acc + (s.moveCount || 0), 0) / totalSolves) * 10) / 10
        : 20;

      const avgComputeTime = totalSolves > 0
        ? Math.round(solves.reduce((acc, s) => acc + (s.solveTimeMs || 0), 0) / totalSolves)
        : 15;

      const avgRating = feedbacks.length > 0
        ? Math.round((feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length) * 10) / 10
        : 4.8;

      const successfulSolutions = solves.filter(s => s.wasValid).length;
      const solveSuccessRate = totalSolves > 0
        ? Math.round((successfulSolutions / totalSolves) * 100)
        : 100;

      return {
        isLiveBackend: false,
        totalVisits,
        totalSolves,
        successfulSolutions,
        solveSuccessRate,
        avgMoves,
        avgComputeTime,
        avgRating,
        feedbackCount: feedbacks.length,
        registeredUsersCount: 0,
        registeredUsers: [],
        solves: solves.slice(-15).reverse(),
        feedbacks: feedbacks.slice(0, 50).map(f => ({
          ...f,
          isGuest: !f.userId,
          userName: f.userName || (f.userId ? 'Authenticated User' : 'Guest User'),
        })),
      };
    } catch (e) {
      console.error('Error computing dashboard metrics:', e);
      return {
        isLiveBackend: false,
        totalVisits: 1,
        totalSolves: 0,
        successfulSolutions: 0,
        solveSuccessRate: 100,
        avgMoves: 20,
        avgComputeTime: 12,
        avgRating: 5.0,
        feedbackCount: 0,
        registeredUsersCount: 0,
        registeredUsers: [],
        solves: [],
        feedbacks: [],
      };
    }
  }

  async deleteFeedback(id) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from('feedback').delete().eq('id', id);
        if (error) throw error;
        return;
      } catch (e) {
        console.warn('Analytics: failed to delete feedback in Supabase', e);
      }
    }

    try {
      let feedbacks = JSON.parse(localStorage.getItem(FALLBACK_KEYS.FEEDBACK) || '[]');
      feedbacks = feedbacks.filter(f => f.id !== id);
      localStorage.setItem(FALLBACK_KEYS.FEEDBACK, JSON.stringify(feedbacks));
    } catch (e) {
      console.warn('Fallback delete feedback error:', e);
    }
  }

  async clearAllData() {
    if (isSupabaseConfigured()) {
      console.warn('clearAllData() is disabled on live Supabase to protect multi-user data.');
    } else {
      localStorage.removeItem(FALLBACK_KEYS.SESSIONS);
      localStorage.removeItem(FALLBACK_KEYS.EVENTS);
      localStorage.removeItem(FALLBACK_KEYS.SOLVES);
      localStorage.removeItem(FALLBACK_KEYS.FEEDBACK);
      this.initFallbackStorage();
    }
  }
}

export const analytics = new AnalyticsService();
export default analytics;
