"use client";

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '@/types';

interface DailyStats {
    [date: string]: number;
}

/**
 * Hook for managing daily statistics and progress visualization.
 * 
 * Provides local storage-based tracking of daily learning progress with:
 * - Daily word count tracking
 * - 14-day rolling histogram data
 * - Raw histogram data for styled div rendering (instead of Unicode characters)
 * - Yesterday vs today comparison with difference calculation
 * 
 * The histogram data includes both raw counts and normalized values for
 * proportional bar height rendering in the progress visualization.
 * 
 * @author Portuguese Learning App  
 * @version 2.0.0
 */
export function useDailyStats() {
    const [dailyStats, setDailyStats] = useLocalStorage<DailyStats>(
        STORAGE_KEYS.DAILY_STATS,
        {}
    );

    const getToday = useCallback(() => {
        return new Date().toISOString().split('T')[0];
    }, []);

    const getYesterday = useCallback(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }, []);

    const incrementTodayCount = useCallback(() => {
        const today = getToday();
        setDailyStats(prev => ({
            ...prev,
            [today]: (prev[today] || 0) + 1,
        }));
    }, [getToday, setDailyStats]);

    const getTodayCount = useCallback(() => {
        return dailyStats[getToday()] || 0;
    }, [dailyStats, getToday]);

    const getYesterdayCount = useCallback(() => {
        return dailyStats[getYesterday()] || 0;
    }, [dailyStats, getYesterday]);

    const getDaysDiff = useCallback(() => {
        return getTodayCount() - getYesterdayCount();
    }, [getTodayCount, getYesterdayCount]);

    /**
     * Gets raw histogram data for the last 14 days.
     * 
     * Returns an array of objects with date, count, and normalized values.
     * The normalized values (0-1) are used for proportional bar heights
     * in the styled div histogram visualization.
     * 
     * @returns Array of 14 day objects with date, count, and normalized values
     */
    const getLast14DaysData = useCallback(() => {
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            return {
                date: dateStr,
                count: dailyStats[dateStr] || 0,
            };
        }).reverse();

        const max = Math.max(...last14Days.map(d => d.count), 1); // Ensure max is at least 1
        
        return last14Days.map((day) => ({
            ...day,
            normalized: day.count / max,
        }));
    }, [dailyStats]);

    /**
     * Gets Unicode character-based histogram (legacy support).
     * 
     * Converts histogram data to Unicode block characters for backward compatibility.
     * The styled div version (getLast14DaysData) is preferred for visual consistency.
     * 
     * @returns String of Unicode block characters representing 14-day progress
     */
    const getLast14DaysHistogram = useCallback(() => {
        const data = getLast14DaysData();
        const characters = '▁▂▃▄▅▆▇█';

        return data
            .map((day) => {
                const index = Math.min(Math.floor(day.normalized * characters.length), characters.length - 1);
                return characters[index] || '▁';
            })
            .join('');
    }, [getLast14DaysData]);

    return {
        dailyStats,
        incrementTodayCount,
        getTodayCount,
        getYesterdayCount,
        getDaysDiff,
        getLast14DaysData,
        getLast14DaysHistogram,
    };
}
