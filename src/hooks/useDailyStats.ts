"use client";

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '@/types';

interface DailyStats {
    [date: string]: number;
}

/**
 * Hook for managing daily statistics
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

    const getLast14DaysHistogram = useCallback(() => {
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            return dailyStats[dateStr] || 0;
        }).reverse();

        const min = Math.min(...last14Days);
        const max = Math.max(...last14Days);
        const range = max - min || 1;

        return last14Days
            .map((count) => {
                const normalized = (count - min) / range;

                if (normalized >= 0.8) return '█';
                if (normalized >= 0.6) return '▇';
                if (normalized >= 0.4) return '▆';
                if (normalized >= 0.2) return '▅';
                if (normalized > 0) return '▃';
                return ' ';
            })
            .join('');
    }, [dailyStats]);

    return {
        dailyStats,
        incrementTodayCount,
        getTodayCount,
        getYesterdayCount,
        getDaysDiff,
        getLast14DaysHistogram,
    };
}
